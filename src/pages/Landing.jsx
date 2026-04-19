import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion, useScroll, useTransform } from 'framer-motion';
import { APP_BRAND, APP_IMAGES } from '@/config/appPaths';
import {
  Heart, Users, BarChart3, Shield, ArrowRight, ChevronDown,
  Wallet, Bell, Globe, Sparkles, CheckCircle2, Menu, X,
  MapPin, Building2, BookOpen, HandHeart, GraduationCap, Stethoscope, Home, Gift
} from 'lucide-react';

const fadeUp = { hidden: { opacity: 0, y: 30 }, visible: { opacity: 1, y: 0 } };
const stagger = { visible: { transition: { staggerChildren: 0.12 } } };

// Islamic 8-pointed star SVG
const Star8 = ({ size = 20, className = '' }) => (
  <svg width={size} height={size} viewBox="0 0 40 40" fill="currentColor" className={className}>
    <polygon points="20,2 22.87,13.07 32.73,7.27 26.93,17.13 38,20 26.93,22.87 32.73,32.73 22.87,26.93 20,38 17.13,26.93 7.27,32.73 13.07,22.87 2,20 13.07,17.13 7.27,7.27 17.13,13.07" />
  </svg>
);

function IslamicDivider({ bismillah = false }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.7 }}
      className="flex flex-col items-center gap-3 py-6"
    >
      {bismillah && (
        <div className="px-8 py-4 rounded-2xl bg-emerald-50/90 dark:bg-emerald-900/20 border border-emerald-200/60 dark:border-emerald-800/40 text-center mb-2">
          <p className="text-2xl sm:text-3xl text-emerald-700 dark:text-emerald-400 leading-loose" dir="rtl">
            بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ
          </p>
          <p className="text-xs text-emerald-600/70 dark:text-emerald-500/60 mt-1 tracking-widest uppercase">
            In the name of Allah, the Most Gracious, the Most Merciful
          </p>
        </div>
      )}
      <div className="flex items-center gap-3 w-full max-w-sm text-emerald-400/50 dark:text-emerald-600/40">
        <div className="flex-1 h-px bg-gradient-to-r from-transparent to-emerald-400/50 dark:to-emerald-600/50" />
        <Star8 size={11} className="opacity-60" />
        <Star8 size={20} />
        <Star8 size={11} className="opacity-60" />
        <div className="flex-1 h-px bg-gradient-to-l from-transparent to-emerald-400/50 dark:to-emerald-600/50" />
      </div>
    </motion.div>
  );
}

const features = [
  { icon: Wallet, title: 'Efficient Fund Management', desc: 'Track contributions, manage budgets, and monitor fund utilization with complete transparency and real-time reporting.' },
  { icon: Users, title: 'Member Management', desc: 'Comprehensive member registry with profiles, contribution history, and automated status tracking for the entire community.' },
  { icon: BarChart3, title: 'Smart Campaigns', desc: 'Create and manage fundraising campaigns with goal tracking, progress visualization, and automated challan generation.' },
  { icon: Shield, title: 'Transparent Reporting', desc: 'Detailed audit logs, financial reports, and fund utilization tracking ensuring complete accountability.' },
  { icon: Bell, title: 'Instant Notifications', desc: 'Keep members informed with real-time updates on campaigns, payments, and community announcements.' },
  { icon: Globe, title: 'GCC Community Connect', desc: 'Purpose-built for the GCC welfare community — bridging distances and strengthening bonds across the Gulf region.' },
];

const stats = [
  { value: 'Kasaragod', label: 'Kerala & Karnataka' },
  { value: '7 Languages', label: 'Saptha Basha Bhoomi' },
  { value: '6 Nations', label: 'GCC Presence' },
  { value: '100%', label: 'Transparent' },
];

