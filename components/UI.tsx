import React from 'react';

interface ModalProps {
    isOpen: boolean;
    onClose: () => void;
    title: string;
    children: React.ReactNode;
    className?: string;
}

export const Modal: React.FC<ModalProps> = ({ isOpen, onClose, title, children, className = '' }) => {
    if (!isOpen) return null;
    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
            <div className={`glass-card w-full max-w-lg rounded-2xl p-0 flex flex-col max-h-[80vh] shadow-2xl ${className}`}>
                <div className="p-4 border-b border-slate-200 dark:border-white/10 flex justify-between items-center bg-slate-50/50 dark:bg-white/5">
                    <h3 className="font-bold text-sm uppercase tracking-wider text-slate-700 dark:text-slate-200">{title}</h3>
                    <button onClick={onClose} className="text-slate-400 hover:text-slate-800 dark:hover:text-white transition-colors">✕</button>
                </div>
                <div className="p-6 overflow-y-auto custom-scrollbar flex-1 bg-white/50 dark:bg-transparent">
                    {children}
                </div>
            </div>
        </div>
    );
};

export const Button: React.FC<React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'primary' | 'secondary' | 'ghost' }> = ({ variant = 'primary', className, ...props }) => {
    const base = "px-4 py-2 rounded-lg text-xs font-bold transition-all duration-200 active:scale-95";
    const variants = {
        primary: "bg-blue-600 text-white hover:bg-blue-700 shadow-lg shadow-blue-500/20",
        secondary: "bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-white/10 hover:border-slate-300 dark:hover:border-white/20",
        ghost: "text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/5"
    };
    return <button className={`${base} ${variants[variant]} ${className}`} {...props} />;
};

export const ProgressBar: React.FC<{ progress: number; color?: string; className?: string }> = ({ progress, color = 'bg-blue-500', className = '' }) => (
    <div className={`w-full h-2 bg-slate-200 dark:bg-slate-700/50 rounded-full overflow-hidden ${className}`}>
        <div 
            className={`h-full rounded-full transition-all duration-700 relative ${color}`} 
            style={{ width: `${progress}%` }}
        >
             <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-shimmer"></div>
        </div>
    </div>
);