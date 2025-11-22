import React, { useState, useEffect } from 'react';
import { CompositeData, UserSettings, TrackableItem } from '../types';
import { TRACKABLE_ITEMS } from '../constants';
import { Button, Modal } from './UI';

interface HeroSectionProps {
    compositeData: CompositeData;
    streak: number;
    settings: UserSettings;
    onUpdateWeights: (newWeights: any, subjectKey?: string) => void;
    onUpdateCountdown: (target: string, label: string) => void;
}

export const HeroSection: React.FC<HeroSectionProps> = ({ compositeData, streak, settings, onUpdateWeights, onUpdateCountdown }) => {
    const [countdown, setCountdown] = useState<{ d: number; h: number; m: number } | null>(null);
    const [isEditingWeights, setIsEditingWeights] = useState(false);
    const [isEditingCountdown, setIsEditingCountdown] = useState(false);
    
    // Weight Config State
    const [selectedSubject, setSelectedSubject] = useState<string>('global');
    const [tempWeights, setTempWeights] = useState<Record<string, number>>({});
    const [weightTotal, setWeightTotal] = useState(0);

    // Countdown Config State
    const [tempTarget, setTempTarget] = useState(settings.countdownTarget || '2025-12-12T00:00');
    const [tempLabel, setTempLabel] = useState(settings.countdownLabel || 'Time Remaining');

    useEffect(() => {
        const targetDateStr = settings.countdownTarget || '2025-12-12T00:00:00+06:00';
        const target = new Date(targetDateStr);
        
        const interval = setInterval(() => {
            const now = new Date();
            const diff = target.getTime() - now.getTime();
            if (diff < 0) { setCountdown(null); return; }
            setCountdown({
                d: Math.floor(diff / 86400000),
                h: Math.floor((diff % 86400000) / 3600000),
                m: Math.floor((diff % 3600000) / 60000)
            });
        }, 1000);
        return () => clearInterval(interval);
    }, [settings.countdownTarget]);

    // Load weights when modal opens or subject changes
    useEffect(() => {
        if (isEditingWeights) {
            let w: Record<string, number> = {};
            if (selectedSubject === 'global') {
                w = { ...settings.weights };
            } else {
                // Load subject specific weights, or fallback to global
                w = { ...(settings.subjectWeights?.[selectedSubject] || settings.weights) };
            }
            setTempWeights(w);
        }
    }, [isEditingWeights, selectedSubject, settings]);

    // Calculate total
    useEffect(() => {
        const total = Object.values(tempWeights).reduce((a: number, b: number) => a + b, 0);
        setWeightTotal(total);
    }, [tempWeights]);

    const handleWeightChange = (key: string, val: string) => {
        const num = parseInt(val) || 0;
        setTempWeights(prev => ({ ...prev, [key]: Math.min(100, Math.max(0, num)) }));
    };

    const saveWeights = () => {
        if (weightTotal === 100) {
            // If global, we pass undefined as subjectKey (or handle in App)
            // If subject, we pass key
            const key = selectedSubject === 'global' ? undefined : selectedSubject;
            onUpdateWeights(tempWeights, key);
            setIsEditingWeights(false);
        }
    };

    const saveCountdown = () => {
        onUpdateCountdown(tempTarget, tempLabel);
        setIsEditingCountdown(false);
    };

    // Determine which items to show in the config list
    const currentConfigItems: TrackableItem[] = selectedSubject === 'global' 
        ? settings.trackableItems 
        : (settings.subjectConfigs?.[selectedSubject] || settings.trackableItems);

    return (
        <section className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            {/* Weighted Progress Card */}
            <div className="glass-card md:col-span-2 relative overflow-visible group p-6 rounded-2xl">
                <div className="relative z-10">
                    <div className="flex justify-between items-start mb-6">
                        <div>
                            <h2 className="text-xs font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400 mb-1">Weighted Progress</h2>
                            <div className="text-4xl font-black tracking-tight text-slate-800 dark:text-slate-100">{compositeData.composite.toFixed(1)}%</div>
                        </div>
                        <button 
                            onClick={() => setIsEditingWeights(!isEditingWeights)} 
                            className="w-9 h-9 flex items-center justify-center rounded-full bg-slate-100 dark:bg-white/10 text-slate-600 dark:text-slate-300 hover:bg-blue-500 hover:text-white transition-all shadow-sm border border-slate-200 dark:border-white/10 z-20"
                            title="Configure Weights"
                        >
                            {isEditingWeights ? (
                                <span className="text-lg font-bold">✕</span>
                            ) : (
                                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
                                  <path fillRule="evenodd" d="M11.078 2.25c-.917 0-1.699.663-1.85 1.567L9.05 5.389c-.421.077-.815.22-1.18.42L5.922 4.387a1.875 1.875 0 00-2.282.819l-.922 1.597a1.875 1.875 0 00.432 2.385l2.2 1.666a5.025 5.025 0 000 2.292l-2.2 1.666a1.875 1.875 0 00-.432 2.385l.922 1.597a1.875 1.875 0 002.282.818l1.948-1.422c.365.2.759.342 1.18.42l.178 1.572c.15.904.932 1.567 1.85 1.567h1.844c.916 0 1.699-.663 1.85-1.567l.178-1.572c.421-.078.815-.22 1.18-.42l1.948 1.422a1.875 1.875 0 002.282-.818l.922-1.597a1.875 1.875 0 00-.432-2.385l-2.2-1.666a5.025 5.025 0 000-2.292l2.2-1.666a1.875 1.875 0 00.432-2.385l-.922-1.597a1.875 1.875 0 00-2.282-.819l-1.95 1.422a4.987 4.987 0 00-1.178-.42l-.18-1.572a1.875 1.875 0 00-1.85-1.567h-1.844zM12 15.75a3.75 3.75 0 100-7.5 3.75 3.75 0 000 7.5z" clipRule="evenodd" />
                                </svg>
                            )}
                        </button>
                    </div>

                    <div className="w-full h-4 bg-slate-200 dark:bg-black/20 rounded-full overflow-hidden mb-6 border border-slate-300 dark:border-white/10">
                        <div className="h-full bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-600 transition-all duration-1000 relative" style={{ width: `${compositeData.composite}%` }}>
                            <div className="absolute inset-0 bg-white/20 animate-pulse"></div>
                        </div>
                    </div>

                    {isEditingWeights ? (
                        <div className="bg-slate-100 dark:bg-black/20 rounded-xl p-4 border border-slate-200 dark:border-white/10 animate-in slide-in-from-top-2 duration-200">
                            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 gap-2">
                                <div className="flex items-center gap-2">
                                    <span className="text-xs font-bold text-slate-500">Configure:</span>
                                    <select 
                                        value={selectedSubject} 
                                        onChange={(e) => setSelectedSubject(e.target.value)}
                                        className="bg-white dark:bg-white/10 border border-slate-200 dark:border-white/10 rounded px-2 py-1 text-xs font-bold text-slate-800 dark:text-white focus:outline-none"
                                    >
                                        <option value="global">Global Defaults</option>
                                        {Object.entries(settings.syllabus).map(([key, data]) => (
                                            <option key={key} value={key}>{data.name}</option>
                                        ))}
                                    </select>
                                </div>
                                <span className={`text-xs font-bold ${weightTotal === 100 ? "text-emerald-600 dark:text-green-400" : "text-rose-500 dark:text-rose-400"}`}>Total: {weightTotal}%</span>
                            </div>

                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
                                {currentConfigItems.map(item => (
                                    <div key={item.key} className="flex flex-col gap-1">
                                        <label className="text-[10px] text-slate-500 dark:text-slate-400 uppercase truncate" title={item.name}>
                                            {item.name}
                                        </label>
                                        <input 
                                            type="number" 
                                            value={tempWeights[item.key] || 0}
                                            onChange={(e) => handleWeightChange(item.key, e.target.value)}
                                            className="bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded px-2 py-1 text-xs text-slate-800 dark:text-white focus:outline-none focus:border-blue-500"
                                        />
                                    </div>
                                ))}
                            </div>
                            <Button disabled={weightTotal !== 100} onClick={saveWeights} className={`w-full ${weightTotal !== 100 ? 'opacity-50 cursor-not-allowed' : ''}`}>
                                Save for {selectedSubject === 'global' ? 'All' : settings.syllabus[selectedSubject]?.name}
                            </Button>
                        </div>
                    ) : (
                        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3">
                            {(Object.values(compositeData.breakdown) as { name: string; val: number; weight: number; color: string }[]).sort((a,b) => b.weight - a.weight).map(item => {
                                return (
                                    <div key={item.name} className={`flex flex-col bg-slate-50/50 dark:bg-white/5 rounded-xl p-2 border border-slate-200 dark:border-white/5 transition-all ${item.weight === 0 ? 'opacity-40 grayscale' : 'opacity-100'}`}>
                                        <div className="flex justify-between items-end mb-1.5">
                                            <div className="text-[10px] text-slate-500 dark:text-slate-400 font-bold uppercase truncate pr-1" title={item.name}>{item.name}</div>
                                            <div className={`text-[10px] font-mono ${item.weight === 0 ? 'text-slate-400' : 'text-blue-600 dark:text-blue-400 font-bold'}`}>{item.weight}%</div>
                                        </div>
                                        <div className="h-1.5 bg-slate-200 dark:bg-white/10 rounded-full overflow-hidden mb-1">
                                            <div className={`h-full ${item.color}`} style={{ width: `${item.val}%` }}></div>
                                        </div>
                                        <div className="text-right text-[10px] font-bold text-slate-700 dark:text-slate-200">{item.val.toFixed(0)}%</div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            </div>

            {/* Right Column: Streak & Countdown */}
            <div className="flex flex-col gap-4">
                <div className="glass-card flex-1 flex flex-col justify-center items-center bg-gradient-to-br from-orange-500/5 to-red-500/5 border-orange-500/20 rounded-2xl p-4">
                    <div className="text-center">
                        <div className="text-[10px] font-bold text-orange-600 dark:text-orange-400 uppercase tracking-widest mb-2">Current Streak</div>
                        <div className="text-4xl font-black text-orange-500 dark:text-orange-400 flex items-center justify-center gap-2 drop-shadow-sm">
                            <span className="animate-bounce text-3xl">🔥</span> <span>{streak}</span>
                        </div>
                        <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">Consecutive Days</div>
                    </div>
                </div>

                <div className="glass-card flex-1 p-5 flex flex-col justify-center items-center relative overflow-hidden rounded-2xl bg-gradient-to-br from-blue-500/10 via-purple-500/10 to-pink-500/10 border-blue-200 dark:border-white/10 group/timer">
                     <button 
                        onClick={() => setIsEditingCountdown(true)}
                        className="absolute top-2 right-2 opacity-0 group-hover/timer:opacity-100 w-6 h-6 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 text-slate-500 dark:text-slate-300 transition-all"
                        title="Edit Timer"
                    >
                        ⚙️
                     </button>
                     <div className="relative z-10 text-center w-full">
                        <div className="text-[10px] font-bold text-blue-600 dark:text-blue-300 uppercase tracking-widest mb-3 flex items-center justify-center gap-2">
                            <span className="inline-block w-1.5 h-1.5 bg-blue-400 rounded-full animate-ping"></span>
                            {settings.countdownLabel || 'Time Remaining'}
                            <span className="inline-block w-1.5 h-1.5 bg-blue-400 rounded-full animate-ping"></span>
                        </div>
                        <div className="flex justify-center gap-3 relative z-10 w-full">
                            {countdown ? (
                                <>
                                    <CountdownUnit val={countdown.d} label="Days" />
                                    <CountdownUnit val={countdown.h} label="Hrs" />
                                    <CountdownUnit val={countdown.m} label="Mins" />
                                </>
                            ) : (
                                <span className="text-xl font-bold text-rose-500">Target Reached!</span>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {isEditingCountdown && (
                <Modal isOpen={true} onClose={() => setIsEditingCountdown(false)} title="Countdown Settings">
                    <div className="flex flex-col gap-4">
                         <div className="flex flex-col gap-1">
                            <label className="text-xs text-slate-500">Event Name</label>
                            <input 
                                type="text"
                                value={tempLabel}
                                onChange={(e) => setTempLabel(e.target.value)}
                                className="bg-slate-50 dark:bg-black/20 border border-slate-200 dark:border-white/10 rounded-lg p-2 text-sm focus:outline-none focus:border-blue-500 dark:text-white"
                                placeholder="e.g. Final Exam"
                            />
                        </div>
                        <div className="flex flex-col gap-1">
                            <label className="text-xs text-slate-500">Target Date & Time</label>
                            <input 
                                type="datetime-local"
                                value={tempTarget.substring(0, 16)} // Limit to yyyy-MM-ddThh:mm
                                onChange={(e) => setTempTarget(e.target.value)}
                                className="bg-slate-50 dark:bg-black/20 border border-slate-200 dark:border-white/10 rounded-lg p-2 text-sm focus:outline-none focus:border-blue-500 dark:text-white"
                            />
                        </div>
                        <div className="flex justify-end gap-3 mt-2">
                             <Button variant="secondary" onClick={() => setIsEditingCountdown(false)}>Cancel</Button>
                             <Button onClick={saveCountdown}>Save Timer</Button>
                        </div>
                    </div>
                </Modal>
            )}
        </section>
    );
};

const CountdownUnit = ({ val, label }: { val: number; label: string }) => (
    <div className="flex flex-col items-center bg-white/60 dark:bg-white/5 backdrop-blur-md border border-slate-200 dark:border-white/10 rounded-xl px-3 py-2 min-w-[60px] shadow-sm">
        <div className="text-2xl font-black text-transparent bg-clip-text bg-gradient-to-br from-slate-700 to-blue-600 dark:from-slate-100 dark:to-blue-400">{val}</div>
        <div className="text-[9px] mt-1 uppercase font-bold text-slate-500 tracking-wider">{label}</div>
    </div>
);