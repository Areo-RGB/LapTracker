import React from 'react';
import { AppSettings } from '../types';
import { Sliders, Monitor, BoxSelect, Target, X, Check, Code } from 'lucide-react';

interface ConfigTabProps {
  settings: AppSettings;
  setSettings: React.Dispatch<React.SetStateAction<AppSettings>>;
  isOpen: boolean;
  onClose: () => void;
}

export default function ConfigTab({ settings, setSettings, isOpen, onClose }: ConfigTabProps) {
  if (!isOpen) return null;

  const updateSetting = (key: keyof AppSettings, value: number | boolean) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-6 animate-in fade-in duration-200">
      <div className="bg-slate-900/95 border border-slate-700 shadow-2xl rounded-3xl w-full max-w-sm overflow-hidden flex flex-col max-h-[85vh]">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-900/50">
          <div className="flex items-center gap-2 text-cyan-400">
            <Sliders size={20} className="drop-shadow-[0_0_8px_rgba(34,211,238,0.5)]" />
            <h2 className="font-bold uppercase tracking-wider text-sm text-slate-200">Settings</h2>
          </div>
          <button 
            onClick={onClose}
            className="p-2 -mr-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-full transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-8 overflow-y-auto no-scrollbar">
          
          {/* Zone Geometry Group */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-slate-400 mb-2">
              <BoxSelect size={14} />
              <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Zone Geometry</span>
            </div>

            <div className="grid grid-cols-1 gap-5">
              {[
                { label: 'Horizontal Position', key: 'tripwireX', max: 100 },
                { label: 'Vertical Position', key: 'tripwireY', max: 100 },
                { label: 'Detection Width', key: 'detectionWidth', max: 50, min: 1 },
                { label: 'Detection Height', key: 'detectionHeight', max: 100, min: 1 },
              ].map((item) => (
                <div className="space-y-2.5" key={item.key}>
                  <div className="flex justify-between text-[11px] font-mono font-medium text-slate-400">
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

          {/* Sensitivity & Performance */}
          <div className="space-y-5 border-t border-slate-800/80 pt-6">
            <div className="space-y-2.5">
              <div className="flex justify-between text-[11px] font-mono font-medium text-slate-400">
                <span>Motion Sensitivity</span>
                <span className="text-cyan-400/80">{settings.sensitivity}%</span>
              </div>
              <input
                type="range" min="1" max="100" step="1" value={settings.sensitivity}
                onChange={(e) => updateSetting('sensitivity', parseInt(e.target.value))}
                className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-cyan-400 hover:accent-cyan-300"
              />
            </div>
            <div className="space-y-2.5">
              <div className="flex justify-between text-[11px] font-mono font-medium text-slate-400">
                <span>Trigger Cooldown</span>
                <span className="text-cyan-400/80">{settings.cooldown}ms</span>
              </div>
              <input
                type="range" min="100" max="5000" step="100" value={settings.cooldown}
                onChange={(e) => updateSetting('cooldown', parseInt(e.target.value))}
                className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-cyan-400 hover:accent-cyan-300"
              />
            </div>
          </div>

          {/* Session Logic */}
           <div className="space-y-4 border-t border-slate-800/80 pt-6">
             <div className="flex items-center gap-2 text-slate-400 mb-1">
              <Target size={14} />
              <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Session Targets</span>
            </div>
            
            <div className="flex items-center justify-between gap-4">
              <label className="text-xs font-mono text-slate-400 whitespace-nowrap">Target Lap Count</label>
              <input 
                type="number"
                min="0"
                max="999"
                value={settings.targetLaps}
                onChange={(e) => updateSetting('targetLaps', Math.max(0, parseInt(e.target.value) || 0))}
                className="w-20 bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5 text-right text-cyan-400 font-mono text-sm focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500/50 transition-all shadow-sm"
              />
            </div>
          </div>

          <div className="space-y-4 pt-6 border-t border-slate-800/80">
            <div className="flex items-center gap-2 text-slate-400 mb-1">
              <Monitor size={14} />
              <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Display Options</span>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs font-mono text-slate-400">
                  <Code size={14} />
                  <span>Developer Mode (FPS + Overlay)</span>
                </div>
                <button
                  onClick={() => updateSetting('devMode', !settings.devMode)}
                  className={`w-12 h-7 flex items-center rounded-full p-1 transition-all duration-300 ${
                    settings.devMode ? 'bg-cyan-500/90 shadow-[0_0_10px_rgba(6,182,212,0.4)]' : 'bg-slate-800 border border-slate-700'
                  }`}
                >
                  <div className={`bg-white w-5 h-5 rounded-full shadow-sm transform transition-transform duration-300 ${settings.devMode ? 'translate-x-5' : 'translate-x-0'}`} />
                </button>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-xs font-mono text-slate-400">Big Screen: Live Lap</span>
                <button
                  onClick={() => updateSetting('showCurrentLapDisplay', !settings.showCurrentLapDisplay)}
                  className={`w-12 h-7 flex items-center rounded-full p-1 transition-all duration-300 ${
                    settings.showCurrentLapDisplay ? 'bg-cyan-500/90 shadow-[0_0_10px_rgba(6,182,212,0.4)]' : 'bg-slate-800 border border-slate-700'
                  }`}
                >
                  <div className={`bg-white w-5 h-5 rounded-full shadow-sm transform transition-transform duration-300 ${settings.showCurrentLapDisplay ? 'translate-x-5' : 'translate-x-0'}`} />
                </button>
              </div>
            </div>
          </div>

        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-800 bg-slate-900/50">
          <button 
            onClick={onClose}
            className="w-full py-3 bg-cyan-600 hover:bg-cyan-500 active:bg-cyan-700 text-white font-bold rounded-xl transition-colors flex items-center justify-center gap-2 uppercase tracking-wider text-sm shadow-lg shadow-cyan-900/20"
          >
            <Check size={18} /> Done
          </button>
        </div>
      </div>
    </div>
  );
}