import React from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { format } from "@/lib/dateTime";
import { currentBusinessMonth, addBusinessMonths } from "@/lib/businessTime";

export function getMonthOptions(count = 24) {
  const current = currentBusinessMonth();
  return Array.from({ length: count }, (_, i) => addBusinessMonths(current, -i));
}

export function getYearOptions(count = 5) {
  const currentYear = Number(currentBusinessMonth().slice(0, 4));
  return Array.from({ length: count }, (_, i) => String(currentYear - i));
}

export default function ReportFilters({ period, onPeriodChange, value, onValueChange }) {
  const monthOptions = getMonthOptions();
  const yearOptions = getYearOptions();

  return (
    <div className="flex flex-wrap gap-3 items-center">
      <Select value={period} onValueChange={onPeriodChange}>
        <SelectTrigger className="w-36">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="monthly">Monthly</SelectItem>
          <SelectItem value="yearly">Yearly</SelectItem>
          <SelectItem value="all">All Time</SelectItem>
        </SelectContent>
      </Select>

      {period === "monthly" && (
        <Select value={value} onValueChange={onValueChange}>
          <SelectTrigger className="w-44">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {monthOptions.map((m) => (
              <SelectItem key={m} value={m}>
                {format(new Date(`${m}-01`), "MMMM yyyy")}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}

      {period === "yearly" && (
        <Select value={value} onValueChange={onValueChange}>
          <SelectTrigger className="w-32">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {yearOptions.map((y) => (
              <SelectItem key={y} value={y}>{y}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}
    </div>
  );
}
