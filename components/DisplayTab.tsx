import React, { useState, useEffect, useRef } from 'react';
import { Lap } from '../types';
import { X, Play, Pause, Trophy } from 'lucide-react';

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
  lastActivity: number;
}

const formatTime = (ms: number) => {
  if (ms <= 0) return "--.--";
  const seconds = (ms / 1000).toFixed(2);
  return seconds;
};

export default function DisplayTab({ stats, laps, isMonitoring, toggleMonitoring, onExit, lastActivity }: DisplayTabProps) {
  const [currentTime, setCurrentTime] = useState(0);
  const [pulseType, setPulseType] = useState<'none' | 'fast' | 'slow'>('none');
  const lastProcessedLapRef = useRef<number>(0);

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

  useEffect(() => {
    if (!isMonitoring || laps.length === 0 || lastActivity === 0 || stats.isFinished) {
      setCurrentTime(0);
      return;
    }

    let frameId: number;
    const update = () => {
      setCurrentTime(Date.now() - lastActivity);
      frameId = requestAnimationFrame(update);
    };
    update();
    return () => cancelAnimationFrame(frameId);
  }, [isMonitoring, laps.length, lastActivity, stats.isFinished]);

  const getDisplayColor = () => {
    if (stats.count < 1 || stats.last === 0) return 'text-slate-100';
    if (stats.last < stats.average) return 'text-emerald-400 drop-shadow-[0_0_15px_rgba(52,211,153,0.5)]';
    if (stats.last > stats.average) return 'text-rose-400 drop-shadow-[0_0_15px_rgba(251,113,133,0.5)]';
    return 'text-slate-100';
  };

  return (
    <div className="h-full w-full flex items-center justify-center bg-slate-950 overflow-hidden select-none z-50 relative group font-sans">
      
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

      <div className="absolute top-6 right-6 z-[60] flex flex-col gap-4 transition-opacity duration-300 opacity-40 hover:opacity-100">
        <button 
          onClick={onExit} 
          className="p-3.5 bg-slate-800/80 text-slate-400 rounded-full hover:bg-rose-950/50 hover:text-rose-400 backdrop-blur-md shadow-lg border border-slate-700/50 transition-all"
          title="Exit Fullscreen"
        >
          <X size={24} />
        </button>
        
        <button 
          onClick={toggleMonitoring} 
          className={`p-3.5 rounded-full backdrop-blur-md shadow-lg border transition-all ${
             isMonitoring 
               ? 'bg-rose-500/10 text-rose-400 hover:bg-rose-500/20 border-rose-500/30' 
               : 'bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 border-emerald-500/30'
          }`}
          title={isMonitoring ? "Stop Monitoring" : "Start Monitoring"}
        >
          {isMonitoring ? <Pause size={24} /> : <Play size={24} />}
        </button>
      </div>

      <div className="flex flex-col items-center justify-center portrait:rotate-90 transition-transform duration-500 origin-center text-center z-20 relative">
        
        {/* Header Label */}
        <div className="flex flex-col items-center mb-[-2vmax]">
          {stats.isFinished ? (
            <div className="flex items-center gap-3 text-amber-400 animate-bounce mb-4 filter drop-shadow-[0_0_10px_rgba(251,191,36,0.5)]">
              <Trophy size={28} className="fill-current" />
              <span className="uppercase tracking-[0.3em] font-black" style={{ fontSize: 'min(2.5vmax, 2.5vmin)' }}>Session Complete</span>
            </div>
          ) : (
             <h3 
              className="text-slate-500 uppercase tracking-[0.3em] font-bold"
              style={{ fontSize: 'min(3vmax, 3vmin)' }}
            >
              Average
            </h3>
          )}
          {stats.count >= 1 && stats.last > 0 && !stats.isFinished && (
            <div className={`text-[min(1.8vmax,1.8vmin)] font-mono font-bold uppercase tracking-widest mt-1 ${getDisplayColor()}`}>
              {stats.last < stats.average ? '↑ Faster' : stats.last > stats.average ? '↓ Slower' : ''}
            </div>
          )}
        </div>
        
        {/* Main Stat (Average) */}
        <div 
          className={`font-sans tabular-nums font-black leading-none tracking-tighter flex items-baseline justify-center transition-all duration-500 ${stats.isFinished ? 'text-transparent bg-clip-text bg-gradient-to-b from-white to-slate-400 drop-shadow-[0_0_20px_rgba(255,255,255,0.15)]' : getDisplayColor()} ${pulseType !== 'none' ? 'scale-105' : 'scale-100'}`}
          style={{ 
            fontSize: stats.isFinished ? 'min(18vmax, 32vmin)' : 'min(22vmax, 40vmin)', 
          }}
        >
          {formatTime(stats.average)}
          <span className="text-[0.2em] text-slate-600 ml-[0.1em] font-medium opacity-60">s</span>
        </div>

        {/* Secondary Stats Section */}
        {stats.isFinished ? (
          <div className="mt-8 grid grid-cols-2 gap-x-16 gap-y-4 border-t border-slate-800/50 pt-8">
            <div className="flex flex-col items-center group">
              <span className="text-emerald-500 uppercase tracking-[0.2em] font-bold mb-1 opacity-80" style={{ fontSize: 'min(1.5vmax, 1.5vmin)' }}>Fastest</span>
              <div className="font-mono tabular-nums font-bold text-white drop-shadow-[0_0_10px_rgba(16,185,129,0.3)]" style={{ fontSize: 'min(6vmax, 10vmin)' }}>
                {formatTime(stats.fastest)}
                <span className="text-[0.4em] text-slate-600 ml-1 font-medium">s</span>
              </div>
            </div>
            <div className="flex flex-col items-center group">
              <span className="text-rose-500 uppercase tracking-[0.2em] font-bold mb-1 opacity-80" style={{ fontSize: 'min(1.5vmax, 1.5vmin)' }}>Slowest</span>
              <div className="font-mono tabular-nums font-bold text-white drop-shadow-[0_0_10px_rgba(244,63,94,0.3)]" style={{ fontSize: 'min(6vmax, 10vmin)' }}>
                {formatTime(stats.slowest)}
                <span className="text-[0.4em] text-slate-600 ml-1 font-medium">s</span>
              </div>
            </div>
            <div className="col-span-2 text-slate-500 font-mono mt-4 uppercase tracking-widest font-medium" style={{ fontSize: 'min(1.2vmax, 1.2vmin)' }}>
              Completed {stats.count} Laps
            </div>
          </div>
        ) : (
          /* Live Running Timer */
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
               className="font-mono tabular-nums font-bold text-cyan-400 leading-none drop-shadow-[0_0_15px_rgba(34,211,238,0.3)]"
               style={{ fontSize: 'min(8vmax, 12vmin)' }}
             >
               {formatTime(currentTime)}
               <span className="text-[0.4em] text-cyan-800 ml-2 font-medium">s</span>
             </div>
          </div>
        )}

      </div>
    </div>
  );
}