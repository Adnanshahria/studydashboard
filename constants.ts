import { SyllabusData, TrackableItem, UserSettings, ProgressBarConfig } from './types';

// Seed data for new users
export const INITIAL_SYLLABUS_DATA: SyllabusData = {
  biology: {
    name: "Biology",
    icon: "🧬",
    color: "emerald",
    chapters: [
      { id: 1, name: "কোষ ও এর গঠন", paper: 1 }, { id: 2, name: "কোষ বিভাজন", paper: 1 }, { id: 3, name: "কোষ রসায়ন", paper: 1 }, { id: 4, name: "অণুজীব", paper: 1 }, { id: 5, name: "শৈবাল ও ছত্রাক", paper: 1 }, { id: 6, name: "ব্রায়োফাইটা ও টেরিডোফাইটা", paper: 1 }, { id: 7, name: "নগ্নবীজী ও আবৃতবীজী উদ্ভিদ", paper: 1 }, { id: 8, name: "টিস্যু ও টিস্যুতন্ত্র", paper: 1 }, { id: 9, name: "উদ্ভিদ শারীরতত্ত্ব", paper: 1 }, { id: 10, name: "উদ্ভিদ প্রজনন", paper: 1 }, { id: 11, name: "জীবপ্রযুক্তি", paper: 1 }, { id: 12, name: "জীবের পরিবেশ, বিস্তার ও সংরক্ষণ", paper: 1 },
      { id: 13, name: "প্রাণীর বিভিন্নতা ও শ্রেণিবিন্যাস", paper: 2 }, { id: 14, name: "হাইড্রা", paper: 2 }, { id: 15, name: "ঘাসফড়িং", paper: 2 }, { id: 16, name: "রুই মাছ", paper: 2 }, { id: 17, name: "পরিপাক ও শোষণ", paper: 2 }, { id: 18, name: "রক্ত ও সংবহন", paper: 2 }, { id: 19, name: "শ্বসন ও শ্বাসক্রিয়া", paper: 2 }, { id: 20, name: "রেচন ও অভিস্রবণ", paper: 2 }, { id: 21, name: "চলন ও অঙ্গচালনা", paper: 2 }, { id: 22, name: "সমন্বয় ও নিঃসরণ", paper: 2 }, { id: 23, name: "মানব জীবনের ধারাবাহিকতা", paper: 2 }, { id: 24, name: "মানবদেহের প্রতিরক্ষা", paper: 2 }, { id: 25, name: "জিনতত্ত্ব ও বিবর্তন", paper: 2 }, { id: 26, name: "প্রাণীর আচরণ", paper: 2 }
    ]
  },
  chemistry: {
    name: "Chemistry",
    icon: "🧪",
    color: "amber",
    chapters: [
      { id: 1, name: "ল্যাবরেটরির নিরাপদ ব্যবহার", paper: 1 }, { id: 2, name: "গুণগত রসায়ন", paper: 1 }, { id: 3, name: "মৌলের পর্যায়বৃত্ত ধর্ম ও রাসায়নিক বন্ধন", paper: 1 }, { id: 4, name: "রাসায়নিক পরিবর্তন", paper: 1 }, { id: 5, name: "কর্মমুখী রসায়ন", paper: 1 },
      { id: 6, name: "পরিবেশ রসায়ন", paper: 2 }, { id: 7, name: "জৈব রসায়ন", paper: 2 }, { id: 8, name: "পরিমাণগত রসায়ন", paper: 2 }, { id: 9, name: "তড়িৎ রসায়ন", paper: 2 }, { id: 10, name: "অর্থনৈতিক রসায়ন", paper: 2 }
    ]
  },
  physics: {
    name: "Physics",
    icon: "⚛️",
    color: "indigo",
    chapters: [
      { id: 1, name: "ভৌত জগৎ ও পরিমাপ", paper: 1 }, { id: 2, name: "ভেক্টর", paper: 1 }, { id: 3, name: "গতিবিদ্যা", paper: 1 }, { id: 4, name: "নিউটনীয় বলবিদ্যা", paper: 1 }, { id: 5, name: "কাজ, শক্তি ও ক্ষমতা", paper: 1 }, { id: 6, name: "মহাকর্ষ ও অভিকর্ষ", paper: 1 }, { id: 7, name: "পদার্থের গাঠনিক ধর্ম", paper: 1 }, { id: 8, name: "পর্যায়বৃত্ত গতি", paper: 1 }, { id: 9, name: "তরঙ্গ", paper: 1 }, { id: 10, name: "আদর্শ গ্যাস ও গ্যাসের গতিতত্ত্ব", paper: 1 },
      { id: 11, name: "তাপগতিবিদ্যা", paper: 2 }, { id: 12, name: "স্থির তড়িৎ", paper: 2 }, { id: 13, name: "চল তড়িৎ", paper: 2 }, { id: 14, name: "তড়িৎ প্রবাহের চৌম্বক ক্রিয়া ও চুম্বকত্ব", paper: 2 }, { id: 15, name: "তড়িৎচৌম্বকীয় আবেশ ও পরিবর্তী প্রবাহ", paper: 2 }, { id: 16, name: "জ্যামিতিক আলোকবিজ্ঞান", paper: 2 }, { id: 17, name: "ভৌত আলোকবিজ্ঞান", paper: 2 }, { id: 18, name: "আধুনিক পদার্থবিজ্ঞানের সূচনা", paper: 2 }, { id: 19, name: "পরমাণুর মডেল ও নিউক্লিয়ার পদার্থবিজ্ঞান", paper: 2 }, { id: 20, name: "সেমিকন্ডাক্টর ও ইলেকট্রনিক্স", paper: 2 }, { id: 21, name: "জ্যোতির্বিজ্ঞান", paper: 2 }
    ]
  }
};

