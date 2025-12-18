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
        className={`bg-gray-900/90 backdrop-blur-md rounded-2xl border border-gray-700 shadow-2xl max-w-md w-full pointer-events-auto transition-shadow duration-200 ${isDragging ? 'shadow-cyan-500/10 cursor-grabbing' : 'shadow-black/50'}`}
      >
        
        <div className="drag-handle w-full flex flex-col items-center pt-2 pb-1 cursor-grab active:cursor-grabbing border-b border-gray-800/50">
          <GripHorizontal className="text-gray-600 mb-1" size={20} />
          <div className="flex items-center gap-2 text-cyan-400 px-6 pb-2 w-full">
            <Sliders size={16} />
            <h2 className="text-[10px] font-bold uppercase tracking-widest flex-1">Detection Settings</h2>
            <div className={`w-1.5 h-1.5 rounded-full ${isMonitoring ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`} />
          </div>
        </div>

        <div className="p-6 space-y-5 max-h-[70vh] overflow-y-auto no-scrollbar">
          {/* Zone Geometry Group */}
          <div className="space-y-4 p-4 bg-gray-800/40 rounded-xl border border-gray-700/50">
            <div className="flex items-center gap-2 text-gray-400 mb-1">
              <BoxSelect size={14} />
              <span className="text-[10px] font-bold uppercase tracking-widest text-gray-500">Zone Geometry</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
              <div className="space-y-2">
                <div className="flex justify-between text-[10px] font-mono text-gray-500">
                  <span>Horiz Pos</span>
                  <span>{settings.tripwireX}%</span>
                </div>
                <input
                  type="range" min="0" max="100" step="1" value={settings.tripwireX}
                  onChange={(e) => updateSetting('tripwireX', parseInt(e.target.value))}
                  className="w-full h-1.5 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-cyan-400"
                />
              </div>
              <div className="space-y-2">
                <div className="flex justify-between text-[10px] font-mono text-gray-500">
                  <span>Vert Pos</span>
                  <span>{settings.tripwireY}%</span>
                </div>
                <input
                  type="range" min="0" max="100" step="1" value={settings.tripwireY}
                  onChange={(e) => updateSetting('tripwireY', parseInt(e.target.value))}
                  className="w-full h-1.5 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-cyan-400"
                />
              </div>
              <div className="space-y-2">
                <div className="flex justify-between text-[10px] font-mono text-gray-500">
                  <span>Width</span>
                  <span>{settings.detectionWidth}%</span>
                </div>
                <input
                  type="range" min="1" max="50" step="1" value={settings.detectionWidth}
                  onChange={(e) => updateSetting('detectionWidth', parseInt(e.target.value))}
                  className="w-full h-1.5 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-cyan-400"
                />
              </div>
              <div className="space-y-2">
                <div className="flex justify-between text-[10px] font-mono text-gray-500">
                  <span>Height</span>
                  <span>{settings.detectionHeight}%</span>
                </div>
                <input
                  type="range" min="1" max="100" step="1" value={settings.detectionHeight}
                  onChange={(e) => updateSetting('detectionHeight', parseInt(e.target.value))}
                  className="w-full h-1.5 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-cyan-400"
                />
              </div>
            </div>
          </div>

          {/* Session Logic */}
          <div className="p-4 bg-gray-800/40 rounded-xl border border-gray-700/50 space-y-4">
             <div className="flex items-center gap-2 text-gray-400 mb-1">
              <Target size={14} />
              <span className="text-[10px] font-bold uppercase tracking-widest text-gray-500">Session Config</span>
            </div>
            
            <div className="flex items-center justify-between gap-4">
              <label className="text-xs font-mono text-gray-400 whitespace-nowrap">Target Laps (0=∞)</label>
              <input 
                type="number"
                min="0"
                max="999"
                value={settings.targetLaps}
                onChange={(e) => updateSetting('targetLaps', Math.max(0, parseInt(e.target.value) || 0))}
                className="w-20 bg-gray-900 border border-gray-700 rounded px-2 py-1 text-right text-cyan-400 font-mono text-sm focus:outline-none focus:border-cyan-500"
              />
            </div>
          </div>

          {/* Sensitivity & Performance */}
          <div className="space-y-4">
            <div className="space-y-2">
              <div className="flex justify-between text-xs font-mono text-gray-400">
                <span>Sensitivity</span>
                <span>{settings.sensitivity}%</span>
              </div>
              <input
                type="range" min="1" max="100" step="1" value={settings.sensitivity}
                onChange={(e) => updateSetting('sensitivity', parseInt(e.target.value))}
                className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-cyan-400"
              />
            </div>
            <div className="space-y-2">
              <div className="flex justify-between text-xs font-mono text-gray-400">
                <span>Cooldown (ms)</span>
                <span>{settings.cooldown}ms</span>
              </div>
              <input
                type="range" min="100" max="5000" step="100" value={settings.cooldown}
                onChange={(e) => updateSetting('cooldown', parseInt(e.target.value))}
                className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-cyan-400"
              />
            </div>
          </div>

          <div className="space-y-3 pt-2 border-t border-gray-800">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-gray-400">
                <Monitor size={16} />
                <span className="text-xs font-mono">Timer Overlay</span>
              </div>
              <button
                onClick={() => updateSetting('showTimerOverlay', !settings.showTimerOverlay)}
                className={`w-11 h-6 flex items-center rounded-full p-1 transition-colors duration-300 ${
                  settings.showTimerOverlay ? 'bg-cyan-500/80' : 'bg-gray-700'
                }`}
              >
                <div className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform duration-300 ${settings.showTimerOverlay ? 'translate-x-5' : 'translate-x-0'}`} />
              </button>
            </div>
            <div className="flex items-center justify-between border-t border-gray-800 pt-3">
              <div className="flex items-center gap-2 text-gray-400">
                  <Trash2 size={16} />
                  <span className="text-xs font-mono">Lap History</span>
              </div>
              <button
                  onClick={resetLaps}
                  className="px-4 py-1.5 bg-gray-800 hover:bg-red-900/30 text-gray-300 hover:text-red-400 border border-gray-700 hover:border-red-900/50 rounded-lg text-xs font-bold transition-all uppercase"
              >
                  Reset
              </button>
            </div>
          </div>

          <button
            onClick={toggleMonitoring}
            className={`w-full py-4 rounded-xl font-bold uppercase tracking-wider flex items-center justify-center gap-3 transition-all ${
              isMonitoring 
                ? 'bg-red-500/20 text-red-400 hover:bg-red-500/30 border border-red-500/50' 
                : 'bg-cyan-500 text-black hover:bg-cyan-400 border border-cyan-400'
            }`}
          >
            {isMonitoring ? (
              <>
                <Pause size={20} fill="currentColor" /> Stop Detection
              </>
            ) : (
              <>
                <Play size={20} fill="currentColor" /> Start Detection
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}