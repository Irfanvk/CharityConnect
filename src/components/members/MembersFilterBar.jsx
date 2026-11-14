import React, { useState } from "react";
import { ArrowDownUp, Phone, Search, SlidersHorizontal, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { LIVING_COUNTRIES, PHONE_CODE_OPTIONS, countryName } from "@/lib/countries";

/*
 * Members list: one row with search, a "Filters" panel and "Sort", plus a chip for every
 * filter that is on. Admin-only filters (registration, country, phone) are hidden for others.
 */

export const DEFAULT_MEMBER_FILTERS = {
  status: "active",
  registered: "all",
  country: "all",
  phoneCode: "all",
  phone: "",
};

const SORTS = [
  ["name:asc", "Name A–Z"],
  ["name:desc", "Name Z–A"],
  ["id:asc", "Member ID, oldest first"],
  ["id:desc", "Member ID, newest first"],
];

const STATUS_LABEL = { all: "All statuses", active: "Active", inactive: "Inactive" };
const REGISTERED_LABEL = { all: "Everyone", yes: "Registered", no: "Not registered" };

function Field({ label, htmlFor, children }) {
  return (
    <div className="space-y-1">
      <Label htmlFor={htmlFor} className="text-xs font-medium text-slate-500">{label}</Label>
      {children}
    </div>
  );
}

function Chip({ children, onRemove }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 py-0.5 pl-2.5 pr-1 text-xs font-medium text-emerald-800">
      {children}
      <button
        type="button"
        onClick={onRemove}
        className="rounded-full p-0.5 hover:bg-emerald-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
        aria-label={`Remove filter ${typeof children === "string" ? children : ""}`.trim()}
      >
        <X className="h-3 w-3" />
      </button>
    </span>
  );
}

