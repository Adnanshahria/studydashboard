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

    // Use chapters directly from the dynamic syllabus
    const allChapters = subject.chapters;

    // Pre-calculate total weight if we are in weighted mode
    let totalWeight = 0;
    let isWeighted = false;
    
    // If no weights provided, treated as unweighted average
    if (weights && Object.keys(weights).length > 0) {
        isWeighted = true;
        // Only sum weights for items that actually exist in this subject's context
        itemIdentifiers.forEach(id => {
             // Verify item exists in current context
             if (allItems.find(t => t.key === id)) {
                 totalWeight += (weights[id] || 0);
             }
        });
    }

    let p1Total = 0, p1Count = 0, p2Total = 0, p2Count = 0;

    allChapters.forEach(ch => {
        let chapterSum = 0;
        let chapterDivisor = 0;

        itemIdentifiers.forEach(itemId => {
            const tIdx = allItems.findIndex(t => t.key === itemId);
            if (tIdx === -1) return;

            const key = `s_${subjectKey}_${ch.id}_${tIdx}`;
            const score = getPercent(userData[key] ?? 0);

            if (isWeighted && totalWeight > 0) {
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
    
    // Helper to determine which items apply to a specific subject
    const getItemsForSubject = (subKey: string) => {
        return settings.subjectConfigs?.[subKey] || settings.trackableItems;
    };

    // Helper to get weights for a specific subject (fallback to global)
    const getWeightsForSubject = (subKey: string) => {
        return settings.subjectWeights?.[subKey] || globalWeights;
    };

    // 1. Calculate Subject Weighted Scores
    let totalSubjectProgress = 0;
    
    subjects.forEach(s => {
        const items = getItemsForSubject(s);
        const w = getWeightsForSubject(s);
        const itemKeys = items.map(i => i.key);
        const p = calculateProgress(s, itemKeys, userData, w, items, syllabus);
        totalSubjectProgress += p.overall;
    });

    const composite = subjects.length > 0 ? totalSubjectProgress / subjects.length : 0;

    // 2. Breakdown Calculation
    // This is tricky with subject-specific weights. 
    // We will display the "Global Average" of that item type across all subjects.
    
    const allGlobalKeys = new Set<string>();
    settings.trackableItems.forEach(i => allGlobalKeys.add(i.key));
    if (settings.subjectConfigs) {
        Object.values(settings.subjectConfigs).forEach(items => {
            items.forEach(i => allGlobalKeys.add(i.key));
        });
    }

    let breakdown: any = {};
    let totalWeight = 0; // Only relevant if using global display, but here we calculate weighted average contribution
    
    // For the display, we use Global Weights as the "target" visual, or we average the weights?
    // Let's show the Global Weights for simplicity in the bar chart labels, 
    // but the Value is the real average.
    
    Array.from(allGlobalKeys).forEach(key => {
        let meta = settings.trackableItems.find(t => t.key === key);
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
            // Check if this subject tracks this item
            if (subjectItems.find(i => i.key === key)) {
                // Check weight
                const sWeights = getWeightsForSubject(s);
                // We only count it if it has weight in that subject (or exists)
                const p = calculateProgress(s, [key], userData, undefined, subjectItems, syllabus);
                itemSum += p.overall;
                subjectCount++;
            }
        });

        const avg = subjectCount > 0 ? itemSum / subjectCount : 0;
        const weight = globalWeights[key] || 0; // Visual reference
        
        breakdown[key] = { name: meta.name, val: avg, weight: weight, color: meta.color };
        if (weight > 0) totalWeight += weight;
    });

    return { composite, breakdown, totalWeight };
};

export const getStreak = (userData: UserData): number => {
    const dates = Object.keys(userData)
        .filter(k => k.startsWith('timestamp_'))
        .map(k => userData[k] ? new Date(userData[k]).toLocaleDateString('en-CA') : null)
        .filter(Boolean) as string[];
        
    const uniqueDates = [...new Set(dates)].sort().reverse();
    if (!uniqueDates.length) return 0;
    
    const today = new Date().toLocaleDateString('en-CA');
    const yesterday = new Date(Date.now() - 86400000).toLocaleDateString('en-CA');
    
    if (uniqueDates[0] !== today && uniqueDates[0] !== yesterday) return 0; 

    let streak = 1;
    let current = new Date(uniqueDates[0]);
    for (let i = 1; i < uniqueDates.length; i++) {
        current.setDate(current.getDate() - 1);
        if (uniqueDates[i] === current.toLocaleDateString('en-CA')) streak++;
        else break;
    }
    return streak;
};