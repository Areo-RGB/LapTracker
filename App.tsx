import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { Settings, Timer, Activity, Trash2, Camera } from 'lucide-react';
import { Tab, Lap, AppSettings } from './types';
import { DEFAULT_SETTINGS } from './constants';
import MotionEngine from './components/MotionEngine';
import DisplayTab from './components/DisplayTab';
import ConfigTab from './components/ConfigTab';

// Internal Component for the Live Timer Overlay
const TimerOverlay = ({ isMonitoring, lastActivity, hasLaps }: { isMonitoring: boolean, lastActivity: number, hasLaps: boolean }) => {
  const [time, setTime] = useState(0);

  useEffect(() => {
    if (!isMonitoring || !hasLaps || lastActivity === 0) {
       setTime(0);
       return;
    }
    
    let frameId: number;
    const update = () => {
      setTime(Date.now() - lastActivity);
      frameId = requestAnimationFrame(update);
    };
    update();
    return () => cancelAnimationFrame(frameId);
  }, [isMonitoring, hasLaps, lastActivity]);

  return (
    <div className="absolute top-4 left-4 z-10 flex flex-col gap-2 pointer-events-none">
      <div className={`px-3 py-2 rounded-lg backdrop-blur-md border shadow-lg transition-colors duration-300 ${
        !isMonitoring 
          ? 'bg-gray-900/60 border-gray-700' 
          : !hasLaps 
            ? 'bg-yellow-900/40 border-yellow-700/50' 
            : 'bg-black/60 border-cyan-900/50'
      }`}>
        <div className="flex items-center gap-2 mb-1">
          <div className={`w-2 h-2 rounded-full ${isMonitoring ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`} />
          <span className="text-[10px] uppercase tracking-wider font-bold text-gray-400">
            {!isMonitoring ? 'OFFLINE' : !hasLaps ? 'WAITING FOR START' : 'CURRENT LAP'}
          </span>
        </div>
        
        <div className="font-mono text-2xl font-bold tabular-nums text-white leading-none">
          {(time / 1000).toFixed(2)}
          <span className="text-sm text-gray-500 ml-1">s</span>
        </div>
      </div>
    </div>
  );
};