export default function MembersFilterBar({
  isAdmin,
  search, onSearchChange,
  filters, onFiltersChange,
  sortBy, sortDirection, onSortChange,
  pageSize, onPageSizeChange,
  counts = {},
}) {
  const [open, setOpen] = useState(false);
  const set = (patch) => onFiltersChange({ ...filters, ...patch });

  const chips = [];
  if (filters.status !== DEFAULT_MEMBER_FILTERS.status) {
    chips.push(["status", filters.status === "all" ? "Active and inactive" : STATUS_LABEL[filters.status], { status: DEFAULT_MEMBER_FILTERS.status }]);
  }
  if (isAdmin) {
    if (filters.registered !== "all") chips.push(["registered", REGISTERED_LABEL[filters.registered], { registered: "all" }]);
    if (filters.country !== "all") {
      chips.push(["country", `Lives in: ${filters.country === "none" ? "Not entered yet" : countryName(filters.country)}`, { country: "all" }]);
    }
    if (filters.phoneCode !== "all") {
      chips.push(["phoneCode", `Phone code: ${filters.phoneCode === "other" ? "Other / none" : filters.phoneCode}`, { phoneCode: "all" }]);
    }
    if (filters.phone.trim()) chips.push(["phone", `Phone: ${filters.phone.trim()}`, { phone: "" }]);
  }
  const activeCount = chips.length;

  const count = (n) => (n === undefined || n === null ? "" : ` (${n})`);

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-0 flex-1 basis-full sm:basis-64">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <Input
            placeholder="Search by name, ID, phone or city..."
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            className="bg-white pl-10"
            aria-label="Search members"
          />
        </div>

        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <Button type="button" variant="outline" className="flex-1 gap-2 bg-white sm:flex-none" aria-label="Filters">
              <SlidersHorizontal className="h-4 w-4" />
              Filters
              {activeCount > 0 && (
                <span className="rounded-full bg-emerald-600 px-1.5 text-xs font-semibold leading-5 text-white">{activeCount}</span>
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent
            align="start"
            collisionPadding={16}
            className="w-[min(22rem,calc(100vw-2rem))] max-h-[min(36rem,var(--radix-popover-content-available-height))] space-y-3 overflow-y-auto p-4"
          >
            <p className="text-sm font-semibold text-slate-900">Filter members</p>
            <Field label="Status" htmlFor="mf-status">
              <Select value={filters.status} onValueChange={(v) => set({ status: v })}>
                <SelectTrigger id="mf-status"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All statuses{count(counts.total)}</SelectItem>
                  <SelectItem value="active">Active{count(counts.active)}</SelectItem>
                  <SelectItem value="inactive">Inactive{count(counts.inactive)}</SelectItem>
                </SelectContent>
              </Select>
            </Field>

            {isAdmin && (
              <>
                <Field label="Registration" htmlFor="mf-registered">
                  <Select value={filters.registered} onValueChange={(v) => set({ registered: v })}>
                    <SelectTrigger id="mf-registered"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Everyone{count(counts.total)}</SelectItem>
                      <SelectItem value="yes">Registered, can sign in{count(counts.registered)}</SelectItem>
                      <SelectItem value="no">Not registered yet{count(counts.notRegistered)}</SelectItem>
                    </SelectContent>
                  </Select>
                </Field>
                <Field label="Lives in" htmlFor="mf-country">
                  <Select value={filters.country} onValueChange={(v) => set({ country: v })}>
                    <SelectTrigger id="mf-country"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All countries</SelectItem>
                      {LIVING_COUNTRIES.map((c) => <SelectItem key={c.iso} value={c.iso}>{c.name}</SelectItem>)}
                      <SelectItem value="none">Not entered yet</SelectItem>
                    </SelectContent>
                  </Select>
                </Field>
                <div className="grid grid-cols-2 gap-2">
                  <Field label="Phone code" htmlFor="mf-code">
                    <Select value={filters.phoneCode} onValueChange={(v) => set({ phoneCode: v })}>
                      <SelectTrigger id="mf-code"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All codes</SelectItem>
                        {PHONE_CODE_OPTIONS.map((o) => (
                          <SelectItem key={o.dialCode} value={o.dialCode}>{o.dialCode} {o.label}</SelectItem>
                        ))}
                        <SelectItem value="other">Other / no phone</SelectItem>
                      </SelectContent>
                    </Select>
                  </Field>
                  <Field label="Phone number" htmlFor="mf-phone">
                    <div className="relative">
                      <Phone className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
                      <Input
                        id="mf-phone"
                        type="tel"
                        inputMode="tel"
                        placeholder="Any part"
                        value={filters.phone}
                        onChange={(e) => set({ phone: e.target.value })}
                        className="pl-8"
                      />
                    </div>
                  </Field>
                </div>
                <p className="-mt-1 text-[11px] text-slate-500">Phone number: at least 3 digits. Spaces, + and a leading 0 are ignored; WhatsApp numbers count too.</p>
              </>
            )}

            <Field label="Rows per page" htmlFor="mf-rows">
              <Select value={String(pageSize)} onValueChange={(v) => onPageSizeChange(Number(v))}>
                <SelectTrigger id="mf-rows"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {[20, 50, 100].map((n) => <SelectItem key={n} value={String(n)}>{n}</SelectItem>)}
                </SelectContent>
              </Select>
            </Field>

            <div className="flex items-center justify-between gap-2 border-t border-slate-100 pt-3">
              <Button type="button" variant="ghost" size="sm" onClick={() => onFiltersChange(DEFAULT_MEMBER_FILTERS)} disabled={activeCount === 0}>
                Reset
              </Button>
              <Button type="button" size="sm" className="bg-emerald-600 hover:bg-emerald-700" onClick={() => setOpen(false)}>
                Done
              </Button>
            </div>
          </PopoverContent>
        </Popover>

        <Select value={`${sortBy}:${sortDirection}`} onValueChange={(v) => { const [by, dir] = v.split(":"); onSortChange(by, dir); }}>
          <SelectTrigger className="w-auto flex-1 gap-2 bg-white sm:flex-none" aria-label="Sort">
            <ArrowDownUp className="h-4 w-4 text-slate-500" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent align="end">
            {SORTS.map(([value, label]) => <SelectItem key={value} value={value}>{label}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {activeCount > 0 && (
        <div className="flex flex-wrap items-center gap-1.5">
          {chips.map(([key, label, reset]) => (
            <Chip key={key} onRemove={() => set(reset)}>{label}</Chip>
          ))}
          <button
            type="button"
            onClick={() => onFiltersChange(DEFAULT_MEMBER_FILTERS)}
            className="ml-1 text-xs font-medium text-slate-500 underline-offset-2 hover:text-slate-700 hover:underline"
          >
            Clear all
          </button>
        </div>
      )}
    </div>
  );
}
