
import { TRACKABLE_ITEMS } from '../constants';
import { SyllabusData, TrackableItem, UserData, UserSettings, CompositeData } from '../types';

const getPercent = (status: number) => (status >= 0 && status <= 5) ? status * 20 : 0;
const normalize = (raw: number) => Math.max(0, Math.min(100, raw));

export const calculateProgress = (
    subjectKey: string, 
    itemIdentifiers: string[], 
    userData: UserData,
    weights: Record<string, number> | undefined,
    allItems: TrackableItem[] = TRACKABLE_ITEMS,
    syllabus: SyllabusData
) => {
    const subject = syllabus[subjectKey];
    if (!subject) return { overall: 0, p1: 0, p2: 0 };

    const allChapters = subject.chapters;
    let totalWeight = 0;
    let isWeighted = false;
    
    if (weights && Object.keys(weights).length > 0) {
        isWeighted = true;
        itemIdentifiers.forEach(id => {
             if (allItems.find(t => t.key === id)) {
                 totalWeight += (weights[id] || 0);
             }
        });
    }
    // If weights sum to 0 (e.g. all weights 0), treat as unweighted to avoid NaN
    if (totalWeight === 0) isWeighted = false;

    let p1Total = 0, p1Count = 0, p2Total = 0, p2Count = 0;

    allChapters.forEach(ch => {
        let chapterSum = 0;
        let chapterDivisor = 0;

        itemIdentifiers.forEach(itemId => {
            // Only calculate if item exists in current definition
            const tIdx = allItems.findIndex(t => t.key === itemId);
            if (tIdx === -1) return;

            const key = `s_${subjectKey}_${ch.id}_${tIdx}`;
            const score = getPercent(userData[key] ?? 0);

            if (isWeighted) {
                const w = weights![itemId] || 0;
                chapterSum += score * w;
                chapterDivisor += w;
            } else {
                chapterSum += score;
                chapterDivisor += 1;
            }
        });

        const chAvg = chapterDivisor > 0 ? normalize(chapterSum / chapterDivisor) : 0;
        
        if (ch.paper === 1) { p1Total += chAvg; p1Count++; } 
        else { p2Total += chAvg; p2Count++; }
    });

    return {
        p1: p1Count ? p1Total / p1Count : 0,
        p2: p2Count ? p2Total / p2Count : 0,
        overall: (p1Count + p2Count) ? (p1Total + p2Total) / (p1Count + p2Count) : 0
    };
};

export const calculateGlobalComposite = (userData: UserData, settings: UserSettings): CompositeData => {
    const globalWeights = settings.weights || {};
    const syllabus = settings.syllabus;
    const subjects = Object.keys(syllabus);
    
    const getItemsForSubject = (subKey: string) => {
        return settings.subjectConfigs?.[subKey] || settings.trackableItems;
    };

    const getWeightsForSubject = (subKey: string) => {
        return settings.subjectWeights?.[subKey] || globalWeights;
    };

    let totalSubjectProgress = 0;
    
    subjects.forEach(s => {
        const items = getItemsForSubject(s);
        const w = getWeightsForSubject(s);
        const itemKeys = items.map(i => i.key);
        const p = calculateProgress(s, itemKeys, userData, w, items, syllabus);
        totalSubjectProgress += p.overall;
    });

    const composite = subjects.length > 0 ? totalSubjectProgress / subjects.length : 0;

    // Breakdown Calculation
    // Aggregates performance per "Item Type" (e.g. "Main Book") across all subjects
    
    const allGlobalKeys = new Set<string>();
    settings.trackableItems.forEach(i => allGlobalKeys.add(i.key));
    if (settings.subjectConfigs) {
        Object.values(settings.subjectConfigs).forEach(items => {
            items.forEach(i => allGlobalKeys.add(i.key));
        });
    }

    let breakdown: any = {};
    let totalWeight = 0;
    
    Array.from(allGlobalKeys).forEach(key => {
        // Find metadata for display
        let meta = settings.trackableItems.find(t => t.key === key);
        // Fallback to subject specific config if not in global
        if (!meta && settings.subjectConfigs) {
            for (const conf of Object.values(settings.subjectConfigs)) {
                meta = conf.find(t => t.key === key);
                if (meta) break;
            }
        }
        
        if (!meta) return;

        let itemSum = 0;
        let subjectCount = 0;

        subjects.forEach(s => {
            const subjectItems = getItemsForSubject(s);
            if (subjectItems.find(i => i.key === key)) {
                const p = calculateProgress(s, [key], userData, undefined, subjectItems, syllabus);
                itemSum += p.overall;
                subjectCount++;
            }
        });

        const avg = subjectCount > 0 ? itemSum / subjectCount : 0;
        const weight = globalWeights[key] || 0; 
        
        breakdown[key] = { name: meta.name, val: avg, weight: weight, color: meta.color };
        if (weight > 0) totalWeight += weight;
    });

    return { composite, breakdown, totalWeight };
};

export const getStreak = (userData: UserData): number => {
    const dates = new Set<string>();
    for (const key in userData) {
        if (key.startsWith('timestamp_')) {
            const val = userData[key];
            if (typeof val === 'string') {
                const d = new Date(val);
                if (!isNaN(d.getTime())) {
                    dates.add(d.toISOString().split('T')[0]);
                }
            }
        }
    }
    
    if (dates.size === 0) return 0;
    
    let streak = 0;
    const current = new Date();
    const toDateStr = (d: Date) => d.toISOString().split('T')[0];
    let dateStr = toDateStr(current);
    
    if (!dates.has(dateStr)) {
        current.setDate(current.getDate() - 1);
        dateStr = toDateStr(current);
        if (!dates.has(dateStr)) return 0;
    }
    
    while(dates.has(dateStr)) {
        streak++;
        current.setDate(current.getDate() - 1);
        dateStr = toDateStr(current);
    }
    
    return streak;
};