export const TRACKABLE_ITEMS: TrackableItem[] = [
  { name: "Main Book", color: "bg-sky-500", key: "mainbook" },
  { name: "Class", color: "bg-blue-500", key: "class" },
  { name: "Rev Class", color: "bg-indigo-500", key: "revclass" },
  { name: "Meditrics", color: "bg-teal-500", key: "meditrics" },
  { name: "MQB", color: "bg-amber-500", key: "mqb" },
  { name: "SF Exam", color: "bg-rose-500", key: "sfexam" },
  { name: "Rev 1", color: "bg-violet-500", key: "rev1" },
  { name: "Rev 2", color: "bg-purple-500", key: "rev2" }
];

export const DEFAULT_PROGRESS_CONFIG: ProgressBarConfig[] = [
  { id: 'p1', title: 'Concept & Learning', items: ['mainbook', 'class', 'revclass'], color: 'from-sky-400 to-sky-600', visible: true },
  { id: 'p2', title: 'Practice & Solve', items: ['meditrics', 'mqb'], color: 'from-amber-400 to-amber-600', visible: true },
  { id: 'p3', title: 'Revision & Exams', items: ['sfexam', 'rev1', 'rev2'], color: 'from-rose-400 to-rose-600', visible: true }
];

export const DEFAULT_SETTINGS: UserSettings = {
  theme: 'dark',
  soundVolume: 0.3,
  weights: {
    mainbook: 15, class: 10, revclass: 10, meditrics: 10,
    mqb: 25, sfexam: 10, rev1: 10, rev2: 10
  },
  progressBars: JSON.parse(JSON.stringify(DEFAULT_PROGRESS_CONFIG)),
  syllabusOpenState: {},
  subjectProgressItems: TRACKABLE_ITEMS.map(t => t.key),
  customNames: {},
  trackableItems: JSON.parse(JSON.stringify(TRACKABLE_ITEMS)),
  
  // Initialized with static data, but this object in state will be mutable
  syllabus: JSON.parse(JSON.stringify(INITIAL_SYLLABUS_DATA)),
  
  countdownLabel: 'Time Remaining',
  countdownTarget: '2025-12-12T00:00:00+06:00'
};

export const FIREBASE_CONFIG = {
  apiKey: "AIzaSyDTLhIkrW9qk6KPT_gTDibIiJeVwWYTowk",
  authDomain: "my-study-dashboard.firebaseapp.com",
  databaseURL: "https://my-study-dashboard-default-rtdb.firebaseio.com",
  projectId: "my-study-dashboard",
  storageBucket: "my-study-dashboard.firebasestorage.app",
  messagingSenderId: "66307909031",
  appId: "1:66307909031:web:9e724a43c8c11a0ef80282",
  measurementId: "G-141B2W7XHN"
};
export const FIRESTORE_USER_ID = 'as19';