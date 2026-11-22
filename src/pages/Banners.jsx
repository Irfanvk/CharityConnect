import React, { useMemo, useRef, useState } from "react";
import { doneByText } from "@/components/common/DoneBy";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CalendarClock, Copy, ImagePlus, Loader2, Monitor, Pause, Pencil, Play, Plus, Smartphone, Trash2 } from "lucide-react";
import { charityClient } from "@/api/charityClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/components/ui/use-toast";
import { formatISTDateTime } from "@/lib/dateTime";
import { resizeImage } from "@/lib/imageResize";
import { BannerCard } from "@/components/banners/BannerCarousel";
import { docHref } from "@/components/relief/ReliefParts";

/*
 * Admins: occasion banners for the login page and the dashboards. Live from the start time,
 * hidden after the end time (both India time). Separate from the app colour themes.
 */

const STATUS = {
  active: ["Showing now", "bg-emerald-100 text-emerald-800"],
  scheduled: ["Starts later", "bg-sky-100 text-sky-800"],
  paused: ["Paused", "bg-amber-100 text-amber-800"],
  past: ["Ended", "bg-slate-100 text-slate-600"],
};
const DURATIONS = [["1 day", 1], ["3 days", 3], ["1 week", 7], ["1 month", 30]];
const PAGES = [
  ["", "No button"], ["/Challans", "My payments"], ["/Campaigns", "Campaigns"], ["/Relief", "Relief fund"],
  ["/BankDetails", "Bank details"], ["/Notifications", "Notifications"], ["/Profile", "Profile"], ["custom", "Another link (https://…)"],
];

// <input type="datetime-local"> values are India time; send them with the +05:30 offset.
const toInput = (date) => {
  const ist = new Date(date.getTime() + (5.5 * 60 + date.getTimezoneOffset()) * 60000);
  const pad = (n) => String(n).padStart(2, "0");
  return `${ist.getFullYear()}-${pad(ist.getMonth() + 1)}-${pad(ist.getDate())}T${pad(ist.getHours())}:${pad(ist.getMinutes())}`;
};
const fromInput = (value) => (value ? `${value}:00+05:30` : null);
const istInputFromIso = (iso) => (iso ? toInput(new Date(iso)) : "");

function emptyForm() {
  const now = new Date();
  return {
    title: "", message: "", image_url: "", button_label: "", link_choice: "", custom_link: "",
    show_on_login: true, show_to_members: true, show_to_admins: true,
    starts: toInput(now), ends: toInput(new Date(now.getTime() + 3 * 86400000)),
  };
}

function formFromBanner(b, { copy = false } = {}) {
  const known = PAGES.some(([v]) => v && v !== "custom" && v === b.button_link);
  const now = new Date();
  return {
    title: b.title, message: b.message || "", image_url: b.image_url, button_label: b.button_label || "",
    link_choice: !b.button_link ? "" : known ? b.button_link : "custom", custom_link: known ? "" : (b.button_link || ""),
    show_on_login: b.show_on_login, show_to_members: b.show_to_members, show_to_admins: b.show_to_admins,
    // "Use again" starts now for the same length of time.
    starts: copy ? toInput(now) : istInputFromIso(b.starts_at),
    ends: copy
      ? toInput(new Date(now.getTime() + Math.max(86400000, new Date(b.ends_at) - new Date(b.starts_at))))
      : istInputFromIso(b.ends_at),
  };
}

