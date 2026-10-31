import React, { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { charityClient } from "@/api/charityClient";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Loader2, RotateCcw } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { formatISTDateTime } from "@/lib/dateTime";
import { PUBLIC_SETTINGS_QUERY_KEY } from "@/lib/usePublicSettings";
import { BRANDING_QUERY_KEY, setPreviewTheme } from "@/lib/branding";
import {
  AnnouncementPreview,
  PlaceholderChips,
  SettingControl,
  ThemePicker,
  renderSample,
  validateSetting,
} from "@/components/settings/SettingControls";

const CATEGORY_ORDER = [
  "Security",
  "Payments",
  "Members & invites",
  "Reminders & messaging",
  "Visibility",
  "Theme & season",
  "Announcement",
  "Organisation & payment details",
  "Messages",
  "Landing & login",
];

const formatValue = (setting, value) => {
  if (setting.type === "bool") return value ? "On" : "Off";
  if (setting.type !== "int") {
    const text = String(value ?? "");
    if (!text) return "(empty)";
    return text.length > 60 ? `${text.slice(0, 57)}...` : text;
  }
  return `${value}${setting.unit ? ` ${setting.unit}` : ""}`;
};

export default function PlatformSettingsPanel({ readOnly = false }) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [draft, setDraft] = useState({});
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [previewing, setPreviewing] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ["admin", "settings"],
    queryFn: () => charityClient.admin.getSettings(),
  });

  const settings = useMemo(() => data?.settings || [], [data]);
  const canEdit = !readOnly && data?.can_edit === true;

  const grouped = useMemo(() => {
    const map = {};
    settings.forEach((s) => {
      (map[s.category] = map[s.category] || []).push(s);
    });
    const known = CATEGORY_ORDER.filter((c) => map[c]);
    const extra = Object.keys(map).filter((c) => !CATEGORY_ORDER.includes(c));
    return [...known, ...extra].map((c) => [c, map[c]]);
  }, [settings]);

  const errorFor = validateSetting;

  const changes = settings.filter((s) => s.key in draft && draft[s.key] !== s.value);
  const hasErrors = changes.some((s) => errorFor(s, draft[s.key]));
  const typed = (s) => (s.type === "int" ? Number(draft[s.key]) : draft[s.key]);
  const valueOf = (key) => (key in draft ? draft[key] : settings.find((s) => s.key === key)?.value);

  const refresh = () => {
    setDraft({});
    queryClient.invalidateQueries({ queryKey: ["admin", "settings"] });
    queryClient.invalidateQueries({ queryKey: PUBLIC_SETTINGS_QUERY_KEY });
    queryClient.invalidateQueries({ queryKey: BRANDING_QUERY_KEY });
    setPreviewing(false);
  };

  const onError = (error) =>
    toast({
      title: "Could not update settings",
      description: error?.message || "Something went wrong.",
      variant: "destructive",
    });

  const saveMutation = useMutation({
    mutationFn: (payload) => charityClient.admin.updateSettings(payload),
    onSuccess: () => {
      toast({ title: "Settings saved" });
      refresh();
    },
    onError,
  });

  const resetMutation = useMutation({
    mutationFn: (key) => charityClient.admin.resetSetting(key),
    onSuccess: () => {
      toast({ title: "Reset to default" });
      refresh();
    },
    onError,
  });

  const save = () => {
    const payload = {};
    changes.forEach((s) => {
      payload[s.key] = typed(s);
    });
    setConfirmOpen(false);
    saveMutation.mutate(payload);
  };

  const previewThemeId = valueOf("active_theme");
  useEffect(() => {
    setPreviewTheme(previewing ? previewThemeId : null);
  }, [previewing, previewThemeId]);
  useEffect(() => () => setPreviewTheme(null), []);
  if (isLoading) {
    return <div className="flex justify-center p-8"><Loader2 className="w-5 h-5 animate-spin text-slate-400" /></div>;
  }

  return (
    <div className="space-y-6">
      {!canEdit && (
        <p className="text-sm text-slate-500">These settings are read-only. Only a superadmin can change them.</p>
      )}

      {grouped.map(([category, items]) => (
        <section key={category} className="space-y-3">
          <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-500">{category}</h3>
          {category === "Messages" && (
            <p className="rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
              These wordings apply to in-app notifications and share links only. WhatsApp sending uses approved templates and is not affected.
            </p>
          )}
          <div className="divide-y divide-slate-100 rounded-md border border-slate-200 bg-white">
            {category === "Theme & season" && (
              <ThemePicker
                value={valueOf("active_theme")}
                disabled={!canEdit}
                onChange={(id) => setDraft((d) => ({ ...d, active_theme: id }))}
                previewing={previewing}
                onPreviewChange={setPreviewing}
              />
            )}
            {items.map((s) => {
              const current = s.key in draft ? draft[s.key] : s.value;
              const error = s.key in draft ? errorFor(s, current) : "";
              return (
                <div key={s.key} className="flex flex-col gap-3 p-4 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-slate-900">{s.label}</p>
                    <p className="text-sm text-slate-500">{s.description}</p>
                    <p className="mt-1 text-xs text-slate-400">
                      Default: {formatValue(s, s.default)}
                      {s.type === "int" && ` · Allowed: ${s.min}–${s.max} ${s.unit}`}
                    </p>
                    {s.type === "template" && (
                      <>
                        <PlaceholderChips placeholders={s.placeholders} />
                        <p className="mt-2 rounded bg-slate-50 p-2 text-sm text-slate-700">
                          <span className="text-xs font-medium text-slate-500">Preview: </span>
                          {renderSample(current || s.default)}
                        </p>
                      </>
                    )}
                    {s.key === "announcement_text" && (
                      <div className="mt-2">
                        <AnnouncementPreview text={current} style={valueOf("announcement_style")} />
                      </div>
                    )}
                    {s.key === "org_display_name" && (
                      <p className="mt-2 text-sm font-semibold text-slate-800">
                        {current || s.default}
                        <span className="ml-2 text-xs font-normal text-slate-500">{valueOf("org_tagline")}</span>
                      </p>
                    )}
                    {s.updated_at && (
                      <p className="text-xs text-slate-400">
                        Last changed {formatISTDateTime(s.updated_at)}{s.updated_by ? ` by ${s.updated_by}` : ""}
                      </p>
                    )}
                    {error && <p className="mt-1 text-xs text-red-600" role="alert">{error}</p>}
                  </div>
                  <div className="flex items-start gap-2">
                    <SettingControl
                      setting={s}
                      value={current}
                      disabled={!canEdit}
                      onChange={(v) => setDraft((d) => ({ ...d, [s.key]: v }))}
                    />
                    {canEdit && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        title="Reset to default"
                        disabled={s.value === s.default || resetMutation.isPending}
                        onClick={() => resetMutation.mutate(s.key)}
                      >
                        <RotateCcw className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      ))}
      {canEdit && (
        <div className="flex items-center gap-3">
          <Button type="button" disabled={changes.length === 0 || hasErrors || saveMutation.isPending} onClick={() => setConfirmOpen(true)}>
            {saveMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            Save changes
          </Button>
          {changes.length > 0 && (
            <>
              <Badge variant="secondary">{changes.length} unsaved</Badge>
              <Button type="button" variant="ghost" onClick={() => setDraft({})}>Discard</Button>
            </>
          )}
        </div>
      )}

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm settings change</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-1">
                {changes.map((s) => (
                  <p key={s.key}>
                    <span className="font-medium">{s.label}:</span> {formatValue(s, s.value)} → {formatValue(s, typed(s))}
                  </p>
                ))}
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={save}>Confirm</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
