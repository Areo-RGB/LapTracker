import React, { useState } from 'react';
import { AppSettings } from '../types';
import { Sliders, Monitor, BoxSelect, Target, X, Check, Code, ChevronDown, Minus, Plus, RotateCcw } from 'lucide-react';

interface ConfigTabProps {
  settings: AppSettings;
  setSettings: React.Dispatch<React.SetStateAction<AppSettings>>;
  isOpen: boolean;
  onClose: () => void;
}

export default function ConfigTab({ settings, setSettings, isOpen, onClose }: ConfigTabProps) {
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    zoneGeometry: false,
    sensitivity: false,
    sessionTargets: false,
    displayOptions: false,
  });

  if (!isOpen) return null;

  const updateSetting = (key: keyof AppSettings, value: number | boolean) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  };

  const toggleSection = (section: string) => {
    setExpandedSections(prev => ({ ...prev, [section]: !prev[section] }));
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
            <button
              onClick={() => toggleSection('zoneGeometry')}
              className="flex items-center justify-between w-full text-slate-400 hover:text-slate-300 transition-colors"
            >
              <div className="flex items-center gap-2">
                <BoxSelect size={14} />
                <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Zone Geometry</span>
              </div>
              <ChevronDown
                size={16}
                className={`transition-transform duration-200 ${expandedSections.zoneGeometry ? 'rotate-180' : ''}`}
              />
            </button>

            {expandedSections.zoneGeometry && (
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
            )}
          </div>

          {/* Sensitivity & Performance */}
          <div className="space-y-4 border-t border-slate-800/80 pt-6">
            <button
              onClick={() => toggleSection('sensitivity')}
              className="flex items-center justify-between w-full text-slate-400 hover:text-slate-300 transition-colors"
            >
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Sensitivity & Performance</span>
              </div>
              <ChevronDown
                size={16}
                className={`transition-transform duration-200 ${expandedSections.sensitivity ? 'rotate-180' : ''}`}
              />
            </button>

            {expandedSections.sensitivity && (
              <div className="space-y-5">
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
            )}
          </div>

          {/* Session Logic */}
           <div className="space-y-4 border-t border-slate-800/80 pt-6">
            <button
              onClick={() => toggleSection('sessionTargets')}
              className="flex items-center justify-between w-full text-slate-400 hover:text-slate-300 transition-colors"
            >
              <div className="flex items-center gap-2">
                <Target size={14} />
                <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Session Targets</span>
              </div>
              <ChevronDown
                size={16}
                className={`transition-transform duration-200 ${expandedSections.sessionTargets ? 'rotate-180' : ''}`}
              />
            </button>

            {expandedSections.sessionTargets && (
              <div className="space-y-4">
                <div className="flex items-center justify-between gap-4">
                  <label className="text-xs font-mono text-slate-400 whitespace-nowrap">Target Lap Count</label>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => updateSetting('targetLaps', Math.max(0, settings.targetLaps - 1))}
                      className="p-1.5 bg-slate-800 text-slate-400 hover:text-cyan-400 hover:bg-slate-700 border border-slate-700 rounded-lg transition-all active:scale-95"
                      title="Decrease"
                    >
                      <Minus size={14} />
                    </button>
                    <input
                      type="number"
                      min="0"
                      max="999"
                      value={settings.targetLaps}
                      onChange={(e) => updateSetting('targetLaps', Math.max(0, parseInt(e.target.value) || 0))}
                      className="w-20 bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5 text-center text-cyan-400 font-mono text-sm focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500/50 transition-all shadow-sm"
                    />
                    <button
                      onClick={() => updateSetting('targetLaps', Math.min(999, settings.targetLaps + 1))}
                      className="p-1.5 bg-slate-800 text-slate-400 hover:text-cyan-400 hover:bg-slate-700 border border-slate-700 rounded-lg transition-all active:scale-95"
                      title="Increase"
                    >
                      <Plus size={14} />
                    </button>
                  </div>
                </div>

            <div className="space-y-2">
              <label className="text-xs font-mono text-slate-400">Target Duration</label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min="0"
                  max="59"
                  placeholder="MM"
                  value={Math.floor(settings.targetDuration / 60) || ''}
                  onChange={(e) => {
                    const minutes = Math.max(0, Math.min(59, parseInt(e.target.value) || 0));
                    const seconds = settings.targetDuration % 60;
                    updateSetting('targetDuration', minutes * 60 + seconds);
                  }}
                  className="w-16 bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5 text-center text-cyan-400 font-mono text-sm focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500/50 transition-all shadow-sm"
                />
                <span className="text-slate-500 font-mono text-sm">:</span>
                <input
                  type="number"
                  min="0"
                  max="59"
                  placeholder="SS"
                  value={settings.targetDuration % 60 || ''}
                  onChange={(e) => {
                    const seconds = Math.max(0, Math.min(59, parseInt(e.target.value) || 0));
                    const minutes = Math.floor(settings.targetDuration / 60);
                    updateSetting('targetDuration', minutes * 60 + seconds);
                  }}
                  className="w-16 bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5 text-center text-cyan-400 font-mono text-sm focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500/50 transition-all shadow-sm"
                />
                <span className="text-[10px] text-slate-500 font-mono ml-1">min:sec</span>
              </div>
                </div>

                {/* Reset Button */}
                {(settings.targetLaps > 0 || settings.targetDuration > 0) && (
                  <button
                    onClick={() => {
                      updateSetting('targetLaps', 0);
                      updateSetting('targetDuration', 0);
                    }}
                    className="w-full flex items-center justify-center gap-2 py-2 px-4 bg-slate-800 text-slate-400 hover:text-rose-400 hover:bg-slate-700 border border-slate-700 hover:border-rose-500/30 rounded-lg transition-all active:scale-95"
                    title="Reset Targets"
                  >
                    <RotateCcw size={14} />
                    <span className="text-xs font-mono font-medium uppercase tracking-wide">Reset Targets</span>
                  </button>
                )}
              </div>
            )}
          </div>

          <div className="space-y-4 pt-6 border-t border-slate-800/80">
            <button
              onClick={() => toggleSection('displayOptions')}
              className="flex items-center justify-between w-full text-slate-400 hover:text-slate-300 transition-colors"
            >
              <div className="flex items-center gap-2">
                <Monitor size={14} />
                <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Display Options</span>
              </div>
              <ChevronDown
                size={16}
                className={`transition-transform duration-200 ${expandedSections.displayOptions ? 'rotate-180' : ''}`}
              />
            </button>

            {expandedSections.displayOptions && (
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
            )}
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