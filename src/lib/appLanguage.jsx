import React, { useCallback, useContext, useEffect, useMemo, useState } from "react";
import { APP_LANGUAGES, LANGUAGE_STORAGE_KEY, LanguageContext } from "@/lib/languageContext";
import ml from "@/lib/i18n/ml";
import kn from "@/lib/i18n/kn";

/*
 * App language: English (default), Malayalam or Kannada, one choice for the whole app.
 * - t("English text", { n: 3 }) gives the chosen language, falling back to the English text,
 *   so a screen never breaks when a sentence is not translated yet.
 * - The choice is kept on this device and on the account (it follows the person to other
 *   devices); the <html lang> attribute switches the font (Noto Sans Malayalam / Kannada).
 * Malayalam and Kannada were written by Claude: a native speaker should check them.
 */

const DICTS = { ml, kn };
const valid = (code) => APP_LANGUAGES.some((l) => l.code === code);

function readStored() {
  try {
    const v = window.localStorage.getItem(LANGUAGE_STORAGE_KEY);
    return valid(v) ? v : "en";
  } catch {
    return "en";
  }
}

export function translate(lang, text, vars) {
  let out = (lang !== "en" && DICTS[lang]?.[text]) || text;
  if (vars && typeof out === "string") {
    Object.entries(vars).forEach(([k, v]) => { out = out.split(`{${k}}`).join(String(v)); });
  }
  return out;
}

export function LanguageProvider({ children }) {
  const [lang, setLangState] = useState(readStored);

  useEffect(() => {
    try { window.localStorage.setItem(LANGUAGE_STORAGE_KEY, lang); } catch { /* optional */ }
    document.documentElement.lang = lang;
  }, [lang]);

  // Another tab changed it.
  useEffect(() => {
    const onStorage = (e) => { if (e.key === LANGUAGE_STORAGE_KEY && valid(e.newValue)) setLangState(e.newValue); };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  // saveToAccount: also remember it on the account (set by the signed-in layout).
  const [saveToAccount, setSaveToAccount] = useState(null);
  const setLang = useCallback((code) => {
    if (!valid(code)) return;
    setLangState(code);
    if (saveToAccount) saveToAccount(code);
  }, [saveToAccount]);

  const value = useMemo(() => {
    const locale = APP_LANGUAGES.find((l) => l.code === lang)?.locale || "en-IN";
    return {
      lang, locale, setLang,
      t: (text, vars) => translate(lang, text, vars),
      setLangQuietly: (code) => { if (valid(code)) setLangState(code); },  // from the account, no save back
      setSaveToAccount: (fn) => setSaveToAccount(() => fn),
    };
  }, [lang, setLang]);

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

/** { lang, locale, t, setLang } — works outside the provider too (English). */
export function useT() {
  const ctx = useContext(LanguageContext);
  return ctx || { lang: "en", locale: "en-IN", t: (text, vars) => translate("en", text, vars), setLang: () => {} };
}

/** English / മലയാളം / ಕನ್ನಡ buttons. */
export function AppLanguageSwitch({ className = "" }) {
  const { lang, setLang, t } = useT();
  return (
    <div role="radiogroup" aria-label={t("Language")} className={`inline-flex rounded-full border border-slate-200 bg-white p-0.5 shadow-sm ${className}`}>
      {APP_LANGUAGES.map((l) => {
        const on = lang === l.code;
        return (
          <button key={l.code} type="button" role="radio" aria-checked={on} lang={l.code} onClick={() => setLang(l.code)}
            className={`rounded-full px-3 py-1.5 text-sm font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 ${on ? "bg-emerald-600 text-white" : "text-slate-600 hover:bg-slate-100"}`}>
            {l.label}
          </button>
        );
      })}
    </div>
  );
}

/** "2026-10" -> "Oct 2026" in the chosen language (Malayalam / Kannada month names). */
export function monthName(month, locale = "en-IN") {
  const m = /^(\d{4})-(\d{2})$/.exec(String(month || ""));
  if (!m) return month || "";
  const date = new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, 1));
  return new Intl.DateTimeFormat(locale === "en-IN" ? "en-GB" : locale, { month: "short", year: "numeric", timeZone: "UTC" }).format(date);
}
