import React from "react";
import { format } from "date-fns";
import { Calendar as CalendarIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

function parseDateValue(value) {
  if (!value) return null;
  const parsed = new Date(`${value}T00:00:00`);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function startOfDay(date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function toDateValue(date) {
  return format(date, "yyyy-MM-dd");
}

function shiftDays(baseDate, amount) {
  const next = new Date(baseDate);
  next.setDate(next.getDate() + amount);
  return next;
}

export default function DatePickerField({
  id,
  value,
  onChange,
  placeholder = "Pick date",
  disabled = false,
  minDate,
  maxDate,
  allowClear = false,
  size = "default",
  className = "",
}) {
  const selectedDate = parseDateValue(value);
  const minParsed = parseDateValue(minDate);
  const maxParsed = parseDateValue(maxDate);

  const disableDate = (date) => {
    const current = startOfDay(date);
    if (minParsed && current < startOfDay(minParsed)) return true;
    if (maxParsed && current > startOfDay(maxParsed)) return true;
    return false;
  };

  const quickDates = [
    { label: "Today", date: new Date() },
    { label: "Yesterday", date: shiftDays(new Date(), -1) },
    { label: "7 Days Ago", date: shiftDays(new Date(), -7) },
    { label: "30 Days Ago", date: shiftDays(new Date(), -30) },
  ];

  const triggerSizeClass =
    size === "compact"
      ? "h-9 px-3 text-sm"
      : size === "large"
        ? "h-11 px-4 text-sm"
        : "h-10 px-3.5 text-sm";

  const popoverWidthClass =
    size === "compact"
      ? "w-[min(300px,calc(100vw-1.5rem))]"
      : size === "large"
        ? "w-[min(360px,calc(100vw-1.5rem))]"
        : "w-[min(340px,calc(100vw-1.5rem))]";

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          id={id}
          type="button"
          variant="outline"
          disabled={disabled}
          className={`w-full justify-start text-left font-normal bg-white hover:bg-slate-50 border-slate-200 ${triggerSizeClass} ${className}`.trim()}
        >
          <CalendarIcon className="mr-2 h-4 w-4 text-slate-500" />
          {selectedDate ? format(selectedDate, "PPP") : placeholder}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" className={`${popoverWidthClass} p-0 overflow-hidden border-slate-200 shadow-xl`}>
        <div className="flex items-center justify-between gap-2 px-3 py-2 border-b bg-slate-50">
          <p className="text-xs font-medium text-slate-600">Quick Select</p>
          {allowClear && (
            <Button
              type="button"
              size="sm"
              variant="ghost"
              className="h-7 px-2 text-xs"
              onClick={() => onChange?.("")}
              disabled={disabled}
            >
              Clear
            </Button>
          )}
        </div>
        <div className="px-3 pt-2 pb-1 grid grid-cols-2 sm:flex sm:flex-wrap gap-1.5">
          {quickDates.map((item) => {
            const blocked = disableDate(item.date);
            return (
              <Button
                key={item.label}
                type="button"
                size="sm"
                variant="outline"
                className="h-7 px-2 text-xs border-slate-200 w-full sm:w-auto"
                onClick={() => onChange?.(toDateValue(item.date))}
                disabled={disabled || blocked}
              >
                {item.label}
              </Button>
            );
          })}
        </div>
        <div className="px-2 pb-2 flex justify-center">
          <Calendar
            className="p-0"
            mode="single"
            selected={selectedDate || undefined}
            onSelect={(date) => onChange?.(date ? toDateValue(date) : "")}
            disabled={disableDate}
          />
        </div>
      </PopoverContent>
    </Popover>
  );
}