export default function App() {
  const [activeTab, setActiveTab] = useState<Tab>(Tab.CONFIG);
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
  const [laps, setLaps] = useState<Lap[]>([]);
  const [isMonitoring, setIsMonitoring] = useState(false);
  const [lastActivity, setLastActivity] = useState<number>(0);

  // Core logic to record a lap
  const handleMotionTriggered = useCallback((timestamp: number) => {
    setLastActivity(timestamp);
    setLaps((prevLaps) => {
      const lastLap = prevLaps[prevLaps.length - 1];
      let duration = 0;
      
      if (lastLap) {
        duration = timestamp - lastLap.timestamp;
      }

      const newLap: Lap = {
        id: crypto.randomUUID(),
        timestamp,
        duration,
      };

      const nextLaps = [...prevLaps, newLap];
      const completedLaps = nextLaps.filter(l => l.duration > 0).length;

      // Check if target reached
      if (settings.targetLaps > 0 && completedLaps >= settings.targetLaps) {
        setIsMonitoring(false);
      }

      return nextLaps;
    });
  }, [settings.targetLaps]);

  const resetLaps = useCallback(() => {
    setLaps([]);
    setLastActivity(0);
  }, []);

  const toggleMonitoring = useCallback(() => {
    // If we're starting fresh from a finished session, reset
    const completedLaps = laps.filter(l => l.duration > 0).length;
    if (!isMonitoring && settings.targetLaps > 0 && completedLaps >= settings.targetLaps) {
      resetLaps();
    }
    setIsMonitoring(prev => !prev);
  }, [isMonitoring, laps, settings.targetLaps, resetLaps]);

  const handleEnterDisplay = useCallback(() => {
    setActiveTab(Tab.DISPLAY);
    document.documentElement.requestFullscreen().catch((e) => {
      console.warn("Fullscreen request failed:", e);
    });
  }, []);

  const handleExitDisplay = useCallback(() => {
    setActiveTab(Tab.CONFIG);
    if (document.fullscreenElement) {
      document.exitFullscreen().catch((e) => {
        console.warn("Exit fullscreen failed:", e);
      });
    }
  }, []);

  // Compute stats for the display
  const stats = useMemo(() => {
    const validLaps = laps.filter(l => l.duration > 0);
    const count = validLaps.length;

    if (count === 0) return { average: 0, count: 0, last: 0, fastest: 0, slowest: 0, isFinished: false, targetLaps: settings.targetLaps };
    
    const durations = validLaps.map(l => l.duration);
    const totalTime = durations.reduce((acc, curr) => acc + curr, 0);
    const average = totalTime / count;
    const last = durations[durations.length - 1];
    const fastest = Math.min(...durations);
    const slowest = Math.max(...durations);
    const isFinished = settings.targetLaps > 0 && count >= settings.targetLaps;

    return { average, count, last, fastest, slowest, isFinished, targetLaps: settings.targetLaps };
  }, [laps, settings.targetLaps]);

  const isDisplayMode = activeTab === Tab.DISPLAY;

  return (
    <div className="h-screen w-screen flex flex-col bg-gray-950 text-white overflow-hidden font-sans">
      
      {!isDisplayMode && (
        <header className="flex-none h-14 bg-gray-900 border-b border-gray-800 flex items-center justify-between px-4 z-20">
          <div className="flex items-center gap-2 text-cyan-400">
            <Activity size={20} />
            <h1 className="font-bold tracking-wider uppercase text-sm md:text-base">LapTrack AI</h1>
          </div>
          <div className="flex items-center gap-3">
            {laps.length > 0 && (
               <button 
               onClick={resetLaps}
               className="p-2 text-red-400 hover:bg-red-900/20 rounded-full transition-colors"
               title="Reset Laps"
             >
               <Trash2 size={18} />
             </button>
            )}
            <div className={`flex items-center gap-2 px-3 py-1 rounded-full text-xs font-mono border ${isMonitoring ? 'border-green-500/50 bg-green-500/10 text-green-400' : 'border-gray-700 bg-gray-800 text-gray-400'}`}>
              <div className={`w-2 h-2 rounded-full ${isMonitoring ? 'bg-green-500 animate-pulse' : 'bg-gray-500'}`}></div>
              {isMonitoring ? 'ACTIVE' : 'IDLE'}
            </div>
          </div>
        </header>
      )}

      <main className="flex-1 relative overflow-hidden flex flex-col">
        <div className={`absolute inset-0 z-0 ${activeTab === Tab.CONFIG ? 'visible' : 'invisible pointer-events-none opacity-0'}`}>
           <MotionEngine 
            settings={settings}
            onMotionTriggered={handleMotionTriggered}
            isMonitoring={isMonitoring}
            lastActivityTimestamp={lastActivity}
           />
           
           {settings.showTimerOverlay && (
             <TimerOverlay 
               isMonitoring={isMonitoring} 
               lastActivity={lastActivity}
               hasLaps={laps.length > 0} 
             />
           )}

           <div className="absolute inset-0 z-10 pointer-events-none">
             <ConfigTab 
               settings={settings} 
               setSettings={setSettings} 
               isMonitoring={isMonitoring} 
               toggleMonitoring={toggleMonitoring}
               resetLaps={resetLaps}
             />
           </div>
        </div>

        {activeTab === Tab.DISPLAY && (
          <div className="absolute inset-0 z-20 bg-gray-950">
            <DisplayTab 
              stats={stats} 
              laps={laps} 
              isMonitoring={isMonitoring} 
              toggleMonitoring={toggleMonitoring}
              onExit={handleExitDisplay}
              lastActivity={lastActivity}
            />
          </div>
        )}
      </main>

      {!isDisplayMode && (
        <nav className="flex-none h-16 bg-gray-900 border-t border-gray-800 flex items-stretch z-30">
          <button
            onClick={() => setActiveTab(Tab.CONFIG)}
            className={`flex-1 flex flex-col items-center justify-center gap-1 transition-colors ${activeTab === Tab.CONFIG ? 'text-cyan-400 bg-gray-800/50' : 'text-gray-500 hover:text-gray-300'}`}
          >
            <Settings size={20} />
            <span className="text-[10px] font-bold uppercase tracking-wider">Config</span>
          </button>
          <button
            onClick={handleEnterDisplay}
            className={`flex-1 flex flex-col items-center justify-center gap-1 transition-colors text-gray-500 hover:text-gray-300`}
          >
            <Timer size={20} />
            <span className="text-[10px] font-bold uppercase tracking-wider">Display</span>
          </button>
        </nav>
      )}

    </div>
  );
}