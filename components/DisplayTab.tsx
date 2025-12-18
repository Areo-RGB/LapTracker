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
        setTimeout(() => setPulseType('none'), 1000);
      } else if (diff >= 0.25) {
        setPulseType('slow');
        setTimeout(() => setPulseType('none'), 1000);
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
    if (stats.count < 1 || stats.last === 0) return 'text-white';
    if (stats.last < stats.average) return 'text-green-400';
    if (stats.last > stats.average) return 'text-red-400';
    return 'text-white';
  };

  return (
    <div className="h-full w-full flex items-center justify-center bg-black overflow-hidden select-none z-50 relative group">
      
      {/* Pulse Overlays */}
      <div className={`absolute inset-0 pointer-events-none transition-opacity duration-300 z-0 ${pulseType === 'fast' ? 'opacity-100' : 'opacity-0'}`}>
        <div className="absolute inset-0 bg-green-500/20 animate-ping opacity-30" />
        <div className="absolute inset-0 bg-gradient-to-t from-green-500/40 via-transparent to-green-500/40" />
      </div>
      <div className={`absolute inset-0 pointer-events-none transition-opacity duration-300 z-0 ${pulseType === 'slow' ? 'opacity-100' : 'opacity-0'}`}>
        <div className="absolute inset-0 bg-red-500/20 animate-pulse" />
        <div className="absolute inset-0 bg-gradient-to-t from-red-500/40 via-transparent to-red-500/40" />
      </div>

      <div className="absolute top-4 right-4 z-[60] flex flex-col gap-4 transition-opacity duration-300 opacity-30 hover:opacity-100">
        <button 
          onClick={onExit} 
          className="p-3 bg-gray-800/80 text-gray-400 rounded-full hover:bg-red-900/50 hover:text-red-400 backdrop-blur-sm shadow-lg border border-gray-700"
          title="Exit Fullscreen"
        >
          <X size={24} />
        </button>
        
        <button 
          onClick={toggleMonitoring} 
          className={`p-3 rounded-full backdrop-blur-sm shadow-lg border border-gray-700 transition-colors ${
             isMonitoring ? 'bg-red-500/20 text-red-400 hover:bg-red-500/30' : 'bg-green-500/20 text-green-400 hover:bg-green-500/30'
          }`}
          title={isMonitoring ? "Stop Monitoring" : "Start Monitoring"}
        >
          {isMonitoring ? <Pause size={24} /> : <Play size={24} />}
        </button>
      </div>

      <div className="flex flex-col items-center justify-center portrait:rotate-90 transition-transform duration-500 origin-center text-center z-10">
        
        {/* Header Label */}
        <div className="flex flex-col items-center mb-[-2vmax]">
          {stats.isFinished ? (
            <div className="flex items-center gap-2 text-yellow-500 animate-bounce mb-2">
              <Trophy size={20} />
              <span className="uppercase tracking-[0.3em] font-black" style={{ fontSize: 'min(2vmax, 2vmin)' }}>Session Complete</span>
            </div>
          ) : (
             <h3 
              className="text-gray-500 uppercase tracking-[0.2em] font-bold opacity-70"
              style={{ fontSize: 'min(3vmax, 3vmin)' }}
            >
              Average
            </h3>
          )}
          {stats.count >= 1 && stats.last > 0 && !stats.isFinished && (
            <div className={`text-[min(1.8vmax,1.8vmin)] font-mono font-bold uppercase tracking-widest mt-0.5 ${getDisplayColor()}`}>
              {stats.last < stats.average ? '↑ Faster' : stats.last > stats.average ? '↓ Slower' : ''}
            </div>
          )}
        </div>
        
        {/* Main Stat (Average) */}
        <div 
          className={`font-sans tabular-nums font-bold leading-none tracking-tighter flex items-baseline justify-center transition-all duration-500 ${stats.isFinished ? 'text-white' : getDisplayColor()} ${pulseType !== 'none' ? 'scale-110' : 'scale-100'}`}
          style={{ 
            fontSize: stats.isFinished ? 'min(18vmax, 32vmin)' : 'min(22vmax, 40vmin)', 
            textShadow: stats.last !== 0 && stats.count >= 1 
              ? `0 0 50px ${stats.last < stats.average ? 'rgba(74, 222, 128, 0.2)' : 'rgba(248, 113, 113, 0.2)'}`
              : '0 0 50px rgba(34, 211, 238, 0.1)' 
          }}
        >
          {formatTime(stats.average)}
          <span className="text-[0.2em] text-gray-600 ml-[0.1em] font-medium">s</span>
        </div>

        {/* Secondary Stats Section */}
        {stats.isFinished ? (
          <div className="mt-8 grid grid-cols-2 gap-x-12 gap-y-2 border-t border-gray-800 pt-6">
            <div className="flex flex-col items-center">
              <span className="text-green-500 uppercase tracking-widest font-bold mb-1" style={{ fontSize: 'min(1.5vmax, 1.5vmin)' }}>Fastest</span>
              <div className="font-mono tabular-nums font-bold text-white" style={{ fontSize: 'min(6vmax, 10vmin)' }}>
                {formatTime(stats.fastest)}
                <span className="text-[0.4em] text-gray-600 ml-1 font-medium">s</span>
              </div>
            </div>
            <div className="flex flex-col items-center">
              <span className="text-red-500 uppercase tracking-widest font-bold mb-1" style={{ fontSize: 'min(1.5vmax, 1.5vmin)' }}>Slowest</span>
              <div className="font-mono tabular-nums font-bold text-white" style={{ fontSize: 'min(6vmax, 10vmin)' }}>
                {formatTime(stats.slowest)}
                <span className="text-[0.4em] text-gray-600 ml-1 font-medium">s</span>
              </div>
            </div>
            <div className="col-span-2 text-gray-500 font-mono mt-4 uppercase tracking-tighter" style={{ fontSize: 'min(1.2vmax, 1.2vmin)' }}>
              Completed {stats.count} Laps
            </div>
          </div>
        ) : (
          /* Live Running Timer */
          <div className="flex flex-col items-center mt-2">
             <div className="flex items-center gap-2 mb-1">
                <div className="text-gray-500 uppercase tracking-widest font-bold" style={{ fontSize: 'min(1.5vmax, 1.5vmin)' }}>
                  Current Lap
                </div>
                {stats.targetLaps > 0 && laps.length > 0 && (
                  <div className="bg-cyan-500/10 text-cyan-500 px-1.5 rounded font-mono font-bold border border-cyan-500/30" style={{ fontSize: 'min(1.5vmax, 1.5vmin)' }}>
                    {Math.min(stats.count + 1, stats.targetLaps)}/{stats.targetLaps}
                  </div>
                )}
             </div>
             <div 
               className="font-mono tabular-nums font-bold text-cyan-400/90 leading-none"
               style={{ fontSize: 'min(8vmax, 12vmin)' }}
             >
               {formatTime(currentTime)}
               <span className="text-[0.4em] text-cyan-900 ml-1 font-medium">s</span>
             </div>
          </div>
        )}

      </div>
    </div>
  );
}