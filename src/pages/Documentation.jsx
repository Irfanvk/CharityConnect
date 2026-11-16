import React, { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link, useSearchParams } from "react-router-dom";
import {
  AlertCircle, ArrowLeft, BadgeCheck, Bell, BookOpen, CalendarPlus, Camera, ChevronRight, ExternalLink, FileSpreadsheet,
  HandCoins, HandHeart, Heart, Image, Inbox, KeyRound, Landmark, Megaphone, MessageSquare, Search, Shield, Smartphone,
  Upload, UserPen, UserPlus, UserRound, Wallet, X,
} from "lucide-react";
import { charityClient } from "@/api/charityClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useReportsLanguage } from "@/lib/reportsI18n";
import { LanguageSwitch } from "@/components/reports/simple/ReportsShared";
import { GUIDE_TASKS, GUIDE_TEXT } from "@/lib/guideContent";

/*
 * User guide: "How do I…?" cards with search, in English / Malayalam / Kannada.
 * Members see the everyday tasks; admins see those plus the admin tasks.
 * A card opens numbered steps, a screenshot (sample data only) and an "Open this page" button.
 */

// Only the icons the guide uses (importing the whole icon set would make the app much bigger).
const Icons = {
  Wallet, Upload, CalendarPlus, Landmark, Camera, UserPen, Bell, KeyRound, Smartphone, HandHeart, Heart, MessageSquare, HandCoins, BadgeCheck, Inbox, UserPlus, Search, UserRound, AlertCircle, FileSpreadsheet, Image, Megaphone, Shield,
};

function TaskIcon({ name, className }) {
  const Icon = Icons[name] || BookOpen;
  return <Icon className={className} />;
}

function TaskCard({ task, lang, onOpen }) {
  return (
    <button
      type="button"
      onClick={() => onOpen(task.id)}
      className="flex w-full items-center gap-3 rounded-2xl border border-slate-200 bg-white p-4 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-emerald-300 hover:shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 dark:border-slate-700 dark:bg-slate-900"
    >
      <span className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl ${task.role === "admin" ? "bg-indigo-50 text-indigo-700" : "bg-emerald-50 text-emerald-700"}`}>
        <TaskIcon name={task.icon} className="h-6 w-6" />
      </span>
      <span className="min-w-0 flex-1 text-base font-semibold text-slate-900 dark:text-white">{task.title[lang] || task.title.en}</span>
      <ChevronRight className="h-5 w-5 shrink-0 text-slate-400" />
    </button>
  );
}

function TaskDetail({ task, lang, T, onBack }) {
  const steps = task.steps[lang] || task.steps.en;
  const [shotOk, setShotOk] = useState(true);
  return (
    <div className="space-y-4">
      <Button variant="outline" onClick={onBack} className="h-11 gap-1.5 bg-white"><ArrowLeft className="h-5 w-5" />{T.back}</Button>
      <div className="flex items-center gap-3">
        <span className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl ${task.role === "admin" ? "bg-indigo-50 text-indigo-700" : "bg-emerald-50 text-emerald-700"}`}>
          <TaskIcon name={task.icon} className="h-7 w-7" />
        </span>
        <h2 className="text-2xl font-bold text-slate-900 dark:text-white">{task.title[lang] || task.title.en}</h2>
      </div>

      <div className="grid gap-4 md:grid-cols-[1fr_260px]">
        <ol className="space-y-3">
          {steps.map((step, i) => (
            <li key={i} className="flex gap-3 rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-emerald-600 text-base font-bold text-white">{i + 1}</span>
              <span className="pt-0.5 text-base leading-relaxed text-slate-800 dark:text-slate-100">{step}</span>
            </li>
          ))}
        </ol>
        {task.shot && shotOk && (
          <figure className="mx-auto w-full max-w-[260px] overflow-hidden rounded-2xl border border-slate-200 bg-slate-50 shadow-sm dark:border-slate-700">
            <img src={task.shot} alt="" loading="lazy" className="w-full" onError={() => setShotOk(false)} />
          </figure>
        )}
      </div>

      {task.page && (
        <Button asChild className="h-12 gap-2 bg-emerald-600 px-6 text-base hover:bg-emerald-700">
          <Link to={task.page}><ExternalLink className="h-5 w-5" />{T.open}</Link>
        </Button>
      )}
      <p className="text-sm text-slate-500">{T.stillStuck}</p>
    </div>
  );
}

export default function Documentation() {
  const L = useReportsLanguage();
  const lang = L.lang;
  const T = GUIDE_TEXT[lang] || GUIDE_TEXT.en;
  const [params, setParams] = useSearchParams();
  const [search, setSearch] = useState("");
  const { data: user } = useQuery({ queryKey: ["me"], queryFn: () => charityClient.auth.me() });
  const isAdmin = user?.role === "admin" || user?.role === "superadmin";

  const openId = params.get("topic");
  const open = GUIDE_TASKS.find((t) => t.id === openId && (t.role === "member" || isAdmin));
  const setOpen = (id) => {
    const next = new URLSearchParams(params);
    if (id) next.set("topic", id); else next.delete("topic");
    setParams(next);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const visible = useMemo(() => {
    const term = search.trim().toLowerCase();
    return GUIDE_TASKS.filter((t) => t.role === "member" || isAdmin).filter((t) => {
      if (!term) return true;
      const hay = [t.words, ...Object.values(t.title), ...Object.values(t.steps).flat()].join(" ").toLowerCase();
      return term.split(/\s+/).every((w) => hay.includes(w));
    });
  }, [search, isAdmin]);
  const groups = [["member", T.memberTasks], ["admin", T.adminTasks]]
    .map(([role, heading]) => [heading, visible.filter((t) => t.role === role)])
    .filter(([, items]) => items.length);

  return (
    <div className="mx-auto max-w-4xl space-y-5" lang={L.locale}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold text-slate-900 dark:text-white"><BookOpen className="h-7 w-7 text-emerald-600" />{T.title}</h1>
          {!open && <p className="text-slate-600 dark:text-slate-300">{T.sub}</p>}
        </div>
        <LanguageSwitch L={L} />
      </div>

      {open ? (
        <TaskDetail task={open} lang={lang} T={T} onBack={() => setOpen(null)} />
      ) : (
        <>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
            <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder={T.search} aria-label={T.search} className="h-12 bg-white pl-11 pr-10 text-base" />
            {search && (
              <button type="button" onClick={() => setSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2 rounded p-1 text-slate-400 hover:text-slate-600" aria-label="Clear">
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
          {groups.length === 0 ? (
            <p className="rounded-2xl border border-slate-200 bg-white p-6 text-center text-slate-500">{T.noResults}</p>
          ) : (
            groups.map(([heading, items]) => (
              <section key={heading} className="space-y-2">
                <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">{heading}</h2>
                <div className="grid gap-2 sm:grid-cols-2">
                  {items.map((t) => <TaskCard key={t.id} task={t} lang={lang} onOpen={setOpen} />)}
                </div>
              </section>
            ))
          )}
          <p className="text-sm text-slate-500">{T.stillStuck}</p>
        </>
      )}
    </div>
  );
}
