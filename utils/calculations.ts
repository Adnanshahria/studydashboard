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
    if (weights && Object.keys(weights).length > 0) {
        isWeighted = true;
        itemIdentifiers.forEach(id => totalWeight += (weights[id] || 0));
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
    const w = settings.weights || {};
    const syllabus = settings.syllabus;
    const subjects = Object.keys(syllabus);
    const allItems = settings.trackableItems || TRACKABLE_ITEMS;
    
    const getGlobalItemAvg = (itemKey: string) => {
        let sum = 0;
        if (subjects.length === 0) return 0;
        
        subjects.forEach(s => {
            const p = calculateProgress(s, [itemKey], userData, undefined, allItems, syllabus);
            sum += p.overall;
        });
        return sum / subjects.length;
    };

    let totalWeightedScore = 0;
    let totalWeight = 0;
    let breakdown: any = {};

    allItems.forEach(item => {
        const weight = w[item.key] || 0;
        const avg = getGlobalItemAvg(item.key);
        
        breakdown[item.key] = { name: item.name, val: avg, weight: weight, color: item.color };
        
        if (weight > 0) {
            totalWeightedScore += avg * weight;
            totalWeight += weight;
        }
    });

    const composite = totalWeight > 0 ? totalWeightedScore / totalWeight : 0;
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