function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  useEffect(() => {
    const handler = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handler, { passive: true });
    return () => window.removeEventListener('scroll', handler);
  }, []);

  return (
    <motion.nav
      initial={{ y: -100 }}
      animate={{ y: 0 }}
      transition={{ type: 'spring', stiffness: 100, damping: 20 }}
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${scrolled ? 'bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl shadow-lg shadow-emerald-900/5' : 'bg-transparent'
        }`}
    >
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 sm:h-20 items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 sm:h-10 sm:w-10 rounded-xl bg-white/90 dark:bg-slate-800 p-1.5 shadow-md">
              <img src={APP_IMAGES.LOGOS.PRIMARY} alt={APP_BRAND.NAME} className="h-full w-full object-contain" />
            </div>
            <span className="text-lg sm:text-xl font-bold bg-gradient-to-r from-emerald-700 to-teal-600 dark:from-emerald-400 dark:to-teal-300 bg-clip-text text-transparent">
              {APP_BRAND.NAME}
            </span>
          </div>
          {/* Desktop */}
          <div className="hidden sm:flex items-center gap-3">
            <Link to="/login" className="px-5 py-2.5 text-sm font-semibold text-white bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 rounded-xl shadow-lg shadow-emerald-600/25 hover:shadow-emerald-600/40 transition-all duration-300">
              Sign In
            </Link>
          </div>
          {/* Mobile */}
          <button onClick={() => setMobileOpen(!mobileOpen)} className="sm:hidden p-2 text-emerald-700 dark:text-emerald-300">
            {mobileOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>
        {mobileOpen && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="sm:hidden pb-4 flex flex-col gap-2">
            <Link to="/login" onClick={() => setMobileOpen(false)} className="px-4 py-3 text-sm font-semibold text-white bg-gradient-to-r from-emerald-600 to-teal-600 rounded-lg text-center">Sign In</Link>
          </motion.div>
        )}
      </div>
    </motion.nav>
  );
}

function HeroSection() {
  const { scrollY } = useScroll();
  const bgY = useTransform(scrollY, [0, 500], [0, 150]);

  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden pt-20">
      {/* Animated background */}
      <motion.div className="absolute inset-0" style={{ y: bgY }}>
        <div className="absolute inset-0" style={{
          backgroundImage: [
            'radial-gradient(circle at 20% 20%, rgba(16, 185, 129, 0.15), transparent 40%)',
            'radial-gradient(circle at 80% 30%, rgba(20, 184, 166, 0.12), transparent 35%)',
            'radial-gradient(circle at 70% 80%, rgba(5, 150, 105, 0.10), transparent 40%)',
            'radial-gradient(circle at 30% 70%, rgba(52, 211, 153, 0.08), transparent 35%)',
            'linear-gradient(145deg, #f0fdf4 0%, #ecfdf5 30%, #f0fdfa 60%, #f8fafc 100%)',
          ].join(','),
        }} />
        <div className="absolute inset-0 opacity-[0.04]" style={{
          backgroundImage: 'repeating-linear-gradient(45deg, rgba(16,185,129,0.3) 0 1px, transparent 1px 30px), repeating-linear-gradient(-45deg, rgba(20,184,166,0.3) 0 1px, transparent 1px 30px)',
        }} />
      </motion.div>

      {/* Floating orbs */}
      {[
        'top-20 left-[10%] w-64 h-64 bg-emerald-200/30',
        'bottom-20 right-[8%] w-80 h-80 bg-teal-200/25',
        'top-1/3 right-[20%] w-48 h-48 bg-emerald-300/20',
      ].map((cls, i) => (
        <motion.div key={i}
          animate={{ y: [0, -20, 0], scale: [1, 1.05, 1] }}
          transition={{ duration: 5 + i * 2, repeat: Infinity, ease: 'easeInOut' }}
          className={`absolute rounded-full blur-3xl pointer-events-none ${cls}`}
        />
      ))}

      <div className="relative z-10 mx-auto max-w-5xl px-4 sm:px-6 text-center">
        <motion.div initial="hidden" animate="visible" variants={stagger}>

          {/* Big Logo */}
          <motion.div variants={fadeUp} transition={{ duration: 0.4 }} className="mb-10 flex justify-center">
            <div className="relative">
              <div className="absolute inset-0 rounded-[2rem] bg-emerald-400/25 blur-3xl scale-125 animate-pulse" />
              <div className="relative h-28 w-28 sm:h-40 sm:w-40 rounded-[2rem] bg-white/95 dark:bg-slate-800 shadow-2xl shadow-emerald-500/25 p-4 sm:p-6 ring-1 ring-emerald-200 dark:ring-emerald-800">
                <img src={APP_IMAGES.LOGOS.PRIMARY} alt={APP_BRAND.NAME} className="h-full w-full object-contain" />
              </div>
            </div>
          </motion.div>

          <motion.div variants={fadeUp} transition={{ duration: 0.6 }}
            className="mb-6 inline-flex items-center gap-2 rounded-full bg-emerald-100/80 dark:bg-emerald-900/30 border border-emerald-200/60 px-4 py-2 text-sm font-medium text-emerald-700 dark:text-emerald-300 backdrop-blur-sm"
          >
            <MapPin className="h-4 w-4" /> Kerala &amp; Karnataka &bull; Gulf Region
          </motion.div>

          <motion.h1 variants={fadeUp} transition={{ duration: 0.7 }}
            className="text-3xl sm:text-5xl lg:text-6xl font-extrabold leading-tight tracking-tight"
          >
            <span className="text-slate-900 dark:text-white">Poyyathabail Jama'ath</span>
            <br />
            <span className="bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 bg-clip-text text-transparent">
              GCC Welfare Committee
            </span>
          </motion.h1>

          <motion.p variants={fadeUp} transition={{ duration: 0.7 }}
            className="mx-auto mt-6 max-w-2xl text-base sm:text-lg text-slate-600 dark:text-slate-300 leading-relaxed"
          >
            Rooted in Kasaragod — where Kerala meets Karnataka — the Poyyathabail Jama'ath GCC Welfare
            Committee carries forward a tradition of community, compassion, and collective responsibility.
            Serving our members and their families through welfare support, mutual aid, and transparent fund management.
          </motion.p>

          <motion.div variants={fadeUp} transition={{ duration: 0.7 }}
            className="mt-10 flex items-center justify-center"
          >
            <Link to="/login"
              className="group inline-flex items-center justify-center gap-2 px-8 py-4 text-base font-semibold text-white bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 rounded-2xl shadow-xl shadow-emerald-600/25 hover:shadow-emerald-600/40 transition-all duration-300 hover:-translate-y-0.5"
            >
              Sign In to Portal
              <ArrowRight className="h-5 w-5 group-hover:translate-x-1 transition-transform" />
            </Link>
          </motion.div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.5, duration: 1 }}
          className="mt-16"
        >
          <ChevronDown className="mx-auto h-6 w-6 text-emerald-400 animate-bounce" />
        </motion.div>
      </div>
    </section>
  );
}

function StatsSection() {
  return (
    <section className="relative py-16 bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700">
      <div className="absolute inset-0 opacity-10" style={{
        backgroundImage: 'repeating-linear-gradient(90deg, white 0 1px, transparent 1px 60px)',
      }} />
      <div className="relative mx-auto max-w-5xl px-4 sm:px-6">
        <motion.div initial="hidden" whileInView="visible" viewport={{ once: true, amount: 0.3 }} variants={stagger}
          className="grid grid-cols-2 md:grid-cols-4 gap-8"
        >
          {stats.map((s, i) => (
            <motion.div key={i} variants={fadeUp} transition={{ duration: 0.5 }} className="text-center">
              <div className="text-3xl sm:text-4xl font-extrabold text-white">{s.value}</div>
              <div className="mt-1 text-sm font-medium text-emerald-100">{s.label}</div>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}

function FeaturesSection() {
  return (
    <section id="features" className="py-20 sm:py-28 bg-white dark:bg-slate-950">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <motion.div initial="hidden" whileInView="visible" viewport={{ once: true, amount: 0.2 }} variants={stagger} className="text-center mb-16">
          <motion.div variants={fadeUp} className="inline-flex items-center gap-2 rounded-full bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-100 dark:border-emerald-800 px-4 py-2 text-sm font-medium text-emerald-600 dark:text-emerald-400 mb-4">
            <Building2 className="h-4 w-4" /> Member Portal
          </motion.div>
          <motion.h2 variants={fadeUp} className="text-3xl sm:text-4xl font-bold text-slate-900 dark:text-white">
            What Our Portal Offers
          </motion.h2>
          <motion.p variants={fadeUp} className="mt-4 max-w-2xl mx-auto text-slate-600 dark:text-slate-400">
            CharityHub brings the committee's welfare operations online — giving members and administrators a single, secure place to manage everything with full transparency.
          </motion.p>
        </motion.div>

        <motion.div initial="hidden" whileInView="visible" viewport={{ once: true, amount: 0.1 }} variants={stagger}
          className="grid md:grid-cols-2 lg:grid-cols-3 gap-6"
        >
          {features.map((f, i) => (
            <motion.div key={i} variants={fadeUp} transition={{ duration: 0.5 }}
              className="group relative p-6 sm:p-8 rounded-2xl border border-slate-100 dark:border-slate-800 bg-gradient-to-br from-white to-slate-50/50 dark:from-slate-900 dark:to-slate-800/50 hover:border-emerald-200 dark:hover:border-emerald-700 hover:shadow-xl hover:shadow-emerald-900/5 transition-all duration-300"
            >
              <div className="mb-4 inline-flex items-center justify-center h-12 w-12 rounded-xl bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-emerald-900/30 dark:to-teal-900/30 border border-emerald-100 dark:border-emerald-800 text-emerald-600 dark:text-emerald-400 group-hover:scale-110 transition-transform duration-300">
                <f.icon className="h-6 w-6" />
              </div>
              <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">{f.title}</h3>
              <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">{f.desc}</p>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}

function AboutSection() {
  const languages = ['Malayalam', 'Tulu', 'Beary Bashe', 'Kannada', 'Konkani'];

  return (
    <section className="py-20 sm:py-28 bg-white dark:bg-slate-950">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <motion.div initial="hidden" whileInView="visible" viewport={{ once: true, amount: 0.2 }} variants={stagger} className="text-center mb-16">
          <motion.div variants={fadeUp} className="inline-flex items-center gap-2 rounded-full bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-100 dark:border-emerald-800 px-4 py-2 text-sm font-medium text-emerald-600 dark:text-emerald-400 mb-4">
            <BookOpen className="h-4 w-4" /> About Us
          </motion.div>
          <motion.h2 variants={fadeUp} className="text-3xl sm:text-4xl font-bold text-slate-900 dark:text-white">
            Who We Are
          </motion.h2>
          <motion.p variants={fadeUp} className="mt-4 max-w-2xl mx-auto text-slate-600 dark:text-slate-400">
            A community united by shared roots, sustained by mutual care, and strengthened by collective action across borders.
          </motion.p>
        </motion.div>

        <IslamicDivider bismillah />

        {/* Poyyathabail — full-width featured card */}
        <motion.div
          initial="hidden" whileInView="visible" viewport={{ once: true, amount: 0.1 }} variants={stagger}
          className="mb-8 p-8 sm:p-10 rounded-3xl bg-gradient-to-br from-emerald-50 to-teal-50/40 dark:from-emerald-900/20 dark:to-teal-900/10 border border-emerald-100 dark:border-emerald-800/50"
        >
          <motion.div variants={fadeUp} className="flex items-center gap-3 mb-8">
            <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center text-white shrink-0">
              <MapPin className="h-6 w-6" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-slate-900 dark:text-white">Poyyathabail</h3>
              <p className="text-sm text-emerald-600 dark:text-emerald-400 font-medium">Saptha Bhasha Sangama Bhoomi — Land of Seven Languages</p>
            </div>
          </motion.div>

          <div className="grid lg:grid-cols-2 gap-8">
            {/* Left column: Location + Dargah */}
            <motion.div variants={stagger} className="space-y-6">
              <motion.div variants={fadeUp}>
                <p className="text-slate-600 dark:text-slate-400 leading-relaxed mb-3">
                  Poyyathabail is a serene and culturally rich locality in the <span className="font-semibold text-slate-700 dark:text-slate-300">Manjeshwar taluk of Kasaragod</span>,
                  Kerala — a district that uniquely sits at the confluence of Kerala and Karnataka. It embodies the
                  region's distinctive character as a land where diverse linguistic traditions, faiths, and communities
                  coexist in remarkable harmony.
                </p>
                <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
                  The surrounding landscape is characterised by lush hilly terrain and proximity to the coastal belt,
                  giving Poyyathabail a peaceful, village-like atmosphere. The area's agriculture reflects this natural
                  abundance — with cultivation of <span className="font-medium text-slate-700 dark:text-slate-300">areca nut, coconut, and cashews</span> forming the backbone of local livelihoods.
                </p>
              </motion.div>

              {/* Dargah Shareef */}
              <motion.div variants={fadeUp} className="p-5 rounded-2xl bg-white/70 dark:bg-slate-800/60 border border-emerald-100 dark:border-emerald-800/40">
                <div className="flex items-center gap-2 mb-3">
                  <Heart className="h-5 w-5 text-emerald-500 shrink-0" />
                  <h4 className="font-semibold text-slate-900 dark:text-white">Poyyathabail Dargah Shareef</h4>
                </div>
                <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                  The most prominent landmark of the area is the <span className="font-medium text-slate-700 dark:text-slate-300">Poyyathabail Dargah Shareef</span>,
                  dedicated to <span className="font-medium text-slate-700 dark:text-slate-300">Manavatti Beevi</span>. It is a deeply revered spiritual centre that draws
                  devotees from across the region regardless of religious affiliation — a living symbol of the
                  community's enduring spirit of openness, mutual respect, and communal harmony.
                </p>
              </motion.div>
            </motion.div>

            {/* Right column: People, Language, Culture */}
            <motion.div variants={stagger} className="space-y-6">
              {/* Languages */}
              <motion.div variants={fadeUp} className="p-5 rounded-2xl bg-white/70 dark:bg-slate-800/60 border border-teal-100 dark:border-teal-800/40">
                <div className="flex items-center gap-2 mb-3">
                  <Globe className="h-5 w-5 text-teal-500 shrink-0" />
                  <h4 className="font-semibold text-slate-900 dark:text-white">A Multilingual Community</h4>
                </div>
                <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed mb-4">
                  The people of Poyyathabail reflect the broader richness of Kasaragod — often fluent in multiple
                  languages, bridging cultures effortlessly in everyday life.
                </p>
                <div className="flex flex-wrap gap-2">
                  {languages.map((lang) => (
                    <span key={lang} className="px-3 py-1 text-xs font-semibold rounded-full bg-teal-100 dark:bg-teal-900/40 text-teal-700 dark:text-teal-300 border border-teal-200 dark:border-teal-700">
                      {lang}
                    </span>
                  ))}
                </div>
              </motion.div>

              {/* Harmony & Culture */}
              <motion.div variants={fadeUp} className="p-5 rounded-2xl bg-white/70 dark:bg-slate-800/60 border border-emerald-100 dark:border-emerald-800/40">
                <div className="flex items-center gap-2 mb-3">
                  <Users className="h-5 w-5 text-emerald-500 shrink-0" />
                  <h4 className="font-semibold text-slate-900 dark:text-white">Harmony &amp; Shared Belonging</h4>
                </div>
                <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                  A defining trait of Poyyathabail is its peaceful co-existence across faiths. The Dargah and local
                  temples share a history of mutual respect, with different communities participating in each other's
                  cultural and religious festivities. This spirit of shared belonging is not just a feature of the
                  place — it is the foundation upon which the Jama'ath and its welfare work are built.
                </p>
              </motion.div>
            </motion.div>
          </div>
        </motion.div>

        {/* 2-column: Jama'ath + GCC Committee */}
        <div className="grid lg:grid-cols-2 gap-8 mb-8">
          {/* Jama'ath */}
          <motion.div
            initial="hidden" whileInView="visible" viewport={{ once: true, amount: 0.2 }} variants={stagger}
            className="p-8 rounded-3xl bg-gradient-to-br from-emerald-50 to-teal-50/50 dark:from-emerald-900/20 dark:to-teal-900/10 border border-emerald-100 dark:border-emerald-800/50"
          >
            <motion.div variants={fadeUp} className="flex items-center gap-3 mb-5">
              <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center text-white shrink-0">
                <Building2 className="h-6 w-6" />
              </div>
              <h3 className="text-xl font-bold text-slate-900 dark:text-white">Poyyathabail Jama'ath</h3>
            </motion.div>
            <motion.p variants={fadeUp} className="text-slate-600 dark:text-slate-400 leading-relaxed mb-4">
              The Poyyathabail Jama'ath is the community's central institution — rooted in faith, shaped by decades
              of service, and guided by a commitment to the collective well-being of its members. It oversees
              religious, social, and welfare activities for the community and its families.
            </motion.p>
            <motion.p variants={fadeUp} className="text-slate-600 dark:text-slate-400 leading-relaxed">
              The Jama'ath has long championed community welfare — supporting families in need, facilitating access
              to education and healthcare, and organising collective aid programmes that strengthen bonds across
              generations and geographies.
            </motion.p>
          </motion.div>

          {/* GCC Committee */}
          <motion.div
            initial="hidden" whileInView="visible" viewport={{ once: true, amount: 0.2 }} variants={stagger}
            className="p-8 rounded-3xl bg-gradient-to-br from-teal-50 to-emerald-50/50 dark:from-teal-900/20 dark:to-emerald-900/10 border border-teal-100 dark:border-teal-800/50"
          >
            <motion.div variants={fadeUp} className="flex items-center gap-3 mb-5">
              <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-teal-500 to-emerald-500 flex items-center justify-center text-white shrink-0">
                <Globe className="h-6 w-6" />
              </div>
              <h3 className="text-xl font-bold text-slate-900 dark:text-white">GCC Welfare Committee</h3>
            </motion.div>
            <motion.p variants={fadeUp} className="text-slate-600 dark:text-slate-400 leading-relaxed mb-4">
              The GCC Welfare Committee is formed by members of the Poyyathabail community residing across the Gulf
              Cooperation Council — spanning the UAE, Saudi Arabia, Kuwait, Qatar, Bahrain, and Oman. United by
              shared heritage, this committee is the community's lifeline across borders.
            </motion.p>
            <motion.p variants={fadeUp} className="text-slate-600 dark:text-slate-400 leading-relaxed">
              The committee organises welfare campaigns, manages collected funds, and coordinates support for members
              and their families back home — from emergency relief and medical aid to education support and community
              development initiatives.
            </motion.p>
          </motion.div>
        </div>

        {/* About the Application */}
        <motion.div
          initial="hidden" whileInView="visible" viewport={{ once: true, amount: 0.2 }} variants={stagger}
          className="p-8 sm:p-10 rounded-3xl bg-gradient-to-br from-slate-50 to-slate-100/50 dark:from-slate-900 dark:to-slate-800/50 border border-slate-200 dark:border-slate-700"
        >
          <div className="grid sm:grid-cols-2 gap-8 items-start">
            <motion.div variants={stagger}>
              <motion.div variants={fadeUp} className="flex items-center gap-3 mb-5">
                <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center text-white shrink-0">
                  <BookOpen className="h-6 w-6" />
                </div>
                <h3 className="text-xl font-bold text-slate-900 dark:text-white">About This Portal</h3>
              </motion.div>
              <motion.p variants={fadeUp} className="text-slate-600 dark:text-slate-400 leading-relaxed mb-4">
                CharityHub is the official digital management portal for the Poyyathabail Jama'ath GCC Committee.
                It was developed to bring transparency, efficiency, and accessibility to the committee's welfare
                operations — replacing manual processes with a secure, organised, and reliable system.
              </motion.p>
              <motion.p variants={fadeUp} className="text-slate-600 dark:text-slate-400 leading-relaxed">
                Members can track contribution history, follow active campaigns, receive real-time announcements,
                and stay connected with the community — all from one centralised portal, accessible from
                anywhere in the world.
              </motion.p>
            </motion.div>
            <motion.ul variants={stagger} className="space-y-3 sm:pt-2">
              {[
                'Digitised member records and contribution tracking',
                'Transparent fund management and utilization reports',
                'Campaign and challan management for welfare drives',
                'Real-time community announcements and notifications',
                'Secure role-based access for admins and members',
                'Accessible from any device, anywhere in the GCC',
              ].map((p, i) => (
                <motion.li key={i} variants={fadeUp} className="flex items-start gap-3">
                  <CheckCircle2 className="h-5 w-5 text-emerald-500 mt-0.5 shrink-0" />
                  <span className="text-sm text-slate-700 dark:text-slate-300">{p}</span>
                </motion.li>
              ))}
            </motion.ul>
          </div>
        </motion.div>
      </div>
    </section>
  );
}

function WelfareSection() {
  const activities = [
    {
      icon: GraduationCap,
      title: 'Education Support',
      desc: 'Providing scholarships, tuition assistance, and educational grants to students from underprivileged families — ensuring that financial hardship is never a barrier to learning and a better future.',
    },
    {
      icon: Gift,
      title: 'Marriage Assistance',
      desc: 'Supporting families with daughters of marriageable age who are unable to bear the financial burden of marriage. The committee provides dignified assistance to ensure their daughters are married with respect and honour.',
    },
    {
      icon: Stethoscope,
      title: 'Healthcare Aid',
      desc: 'Helping members and their families access medical treatment, covering hospital expenses, medicines, and specialist consultations for those facing serious illness or financial hardship.',
    },
    {
      icon: Home,
      title: 'Area Development',
      desc: 'Investing in the development of the Poyyathabail locality — from infrastructure and sanitation improvements to supporting local institutions and public amenities that benefit the entire community.',
    },
    {
      icon: HandHeart,
      title: 'Emergency Relief',
      desc: 'Providing immediate financial and material relief to members and families affected by accidents, natural disasters, loss of livelihood, or sudden bereavement — standing by our community in their most difficult moments.',
    },
    {
      icon: Users,
      title: 'Community Development',
      desc: 'Organising skill development programmes, youth initiatives, and community-building activities that strengthen social bonds, improve livelihoods, and foster a sense of shared purpose across the Jama\'ath.',
    },
    {
      icon: Heart,
      title: 'Deceased Family Support',
      desc: 'Providing compassionate financial support to families who have lost their breadwinner, helping them sustain their household and rebuild stability during periods of grief and uncertainty.',
    },
    {
      icon: Building2,
      title: 'Institutional Support',
      desc: 'Contributing to the upkeep and development of mosques, madrasas, and local welfare institutions that serve as the spiritual and educational backbone of the Poyyathabail community.',
    },
    {
      icon: Globe,
      title: 'GCC Member Welfare',
      desc: 'Extending support to community members working in the Gulf — assisting with repatriation, legal aid, and emergency assistance for those facing difficulties far from home.',
    },
  ];

  return (
    <section className="py-20 sm:py-28 bg-slate-50/60 dark:bg-slate-900/60">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <motion.div initial="hidden" whileInView="visible" viewport={{ once: true, amount: 0.2 }} variants={stagger} className="text-center mb-16">
          <motion.div variants={fadeUp} className="inline-flex items-center gap-2 rounded-full bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-100 dark:border-emerald-800 px-4 py-2 text-sm font-medium text-emerald-600 dark:text-emerald-400 mb-4">
            <HandHeart className="h-4 w-4" /> Welfare Programmes
          </motion.div>
          <motion.h2 variants={fadeUp} className="text-3xl sm:text-4xl font-bold text-slate-900 dark:text-white">
            How We Support Our Community
          </motion.h2>
          <motion.p variants={fadeUp} className="mt-4 max-w-2xl mx-auto text-slate-600 dark:text-slate-400">
            The Poyyathabail Jama'ath GCC Committee runs a wide range of welfare programmes — touching every
            aspect of community life, from education and healthcare to development and dignity.
          </motion.p>
        </motion.div>

        <IslamicDivider />

        <motion.div initial="hidden" whileInView="visible" viewport={{ once: true, amount: 0.1 }} variants={stagger}
          className="grid md:grid-cols-2 lg:grid-cols-3 gap-6"
        >
          {activities.map((a, i) => (
            <motion.div key={i} variants={fadeUp} transition={{ duration: 0.5 }}
              className="group p-6 sm:p-7 rounded-2xl border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-emerald-200 dark:hover:border-emerald-700 hover:shadow-xl hover:shadow-emerald-900/5 transition-all duration-300"
            >
              <div className="mb-4 inline-flex items-center justify-center h-12 w-12 rounded-xl bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-emerald-900/30 dark:to-teal-900/30 border border-emerald-100 dark:border-emerald-800 text-emerald-600 dark:text-emerald-400 group-hover:scale-110 transition-transform duration-300">
                <a.icon className="h-6 w-6" />
              </div>
              <h3 className="text-base font-semibold text-slate-900 dark:text-white mb-2">{a.title}</h3>
              <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">{a.desc}</p>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}

function CTASection() {
  return (
    <section className="py-20 sm:py-28 bg-gradient-to-br from-slate-50 to-emerald-50/30 dark:from-slate-950 dark:to-emerald-950/10">
      <div className="mx-auto max-w-4xl px-4 sm:px-6 text-center">
        <motion.div initial="hidden" whileInView="visible" viewport={{ once: true, amount: 0.3 }} variants={stagger}>
          <motion.div variants={fadeUp} className="inline-flex items-center gap-2 rounded-full bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-100 dark:border-emerald-800 px-4 py-2 text-sm font-medium text-emerald-600 dark:text-emerald-400 mb-4">
            <Shield className="h-4 w-4" /> Member Portal
          </motion.div>
          <motion.h2 variants={fadeUp} className="text-2xl sm:text-4xl font-bold text-slate-900 dark:text-white mb-4">
            Access the Member Portal
          </motion.h2>
          <motion.p variants={fadeUp} className="text-slate-600 dark:text-slate-400 max-w-xl mx-auto mb-8">
            Sign in to manage your contributions, view campaign updates, and stay connected with the Poyyathabail Jama'ath GCC Welfare Organisation.
          </motion.p>
          <motion.div variants={fadeUp}>
            <Link to="/login"
              className="group inline-flex items-center justify-center gap-2 px-8 py-4 text-base font-semibold text-white bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 rounded-2xl shadow-xl shadow-emerald-600/25 hover:shadow-emerald-600/40 transition-all duration-300 hover:-translate-y-0.5"
            >
              Sign In to Portal <ArrowRight className="h-5 w-5 group-hover:translate-x-1 transition-transform" />
            </Link>
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
}

function WhySection() {
  const points = [
    'Financial aid for education — scholarships and grants for deserving students',
    'Marriage assistance for daughters of families who cannot afford it',
    'Medical and healthcare support for members facing illness or surgery',
    'Emergency relief for families in sudden hardship or bereavement',
    'Area development — local infrastructure, institutions, and public amenities',
    'Support for mosques, madrasas, and community institutions',
    'Welfare for GCC members facing difficulties far from home',
    'Every contribution tracked and accounted for with full transparency',
  ];

  return (
    <section className="py-20 sm:py-28 bg-slate-50/50 dark:bg-slate-900/50">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true, amount: 0.3 }} variants={stagger}>
            <motion.div variants={fadeUp} className="inline-flex items-center gap-2 rounded-full bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-100 dark:border-emerald-800 px-4 py-2 text-sm font-medium text-emerald-600 dark:text-emerald-400 mb-4">
              <HandHeart className="h-4 w-4" /> Our Commitment
            </motion.div>
            <motion.h2 variants={fadeUp} className="text-3xl sm:text-4xl font-bold text-slate-900 dark:text-white mb-4">
              Serving Our Community,<br />Across Every Border
            </motion.h2>
            <motion.p variants={fadeUp} className="text-slate-600 dark:text-slate-400 mb-8">
              The Poyyathabail Jama'ath GCC Committee is committed to the well-being of every member —
              whether at home in Kasaragod or living and working across Kerala, Karnataka, and the Gulf.
              Our welfare work is guided by trust, transparency, and a deep sense of shared responsibility.
            </motion.p>
            <motion.ul variants={stagger} className="space-y-3">
              {points.map((p, i) => (
                <motion.li key={i} variants={fadeUp} className="flex items-start gap-3">
                  <CheckCircle2 className="h-5 w-5 text-emerald-500 mt-0.5 shrink-0" />
                  <span className="text-sm text-slate-700 dark:text-slate-300">{p}</span>
                </motion.li>
              ))}
            </motion.ul>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.7 }}
            className="relative"
          >
            <div className="relative rounded-3xl overflow-hidden shadow-2xl border border-emerald-100 dark:border-emerald-800/50">
              <img
                src="/brand/poyyathabail.jpg"
                alt="Poyyathabail Jama'ath GCC Community"
                className="w-full h-full object-cover"
              />
            </div>
            <div className="absolute -top-4 -right-4 w-24 h-24 rounded-full bg-emerald-200/40 blur-2xl" />
            <div className="absolute -bottom-4 -left-4 w-32 h-32 rounded-full bg-teal-200/30 blur-2xl" />
          </motion.div>
        </div>
      </div>
    </section>
  );
}

function Footer() {
  return (
    <footer className="py-10 bg-slate-900 dark:bg-slate-950 border-t border-slate-800">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 rounded-lg bg-white/10 p-1.5">
              <img src={APP_IMAGES.LOGOS.PRIMARY} alt={APP_BRAND.NAME} className="h-full w-full object-contain brightness-0 invert" />
            </div>
            <span className="text-sm font-semibold text-white">{APP_BRAND.NAME}</span>
          </div>
          <p className="text-xs text-slate-400 text-center">
            © {new Date().getFullYear()} Poyyathabail Jama'ath GCC Welfare Organisation. All rights reserved.
          </p>
          <div className="flex items-center gap-4">
            <Link to="/login" className="text-xs text-slate-400 hover:text-emerald-400 transition-colors">Sign In</Link>
          </div>
        </div>

        {/* Developer credit */}
        <div className="mt-6 pt-5 border-t border-slate-800 flex flex-col items-center gap-1">
          <div className="flex items-center gap-2 text-emerald-600/60 mb-1">
            <Star8 size={9} className="opacity-50" />
            <Star8 size={13} className="opacity-70" />
            <Star8 size={9} className="opacity-50" />
          </div>
          <p className="text-xs text-slate-500">
            Crafted with care by{' '}
            <span className="text-emerald-400 font-semibold">Team Youth - Poyyathabail & Dharmanagar</span>
          </p>
          <p className="text-xs text-slate-600 italic">
            May Allah accept our efforts &mdash; your Du&apos;a is our greatest reward 🤲
          </p>
        </div>
      </div>
    </footer>
  );
}

export default function Landing() {
  return (
    <div className="min-h-screen bg-white dark:bg-slate-950 overflow-x-hidden">
      <Navbar />
      <HeroSection />
      <StatsSection />
      <AboutSection />
      <WelfareSection />
      <FeaturesSection />
      <WhySection />
      <IslamicDivider />
      <CTASection />
      <Footer />
    </div>
  );
}
