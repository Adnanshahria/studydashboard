
import React, { useEffect, useState, useRef } from 'react';
import { DEFAULT_SETTINGS, INITIAL_SYLLABUS_DATA } from './constants';
import { UserData, UserSettings, TrackableItem, Chapter } from './types';
import { calculateGlobalComposite, getStreak } from './utils/calculations';
import { openDB, dbPut, initFirebase, cleanupStorage, dbClear, authenticateUser, createUser, loginAnonymously, saveSettings, saveUserProgress } from './utils/storage';
import { HeroSection } from './components/HeroSection';
import { Sidebar } from './components/Sidebar';
import { Syllabus } from './components/Syllabus';
import { Modal, Button } from './components/UI';

function App() {
  const [isLoading, setIsLoading] = useState(false);
  const [userData, setUserData] = useState<UserData>({});
  const [settings, setSettings] = useState<UserSettings>(DEFAULT_SETTINGS);
  const [activeSubject, setActiveSubject] = useState<string>('biology');
  const [connectionStatus, setConnectionStatus] = useState<'connected' | 'disconnected'>('disconnected');
  
  // Auth State
  const [userId, setUserId] = useState<string | null>(null);
  
  // Refs for data migration and cleanup
  const localDataRef = useRef<UserData>({});
  const localSettingsRef = useRef<UserSettings>(DEFAULT_SETTINGS);

  // UI State
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [modalMode, setModalMode] = useState<'login' | 'create'>('login');
  const [tempUserId, setTempUserId] = useState('');
  const [tempPassword, setTempPassword] = useState('');
  const [modalError, setModalError] = useState('');
  const [isCheckingUser, setIsCheckingUser] = useState(false);
  const [showDevModal, setShowDevModal] = useState(false);

  // Keep refs synced with state for potential migration on login
  useEffect(() => { localDataRef.current = userData; }, [userData]);
  useEffect(() => { localSettingsRef.current = settings; }, [settings]);

  // INITIAL LOAD
  useEffect(() => {
      setUserData({});
      setSettings(DEFAULT_SETTINGS);
      setUserId(null);
  }, []);

  // AUTH & DATA SYNC LOGIC
  useEffect(() => {
    if (!userId) return;

    setIsLoading(true);
    let unsub: () => void = () => {};
    
    const init = async () => {
      try {
        // 1. Clean local indexedDB for fresh user session to prevent data leak
        await openDB();
        await dbClear('userData'); 
        
        // 2. Initialize Firebase Listener
        unsub = await initFirebase(
            userId, 
            (remoteData, remoteSettings) => {
                // Update Data
                if (remoteData) {
                    setUserData(prev => ({ ...prev, ...remoteData }));
                    dbPut('userData', { id: 'main', value: remoteData });
                }
                
                // Update Settings
                if (remoteSettings) {
                    setSettings(prev => {
                        // Deep merge remote settings onto default to ensure structure
                        // We do NOT merge with 'prev' here to ensure server deletions are respected.
                        const merged: UserSettings = { 
                            ...DEFAULT_SETTINGS, 
                            ...remoteSettings,
                            // Ensure syllabus is correctly merged/replaced
                            syllabus: remoteSettings.syllabus || JSON.parse(JSON.stringify(INITIAL_SYLLABUS_DATA)),
                            trackableItems: remoteSettings.trackableItems || DEFAULT_SETTINGS.trackableItems
                        };
                        
                        dbPut('userData', { id: 'settings', value: merged });
                        return merged;
                    });
                }
                setIsLoading(false);
            }, 
            (status) => setConnectionStatus(status),
            // Pass current local state for migration if this is a new user
            localSettingsRef.current, 
            localDataRef.current      
        );

      } catch (e) {
        console.error("Init failed", e);
        setIsLoading(false);
      }
    };

    init();

    // CLEANUP FUNCTION to prevent Data Leaks between users
    return () => {
        unsub();
        cleanupStorage();
        setUserData({});
        setSettings(DEFAULT_SETTINGS);
    };
  }, [userId]);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', settings.theme);
  }, [settings.theme]);

  // --- LOGIC HANDLERS ---

  const handleStatusUpdate = async (key: string) => {
    if(!userId) return;
    const current = userData[key] ?? 0;
    const next = (current + 1) % 7;
    
    setUserData(prev => ({ ...prev, [key]: next, [`timestamp_${key}`]: new Date().toISOString() }));
    await saveUserProgress(userId, { [key]: next, [`timestamp_${key}`]: new Date().toISOString() });
  };

  const handleSettingsUpdate = async (newSettings: UserSettings) => {
      // Optimistic Update
      setSettings(newSettings);
      if(!userId) return;
      // Cloud Save (Replacement)
      await saveSettings(userId, newSettings);
  };

  const toggleTheme = () => {
      handleSettingsUpdate({ ...settings, theme: settings.theme === 'dark' ? 'light' : 'dark' });
  };

  // --- CRUD OPERATIONS (DEEP CLONING TO FIX DELETION BUGS) ---

  const onDeleteChapter = (subjectKey: string, chapterId: number | string) => {
      const currentSub = settings.syllabus[subjectKey];
      if(!currentSub) return;
      
      if(window.confirm(`Are you sure you want to delete this chapter? This cannot be undone.`)) {
          // Deep clone to break references
          const newSyllabus = JSON.parse(JSON.stringify(settings.syllabus));
          
          // Filter out the chapter
          newSyllabus[subjectKey].chapters = newSyllabus[subjectKey].chapters.filter((c: Chapter) => c.id !== chapterId);
          
          // Update state and cloud
          handleSettingsUpdate({ ...settings, syllabus: newSyllabus });
      }
  };

  const onDeleteColumn = (itemKey: string) => {
      if(window.confirm(`Are you sure you want to delete this column? It will be removed from ALL subjects.`)) {
          // Deep clone items
          const newItems = settings.trackableItems.filter(t => t.key !== itemKey);
          
          // Update state and cloud
          handleSettingsUpdate({ ...settings, trackableItems: newItems });
      }
  };

  const onAddColumn = (name: string, color: string) => {
      const newKey = `custom_col_${Date.now()}`;
      const newItem: TrackableItem = { name, color, key: newKey };
      
      // Deep clone array
      const newItems = [...settings.trackableItems, newItem];
      
      handleSettingsUpdate({ ...settings, trackableItems: newItems });
  };

  const onAddChapter = (subjectKey: string, paper: 1 | 2, name: string) => {
      const currentSub = settings.syllabus[subjectKey];
      if(!currentSub) return;
      
      const newChapter: Chapter = {
          id: `custom_${Date.now()}`,
          name,
          paper
      };
      
      // Deep clone syllabus to prevent "Ghost Rows" in other subjects
      const newSyllabus = JSON.parse(JSON.stringify(settings.syllabus));
      newSyllabus[subjectKey].chapters.push(newChapter);
      
      handleSettingsUpdate({ ...settings, syllabus: newSyllabus });
  };

  // --- AUTH HANDLERS ---

  const handleUserAction = async () => {
      if (!tempUserId.trim()) return;
      setModalError('');
      setIsCheckingUser(true);
      
      const inputId = tempUserId.trim();
      const inputPass = tempPassword.trim();

      try {
        if (modalMode === 'login') {
            const result = await authenticateUser(inputId, inputPass);
            if (result.success && result.uid) {
                setUserId(result.uid);
                setShowLoginModal(false);
                setTempUserId('');
                setTempPassword('');
            } else {
                setModalError(result.error || 'Login failed.');
            }
        } else {
            const result = await createUser(inputId, inputPass);
            if (result.success && result.uid) {
                setUserId(result.uid);
                setShowLoginModal(false);
                setTempUserId('');
                setTempPassword('');
            } else {
                setModalError(result.error || 'Creation failed.');
            }
        }
      } catch (e) {
          setModalError('Network error.');
      } finally {
          setIsCheckingUser(false);
      }
  };

  const handleGuestLogin = async () => {
    setModalError('');
    setIsCheckingUser(true);
    try {
        const result = await loginAnonymously();
        if (result.success && result.uid) {
            setUserId(result.uid);
            setShowLoginModal(false);
        } else {
            setModalError(result.error || 'Guest login failed');
        }
    } catch (e) {
        setModalError('Network error');
    } finally {
        setIsCheckingUser(false);
    }
  };

  const handleLogout = () => {
      // Aggressive cleanup
      setUserId(null);
      setUserData({});
      setSettings(DEFAULT_SETTINGS);
      localDataRef.current = {};
      localSettingsRef.current = DEFAULT_SETTINGS;
      cleanupStorage();
  };

  const compositeData = calculateGlobalComposite(userData, settings);
  const streak = getStreak(userData);

  return (
    <div className="min-h-screen pb-10 text-slate-800 dark:text-slate-200 selection:bg-blue-500/30 selection:text-blue-600 dark:selection:text-blue-200 transition-colors duration-300">
        <header className="sticky top-0 z-50 w-full header-glass border-b border-slate-200 dark:border-white/5 transition-colors duration-300">
            <div className="glass-card border-none rounded-none bg-white/70 dark:bg-slate-900/70 backdrop-blur-xl">
                 <div className="max-w-screen-xl mx-auto flex justify-between items-center py-3 px-4">
                    <div className="flex items-center gap-3">
                        <div 
                            onClick={() => setShowDevModal(true)}
                            className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white font-bold shadow-lg shadow-blue-500/30 cursor-pointer hover:scale-105 transition-transform"
                            title="Developer Info"
                        >
                            AS
                        </div>
                        <h1 className="text-lg font-bold tracking-tight text-slate-800 dark:text-slate-100">Study Dashboard <span className="text-[10px] align-top font-normal text-slate-500 dark:text-slate-400 px-2 py-0.5 rounded-full border border-slate-200 dark:border-white/10 bg-slate-100 dark:bg-white/5">v20.8</span></h1>
                    </div>
                    <div className="flex items-center gap-3">
                        <div className={`flex items-center gap-2 text-xs font-medium px-3 py-1.5 rounded-full border transition-colors ${connectionStatus === 'connected' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-600 dark:text-emerald-500' : 'bg-slate-500/10 border-slate-500/20 text-slate-500'}`}>
                            <div className={`w-2 h-2 rounded-full ${connectionStatus === 'connected' ? 'bg-emerald-500' : 'bg-slate-400'}`}></div>
                            <span className="hidden sm:inline">{connectionStatus === 'connected' ? 'Online' : 'Offline'}</span>
                        </div>
                        
                        {userId ? (
                            <div className="flex items-center gap-2">
                                <span className="text-xs font-bold hidden sm:inline truncate max-w-[100px]">👤 {userId.includes('@') ? userId.split('@')[0] : 'User'}</span>
                                <Button onClick={handleLogout} className="px-3 py-1.5 text-xs">Logout</Button>
                            </div>
                        ) : (
                            <Button onClick={() => setShowLoginModal(true)} className="px-4 py-1.5 text-xs animate-pulse">Sign In / Create</Button>
                        )}

                        <button onClick={toggleTheme} className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-slate-100 dark:hover:bg-white/10 text-slate-400 hover:text-slate-800 dark:hover:text-white transition-colors border border-transparent hover:border-slate-200 dark:hover:border-white/10">
                             {settings.theme === 'dark' ? '☀️' : '🌙'}
                        </button>
                    </div>
                 </div>
            </div>
        </header>

        <main className="container max-w-screen-xl mx-auto py-6 px-4">
            {userId ? (
                isLoading ? (
                    <div className="flex flex-col items-center justify-center py-32 gap-4">
                         <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                         <p className="text-sm font-bold text-slate-500 uppercase tracking-wider">Loading Data...</p>
                    </div>
                ) : (
                    <>
                        <HeroSection 
                            compositeData={compositeData} 
                            streak={streak} 
                            settings={settings}
                            onUpdateWeights={(w) => handleSettingsUpdate({ ...settings, weights: w })}
                            onUpdateCountdown={(target, label) => handleSettingsUpdate({ ...settings, countdownTarget: target, countdownLabel: label })}
                        />
                        
                        <div className="grid grid-cols-1 lg:grid-cols-[300px_1fr] gap-6 items-start">
                            <Sidebar 
                                activeSubject={activeSubject} 
                                onChangeSubject={setActiveSubject}
                                userData={userData}
                                settings={settings}
                                onUpdateSettings={handleSettingsUpdate}
                            />
                            <Syllabus 
                                activeSubject={activeSubject} 
                                userData={userData} 
                                settings={settings}
                                onUpdateStatus={handleStatusUpdate}
                                onUpdateNote={(key, text) => {
                                    const newVal = { ...userData, [`note_${key}`]: text };
                                    setUserData(newVal); 
                                    saveUserProgress(userId, { [`note_${key}`]: text });
                                }}
                                onTogglePaper={(key) => {
                                    const newState = { ...settings.syllabusOpenState, [key]: !settings.syllabusOpenState[key] };
                                    handleSettingsUpdate({ ...settings, syllabusOpenState: newState });
                                }}
                                onRenameColumn={(key, newName) => {
                                    const newNames = { ...settings.customNames, [key]: newName };
                                    handleSettingsUpdate({ ...settings, customNames: newNames });
                                }}
                                onAddColumn={onAddColumn}
                                onAddChapter={onAddChapter}
                                onDeleteChapter={onDeleteChapter}
                                onDeleteColumn={onDeleteColumn}
                            />
                        </div>
                    </>
                )
            ) : (
                <div className="flex flex-col items-center justify-center py-20 text-center animate-in fade-in zoom-in duration-500">
                    <div className="w-20 h-20 bg-blue-500/10 rounded-2xl flex items-center justify-center mb-6">
                        <span className="text-4xl">🔒</span>
                    </div>
                    <h2 className="text-3xl font-black mb-4 bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-purple-600 dark:from-blue-400 dark:to-purple-400">Dashboard Locked</h2>
                    <p className="text-slate-500 dark:text-slate-400 max-w-md mb-8">Please sign in with your User ID and Password to access your study progress, stats, and syllabus tracking.</p>
                    <Button onClick={() => setShowLoginModal(true)} className="px-8 py-3 text-sm rounded-xl shadow-blue-500/30">Access Dashboard</Button>
                </div>
            )}
        </main>

        {/* MODALS */}
        <Modal isOpen={showLoginModal} onClose={() => setShowLoginModal(false)} title={modalMode === 'login' ? 'Sign In' : 'Create Account'}>
            <div className="flex flex-col gap-4">
                <div className="flex p-1 bg-slate-100 dark:bg-white/5 rounded-lg">
                    <button 
                        onClick={() => { setModalMode('login'); setModalError(''); }}
                        className={`flex-1 py-1.5 text-xs font-bold rounded-md transition-all ${modalMode === 'login' ? 'bg-white dark:bg-slate-700 shadow-sm text-blue-600 dark:text-white' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700'}`}
                    >
                        Sign In
                    </button>
                    <button 
                        onClick={() => { setModalMode('create'); setModalError(''); }}
                        className={`flex-1 py-1.5 text-xs font-bold rounded-md transition-all ${modalMode === 'create' ? 'bg-white dark:bg-slate-700 shadow-sm text-blue-600 dark:text-white' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700'}`}
                    >
                        Create Account
                    </button>
                </div>

                <div className="flex flex-col gap-4 mt-2">
                    <div className="flex flex-col gap-1">
                        <label className="text-[10px] uppercase font-bold text-slate-400">User ID / Email</label>
                        <input 
                            type="text" 
                            value={tempUserId}
                            onChange={(e) => setTempUserId(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleUserAction()}
                            placeholder="e.g. user_123 or email@example.com"
                            className="bg-slate-50 dark:bg-black/20 border border-slate-200 dark:border-white/10 rounded-xl px-4 py-3 text-sm font-bold focus:outline-none focus:border-blue-500 text-slate-800 dark:text-white"
                        />
                    </div>
                    <div className="flex flex-col gap-1">
                        <label className="text-[10px] uppercase font-bold text-slate-400">Password {modalMode === 'create' && '(Min 6 chars)'}</label>
                        <input 
                            type="password" 
                            value={tempPassword}
                            onChange={(e) => setTempPassword(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleUserAction()}
                            placeholder="••••••••"
                            className="bg-slate-50 dark:bg-black/20 border border-slate-200 dark:border-white/10 rounded-xl px-4 py-3 text-sm font-bold focus:outline-none focus:border-blue-500 text-slate-800 dark:text-white"
                        />
                    </div>

                    {modalError && <p className="text-xs text-rose-500 font-medium bg-rose-500/10 p-2 rounded">{modalError}</p>}
                </div>

                <div className="flex flex-col gap-3 mt-2">
                    <Button onClick={handleUserAction} disabled={!tempUserId.trim() || isCheckingUser} className="w-full py-3">
                        {isCheckingUser ? 'Checking...' : (modalMode === 'login' ? 'Sign In' : 'Create Account')}
                    </Button>
                    
                    <div className="relative flex items-center py-2">
                        <div className="flex-grow border-t border-slate-200 dark:border-white/10"></div>
                        <span className="flex-shrink-0 mx-4 text-[10px] text-slate-400 uppercase font-bold">Or</span>
                        <div className="flex-grow border-t border-slate-200 dark:border-white/10"></div>
                    </div>

                    <button 
                        onClick={handleGuestLogin}
                        className="w-full py-2.5 rounded-lg border border-dashed border-slate-300 dark:border-white/20 text-slate-500 dark:text-slate-400 text-xs font-bold hover:bg-slate-50 dark:hover:bg-white/5 transition-all flex items-center justify-center gap-2"
                    >
                        <span>👤 Continue as Guest</span>
                    </button>
                </div>
            </div>
        </Modal>

        <Modal isOpen={showDevModal} onClose={() => setShowDevModal(false)} title="Developer Info">
            <div className="flex flex-col items-center gap-4 py-4">
                <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white text-3xl font-bold shadow-lg">
                    AS
                </div>
                <div className="text-center">
                    <h3 className="text-xl font-bold text-slate-800 dark:text-white">Md. Adnan Shahria</h3>
                    <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Full Stack Developer</p>
                </div>
                <div className="w-full bg-slate-50 dark:bg-white/5 p-4 rounded-xl border border-slate-200 dark:border-white/10 mt-2">
                    <p className="text-xs text-slate-500 dark:text-slate-400 uppercase tracking-wider font-bold mb-2">Contact</p>
                    <a href="mailto:adnanshahria2006@gmail.com" className="flex items-center gap-2 text-blue-600 dark:text-blue-400 font-medium hover:underline">
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4"><path d="M3 4a2 2 0 00-2 2v1.161l8.441 4.221a1.25 1.25 0 001.118 0L19 7.162V6a2 2 0 00-2-2H3z" /><path d="M19 8.839l-7.77 3.885a2.75 2.75 0 01-2.46 0L1 8.839V14a2 2 0 002 2h14a2 2 0 002-2V8.839z" /></svg>
                        adnanshahria2006@gmail.com
                    </a>
                </div>
                <Button onClick={() => setShowDevModal(false)} className="w-full mt-2">Close</Button>
            </div>
        </Modal>
    </div>
  );
}

export default App;
