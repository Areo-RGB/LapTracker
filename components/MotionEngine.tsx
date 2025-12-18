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
  const animationFrameRef = useRef<number | null>(null);
  const lastTriggerRef = useRef<number>(0);
  
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
            width: { ideal: 1280 },
            height: { ideal: 720 },
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
      if (animationFrameRef.current !== null) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, []);

  // Motion Detection Loop
  useEffect(() => {
    const processFrame = () => {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      
      if (!video || !canvas || video.readyState !== 4) {
        animationFrameRef.current = requestAnimationFrame(processFrame);
        return;
      }

      if (canvas.width !== video.videoWidth || canvas.height !== video.videoHeight) {
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
      }

      const ctx = canvas.getContext('2d', { willReadFrequently: true });
      if (!ctx) return;

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
      // We apply this before capturing data so we detect on the blurred image (reduces noise)
      if (isMonitoring) {
        ctx.filter = 'blur(4px)'; 
        ctx.drawImage(video, sampleX, sampleY, zoneW, zoneH, sampleX, sampleY, zoneW, zoneH);
        ctx.filter = 'none';
      }

      // 3. CAPTURE DATA FOR MOTION DETECTION
      // Critical: Capture BEFORE drawing any overlays (boxes, text, etc.) to prevent feedback loops.
      let currentFrameData: Uint8ClampedArray | null = null;
      if (isMonitoring) {
        currentFrameData = ctx.getImageData(sampleX, sampleY, zoneW, zoneH).data;
      }

      // 4. Draw Zone Overlay Box (Neon Style)
      // These overlays change color based on state, so they must happen AFTER capture.
      const now = Date.now();
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
            
            // Visual Flash on Trigger (Cyan flash)
            // This is drawn at end of frame, will be cleared by next frame's video draw
            ctx.fillStyle = 'rgba(6, 182, 212, 0.3)';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
          }
        }

        prevPixelDataRef.current = new Uint8ClampedArray(data);
      } else {
        prevPixelDataRef.current = null;
      }

      animationFrameRef.current = requestAnimationFrame(processFrame);
    };

    animationFrameRef.current = requestAnimationFrame(processFrame);

    return () => {
      if (animationFrameRef.current !== null) cancelAnimationFrame(animationFrameRef.current);
    };
  }, [settings, isMonitoring, onMotionTriggered]);

  return (
    <div className="w-full h-full bg-slate-950 relative flex items-center justify-center">
      {error && (
        <div className="absolute inset-0 flex items-center justify-center bg-slate-950 z-50 text-rose-500 p-4 text-center">
          <p>{error}</p>
        </div>
      )}
      
      <video ref={videoRef} className="hidden" playsInline muted />
      
      <canvas ref={canvasRef} className="max-w-full max-h-full object-contain" />

      {/* Debug Info Overlay */}
      <div className="absolute bottom-4 left-4 text-[10px] text-cyan-400/50 font-mono pointer-events-none">
        DIFF: {debugDiff.toFixed(2)} | STATE: {isMonitoring ? 'RUNNING' : 'STOPPED'}
      </div>
    </div>
  );
}