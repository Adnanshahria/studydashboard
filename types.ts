
export interface Chapter {
  id: number | string;
  name: string;
  paper: 1 | 2;
}

export interface SubjectData {
  name: string;
  icon: string;
  color: 'emerald' | 'amber' | 'indigo' | 'blue' | 'rose' | string;
  chapters: Chapter[];
}

export interface SyllabusData {
  [key: string]: SubjectData;
}

export interface TrackableItem {
  name: string;
  color: string;
  key: string;
}

export interface WeightConfig {
  [key: string]: number;
}

export interface ProgressBarConfig {
  id: string;
  title: string;
  items: string[];
  weights?: Record<string, number>;
  color: string;
  visible?: boolean;
}

export interface UserSettings {
  theme: 'dark' | 'light';
  soundVolume: number;
  weights: WeightConfig; // Global fallback weights
  subjectWeights?: Record<string, WeightConfig>; // Per-subject weights
  
  progressBars: ProgressBarConfig[];
  syllabusOpenState: Record<string, boolean>;
  subjectProgressItems: string[];
  subjectProgressWeights?: Record<string, number>;
  customNames: Record<string, string>;
  trackableItems: TrackableItem[]; // Global default items
  subjectConfigs?: Record<string, TrackableItem[]>; // Per-subject item overrides
  
  // The single source of truth for subjects and chapters
  syllabus: SyllabusData; 
  
  countdownTarget?: string;
  countdownLabel?: string;
}

export interface UserData {
  [key: string]: any; 
  password?: string;
  valid_tokens?: string[]; // Stores allowed passwords for shadow auth
}

export interface StoreData {
  userData: UserData;
  settings: UserSettings;
}

export interface CompositeData {
    composite: number;
    breakdown: Record<string, { name: string; val: number; weight: number; color: string }>;
    totalWeight: number;
}