function BannerForm({ initial, editingId, onClose }) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [form, setForm] = useState(initial);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [size, setSize] = useState(null);
  const fileRef = useRef(null);
  const set = (patch) => setForm((f) => ({ ...f, ...patch }));

  const pick = async (file) => {
    if (!file) return;
    setUploading(true);
    try {
      const { file: small, width, height } = await resizeImage(file, { maxWidth: 1600 });
      const res = await charityClient.banners.uploadImage(small);
      set({ image_url: res.image_url });
      setSize({ width, height, kb: Math.round(small.size / 1024) });
    } catch (error) {
      toast({ title: "Could not upload the picture", description: error?.message, variant: "destructive" });
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  const link = form.link_choice === "custom" ? form.custom_link.trim() : form.link_choice;
  const preview = { id: 0, title: form.title || "Banner", message: form.message, image_url: form.image_url, button_label: link ? form.button_label : "", button_link: link };
  const problems = [
    !form.image_url && "a picture",
    !form.title.trim() && "a title",
    !(form.show_on_login || form.show_to_members || form.show_to_admins) && "where to show it",
    (!form.starts || !form.ends || form.ends <= form.starts) && "an end after the start",
    link && !form.button_label.trim() && "the button text",
  ].filter(Boolean);

  const save = async () => {
    setSaving(true);
    const payload = {
      title: form.title, message: form.message || null, image_url: form.image_url,
      button_label: link ? form.button_label : null, button_link: link || null,
      show_on_login: form.show_on_login, show_to_members: form.show_to_members, show_to_admins: form.show_to_admins,
      starts_at: fromInput(form.starts), ends_at: fromInput(form.ends),
    };
    try {
      if (editingId) await charityClient.banners.update(editingId, payload);
      else await charityClient.banners.create(payload);
      await queryClient.invalidateQueries({ queryKey: ["banners"] });
      toast({ title: editingId ? "Banner saved" : "Banner created" });
      onClose();
    } catch (error) {
      toast({ title: "Could not save", description: error?.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const setDuration = (days) => {
    const start = form.starts ? new Date(fromInput(form.starts)) : new Date();
    set({ ends: toInput(new Date(start.getTime() + days * 86400000)) });
  };

  return (
    <div className="space-y-4">
      {/* Picture */}
      <div className="space-y-2">
        <Label className="text-sm font-semibold">1. Picture</Label>
        <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={(e) => pick(e.target.files?.[0])} />
        <Button type="button" variant="outline" onClick={() => fileRef.current?.click()} disabled={uploading} className="h-11 w-full gap-2">
          {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ImagePlus className="h-4 w-4" />}
          {form.image_url ? "Change picture" : "Upload picture"}
        </Button>
        <p className="text-xs text-slate-500">
          A wide picture works best (about 1600 × 900). It is made smaller on this device before uploading.
          Keep important parts in the middle; avoid small text in the picture, put it in the message instead.
          {size && <> Uploaded: {size.width} × {size.height}, {size.kb} KB.</>}
        </p>
      </div>

      {form.image_url && (
        <div className="grid gap-3 sm:grid-cols-[1fr_190px]">
          <div>
            <p className="mb-1 flex items-center gap-1 text-xs font-medium text-slate-500"><Monitor className="h-3.5 w-3.5" />On a computer</p>
            <BannerCard banner={preview} />
          </div>
          <div>
            <p className="mb-1 flex items-center gap-1 text-xs font-medium text-slate-500"><Smartphone className="h-3.5 w-3.5" />On a phone</p>
            <BannerCard banner={preview} compact />
          </div>
        </div>
      )}

      {/* Words */}
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1 sm:col-span-2">
          <Label htmlFor="bn-title" className="text-sm font-semibold">2. Title (for admins, and read aloud by screen readers)</Label>
          <Input id="bn-title" value={form.title} maxLength={120} onChange={(e) => set({ title: e.target.value })} placeholder="e.g. Eid al-Fitr 2027" />
        </div>
        <div className="space-y-1 sm:col-span-2">
          <Label htmlFor="bn-msg" className="text-sm font-semibold">Message under the picture (optional)</Label>
          <Textarea id="bn-msg" value={form.message} maxLength={300} rows={2} onChange={(e) => set({ message: e.target.value })} placeholder="e.g. Eid Mubarak to all our members and families!" />
          <p className="text-right text-xs text-slate-400">{form.message.length}/300 · any language</p>
        </div>
        <div className="space-y-1">
          <Label className="text-sm font-semibold">Button (optional)</Label>
          <select value={form.link_choice} onChange={(e) => set({ link_choice: e.target.value })} className="h-10 w-full rounded-md border border-input bg-white px-3 text-sm dark:bg-slate-900">
            {PAGES.map(([v, label]) => <option key={v} value={v}>{label}</option>)}
          </select>
        </div>
        {form.link_choice && (
          <div className="space-y-1">
            <Label htmlFor="bn-btn" className="text-sm font-semibold">Button text</Label>
            <Input id="bn-btn" value={form.button_label} maxLength={40} onChange={(e) => set({ button_label: e.target.value })} placeholder="e.g. Donate now" />
          </div>
        )}
        {form.link_choice === "custom" && (
          <div className="space-y-1 sm:col-span-2">
            <Label htmlFor="bn-link" className="text-sm font-semibold">Link (must start with https://)</Label>
            <Input id="bn-link" value={form.custom_link} onChange={(e) => set({ custom_link: e.target.value })} placeholder="https://…" />
          </div>
        )}
      </div>

      {/* Where */}
      <div className="space-y-2">
        <Label className="text-sm font-semibold">3. Where to show it</Label>
        {[["show_on_login", "Login page (everyone, before signing in)"], ["show_to_members", "Members' dashboard"], ["show_to_admins", "Admins' dashboard"]].map(([key, label]) => (
          <label key={key} className="flex items-center gap-3 rounded-lg border border-slate-200 p-3 text-sm dark:border-slate-700">
            <Checkbox checked={form[key]} onCheckedChange={(v) => set({ [key]: Boolean(v) })} />{label}
          </label>
        ))}
      </div>

      {/* When */}
      <div className="space-y-2">
        <Label className="text-sm font-semibold">4. When (India time)</Label>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1"><span className="text-xs text-slate-500">Starts</span>
            <Input type="datetime-local" value={form.starts} onChange={(e) => set({ starts: e.target.value })} /></div>
          <div className="space-y-1"><span className="text-xs text-slate-500">Ends (hides by itself)</span>
            <Input type="datetime-local" value={form.ends} min={form.starts} onChange={(e) => set({ ends: e.target.value })} /></div>
        </div>
        <div className="flex flex-wrap gap-2">
          {DURATIONS.map(([label, days]) => (
            <Button key={label} type="button" size="sm" variant="outline" onClick={() => setDuration(days)}>{label}</Button>
          ))}
        </div>
      </div>

      <DialogFooter className="gap-2 sm:gap-2">
        {problems.length > 0 && <p className="mr-auto self-center text-xs text-amber-700">Still needed: {problems.join(", ")}</p>}
        <Button variant="outline" onClick={onClose} disabled={saving}>Cancel</Button>
        <Button onClick={save} disabled={saving || uploading || problems.length > 0} className="bg-emerald-600 hover:bg-emerald-700">
          {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}{editingId ? "Save" : "Create banner"}
        </Button>
      </DialogFooter>
    </div>
  );
}

export default function Banners() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { data: user } = useQuery({ queryKey: ["me"], queryFn: () => charityClient.auth.me() });
  const isAdmin = user?.role === "admin" || user?.role === "superadmin";
  const { data, isLoading } = useQuery({ queryKey: ["banners", "all"], queryFn: () => charityClient.banners.list(), enabled: isAdmin });
  const [editor, setEditor] = useState(null); // { initial, id }
  const [toDelete, setToDelete] = useState(null);

  const toggle = useMutation({
    mutationFn: (b) => charityClient.banners.update(b.id, { is_active: !b.is_active }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["banners"] }),
    onError: (e) => toast({ title: "Could not change it", description: e?.message, variant: "destructive" }),
  });
  const remove = useMutation({
    mutationFn: (b) => charityClient.banners.remove(b.id),
    onSuccess: () => { setToDelete(null); queryClient.invalidateQueries({ queryKey: ["banners"] }); toast({ title: "Banner deleted" }); },
    onError: (e) => toast({ title: "Could not delete", description: e?.message, variant: "destructive" }),
  });

  const groups = useMemo(() => {
    const items = data?.items || [];
    return [
      ["Showing now and coming up", items.filter((b) => b.status === "active" || b.status === "scheduled" || b.status === "paused")],
      ["Past banners (use again next time)", items.filter((b) => b.status === "past")],
    ];
  }, [data]);

  if (user && !isAdmin) {
    return <Card className="border-0 shadow-sm"><CardContent className="p-10 text-center text-slate-500">Admin access required.</CardContent></Card>;
  }

  return (
    <div className="mx-auto max-w-4xl space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Banners</h1>
          <p className="text-slate-500">Pictures for occasions on the login page and dashboards. They hide on their own when they end.</p>
        </div>
        <Button onClick={() => setEditor({ initial: emptyForm(), id: null })} className="h-11 gap-2 bg-emerald-600 hover:bg-emerald-700">
          <Plus className="h-4 w-4" />New banner
        </Button>
      </div>

      <div className="rounded-xl border border-sky-200 bg-sky-50 p-3 text-sm text-sky-900">
        Good practice: one or two banners at a time (at most {data?.max_per_place || 5} show), a clear picture without small text,
        an end date soon after the occasion, and a short message everyone can read. The app colour theme (Eid, Ramadan…) is set separately.
      </div>

      {isLoading ? (
        <p className="flex items-center gap-2 text-slate-500"><Loader2 className="h-4 w-4 animate-spin" />Loading…</p>
      ) : (
        groups.map(([heading, items]) => (
          <section key={heading} className="space-y-2">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">{heading} <span className="font-normal">({items.length})</span></h2>
            {items.length === 0 ? (
              <p className="rounded-xl border border-dashed border-slate-200 p-4 text-center text-sm text-slate-500">None.</p>
            ) : (
              <ul className="space-y-3">
                {items.map((b) => {
                  const [label, cls] = STATUS[b.status] || STATUS.past;
                  const places = [b.show_on_login && "Login page", b.show_to_members && "Members", b.show_to_admins && "Admins"].filter(Boolean).join(" · ");
                  return (
                    <li key={b.id} className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-3 shadow-sm sm:flex-row dark:border-slate-700 dark:bg-slate-900">
                      <img src={docHref(b.image_url)} alt={b.title} className="aspect-[16/9] w-full rounded-lg object-cover sm:w-48" />
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="font-semibold text-slate-900 dark:text-white">{b.title}</p>
                          <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${cls}`}>{label}</span>
                        </div>
                        {b.message && <p className="mt-0.5 line-clamp-2 text-sm text-slate-600">{b.message}</p>}
                        <p className="mt-1 flex items-center gap-1 text-xs text-slate-500">
                          <CalendarClock className="h-3.5 w-3.5" />
                          {formatISTDateTime(b.starts_at, { second: undefined })} → {formatISTDateTime(b.ends_at, { second: undefined })}
                        </p>
                        <p className="text-xs text-slate-500">Shows on: {places}</p>
                        {b.created_by_name && <p className="text-xs text-slate-500">{doneByText("Created", b.created_by_name, b.created_at)}</p>}
                        {b.updated_by_name && b.updated_by_name !== b.created_by_name && <p className="text-xs text-slate-500">{doneByText("Changed", b.updated_by_name, b.updated_at)}</p>}
                        <div className="mt-2 flex flex-wrap gap-2">
                          {b.status !== "past" && (
                            <Button size="sm" variant="outline" onClick={() => setEditor({ initial: formFromBanner(b), id: b.id })} className="gap-1"><Pencil className="h-3.5 w-3.5" />Edit</Button>
                          )}
                          {b.status !== "past" && (
                            <Button size="sm" variant="outline" onClick={() => toggle.mutate(b)} disabled={toggle.isPending} className="gap-1">
                              {b.is_active ? <><Pause className="h-3.5 w-3.5" />Pause</> : <><Play className="h-3.5 w-3.5" />Resume</>}
                            </Button>
                          )}
                          <Button size="sm" variant="outline" onClick={() => setEditor({ initial: formFromBanner(b, { copy: true }), id: null })} className="gap-1"><Copy className="h-3.5 w-3.5" />Use again</Button>
                          <Button size="sm" variant="ghost" onClick={() => setToDelete(b)} className="gap-1 text-rose-600 hover:text-rose-700"><Trash2 className="h-3.5 w-3.5" />Delete</Button>
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>
        ))
      )}

      <Dialog open={Boolean(editor)} onOpenChange={(open) => { if (!open) setEditor(null); }}>
        <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editor?.id ? "Edit banner" : "New banner"}</DialogTitle>
            <DialogDescription>It shows from the start time and hides by itself after the end time.</DialogDescription>
          </DialogHeader>
          {editor && <BannerForm key={editor.id || "new"} initial={editor.initial} editingId={editor.id} onClose={() => setEditor(null)} />}
        </DialogContent>
      </Dialog>

      <AlertDialog open={Boolean(toDelete)} onOpenChange={(open) => { if (!open) setToDelete(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this banner?</AlertDialogTitle>
            <AlertDialogDescription>"{toDelete?.title}" will be removed for good. To keep it for next year, Pause it instead.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep</AlertDialogCancel>
            <AlertDialogAction className="bg-rose-600 hover:bg-rose-700" onClick={(e) => { e.preventDefault(); remove.mutate(toDelete); }}>
              {remove.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
