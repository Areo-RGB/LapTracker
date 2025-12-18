import React, { useState, useRef, useEffect } from 'react';
import { AppSettings } from '../types';
import { Play, Pause, Sliders, Monitor, Trash2, BoxSelect, GripHorizontal, Target } from 'lucide-react';

interface ConfigTabProps {
  settings: AppSettings;
  setSettings: React.Dispatch<React.SetStateAction<AppSettings>>;
  isMonitoring: boolean;
  toggleMonitoring: () => void;
  resetLaps: () => void;
}

export default function ConfigTab({ settings, setSettings, isMonitoring, toggleMonitoring, resetLaps }: ConfigTabProps) {
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const dragStartPos = useRef({ x: 0, y: 0 });
  const panelRef = useRef<HTMLDivElement>(null);

  const updateSetting = (key: keyof AppSettings, value: number | boolean) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  };

  // Dragging Logic
  const handlePointerDown = (e: React.PointerEvent) => {
    const target = e.target as HTMLElement;
    if (target.closest('.drag-handle')) {
      setIsDragging(true);
      dragStartPos.current = {
        x: e.clientX - position.x,
        y: e.clientY - position.y
      };
      (e.target as HTMLElement).setPointerCapture(e.pointerId);
    }
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDragging) return;
    const newX = e.clientX - dragStartPos.current.x;
    const newY = e.clientY - dragStartPos.current.y;
    setPosition({ x: newX, y: newY });
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    setIsDragging(false);
    (e.target as HTMLElement).releasePointerCapture(e.pointerId);
  };

  return (
    <div className="w-full h-full pointer-events-none relative flex items-center justify-center overflow-hidden">
      
      <div 
        ref={panelRef}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        style={{ 
          transform: `translate(${position.x}px, ${position.y}px)`,
          touchAction: 'none'
        }}
        className={`bg-slate-900/90 backdrop-blur-xl rounded-3xl border border-slate-700/50 shadow-2xl max-w-md w-full pointer-events-auto transition-all duration-200 ${isDragging ? 'shadow-cyan-500/10 cursor-grabbing scale-[1.01]' : 'shadow-black/50'}`}
      >
        
        <div className="drag-handle w-full flex flex-col items-center pt-3 pb-2 cursor-grab active:cursor-grabbing border-b border-slate-800">
          <div className="w-12 h-1 bg-slate-700 rounded-full mb-3" />
          <div className="flex items-center gap-2.5 text-cyan-400 px-6 pb-2 w-full">
            <Sliders size={18} className="drop-shadow-[0_0_8px_rgba(34,211,238,0.5)]" />
            <h2 className="text-xs font-bold uppercase tracking-widest flex-1 text-slate-200">Detection Settings</h2>
            <div className={`w-2 h-2 rounded-full shadow-[0_0_8px_currentColor] ${isMonitoring ? 'bg-emerald-400 text-emerald-400 animate-pulse' : 'bg-rose-500 text-rose-500'}`} />
          </div>
        </div>

        <div className="p-6 space-y-6 max-h-[70vh] overflow-y-auto no-scrollbar">
          {/* Zone Geometry Group */}
          <div className="space-y-4 p-5 bg-slate-950/40 rounded-2xl border border-slate-800/50 shadow-inner">
            <div className="flex items-center gap-2 text-slate-400 mb-2">
              <BoxSelect size={14} />
              <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Zone Geometry</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-5">
              {[
                { label: 'Horiz Pos', key: 'tripwireX', max: 100 },
                { label: 'Vert Pos', key: 'tripwireY', max: 100 },
                { label: 'Width', key: 'detectionWidth', max: 50, min: 1 },
                { label: 'Height', key: 'detectionHeight', max: 100, min: 1 },
              ].map((item) => (
                <div className="space-y-2.5" key={item.key}>
                  <div className="flex justify-between text-[10px] font-mono font-medium text-slate-400">
                    <span>{item.label}</span>
                    <span className="text-cyan-400/80">{settings[item.key as keyof AppSettings]}%</span>
                  </div>
                  <input
                    type="range" min={item.min || 0} max={item.max} step="1" 
                    value={settings[item.key as keyof AppSettings] as number}
                    onChange={(e) => updateSetting(item.key as keyof AppSettings, parseInt(e.target.value))}
                    className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-cyan-400 hover:accent-cyan-300 transition-colors"
                  />
                </div>
              ))}
            </div>
          </div>

          {/* Session Logic */}
          <div className="p-5 bg-slate-950/40 rounded-2xl border border-slate-800/50 shadow-inner space-y-4">
             <div className="flex items-center gap-2 text-slate-400 mb-1">
              <Target size={14} />
              <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Session Config</span>
            </div>
            
            <div className="flex items-center justify-between gap-4">
              <label className="text-xs font-mono text-slate-400 whitespace-nowrap">Target Laps (0=∞)</label>
              <input 
                type="number"
                min="0"
                max="999"
                value={settings.targetLaps}
                onChange={(e) => updateSetting('targetLaps', Math.max(0, parseInt(e.target.value) || 0))}
                className="w-20 bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-right text-cyan-400 font-mono text-sm focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500/50 transition-all shadow-sm"
              />
            </div>
          </div>

          {/* Sensitivity & Performance */}
          <div className="space-y-5 px-1">
            <div className="space-y-2.5">
              <div className="flex justify-between text-xs font-mono text-slate-400">
                <span>Sensitivity</span>
                <span className="text-cyan-400/80">{settings.sensitivity}%</span>
              </div>
              <input
                type="range" min="1" max="100" step="1" value={settings.sensitivity}
                onChange={(e) => updateSetting('sensitivity', parseInt(e.target.value))}
                className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-cyan-400 hover:accent-cyan-300"
              />
            </div>
            <div className="space-y-2.5">
              <div className="flex justify-between text-xs font-mono text-slate-400">
                <span>Cooldown</span>
                <span className="text-cyan-400/80">{settings.cooldown}ms</span>
              </div>
              <input
                type="range" min="100" max="5000" step="100" value={settings.cooldown}
                onChange={(e) => updateSetting('cooldown', parseInt(e.target.value))}
                className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-cyan-400 hover:accent-cyan-300"
              />
            </div>
          </div>

          <div className="space-y-3 pt-4 border-t border-slate-800/80">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-slate-400">
                <Monitor size={16} />
                <span className="text-xs font-mono">Timer Overlay</span>
              </div>
              <button
                onClick={() => updateSetting('showTimerOverlay', !settings.showTimerOverlay)}
                className={`w-12 h-7 flex items-center rounded-full p-1 transition-all duration-300 ${
                  settings.showTimerOverlay ? 'bg-cyan-500/90 shadow-[0_0_10px_rgba(6,182,212,0.4)]' : 'bg-slate-800 border border-slate-700'
                }`}
              >
                <div className={`bg-white w-5 h-5 rounded-full shadow-sm transform transition-transform duration-300 ${settings.showTimerOverlay ? 'translate-x-5' : 'translate-x-0'}`} />
              </button>
            </div>
            <div className="flex items-center justify-between border-t border-slate-800/80 pt-4">
              <div className="flex items-center gap-2 text-slate-400">
                  <Trash2 size={16} />
                  <span className="text-xs font-mono">Lap History</span>
              </div>
              <button
                  onClick={resetLaps}
                  className="px-5 py-2 bg-slate-800 hover:bg-rose-950/40 text-slate-300 hover:text-rose-400 border border-slate-700 hover:border-rose-900/60 rounded-xl text-xs font-bold transition-all uppercase hover:shadow-lg hover:shadow-rose-900/10"
              >
                  Reset
              </button>
            </div>
          </div>

          <button
            onClick={toggleMonitoring}
            className={`w-full py-4 rounded-xl font-bold uppercase tracking-wider flex items-center justify-center gap-3 transition-all duration-300 shadow-lg ${
              isMonitoring 
                ? 'bg-rose-500/10 text-rose-400 hover:bg-rose-500/20 border border-rose-500/50 shadow-rose-900/10' 
                : 'bg-gradient-to-r from-cyan-500 to-blue-600 text-white hover:from-cyan-400 hover:to-blue-500 border border-cyan-400/20 shadow-cyan-500/20'
            }`}
          >
            {isMonitoring ? (
              <>
                <Pause size={20} className="fill-current" /> Stop Detection
              </>
            ) : (
              <>
                <Play size={20} className="fill-current" /> Start Detection
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}