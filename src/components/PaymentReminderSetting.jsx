import React from "react";
import { CalendarClock } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export const REMINDER_DAYS = Array.from({ length: 28 }, (_, i) => i + 1);

export function ordinal(day) {
  const n = Number(day);
  const suffix = n % 10 === 1 && n !== 11 ? "st" : n % 10 === 2 && n !== 12 ? "nd" : n % 10 === 3 && n !== 13 ? "rd" : "th";
  return `${n}${suffix}`;
}

/**
 * Monthly payment reminder: on/off + day of month (1st-28th).
 * Controlled: pass `enabled`, `day` and `onChange({ enabled?, day? })`.
 */
export default function PaymentReminderSetting({ enabled, day, onChange, disabled = false, compact = false }) {
  return (
    <div className="space-y-3 rounded-lg border border-slate-200 p-3 dark:border-slate-700">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-start gap-2">
          <CalendarClock className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
          <div>
            <p className="text-sm font-medium text-slate-800 dark:text-slate-100">Monthly payment reminder</p>
            {!compact && (
              <p className="text-xs text-slate-500 dark:text-slate-400">
                A notification on your chosen day. Skipped if you've already paid that month; one gentle follow-up a week later if not.
              </p>
            )}
          </div>
        </div>
        <Switch
          checked={Boolean(enabled)}
          onCheckedChange={(checked) => onChange({ enabled: checked })}
          disabled={disabled}
          aria-label="Monthly payment reminder"
        />
      </div>
      {enabled && (
        <div className="flex flex-wrap items-center gap-2 text-sm text-slate-700 dark:text-slate-200">
          <span>Remind me on the</span>
          <Select value={String(day)} onValueChange={(value) => onChange({ day: Number(value) })} disabled={disabled}>
            <SelectTrigger className="h-9 w-24" aria-label="Reminder day"><SelectValue /></SelectTrigger>
            <SelectContent className="max-h-64">
              {REMINDER_DAYS.map((d) => (
                <SelectItem key={d} value={String(d)}>{ordinal(d)}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <span>of every month</span>
        </div>
      )}
    </div>
  );
}
