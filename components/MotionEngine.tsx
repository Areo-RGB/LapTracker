import React, { useRef, useEffect, useState } from 'react';
import { AppSettings } from '../types';

interface MotionEngineProps {
  settings: AppSettings;
  onMotionTriggered: (timestamp: number) => void;
  isMonitoring: boolean;
  lastActivityTimestamp: number;
}

// Inline Worker Code
const WORKER_CODE = `
  let prevPixels = null;

  self.onmessage = function(e) {
    const { type, data, width, height } = e.data;

    if (type === 'RESET') {
      prevPixels = null;
      return;
    }

    if (type === 'PROCESS') {
      // Create a view on the transferred buffer
      const pixels = new Uint8ClampedArray(data);
      
      // If dimensions changed or no prev frame, reset
      if (prevPixels && prevPixels.length !== pixels.length) {
        prevPixels = null;
      }

      if (!prevPixels) {
        // Store first frame copy
        prevPixels = new Uint8ClampedArray(pixels);
        self.postMessage({ diff: 0 });
        return;
      }

      let diffScore = 0;
      let pixelsChecked = 0;
      // Sampling rate optimization
      const skip = pixels.length > 50000 ? 16 : 4; 

      for (let i = 0; i < pixels.length; i += skip * 4) {
        const rDiff = Math.abs(pixels[i] - prevPixels[i]);
        const gDiff = Math.abs(pixels[i+1] - prevPixels[i+1]);
        const bDiff = Math.abs(pixels[i+2] - prevPixels[i+2]);
        
        diffScore += (rDiff + gDiff + bDiff);
        pixelsChecked++;
      }

      const normalizedDiff = pixelsChecked > 0 ? diffScore / pixelsChecked : 0;
      
      // Update previous frame with current frame data
      prevPixels.set(pixels);
      
      self.postMessage({ diff: normalizedDiff });
    }
  };
`;

