import React, { useRef, useState } from "react";
import { Loader2, Upload } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { charityClient } from "@/api/charityClient";
import { useToast } from "@/components/ui/use-toast";
import { THEME_IDS, THEME_PRESETS } from "@/themes/presets";
import ThemeDecoration from "@/components/branding/ThemeDecoration";

const MAX_IMAGE_BYTES = 1024 * 1024;
const PLACEHOLDER_RE = /\{(\w*)\}/g;

// Client-side check mirrors the backend; the backend remains the source of truth.
export function validateSetting(s, value) {
  if (s.type === "bool") return "";
  if (s.type === "int") {
    if (value === "" || value === null || Number.isNaN(Number(value))) return "Enter a number";
    const n = Number(value);
    if (!Number.isInteger(n)) return "Must be a whole number";
    if (n < s.min || n > s.max) return `Must be between ${s.min} and ${s.max} ${s.unit || ""}`.trim();
    return "";
  }
  const text = String(value ?? "");
  if (s.required && !text.trim()) return "This field is required";
  if (/[<>]/.test(text)) return "Angle brackets are not allowed (plain text only)";
  if (s.max_len && text.length > s.max_len) return `At most ${s.max_len} characters`;
  if (!text) return "";
  if (s.type === "url" && !/^https:\/\//i.test(text)) return "Must start with https://";
  if (s.type === "date" && !/^\d{4}-\d{2}-\d{2}$/.test(text)) return "Use a valid date";
  if (s.type === "template") {
    const unknown = [...text.matchAll(PLACEHOLDER_RE)].map((m) => m[1]).filter((n) => !(s.placeholders || []).includes(n));
    if (unknown.length) return `Unknown placeholder: ${unknown.map((n) => `{${n}}`).join(", ")}`;
  }
  return "";
}

export const SAMPLE_VALUES = {
  member_name: "Ahmed",
  month: "Oct 2026",
  amount: "₹500",
  payment: "monthly payment for Oct 2026 (₹500)",
  org_name: "your organisation",
  reason: "Proof image was unclear",
  invite_code: "ABC123",
  registration_url: "https://example.org/register",
  expiry_note: "Valid for 7 days.",
};

export const renderSample = (text, overrides = {}) =>
  String(text || "").replace(PLACEHOLDER_RE, (_, name) => ({ ...SAMPLE_VALUES, ...overrides })[name] ?? "");

function ImageField({ value, disabled, onChange, label }) {
  const inputRef = useRef(null);
  const [busy, setBusy] = useState(false);
  const { toast } = useToast();

  const onPick = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    if (!/^image\/(png|jpeg)$/.test(file.type)) {
      toast({ title: "Unsupported image", description: "Use a JPG or PNG image.", variant: "destructive" });
      return;
    }
    if (file.size > MAX_IMAGE_BYTES) {
      toast({ title: "Image too large", description: "Images must be 1 MB or smaller.", variant: "destructive" });
      return;
    }
    setBusy(true);
    try {
      const result = await charityClient.files.uploadBranding(file);
      onChange(result.file_url);
    } catch (error) {
      toast({ title: "Upload failed", description: error?.message || "Could not upload image.", variant: "destructive" });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex items-center gap-2">
      {value ? <img src={value} alt={`${label} preview`} className="h-12 w-12 rounded border bg-white object-contain" /> : <span className="text-xs text-slate-400">None</span>}
      {!disabled && (
        <>
          <input ref={inputRef} type="file" accept="image/png,image/jpeg" className="hidden" onChange={onPick} />
          <Button type="button" variant="outline" size="sm" disabled={busy} onClick={() => inputRef.current?.click()}>
            {busy ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : <Upload className="mr-1 h-4 w-4" />}
            Upload
          </Button>
          {value && <Button type="button" variant="ghost" size="sm" onClick={() => onChange("")}>Remove</Button>}
        </>
      )}
    </div>
  );
}

export function SettingControl({ setting: s, value, disabled, onChange }) {
  if (s.type === "bool") {
    return <Switch checked={Boolean(value)} disabled={disabled} onCheckedChange={onChange} aria-label={s.label} />;
  }
  if (s.type === "int") {
    return <Input type="number" className="w-28" value={value} min={s.min} max={s.max} disabled={disabled} onChange={(e) => onChange(e.target.value)} aria-label={s.label} />;
  }
  if (s.type === "enum") {
    return (
      <select
        className="h-9 rounded-md border border-input bg-background px-2 text-sm"
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value)}
        aria-label={s.label}
      >
        {(s.choices || []).map((c) => <option key={c} value={c}>{c}</option>)}
      </select>
    );
  }
  if (s.type === "image") {
    return <ImageField value={value} disabled={disabled} onChange={onChange} label={s.label} />;
  }
  if (s.type === "date") {
    return <Input type="date" className="w-44" value={value || ""} disabled={disabled} onChange={(e) => onChange(e.target.value)} aria-label={s.label} />;
  }
  const long = s.multiline || s.type === "template";
  return (
    <div className="w-full sm:w-80">
      {long ? (
        <Textarea rows={4} value={value || ""} disabled={disabled} maxLength={s.max_len || undefined} onChange={(e) => onChange(e.target.value)} aria-label={s.label} />
      ) : (
        <Input type={s.type === "url" ? "url" : "text"} value={value || ""} disabled={disabled} maxLength={s.max_len || undefined} onChange={(e) => onChange(e.target.value)} aria-label={s.label} />
      )}
      {s.max_len ? <p className="mt-1 text-right text-xs text-slate-400">{String(value || "").length}/{s.max_len}</p> : null}
    </div>
  );
}

