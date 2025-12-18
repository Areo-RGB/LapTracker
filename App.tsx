import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { Settings, Timer, Activity, Trash2, Play, Pause } from 'lucide-react';
import { Tab, Lap, AppSettings } from './types';
import { DEFAULT_SETTINGS } from './constants';
import MotionEngine from './components/MotionEngine';
import DisplayTab from './components/DisplayTab';
import ConfigTab from './components/ConfigTab';

// Internal Component for the Live Timer Overlay
// Uses direct DOM manipulation for 60fps performance (avoids React re-renders)
const TimerOverlay = ({ isMonitoring, lastActivity, hasLaps }: { isMonitoring: boolean, lastActivity: number, hasLaps: boolean }) => {
  const displayRef = React.useRef<HTMLSpanElement>(null);

  React.useEffect(() => {
    if (!isMonitoring || !hasLaps || lastActivity === 0) {
      if (displayRef.current) displayRef.current.textContent = '0.00';
      return;
    }

    let frameId: number;
    const update = () => {
      if (displayRef.current) {
        displayRef.current.textContent = ((Date.now() - lastActivity) / 1000).toFixed(2);
      }
      frameId = requestAnimationFrame(update);
    };
    update();
    return () => cancelAnimationFrame(frameId);
  }, [isMonitoring, hasLaps, lastActivity]);

  return (
    <div className="absolute top-4 left-4 z-10 flex flex-col gap-2 pointer-events-none">
      <div className={`px-4 py-3 rounded-xl backdrop-blur-md border shadow-2xl transition-all duration-300 ${!isMonitoring
        ? 'bg-slate-900/80 border-slate-700/50'
        : !hasLaps
          ? 'bg-amber-900/40 border-amber-700/30'
          : 'bg-slate-900/80 border-cyan-500/30 shadow-cyan-500/10'
        }`}>
        <div className="flex items-center gap-2.5 mb-1.5">
          <div className={`w-2 h-2 rounded-full shadow-[0_0_8px_currentColor] ${isMonitoring ? 'bg-emerald-400 text-emerald-400 animate-pulse' : 'bg-rose-500 text-rose-500'}`} />
          <span className="text-[10px] uppercase tracking-wider font-bold text-slate-400">
            {!isMonitoring ? 'OFFLINE' : !hasLaps ? 'READY' : 'CURRENT LAP'}
          </span>
        </div>

        <div className="font-mono text-3xl font-bold tabular-nums text-white leading-none tracking-tight drop-shadow-lg">
          <span ref={displayRef}>0.00</span>
          <span className="text-sm text-slate-500 ml-1 font-sans font-medium">s</span>
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
  const [showSettings, setShowSettings] = useState(false);

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
    if (isMonitoring) {
      setIsMonitoring(false);
    } else {
      const completedLaps = laps.filter(l => l.duration > 0).length;
      const isFinished = settings.targetLaps > 0 && completedLaps >= settings.targetLaps;

      setIsMonitoring(true);

      // If starting fresh (no laps or previous session finished), trigger the timer start immediately
      if (laps.length === 0 || isFinished) {
        const now = Date.now();
        setLastActivity(now);
        setLaps([{
          id: crypto.randomUUID(),
          timestamp: now,
          duration: 0
        }]);
      }
    }
  }, [isMonitoring, laps, settings.targetLaps]);

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
    <div className="h-screen w-screen flex flex-col bg-slate-950 text-slate-100 overflow-hidden font-sans selection:bg-cyan-500/30">

      {!isDisplayMode && (
        <header className="flex-none h-16 bg-slate-950/80 backdrop-blur-md border-b border-slate-800 flex items-center justify-between px-6 z-20">
          <div className="flex items-center gap-3">
            <div className="bg-gradient-to-tr from-cyan-500 to-blue-600 p-2 rounded-lg shadow-lg shadow-cyan-500/20">
              <Activity size={20} className="text-white" />
            </div>
            <div>
              <h1 className="font-bold tracking-wide uppercase text-sm md:text-base text-white">LapTrack AI</h1>
              <span className="text-[10px] text-slate-500 font-medium tracking-wider uppercase block -mt-0.5">Motion Timer</span>
            </div>
          </div>
          <div className="flex items-center gap-4">
            {laps.length > 0 && (
              <button
                onClick={resetLaps}
                className="p-2.5 text-rose-400 hover:bg-rose-950/30 hover:text-rose-300 rounded-full transition-all border border-transparent hover:border-rose-900/50"
                title="Reset Laps"
              >
                <Trash2 size={18} />
              </button>
            )}
            <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-mono font-bold border transition-all duration-500 ${isMonitoring ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400 shadow-[0_0_15px_-3px_rgba(16,185,129,0.3)]' : 'border-slate-700 bg-slate-800 text-slate-400'}`}>
              <div className={`w-2 h-2 rounded-full ${isMonitoring ? 'bg-emerald-400 animate-pulse shadow-[0_0_8px_currentColor]' : 'bg-slate-500'}`}></div>
              {isMonitoring ? 'ACTIVE' : 'IDLE'}
            </div>
          </div>
        </header>
      )}

      <main className="flex-1 relative overflow-hidden flex flex-col bg-slate-950">

        <div className={`absolute inset-0 z-0 ${activeTab === Tab.CONFIG ? 'visible' : 'invisible pointer-events-none opacity-0'}`}>
          <MotionEngine
            settings={settings}
            onMotionTriggered={handleMotionTriggered}
            isMonitoring={isMonitoring}
            lastActivityTimestamp={lastActivity}
          />

          {/* Tied to Dev Mode now */}
          {settings.devMode && (
            <TimerOverlay
              isMonitoring={isMonitoring}
              lastActivity={lastActivity}
              hasLaps={laps.length > 0}
            />
          )}

          {/* Controls Layer */}
          <div className="absolute inset-0 z-10 pointer-events-none">
            {/* Settings Button - Top Right */}
            <div className="absolute top-3 right-3 pointer-events-auto">
              <button
                onClick={() => setShowSettings(true)}
                className="p-2.5 bg-black/60 text-slate-400 hover:text-cyan-400 backdrop-blur-sm rounded-xl border border-slate-700/50 hover:border-cyan-500/30 transition-all duration-300 group"
                title="Configure Settings"
              >
                <Settings size={20} className="group-hover:rotate-90 transition-transform duration-500" />
              </button>
            </div>

            {/* Start/Stop Button - Bottom, integrated with nav */}
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 pointer-events-auto">
              <button
                onClick={toggleMonitoring}
                className={`flex items-center gap-2.5 px-6 py-3 rounded-full font-semibold uppercase tracking-wide text-sm shadow-2xl transition-all duration-300 transform active:scale-95 ${isMonitoring
                  ? 'bg-rose-500 text-white shadow-rose-500/30 hover:bg-rose-400'
                  : 'bg-cyan-500 text-white shadow-cyan-500/30 hover:bg-cyan-400'
                  }`}
              >
                {isMonitoring ? <Pause size={20} fill="currentColor" /> : <Play size={20} fill="currentColor" className="ml-0.5" />}
                <span>{isMonitoring ? 'Stop' : 'Start'}</span>
              </button>
            </div>
          </div>

          <ConfigTab
            settings={settings}
            setSettings={setSettings}
            isOpen={showSettings}
            onClose={() => setShowSettings(false)}
          />
        </div>

        {activeTab === Tab.DISPLAY && (
          <div className="absolute inset-0 z-20 bg-slate-950">
            <DisplayTab
              stats={stats}
              laps={laps}
              isMonitoring={isMonitoring}
              toggleMonitoring={toggleMonitoring}
              onExit={handleExitDisplay}
              onReset={resetLaps}
              lastActivity={lastActivity}
              settings={settings}
            />
          </div>
        )}
      </main>

      {!isDisplayMode && (
        <nav className="flex-none h-16 bg-slate-900/50 backdrop-blur-sm border-t border-slate-800/50 flex items-center z-30 px-4 gap-2">
          <button
            onClick={() => setActiveTab(Tab.CONFIG)}
            className={`flex-1 h-12 rounded-xl flex items-center justify-center gap-2 transition-all duration-300 ${activeTab === Tab.CONFIG ? 'bg-slate-800 text-cyan-400' : 'text-slate-500 hover:text-slate-300'}`}
          >
            <Activity size={18} className={activeTab === Tab.CONFIG ? 'drop-shadow-[0_0_6px_rgba(34,211,238,0.5)]' : ''} />
            <span className="text-xs font-semibold uppercase tracking-wide">Monitor</span>
          </button>
          <button
            onClick={handleEnterDisplay}
            className="flex-1 h-12 rounded-xl flex items-center justify-center gap-2 transition-all duration-300 text-slate-500 hover:text-slate-300"
          >
            <Timer size={18} />
            <span className="text-xs font-semibold uppercase tracking-wide">Display</span>
          </button>
        </nav>
      )}

    </div>
  );
}