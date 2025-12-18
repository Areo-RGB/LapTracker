import React, { useState, useEffect, useRef } from 'react';
import { Lap, AppSettings } from '../types';
import { X, Play, Pause, Trophy, Plus, Minus, Trash2 } from 'lucide-react';

interface DisplayTabProps {
  stats: {
    average: number;
    count: number;
    last: number;
    fastest: number;
    slowest: number;
    isFinished: boolean;
    targetLaps: number;
  };
  laps: Lap[];
  isMonitoring: boolean;
  toggleMonitoring: () => void;
  onExit: () => void;
  onReset: () => void;
  lastActivity: number;
  settings: AppSettings;
}

const formatTime = (ms: number) => {
  if (ms <= 0) return "--.--";
  const seconds = (ms / 1000).toFixed(2);
  return seconds;
};

const STORAGE_KEY_FONT_SCALE = 'laptrack-font-scale';

export default function DisplayTab({ stats, laps, isMonitoring, toggleMonitoring, onExit, onReset, lastActivity, settings }: DisplayTabProps) {
  // Using ref for direct DOM updates (60fps performance optimization)
  const [pulseType, setPulseType] = useState<'none' | 'fast' | 'slow'>('none');

  // Initialize fontScale from localStorage
  const [fontScale, setFontScale] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_FONT_SCALE);
      const parsed = saved ? parseFloat(saved) : 1;
      return isNaN(parsed) ? 1 : Math.max(0.5, Math.min(4.0, parsed));
    } catch {
      return 1;
    }
  });

  const [showControls, setShowControls] = useState(false);

  const lastProcessedLapRef = useRef<number>(0);
  const controlsTimeoutRef = useRef<number | null>(null);
  const currentTimeRef = useRef<HTMLDivElement>(null);

  // Persist fontScale to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_FONT_SCALE, fontScale.toString());
    } catch (e) {
      console.warn('Failed to save font scale preference');
    }
  }, [fontScale]);

  // Animation effect for significant laps
  useEffect(() => {
    // Only trigger if we have a new lap and enough data to compare (count >= 2 because first lap is start)
    if (stats.count >= 1 && stats.last !== lastProcessedLapRef.current && stats.average > 0) {
      const diff = (stats.last - stats.average) / stats.average;

      if (diff <= -0.25) {
        setPulseType('fast');
        setTimeout(() => setPulseType('none'), 1200);
      } else if (diff >= 0.25) {
        setPulseType('slow');
        setTimeout(() => setPulseType('none'), 1200);
      }

      lastProcessedLapRef.current = stats.last;
    }
  }, [stats.last, stats.average, stats.count]);

  // Direct DOM updates for 60fps timer (avoids React re-renders)
  useEffect(() => {
    if (!isMonitoring || laps.length === 0 || lastActivity === 0 || stats.isFinished) {
      if (currentTimeRef.current) currentTimeRef.current.textContent = formatTime(0);
      return;
    }

    let frameId: number;
    const update = () => {
      if (currentTimeRef.current) {
        currentTimeRef.current.textContent = formatTime(Date.now() - lastActivity);
      }
      frameId = requestAnimationFrame(update);
    };
    update();
    return () => cancelAnimationFrame(frameId);
  }, [isMonitoring, laps.length, lastActivity, stats.isFinished]);

  // Clean up timeout on unmount
  useEffect(() => {
    return () => {
      if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
    };
  }, []);

  const handleInteraction = () => {
    setShowControls(true);
    if (controlsTimeoutRef.current) {
      clearTimeout(controlsTimeoutRef.current);
    }
    controlsTimeoutRef.current = window.setTimeout(() => {
      setShowControls(false);
    }, 3000);
  };

  const adjustScale = (delta: number) => {
    setFontScale(prev => Math.max(0.5, Math.min(4.0, prev + delta)));
    handleInteraction();
  };

  const getDisplayColor = () => {
    if (stats.count < 1 || stats.last === 0) return 'text-slate-100';
    if (stats.last < stats.average) return 'text-emerald-400 drop-shadow-[0_0_15px_rgba(52,211,153,0.5)]';
    if (stats.last > stats.average) return 'text-rose-400 drop-shadow-[0_0_15px_rgba(251,113,133,0.5)]';
    return 'text-slate-100';
  };

  return (
    <div
      className="h-full w-full flex items-center justify-center bg-slate-950 overflow-hidden select-none z-50 relative group font-sans cursor-pointer"
      onClick={handleInteraction}
    >

      {/* Background Gradient */}
      <div className="absolute inset-0 bg-gradient-to-br from-slate-900 to-slate-950 pointer-events-none" />

      {/* Pulse Overlays */}
      <div className={`absolute inset-0 pointer-events-none transition-opacity duration-500 z-10 ${pulseType === 'fast' ? 'opacity-100' : 'opacity-0'}`}>
        <div className="absolute inset-0 bg-emerald-500/10 animate-pulse" />
        <div className="absolute inset-0 bg-gradient-to-t from-emerald-500/30 via-transparent to-emerald-500/30 blur-3xl" />
      </div>
      <div className={`absolute inset-0 pointer-events-none transition-opacity duration-500 z-10 ${pulseType === 'slow' ? 'opacity-100' : 'opacity-0'}`}>
        <div className="absolute inset-0 bg-rose-500/10 animate-pulse" />
        <div className="absolute inset-0 bg-gradient-to-t from-rose-500/30 via-transparent to-rose-500/30 blur-3xl" />
      </div>

      {/* Unified Controls Group (Top Right) */}
      <div className={`absolute top-6 right-6 z-[60] flex flex-col gap-3 transition-all duration-500 ${showControls ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-4 pointer-events-none'}`}>
        {/* Core Controls */}
        <button
          onClick={(e) => { e.stopPropagation(); onExit(); }}
          className="p-3.5 bg-slate-800/80 text-slate-400 rounded-full hover:bg-rose-950/50 hover:text-rose-400 backdrop-blur-md shadow-lg border border-slate-700/50 transition-all active:scale-95"
          title="Exit Fullscreen"
        >
          <X size={24} />
        </button>

        <button
          onClick={(e) => { e.stopPropagation(); toggleMonitoring(); }}
          className={`p-3.5 rounded-full backdrop-blur-md shadow-lg border transition-all active:scale-95 ${isMonitoring
              ? 'bg-rose-500/10 text-rose-400 hover:bg-rose-500/20 border-rose-500/30'
              : 'bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 border-emerald-500/30'
            }`}
          title={isMonitoring ? "Stop Monitoring" : "Start Monitoring"}
        >
          {isMonitoring ? <Pause size={24} /> : <Play size={24} />}
        </button>

        {laps.length > 0 && (
          <button
            onClick={(e) => { e.stopPropagation(); onReset(); }}
            className="p-3.5 bg-slate-800/80 text-slate-400 rounded-full hover:bg-rose-950/50 hover:text-rose-400 backdrop-blur-md shadow-lg border border-slate-700/50 transition-all active:scale-95"
            title="Reset Session"
          >
            <Trash2 size={24} />
          </button>
        )}

        {/* Separator */}
        <div className="h-px bg-slate-800/80 w-full my-1" />

        {/* Font Scale Controls */}
        <button
          onClick={(e) => { e.stopPropagation(); adjustScale(0.1); }}
          className="p-3.5 bg-slate-800/80 text-slate-300 rounded-full hover:bg-cyan-900/50 hover:text-cyan-400 backdrop-blur-md shadow-lg border border-slate-700/50 active:scale-95 transition-all"
          title="Increase Size"
        >
          <Plus size={24} />
        </button>
        <button
          onClick={(e) => { e.stopPropagation(); adjustScale(-0.1); }}
          className="p-3.5 bg-slate-800/80 text-slate-300 rounded-full hover:bg-cyan-900/50 hover:text-cyan-400 backdrop-blur-md shadow-lg border border-slate-700/50 active:scale-95 transition-all"
          title="Decrease Size"
        >
          <Minus size={24} />
        </button>
      </div>

      <div className="flex flex-col items-center justify-center portrait:rotate-90 transition-transform duration-500 origin-center text-center z-20 relative">

        {/* Header Label - ONLY Session Complete */}
        <div className="flex flex-col items-center mb-[-2vmax]">
          {stats.isFinished && (
            <div className="flex items-center gap-3 text-amber-400 animate-bounce mb-4 filter drop-shadow-[0_0_10px_rgba(251,191,36,0.5)]">
              <Trophy size={28} className="fill-current" />
              <span className="uppercase tracking-[0.3em] font-black" style={{ fontSize: 'min(2.5vmax, 2.5vmin)' }}>Session Complete</span>
            </div>
          )}
        </div>

        {/* Main Stat (Average) */}
        <div
          className={`font-sans tabular-nums font-black leading-tight tracking-tight flex items-baseline justify-center transition-all duration-300 ease-out ${stats.isFinished ? 'text-transparent bg-clip-text bg-gradient-to-b from-white to-slate-400 drop-shadow-[0_0_20px_rgba(255,255,255,0.15)]' : getDisplayColor()} ${pulseType !== 'none' ? 'scale-105' : 'scale-100'}`}
          style={{
            fontSize: stats.isFinished
              ? `min(${25 * fontScale}vmax, ${45 * fontScale}vmin)`
              : `min(${35 * fontScale}vmax, ${55 * fontScale}vmin)`,
          }}
        >
          {formatTime(stats.average)}
        </div>

        {/* Secondary Stats Section */}
        {stats.isFinished ? (
          <div className="mt-8 grid grid-cols-2 gap-x-16 gap-y-4 border-t border-slate-800/50 pt-8">
            <div className="flex flex-col items-center group">
              <span className="text-emerald-500 uppercase tracking-[0.2em] font-bold mb-1 opacity-80" style={{ fontSize: 'min(1.5vmax, 1.5vmin)' }}>Fastest</span>
              <div className="font-mono tabular-nums font-bold text-white drop-shadow-[0_0_10px_rgba(16,185,129,0.3)]" style={{ fontSize: 'min(6vmax, 10vmin)' }}>
                {formatTime(stats.fastest)}
              </div>
            </div>
            <div className="flex flex-col items-center group">
              <span className="text-rose-500 uppercase tracking-[0.2em] font-bold mb-1 opacity-80" style={{ fontSize: 'min(1.5vmax, 1.5vmin)' }}>Slowest</span>
              <div className="font-mono tabular-nums font-bold text-white drop-shadow-[0_0_10px_rgba(244,63,94,0.3)]" style={{ fontSize: 'min(6vmax, 10vmin)' }}>
                {formatTime(stats.slowest)}
              </div>
            </div>
            <div className="col-span-2 text-slate-500 font-mono mt-4 uppercase tracking-widest font-medium" style={{ fontSize: 'min(1.2vmax, 1.2vmin)' }}>
              Completed {stats.count} Laps
            </div>
          </div>
        ) : (
          /* Live Running Timer - Conditionally Rendered based on settings */
          settings.showCurrentLapDisplay && (
            <div className="flex flex-col items-center mt-4">
              <div className="flex items-center gap-3 mb-2">
                <div className="text-slate-500 uppercase tracking-widest font-bold" style={{ fontSize: 'min(1.5vmax, 1.5vmin)' }}>
                  Current Lap
                </div>
                {stats.targetLaps > 0 && laps.length > 0 && (
                  <div className="bg-cyan-500/10 text-cyan-400 px-2 py-0.5 rounded-md font-mono font-bold border border-cyan-500/20 shadow-[0_0_10px_rgba(6,182,212,0.1)]" style={{ fontSize: 'min(1.5vmax, 1.5vmin)' }}>
                    {Math.min(stats.count + 1, stats.targetLaps)}<span className="text-cyan-600 mx-0.5">/</span>{stats.targetLaps}
                  </div>
                )}
              </div>
              <div
                ref={currentTimeRef}
                className="font-mono tabular-nums font-bold text-cyan-400 leading-tight drop-shadow-[0_0_15px_rgba(34,211,238,0.3)]"
                style={{ fontSize: 'min(8vmax, 12vmin)' }}
              >
                {formatTime(0)}
              </div>
            </div>
          )
        )}

      </div>
    </div>
  );
}