export function PlaceholderChips({ placeholders = [] }) {
  if (!placeholders.length) return null;
  return (
    <p className="mt-1 text-xs text-slate-500">
      Allowed placeholders:{" "}
      {placeholders.map((p) => <code key={p} className="mr-1 rounded bg-slate-100 px-1">{`{${p}}`}</code>)}
    </p>
  );
}

export function ThemePicker({ value, disabled, onChange, previewing, onPreviewChange }) {
  return (
    <div className="space-y-3 p-4">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {THEME_IDS.map((id) => {
          const preset = THEME_PRESETS[id];
          const selected = value === id;
          return (
            <button
              key={id}
              type="button"
              disabled={disabled}
              onClick={() => onChange(id)}
              aria-pressed={selected}
              className={`relative overflow-hidden rounded-lg border p-3 text-left ${selected ? "border-emerald-600 ring-2 ring-emerald-600" : "border-slate-200"} disabled:opacity-70`}
            >
              <div className="relative h-10 rounded" style={{ background: `linear-gradient(90deg, ${preset.swatch[0]}, ${preset.swatch[2]})` }}>
                <ThemeDecoration themeId={id} />
              </div>
              <div className="mt-2 flex items-center gap-1.5">
                {preset.swatch.map((c) => <span key={c} className="h-3 w-3 rounded-full border" style={{ background: c }} />)}
                <span className="ml-1 text-sm font-medium text-slate-900">{preset.label}</span>
              </div>
            </button>
          );
        })}
      </div>
      <label className="flex items-center gap-2 text-sm text-slate-700">
        <Switch checked={previewing} onCheckedChange={onPreviewChange} aria-label="Preview as member" />
        Preview as member (only in this browser until saved)
      </label>
    </div>
  );
}

const BANNER_STYLES = {
  info: "bg-sky-50 text-sky-950 border-sky-200",
  success: "bg-emerald-50 text-emerald-950 border-emerald-200",
  warning: "bg-amber-50 text-amber-950 border-amber-300",
  festive: "bg-gradient-to-r from-amber-50 via-rose-50 to-violet-50 text-slate-900 border-amber-200",
};

export function AnnouncementPreview({ text, style }) {
  if (!text) return null;
  return <div className={`rounded border px-3 py-2 text-sm ${BANNER_STYLES[style] || BANNER_STYLES.info}`}>{text}</div>;
}
