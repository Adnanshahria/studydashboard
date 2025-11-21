import React, { useState } from 'react';
import { calculateProgress } from '../utils/calculations';
import { UserData, UserSettings, ProgressBarConfig, TrackableItem } from '../types';
import { Modal, ProgressBar, Button } from './UI';

interface SidebarProps {
    activeSubject: string;
    onChangeSubject: (key: string) => void;
    userData: UserData;
    settings: UserSettings;
    onUpdateSettings: (s: UserSettings) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ activeSubject, onChangeSubject, userData, settings, onUpdateSettings }) => {
    const [showPerfConfig, setShowPerfConfig] = useState(false);
    const [showSubjectConfig, setShowSubjectConfig] = useState(false);
    const [renameModal, setRenameModal] = useState<{isOpen: boolean, key: string, currentName: string} | null>(null);
    const [addSubjectModal, setAddSubjectModal] = useState(false);
    const [isEditingSubjects, setIsEditingSubjects] = useState(false);

    const getDisplayName = (key: string, defaultName: string) => {
        return settings.customNames?.[key] || defaultName;
    };

    const handlePerfConfigSave = (newConfigs: ProgressBarConfig[]) => {
        onUpdateSettings({ ...settings, progressBars: newConfigs });
        setShowPerfConfig(false);
    };

    const handleSubjectConfigSave = (newItems: string[], newWeights: Record<string, number>) => {
        onUpdateSettings({ 
            ...settings, 
            subjectProgressItems: newItems,
            subjectProgressWeights: newWeights 
        });
        setShowSubjectConfig(false);
    };
    
    const deleteSubject = (key: string) => {
        if (confirm(`Delete ${settings.syllabus[key].name}? All progress data for this subject will be lost.`)) {
            const newSyllabus = { ...settings.syllabus };
            delete newSyllabus[key];
            
            if (activeSubject === key) {
                const remaining = Object.keys(newSyllabus);
                if (remaining.length > 0) onChangeSubject(remaining[0]);
            }
            
            onUpdateSettings({ ...settings, syllabus: newSyllabus });
        }
    };

    const subjectItemsToCalculate = settings.subjectProgressItems || settings.trackableItems.map(t => t.key);
    const subjectWeights = settings.subjectProgressWeights;

    return (
        <aside className="flex flex-col gap-6">
            <div className="glass-card p-5 rounded-2xl">
                <div className="flex justify-between items-center mb-4">
                    <h3 className="font-bold text-xs text-slate-500 dark:text-slate-400 uppercase tracking-wider flex items-center gap-2">
                        <span className="w-1 h-4 bg-blue-500 rounded-full"></span> Select Subject
                    </h3>
                    <div className="flex gap-2">
                         <button 
                            onClick={() => setIsEditingSubjects(!isEditingSubjects)}
                            className={`w-6 h-6 flex items-center justify-center rounded transition-colors ${isEditingSubjects ? 'bg-blue-500 text-white' : 'text-slate-400 hover:bg-slate-100 dark:hover:bg-white/5'}`}
                            title="Edit Subjects"
                        >
                            ✏️
                        </button>
                         <button 
                            onClick={() => setAddSubjectModal(true)}
                            className="w-6 h-6 flex items-center justify-center rounded bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500 hover:text-white transition-colors"
                            title="Add New Subject"
                        >
                            +
                        </button>
                        <button 
                            onClick={() => setShowSubjectConfig(true)} 
                            className="text-slate-400 hover:text-blue-600 dark:hover:text-white transition-colors p-1 rounded hover:bg-slate-100 dark:hover:bg-white/5"
                            title="Configure Calculation"
                        >
                             <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4"><path fillRule="evenodd" d="M7.84 1.804A1 1 0 018.82 1h2.36a1 1 0 01.98.804l.331 1.652a6.993 6.993 0 011.929 1.115l1.598-.54a1 1 0 011.186.447l1.18 2.044a1 1 0 01-.205 1.251l-1.267 1.113a7.047 7.047 0 010 2.228l1.267 1.113a1 1 0 01.206 1.25l-1.18 2.045a1 1 0 01-1.187.447l-1.598-.54a6.993 6.993 0 01-1.929 1.115l-.33 1.652a1 1 0 01-.98.804H8.82a1 1 0 01-.98-.804l-.331-1.652a6.993 6.993 0 01-1.929-1.115l-1.598.54a1 1 0 01-1.186-.447l-1.18-2.044a1 1 0 01.205-1.251l1.267-1.114a7.05 7.05 0 010-2.227L1.821 7.773a1 1 0 01-.206-1.25l1.18-2.045a1 1 0 011.187-.447l1.598.54A6.993 6.993 0 017.51 3.456l.33-1.652zM10 13a3 3 0 100-6 3 3 0 000 6z" clipRule="evenodd" /></svg>
                        </button>
                    </div>
                </div>
                <div className="flex flex-col gap-3 max-h-[400px] overflow-y-auto custom-scrollbar pr-1">
                    {Object.entries(settings.syllabus).map(([key, data]) => {
                        const isActive = activeSubject === key;
                        const progress = calculateProgress(key, subjectItemsToCalculate, userData, subjectWeights, settings.trackableItems, settings.syllabus);
                        const displayName = getDisplayName(key, data.name);
                        
                        let borderColor = 'border-slate-200 dark:border-white/10';
                        let bgColor = 'bg-slate-50 dark:bg-white/5';
                        let textColor = 'text-slate-600 dark:text-slate-300';
                        let barColor = 'bg-indigo-500';
                        
                        if(data.color === 'emerald') { borderColor = 'border-emerald-500/30'; bgColor = 'bg-emerald-500/5'; textColor = 'text-emerald-600 dark:text-emerald-400'; barColor = 'bg-emerald-500'; }
                        else if(data.color === 'amber') { borderColor = 'border-amber-500/30'; bgColor = 'bg-amber-500/5'; textColor = 'text-amber-600 dark:text-amber-400'; barColor = 'bg-amber-500'; }
                        else if(data.color === 'indigo') { borderColor = 'border-indigo-500/30'; bgColor = 'bg-indigo-500/5'; textColor = 'text-indigo-600 dark:text-indigo-400'; barColor = 'bg-indigo-500'; }
                        else if(data.color === 'blue') { borderColor = 'border-blue-500/30'; bgColor = 'bg-blue-500/5'; textColor = 'text-blue-600 dark:text-blue-400'; barColor = 'bg-blue-500'; }
                        else if(data.color === 'rose') { borderColor = 'border-rose-500/30'; bgColor = 'bg-rose-500/5'; textColor = 'text-rose-600 dark:text-rose-400'; barColor = 'bg-rose-500'; }

                        return (
                            <div 
                                key={key}
                                onClick={() => onChangeSubject(key)}
                                className={`group flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all hover:-translate-y-0.5 relative ${isActive ? `bg-blue-500/10 border-blue-500 shadow-lg shadow-blue-500/10` : `${bgColor} ${borderColor} hover:bg-slate-100 dark:hover:bg-white/10`}`}
                            >
                                <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-xl border bg-white/50 dark:bg-black/20 ${borderColor} ${textColor}`}>
                                    {data.icon}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="flex justify-between items-center mb-1">
                                        <div className="flex items-center gap-2">
                                            <span className={`font-bold text-sm truncate max-w-[100px] ${isActive ? 'text-slate-800 dark:text-white' : textColor}`}>{displayName}</span>
                                            {isEditingSubjects && (
                                                <button 
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        setRenameModal({ isOpen: true, key, currentName: displayName });
                                                    }}
                                                    className="text-[10px] text-slate-400 hover:text-blue-500 transition-opacity"
                                                >
                                                    ✏️
                                                </button>
                                            )}
                                        </div>
                                        <span className={`text-xs font-mono font-bold ${textColor}`}>{progress.overall.toFixed(0)}%</span>
                                    </div>
                                    <div className="h-1 bg-slate-200 dark:bg-black/20 rounded-full overflow-hidden">
                                        <div className={`h-full rounded-full ${barColor}`} style={{ width: `${progress.overall}%` }}></div>
                                    </div>
                                </div>
                                
                                {isEditingSubjects && (
                                    <button 
                                        onClick={(e) => { e.stopPropagation(); deleteSubject(key); }}
                                        className="w-6 h-6 bg-rose-500 text-white rounded-full flex items-center justify-center text-xs hover:scale-110 transition-all shadow-sm z-10 ml-2"
                                        title="Delete Subject"
                                    >
                                        ✕
                                    </button>
                                )}
                            </div>
                        );
                    })}
                </div>
            </div>

            <div className="glass-card p-5 rounded-2xl">
                <div className="flex justify-between items-center mb-4">
                    <h3 className="font-bold text-xs text-slate-500 dark:text-slate-400 uppercase tracking-wider flex items-center gap-2">
                        <span className="w-1 h-4 bg-purple-500 rounded-full"></span> Performance
                    </h3>
                    <button 
                        onClick={() => setShowPerfConfig(true)} 
                        className="text-slate-400 hover:text-blue-600 dark:hover:text-white transition-colors p-1 rounded hover:bg-slate-100 dark:hover:bg-white/5"
                        title="Configure Performance Bars"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4"><path strokeLinecap="round" strokeLinejoin="round" d="M10.34 15.84c-.688-.06-1.386-.09-2.09-.09H7.5a4.5 4.5 0 110-9h.75c.704 0 1.402-.03 2.09-.09m0 9.18c.253.962.584 1.892.985 2.783.247.55.06 1.21-.463 1.511l-.657.38c-.551.318-1.26.117-1.527-.461a20.845 20.845 0 01-1.44-4.282m3.102.069a18.03 18.03 0 01-.59-4.59c0-1.586.205-3.124.59-4.59m0 9.18a23.848 23.848 0 018.835 2.535M10.34 6.66a23.847 23.847 0 008.835-2.535m0 0A23.74 23.74 0 0018.795 3m.38 1.125a23.91 23.91 0 011.014 5.795" /></svg>
                    </button>
                </div>
                
                <div className="flex flex-col gap-5">
                    {settings.progressBars.filter(conf => conf.visible !== false).map(conf => {
                        if (conf.items.length === 0) return null;
                        const p = calculateProgress(activeSubject, conf.items, userData, conf.weights, settings.trackableItems, settings.syllabus);
                        return (
                            <div key={conf.id}>
                                <div className="flex justify-between text-xs font-semibold mb-1.5 tracking-wide text-slate-700 dark:text-slate-300">
                                    <span>{conf.title}</span>
                                    <span className="text-blue-600 dark:text-blue-400">{p.overall.toFixed(1)}%</span>
                                </div>
                                <ProgressBar progress={p.overall} className={`bg-gradient-to-r ${conf.color}`} />
                                <div className="flex justify-between text-[10px] text-slate-500 mt-1 opacity-80">
                                    <span>Paper 1: {p.p1.toFixed(0)}%</span>
                                    <span>Paper 2: {p.p2.toFixed(0)}%</span>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>

            {showPerfConfig && (
                <PerformanceConfigModal 
                    currentConfig={settings.progressBars} 
                    allItems={settings.trackableItems}
                    onSave={handlePerfConfigSave} 
                    onClose={() => setShowPerfConfig(false)} 
                />
            )}

            {showSubjectConfig && (
                <SubjectConfigModal
                    currentItems={subjectItemsToCalculate}
                    currentWeights={subjectWeights || {}}
                    allItems={settings.trackableItems}
                    onSave={handleSubjectConfigSave}
                    onClose={() => setShowSubjectConfig(false)}
                />
            )}

            {renameModal && (
                <Modal isOpen={true} onClose={() => setRenameModal(null)} title="Rename Subject">
                    <div className="flex flex-col gap-4">
                        <div className="flex flex-col gap-1">
                            <label className="text-xs text-slate-500">New Subject Name</label>
                            <input 
                                type="text" 
                                value={renameModal.currentName}
                                onChange={(e) => setRenameModal(prev => prev ? { ...prev, currentName: e.target.value } : null)}
                                className="bg-slate-50 dark:bg-black/20 border border-slate-200 dark:border-white/10 rounded-lg p-2 text-sm focus:outline-none focus:border-blue-500 dark:text-white"
                            />
                        </div>
                        <div className="flex justify-end gap-3">
                            <Button variant="secondary" onClick={() => setRenameModal(null)}>Cancel</Button>
                            <Button onClick={() => {
                                onUpdateSettings({
                                    ...settings,
                                    customNames: { ...settings.customNames, [renameModal.key]: renameModal.currentName }
                                });
                                setRenameModal(null);
                            }}>Save</Button>
                        </div>
                    </div>
                </Modal>
            )}
            
            {addSubjectModal && (
                <AddSubjectModal 
                    onClose={() => setAddSubjectModal(false)} 
                    onAdd={(name, emoji, color) => {
                        const newKey = `subj_${Date.now()}`;
                        const newSyllabus = { 
                            ...settings.syllabus,
                            [newKey]: { name, icon: emoji, color, chapters: [] } 
                        };
                        onUpdateSettings({ ...settings, syllabus: newSyllabus });
                    }}
                />
            )}
        </aside>
    );
};

const AddSubjectModal = ({ onClose, onAdd }: { onClose: () => void, onAdd: (name: string, emoji: string, color: string) => void }) => {
    const [name, setName] = useState('');
    const [emoji, setEmoji] = useState('📚');
    const [color, setColor] = useState('emerald');
    
    const colors = [
        { id: 'emerald', class: 'bg-emerald-500' },
        { id: 'blue', class: 'bg-blue-500' },
        { id: 'amber', class: 'bg-amber-500' },
        { id: 'rose', class: 'bg-rose-500' },
        { id: 'indigo', class: 'bg-indigo-500' }
    ];
    
    const emojis = ['📚', '🧬', '🧪', '⚛️', '📐', '🌍', '💻', '🎨', '🎵', '📝'];

    return (
        <Modal isOpen={true} onClose={onClose} title="Add New Subject">
            <div className="flex flex-col gap-4">
                <div className="flex flex-col gap-1">
                    <label className="text-xs text-slate-500">Subject Name</label>
                    <input 
                        type="text"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        className="bg-slate-50 dark:bg-black/20 border border-slate-200 dark:border-white/10 rounded-lg p-2 text-sm focus:outline-none focus:border-blue-500 dark:text-white"
                        placeholder="e.g. Math"
                    />
                </div>
                <div className="flex flex-col gap-1">
                    <label className="text-xs text-slate-500">Icon</label>
                    <div className="flex gap-2 flex-wrap">
                        {emojis.map(e => (
                             <button 
                                key={e} 
                                onClick={() => setEmoji(e)}
                                className={`w-8 h-8 flex items-center justify-center rounded-lg border ${emoji === e ? 'border-blue-500 bg-blue-500/20' : 'border-slate-200 dark:border-white/10'}`}
                            >{e}</button>
                        ))}
                    </div>
                </div>
                 <div className="flex flex-col gap-1">
                    <label className="text-xs text-slate-500">Color Theme</label>
                    <div className="flex gap-2">
                         {colors.map(c => (
                             <button 
                                key={c.id} 
                                onClick={() => setColor(c.id)}
                                className={`w-8 h-8 rounded-full ${c.class} ${color === c.id ? 'ring-2 ring-offset-2 ring-slate-400' : ''}`}
                            />
                        ))}
                    </div>
                </div>
                <div className="flex justify-end gap-3 mt-4">
                    <Button variant="secondary" onClick={onClose}>Cancel</Button>
                    <Button onClick={() => { if(name.trim()) { onAdd(name, emoji, color); onClose(); } }} disabled={!name.trim()}>Add Subject</Button>
                </div>
            </div>
        </Modal>
    );
};

const PerformanceConfigModal = ({ currentConfig, allItems, onSave, onClose }: { currentConfig: ProgressBarConfig[], allItems: TrackableItem[], onSave: (c: ProgressBarConfig[]) => void, onClose: () => void }) => {
    const [config, setConfig] = useState<ProgressBarConfig[]>(JSON.parse(JSON.stringify(currentConfig)));
    const [titleEdit, setTitleEdit] = useState<{idx: number, val: string} | null>(null);

    const toggleVisibility = (idx: number) => {
        const newC = [...config];
        newC[idx].visible = !newC[idx].visible;
        setConfig(newC);
    };

    const toggleItem = (confIdx: number, itemKey: string) => {
        const newC = [...config];
        const items = newC[confIdx].items;
        if (items.includes(itemKey)) {
            newC[confIdx].items = items.filter(k => k !== itemKey);
            if (newC[confIdx].weights) delete newC[confIdx].weights![itemKey];
        } else {
            newC[confIdx].items = [...items, itemKey];
            if (!newC[confIdx].weights) newC[confIdx].weights = {};
            newC[confIdx].weights![itemKey] = 10; 
        }
        setConfig(newC);
    };

    const updateWeight = (confIdx: number, itemKey: string, val: number) => {
        const newC = [...config];
        if (!newC[confIdx].weights) newC[confIdx].weights = {};
        newC[confIdx].weights![itemKey] = Math.max(0, val);
        setConfig(newC);
    };
    
    const deleteBar = (idx: number) => {
        if (confirm("Delete this progress bar?")) {
            const newC = config.filter((_, i) => i !== idx);
            setConfig(newC);
        }
    };
    
    const addBar = () => {
        const newBar: ProgressBarConfig = {
            id: `p_${Date.now()}`,
            title: "New Progress",
            items: [],
            color: 'from-blue-400 to-blue-600',
            visible: true
        };
        setConfig([...config, newBar]);
    };

    return (
        <Modal isOpen={true} onClose={onClose} title="Configure Progress Bars">
            <div className="flex flex-col gap-6">
                {config.map((conf, idx) => {
                    const totalWeight = conf.weights ? Object.values(conf.weights).reduce((a,b) => a+b, 0) : 0;
                    const activeItemsCount = conf.items.length;
                    
                    return (
                        <div key={conf.id} className="bg-slate-50 dark:bg-white/5 p-4 rounded-xl border border-slate-200 dark:border-white/10 relative group">
                             <div className="flex items-center justify-between mb-4 pb-2 border-b border-slate-200 dark:border-white/5">
                                <div className="flex items-center gap-3 flex-1">
                                    <div className={`w-4 h-4 rounded-full bg-gradient-to-br ${conf.color}`}></div>
                                    <input 
                                        type="text" 
                                        value={titleEdit?.idx === idx ? titleEdit.val : conf.title}
                                        onChange={(e) => setTitleEdit({ idx, val: e.target.value })}
                                        onBlur={() => {
                                            if(titleEdit) {
                                                const newC = [...config];
                                                newC[idx].title = titleEdit.val;
                                                setConfig(newC);
                                                setTitleEdit(null);
                                            }
                                        }}
                                        className="bg-transparent font-bold text-sm border-b border-transparent hover:border-blue-500 focus:border-blue-500 focus:outline-none text-slate-800 dark:text-slate-200 w-full"
                                    />
                                </div>
                                <label className="flex items-center gap-2 text-xs cursor-pointer select-none">
                                    <input type="checkbox" checked={conf.visible !== false} onChange={() => toggleVisibility(idx)} className="accent-blue-500" />
                                    <span className="text-slate-500 dark:text-slate-400">Visible</span>
                                </label>
                            </div>
                            
                             <button 
                                onClick={() => deleteBar(idx)}
                                className="absolute top-2 right-2 text-rose-500 hover:bg-rose-500/10 p-1 rounded transition-all opacity-0 group-hover:opacity-100"
                                title="Delete Bar"
                            >
                                🗑️
                            </button>
                            
                            {activeItemsCount > 0 && (
                                <div className="flex justify-between items-center mb-2">
                                    <span className="text-[10px] font-bold text-slate-400">ITEMS & WEIGHTS</span>
                                    <span className={`text-[10px] font-bold ${totalWeight === 100 ? 'text-green-500' : 'text-amber-500'}`}>Total Weight: {totalWeight}%</span>
                                </div>
                            )}

                            <div className="grid grid-cols-1 gap-2 max-h-40 overflow-y-auto custom-scrollbar">
                                {allItems.map(item => {
                                    const isChecked = conf.items.includes(item.key);
                                    const weight = conf.weights?.[item.key] ?? 0;
                                    return (
                                        <div key={item.key} className="flex items-center justify-between p-1.5 rounded hover:bg-slate-100 dark:hover:bg-white/5 transition-colors">
                                            <label className="flex items-center gap-3 text-xs text-slate-700 dark:text-slate-300 cursor-pointer select-none">
                                                <input 
                                                    type="checkbox" 
                                                    checked={isChecked} 
                                                    onChange={() => toggleItem(idx, item.key)}
                                                    className="accent-blue-500 rounded-sm w-3.5 h-3.5" 
                                                />
                                                <span>{item.name}</span>
                                            </label>
                                            {isChecked && (
                                                <div className="flex items-center gap-1">
                                                    <input 
                                                        type="number" 
                                                        value={weight} 
                                                        onChange={(e) => updateWeight(idx, item.key, parseInt(e.target.value) || 0)}
                                                        className="w-12 bg-white dark:bg-black/20 border border-slate-200 dark:border-white/10 rounded px-1 py-0.5 text-[10px] text-center text-slate-800 dark:text-white focus:outline-none focus:border-blue-500"
                                                    />
                                                    <span className="text-[9px] text-slate-500">%</span>
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    );
                })}
                 <button 
                    onClick={addBar}
                    className="w-full py-3 border-2 border-dashed border-slate-300 dark:border-white/10 rounded-xl text-slate-500 hover:text-blue-500 hover:border-blue-500 hover:bg-blue-500/5 transition-all font-bold text-xs flex items-center justify-center gap-2"
                >
                    + Add New Progress Bar
                </button>
                <div className="flex justify-end gap-3 pt-2 border-t border-slate-200 dark:border-white/10">
                     <Button onClick={() => onSave(config)}>Save Changes</Button>
                </div>
            </div>
        </Modal>
    );
}

const SubjectConfigModal = ({ currentItems, currentWeights, allItems, onSave, onClose }: { currentItems: string[], currentWeights: Record<string, number>, allItems: TrackableItem[], onSave: (i: string[], w: Record<string, number>) => void, onClose: () => void }) => {
    const [items, setItems] = useState<string[]>(currentItems);
    const [weights, setWeights] = useState<Record<string, number>>({ ...currentWeights });

    const toggleItem = (key: string) => {
        if (items.includes(key)) {
            setItems(items.filter(k => k !== key));
            const newW = { ...weights }; delete newW[key]; setWeights(newW);
        } else {
            setItems([...items, key]);
            setWeights({ ...weights, [key]: 10 }); // Default weight
        }
    };

    const updateWeight = (key: string, val: number) => {
        setWeights({ ...weights, [key]: Math.max(0, val) });
    };
    
    const totalWeight = Object.values(weights).reduce((a,b) => a+b, 0);

    return (
        <Modal isOpen={true} onClose={onClose} title="Configure Subject Progress">
            <div className="flex flex-col gap-4">
                <div className="flex justify-between items-center">
                    <p className="text-xs text-slate-500 dark:text-slate-400">Select items for subject calculation.</p>
                    <span className={`text-xs font-bold ${totalWeight === 100 ? 'text-green-500' : 'text-amber-500'}`}>Total Weight: {totalWeight}%</span>
                </div>
                
                <div className="bg-slate-50 dark:bg-white/5 p-4 rounded-xl border border-slate-200 dark:border-white/10 flex flex-col gap-2 max-h-[60vh] overflow-y-auto custom-scrollbar">
                    {allItems.map(item => {
                        const isChecked = items.includes(item.key);
                        const weight = weights[item.key] ?? 0;
                        return (
                            <div key={item.key} className="flex items-center justify-between p-2 rounded hover:bg-slate-100 dark:hover:bg-white/5 transition-colors">
                                <label className="flex items-center gap-3 text-sm text-slate-700 dark:text-slate-200 cursor-pointer select-none">
                                    <input 
                                        type="checkbox" 
                                        checked={isChecked} 
                                        onChange={() => toggleItem(item.key)}
                                        className="accent-blue-500 w-4 h-4 rounded" 
                                    />
                                    <span>{item.name}</span>
                                </label>
                                {isChecked && (
                                    <div className="flex items-center gap-2 animate-in fade-in">
                                        <label className="text-[10px] text-slate-500 uppercase">Weight</label>
                                        <input 
                                            type="number" 
                                            value={weight} 
                                            onChange={(e) => updateWeight(item.key, parseInt(e.target.value) || 0)}
                                            className="w-14 bg-white dark:bg-black/20 border border-slate-200 dark:border-white/10 rounded px-2 py-1 text-xs text-center text-slate-800 dark:text-white focus:outline-none focus:border-blue-500"
                                        />
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
                <div className="flex justify-end gap-3 mt-4">
                     <Button onClick={() => onSave(items, weights)}>Save Configuration</Button>
                </div>
            </div>
        </Modal>
    );
}