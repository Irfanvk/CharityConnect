// Business time is always India Standard Time, regardless of the viewer's location.
// The backend stores UTC; naive ISO datetimes from the API are therefore UTC.
export const BUSINESS_TZ = "Asia/Kolkata";
export const BUSINESS_TZ_LABEL = "IST";

const NAIVE_ISO_DATETIME = /^\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2}(:\d{2}(\.\d+)?)?$/;

export function parseBackendDate(value) {
  if (value instanceof Date) return new Date(value.getTime());
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (NAIVE_ISO_DATETIME.test(trimmed)) {
      return new Date(`${trimmed.replace(" ", "T")}Z`);
    }
    return new Date(trimmed);
  }
  if (typeof value === "number") return new Date(value);
  return new Date(NaN);
}

export function formatBusinessDate(value, opts = {}) {
  const date = parseBackendDate(value);
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat("en-IN", {
    timeZone: BUSINESS_TZ,
    year: "numeric",
    month: "short",
    day: "2-digit",
    ...opts,
  }).format(date);
}

export function formatBusinessDateTime(value, opts = {}) {
  const date = parseBackendDate(value);
  if (Number.isNaN(date.getTime())) return "";
  const text = new Intl.DateTimeFormat("en-IN", {
    timeZone: BUSINESS_TZ,
    year: "numeric",
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
    ...opts,
  }).format(date);
  return `${text} ${BUSINESS_TZ_LABEL}`;
}

// "YYYY-MM" for the current month in business time.
export function currentBusinessMonth(now = new Date()) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: BUSINESS_TZ,
    year: "numeric",
    month: "2-digit",
  }).formatToParts(now);
  const year = parts.find((p) => p.type === "year")?.value;
  const month = parts.find((p) => p.type === "month")?.value;
  return `${year}-${month}`;
}

// "YYYY-MM-DD" for today in business time.
export function currentBusinessDate(now = new Date()) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: BUSINESS_TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
}

// Pure string month arithmetic ("2026-10", 1) -> "2026-11"; avoids any local-timezone Date math.
export function addBusinessMonths(month, count) {
  const [year, mon] = month.split("-").map(Number);
  const index = year * 12 + (mon - 1) + count;
  const nextYear = Math.floor(index / 12);
  const nextMonth = (index % 12) + 1;
  return `${nextYear}-${String(nextMonth).padStart(2, "0")}`;
}