export default function MotionEngine({ settings, onMotionTriggered, isMonitoring, lastActivityTimestamp }: MotionEngineProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const workerRef = useRef<Worker | null>(null);

  // Logic Refs
  const lastTriggerRef = useRef<number>(0);

  // FPS Counting Refs
  const lastFpsTimeRef = useRef<number>(0);
  const frameCountRef = useRef<number>(0);
  const [fps, setFps] = useState<number>(0);

  const [error, setError] = useState<string | null>(null);
  const [debugDiff, setDebugDiff] = useState(0);

  // Initialize Worker
  useEffect(() => {
    const blob = new Blob([WORKER_CODE], { type: 'application/javascript' });
    const worker = new Worker(URL.createObjectURL(blob));
    workerRef.current = worker;

    return () => {
      worker.terminate();
    };
  }, []);

  // Worker Message Handler - Handles the RESULT of the calculation
  useEffect(() => {
    const worker = workerRef.current;
    if (!worker) return;

    const handleMessage = (e: MessageEvent) => {
      const { diff } = e.data;
      setDebugDiff(diff);

      const now = Date.now();
      const onCooldown = now - lastTriggerRef.current < settings.cooldown;
      const threshold = 105 - settings.sensitivity;

      if (diff > threshold && !onCooldown && isMonitoring) {
        lastTriggerRef.current = now;
        onMotionTriggered(now);
      }
    };

    worker.onmessage = handleMessage;

    // Reset worker state when monitoring stops/starts to avoid diffing against old frames
    if (!isMonitoring) {
      worker.postMessage({ type: 'RESET' });
    }

    return () => {
      worker.onmessage = null;
    };
  }, [isMonitoring, settings.sensitivity, settings.cooldown, onMotionTriggered]);

  // Initialize Camera
  useEffect(() => {
    async function setupCamera() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            width: { ideal: 640 },
            height: { ideal: 360 },
            frameRate: { ideal: 60 },
            facingMode: 'environment'
          },
          audio: false
        });

        streamRef.current = stream;

        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.onloadedmetadata = () => {
            videoRef.current?.play().catch(e => console.error("Play error:", e));
          };
        }
        setError(null);
      } catch (err) {
        console.error("Error accessing camera:", err);
        setError("Camera access denied or unavailable.");
      }
    }

    setupCamera();

    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  // Rendering & Capture Loop
  useEffect(() => {
    let rafId: number | null = null;
    let rvfcId: number | null = null;

    const processFrame = () => {
      const now = Date.now();

      // Calculate FPS
      frameCountRef.current++;
      if (now - lastFpsTimeRef.current >= 1000) {
        setFps(frameCountRef.current);
        frameCountRef.current = 0;
        lastFpsTimeRef.current = now;
      }

      const video = videoRef.current;
      const canvas = canvasRef.current;

      // Safety Check
      if (!video || !canvas || video.readyState < 2) {
        rafId = requestAnimationFrame(processFrame);
        return;
      }

      if (canvas.width !== video.videoWidth || canvas.height !== video.videoHeight) {
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
      }

      const ctx = canvas.getContext('2d', {
        willReadFrequently: true,
        alpha: false
      });

      if (!ctx) {
        rafId = requestAnimationFrame(processFrame);
        return;
      }

      // 1. Draw the current frame
      ctx.filter = 'none';
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

      // Calculate geometry
      const centerX = (settings.tripwireX / 100) * canvas.width;
      const centerY = (settings.tripwireY / 100) * canvas.height;
      const zoneW = Math.max(2, (settings.detectionWidth / 100) * canvas.width);
      const zoneH = Math.max(2, (settings.detectionHeight / 100) * canvas.height);

      const sampleX = Math.max(0, Math.min(canvas.width - zoneW, centerX - zoneW / 2));
      const sampleY = Math.max(0, Math.min(canvas.height - zoneH, centerY - zoneH / 2));

      // 2. Monitoring visual effect (blur)
      if (isMonitoring) {
        ctx.filter = 'blur(4px)';
        ctx.drawImage(video, sampleX, sampleY, zoneW, zoneH, sampleX, sampleY, zoneW, zoneH);
        ctx.filter = 'none';
      }

      // 3. CAPTURE & SEND TO WORKER
      if (isMonitoring && workerRef.current) {
        const imageData = ctx.getImageData(sampleX, sampleY, zoneW, zoneH);
        // We transfer the buffer to the worker (zero-copy)
        workerRef.current.postMessage({
          type: 'PROCESS',
          data: imageData.data.buffer,
          width: zoneW,
          height: zoneH
        }, [imageData.data.buffer]);
      }

      // 4. Draw Zone Overlay Box
      // We check lastTriggerRef directly for immediate UI feedback even if the worker is processing asynchronously
      const onCooldown = now - lastTriggerRef.current < settings.cooldown;

      ctx.shadowBlur = 10;
      ctx.shadowColor = onCooldown ? '#f43f5e' : '#06b6d4';

      ctx.lineWidth = 2;
      ctx.strokeStyle = onCooldown ? 'rgba(244, 63, 94, 0.8)' : 'rgba(6, 182, 212, 0.8)';
      ctx.fillStyle = onCooldown ? 'rgba(244, 63, 94, 0.1)' : 'rgba(6, 182, 212, 0.05)';

      ctx.strokeRect(sampleX, sampleY, zoneW, zoneH);
      ctx.fillRect(sampleX, sampleY, zoneW, zoneH);
      ctx.shadowBlur = 0;

      // Visual Flash if triggered recently
      if (onCooldown && isMonitoring) {
        ctx.fillStyle = 'rgba(6, 182, 212, 0.3)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
      }

      // Schedule next frame
      if ('requestVideoFrameCallback' in video) {
        rvfcId = (video as any).requestVideoFrameCallback(processFrame);
      } else {
        rafId = requestAnimationFrame(processFrame);
      }
    };

    // Kickoff
    rafId = requestAnimationFrame(processFrame);

    return () => {
      if (rafId !== null) cancelAnimationFrame(rafId);
      if (rvfcId !== null && videoRef.current && 'cancelVideoFrameCallback' in videoRef.current) {
        (videoRef.current as any).cancelVideoFrameCallback(rvfcId);
      }
    };
  }, [settings, isMonitoring]); // Removed onMotionTriggered from dep array to avoid re-binding loop

  return (
    <div
      className="w-full h-full bg-black relative"
      style={{ transform: 'translate3d(0,0,0)', backfaceVisibility: 'hidden' }}
    >
      {error && (
        <div className="absolute inset-0 flex items-center justify-center bg-black z-50 text-rose-500 p-4 text-center">
          <p>{error}</p>
        </div>
      )}

      <video ref={videoRef} className="hidden" playsInline muted />

      <canvas
        ref={canvasRef}
        className="w-full h-full object-cover"
        style={{ transform: 'translate3d(0,0,0)' }}
      />

      {/* Debug Info Overlay - Conditional on devMode */}
      {settings.devMode && (
        <div className="absolute bottom-4 left-4 flex flex-col items-start gap-1 pointer-events-none z-20">
          <div className="text-[10px] text-cyan-400/80 font-mono bg-slate-950/70 px-2 py-1 rounded">
            FPS: {fps}
          </div>
          <div className="text-[10px] text-cyan-400/50 font-mono bg-slate-950/50 px-2 py-1 rounded">
            DIFF: {debugDiff.toFixed(2)} | STATE: {isMonitoring ? 'RUNNING' : 'STOPPED'}
          </div>
        </div>
      )}
    </div>
  );
}