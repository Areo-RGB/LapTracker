import React, { useRef, useEffect, useState } from 'react';
import { AppSettings } from '../types';

interface MotionEngineProps {
  settings: AppSettings;
  onMotionTriggered: (timestamp: number) => void;
  isMonitoring: boolean;
  lastActivityTimestamp: number;
}

export default function MotionEngine({ settings, onMotionTriggered, isMonitoring, lastActivityTimestamp }: MotionEngineProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  
  // Logic Refs
  const lastTriggerRef = useRef<number>(0);
  
  // FPS Counting Refs
  const lastFpsTimeRef = useRef<number>(0);
  const frameCountRef = useRef<number>(0);
  const [fps, setFps] = useState<number>(0);

  // Previous frame data for difference calculation
  const prevPixelDataRef = useRef<Uint8ClampedArray | null>(null);
  
  const [error, setError] = useState<string | null>(null);
  const [debugDiff, setDebugDiff] = useState(0);

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

  // Motion Detection Loop
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
      
      // Safety Check: If video isn't ready, fallback to RAF to retry next frame
      if (!video || !canvas || video.readyState < 2) {
         rafId = requestAnimationFrame(processFrame);
         return;
      }

      if (canvas.width !== video.videoWidth || canvas.height !== video.videoHeight) {
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
      }

      // Optimization: alpha: false removes the transparency channel, speeding up compositing
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

      // 3. CAPTURE DATA FOR MOTION DETECTION
      let currentFrameData: Uint8ClampedArray | null = null;
      if (isMonitoring) {
        currentFrameData = ctx.getImageData(sampleX, sampleY, zoneW, zoneH).data;
      }

      // 4. Draw Zone Overlay Box
      const onCooldown = now - lastTriggerRef.current < settings.cooldown;
      
      ctx.shadowBlur = 10;
      ctx.shadowColor = onCooldown ? '#f43f5e' : '#06b6d4'; // Rose-500 or Cyan-500
      
      ctx.lineWidth = 2;
      ctx.strokeStyle = onCooldown ? 'rgba(244, 63, 94, 0.8)' : 'rgba(6, 182, 212, 0.8)';
      ctx.fillStyle = onCooldown ? 'rgba(244, 63, 94, 0.1)' : 'rgba(6, 182, 212, 0.05)';
      
      ctx.strokeRect(sampleX, sampleY, zoneW, zoneH);
      ctx.fillRect(sampleX, sampleY, zoneW, zoneH);
      ctx.shadowBlur = 0;

      // 5. Motion Logic processing
      if (isMonitoring && currentFrameData) {
        const data = currentFrameData;
        
        let diffScore = 0;
        let pixelsChecked = 0;

        if (prevPixelDataRef.current && prevPixelDataRef.current.length === data.length) {
          const prevData = prevPixelDataRef.current;
          const skip = data.length > 50000 ? 16 : 4; 
          
          for (let i = 0; i < data.length; i += skip * 4) {
            const rDiff = Math.abs(data[i] - prevData[i]);
            const gDiff = Math.abs(data[i + 1] - prevData[i + 1]);
            const bDiff = Math.abs(data[i + 2] - prevData[i + 2]);
            
            diffScore += (rDiff + gDiff + bDiff);
            pixelsChecked++;
          }
          
          const normalizedDiff = diffScore / pixelsChecked; 
          setDebugDiff(normalizedDiff);

          const threshold = 105 - settings.sensitivity; 

          if (normalizedDiff > threshold && !onCooldown) {
            // TRIGGER
            lastTriggerRef.current = now;
            onMotionTriggered(now);
            
            ctx.fillStyle = 'rgba(6, 182, 212, 0.3)';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
          }
        }

        prevPixelDataRef.current = new Uint8ClampedArray(data);
      } else {
        prevPixelDataRef.current = null;
      }

      // Schedule next frame
      // CRITICAL: We prioritize requestVideoFrameCallback to sync with the CAMERA FPS (e.g. 60Hz)
      // instead of the monitor refresh rate (e.g. 75Hz). This avoids processing duplicate frames.
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
  }, [settings, isMonitoring, onMotionTriggered]);

  return (
    <div 
      className="w-full h-full bg-slate-950 relative flex items-center justify-center"
      style={{ transform: 'translate3d(0,0,0)', backfaceVisibility: 'hidden' }}
    >
      {error && (
        <div className="absolute inset-0 flex items-center justify-center bg-slate-950 z-50 text-rose-500 p-4 text-center">
          <p>{error}</p>
        </div>
      )}
      
      <video ref={videoRef} className="hidden" playsInline muted />
      
      <canvas 
        ref={canvasRef} 
        className="max-w-full max-h-full object-contain"
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