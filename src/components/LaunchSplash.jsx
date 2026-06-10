import { useEffect, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { APP_BRAND } from '@/config/appPaths';

// Splash is shown from June 12 to July 10, 2026
const SPLASH_START = new Date('2026-06-12T00:00:00');
const SPLASH_EXPIRY = new Date('2026-07-10T23:59:59');
const STORAGE_KEY = 'pmbgcc:launch_splash_v1';
const AUTO_CLOSE_SECONDS = 15;

// Islamic 8-pointed star
const Star8 = ({ size = 20, className = '' }) => (
    <svg width={size} height={size} viewBox="0 0 40 40" fill="currentColor" className={className}>
        <polygon points="20,2 22.87,13.07 32.73,7.27 26.93,17.13 38,20 26.93,22.87 32.73,32.73 22.87,26.93 20,38 17.13,26.93 7.27,32.73 13.07,22.87 2,20 13.07,17.13 7.27,7.27 17.13,13.07" />
    </svg>
);

const IslamicRow = () => (
    <div className="flex items-center gap-2 text-emerald-300/60 dark:text-emerald-600/60">
        <div className="flex-1 h-px bg-gradient-to-r from-transparent to-emerald-400/40 dark:to-emerald-600/40" />
        <Star8 size={9} className="opacity-50" />
        <Star8 size={16} />
        <Star8 size={9} className="opacity-50" />
        <div className="flex-1 h-px bg-gradient-to-l from-transparent to-emerald-400/40 dark:to-emerald-600/40" />
    </div>
);

export function LaunchSplash() {
    const [visible, setVisible] = useState(false);
    const [countdown, setCountdown] = useState(AUTO_CLOSE_SECONDS);
    const timerRef = useRef(null);

    useEffect(() => {
        // Never show past expiry date
        if (new Date() >= SPLASH_EXPIRY) return;
        // Never show if already dismissed
        if (localStorage.getItem(STORAGE_KEY)) return;
        setVisible(true);
    }, []);

    useEffect(() => {
        if (!visible) return;
        timerRef.current = setInterval(() => {
            setCountdown(prev => {
                if (prev <= 1) {
                    dismiss();
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);
        return () => clearInterval(timerRef.current);
    }, [visible]);

    const dismiss = () => {
        clearInterval(timerRef.current);
        localStorage.setItem(STORAGE_KEY, '1');
        setVisible(false);
    };

    return (
        <AnimatePresence>
            {visible && (
                <motion.div
                    key="launch-splash"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0, scale: 1.04, transition: { duration: 0.5, ease: 'easeIn' } }}
                    transition={{ duration: 0.6 }}
                    className="fixed inset-0 z-[9999] flex items-center justify-center p-4 overflow-hidden bg-white dark:bg-slate-950"
                    style={{
                        background: window.matchMedia('(prefers-color-scheme: dark)').matches
                            ? 'linear-gradient(135deg, #0f172a 0%, #1a2332 30%, #164e63 60%, #0c4a6e 100%)'
                            : 'linear-gradient(135deg, #064e3b 0%, #065f46 30%, #047857 60%, #059669 100%)',
                    }}
                >
                    {/* Decorative background circles */}
                    <div className="absolute inset-0 overflow-hidden pointer-events-none">
                        <div className="absolute -top-32 -left-32 w-96 h-96 rounded-full bg-emerald-400/10 dark:bg-cyan-400/10 blur-3xl" />
                        <div className="absolute -bottom-32 -right-32 w-96 h-96 rounded-full bg-teal-300/10 dark:bg-blue-400/10 blur-3xl" />
                        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full border border-emerald-400/10 dark:border-cyan-600/10" />
                        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] rounded-full border border-emerald-400/10 dark:border-cyan-600/10" />
                        {/* Scattered stars */}
                        {[...Array(8)].map((_, i) => (
                            <motion.div
                                key={i}
                                className="absolute text-emerald-300/20 dark:text-cyan-400/20"
                                style={{
                                    top: `${10 + (i * 11) % 80}%`,
                                    left: `${5 + (i * 17) % 90}%`,
                                }}
                                animate={{ rotate: 360 }}
                                transition={{ duration: 20 + i * 3, repeat: Infinity, ease: 'linear' }}
                            >
                                <Star8 size={12 + (i % 3) * 8} />
                            </motion.div>
                        ))}
                    </div>

                    {/* Card */}
                    <motion.div
                        initial={{ scale: 0.88, opacity: 0, y: 30 }}
                        animate={{ scale: 1, opacity: 1, y: 0 }}
                        exit={{ scale: 0.92, opacity: 0 }}
                        transition={{ duration: 0.65, ease: [0.22, 1, 0.36, 1] }}
                        className="relative w-full max-w-lg bg-white/5 dark:bg-slate-900/20 backdrop-blur-xl rounded-3xl border border-white/10 dark:border-cyan-500/20 shadow-2xl p-8 sm:p-10 text-center"
                    >
                        {/* Bismillah */}
                        <motion.div
                            initial={{ opacity: 0, y: -10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.3 }}
                            className="mb-6"
                        >
                            <p
                                className="text-2xl sm:text-3xl text-emerald-200 dark:text-cyan-300 leading-loose tracking-wide"
                                dir="rtl"
                            >
                                بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ
                            </p>
                            <p className="text-xs text-emerald-300/60 dark:text-cyan-400/60 mt-1 tracking-widest uppercase">
                                In the name of Allah, the Most Gracious, the Most Merciful
                            </p>
                        </motion.div>

                        <IslamicRow />

                        {/* Launch badge */}
                        <motion.div
                            initial={{ opacity: 0, scale: 0.8 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ delay: 0.45 }}
                            className="mt-6 mb-3 inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-emerald-400/20 dark:bg-cyan-400/20 border border-emerald-400/30 dark:border-cyan-400/30 text-emerald-200 dark:text-cyan-300 text-xs font-semibold tracking-widest uppercase"
                        >
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 dark:bg-cyan-400 animate-pulse" />
                            We Are Live
                        </motion.div>

                        {/* App Name */}
                        <motion.h1
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.55 }}
                            className="text-4xl sm:text-5xl font-bold text-white tracking-tight mt-2"
                        >
                            {APP_BRAND.NAME}
                        </motion.h1>

                        {/* Tagline */}
                        <motion.p
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ delay: 0.65 }}
                            className="mt-2 text-emerald-200/80 dark:text-cyan-300/80 text-base font-medium"
                        >
                            {APP_BRAND.TAGLINE}
                        </motion.p>

                        <IslamicRow />

                        {/* Description */}
                        <motion.p
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ delay: 0.75 }}
                            className="mt-5 text-emerald-100/70 dark:text-cyan-200/70 text-sm leading-relaxed max-w-sm mx-auto"
                        >
                            Alhamdulillah — our official member portal is now live.
                            Manage contributions, campaigns, and community welfare — all in one place,
                            built with trust and transparency.
                        </motion.p>

                        {/* Enter button */}
                        <motion.button
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.85 }}
                            whileHover={{ scale: 1.03 }}
                            whileTap={{ scale: 0.97 }}
                            onClick={dismiss}
                            className="mt-8 w-full py-3.5 rounded-2xl bg-emerald-400 dark:bg-cyan-400 hover:bg-emerald-300 dark:hover:bg-cyan-300 text-emerald-950 dark:text-slate-950 font-bold text-base tracking-wide transition-colors shadow-lg shadow-emerald-900/40 dark:shadow-cyan-900/40"
                        >
                            Enter Portal
                        </motion.button>

                        {/* Auto-close countdown */}
                        <motion.p
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ delay: 1 }}
                            className="mt-4 text-emerald-400/50 dark:text-cyan-500/50 text-xs"
                        >
                            Continues automatically in {countdown}s
                        </motion.p>

                        {/* Expiry notice */}
                        <p className="mt-3 text-emerald-500/40 dark:text-cyan-600/40 text-[10px]">
                            Yes, Available & live 
                        </p>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}
