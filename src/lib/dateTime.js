import { format as formatDateFns, isValid } from "date-fns";

export * from "date-fns";

export const IST_TIME_ZONE = "Asia/Kolkata";
const IST_OFFSET_MINUTES = 330;

function toDate(value) {
    if (value instanceof Date) {
        return new Date(value.getTime());
    }
    if (typeof value === "string" || typeof value === "number") {
        return new Date(value);
    }
    return new Date(NaN);
}

function toISTDate(value) {
    const date = toDate(value);
    if (!isValid(date)) {
        return date;
    }

    const utcMs = date.getTime() + date.getTimezoneOffset() * 60 * 1000;
    return new Date(utcMs + IST_OFFSET_MINUTES * 60 * 1000);
}

export function format(value, formatString, options) {
    const istDate = toISTDate(value);
    if (!isValid(istDate)) {
        return "";
    }
    return formatDateFns(istDate, formatString, options);
}

export function formatISTDateTime(value, options = {}) {
    const date = toDate(value);
    if (!isValid(date)) return "";
    return new Intl.DateTimeFormat("en-IN", {
        timeZone: IST_TIME_ZONE,
        year: "numeric",
        month: "short",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hour12: true,
        ...options,
    }).format(date);
}

export function formatISTDate(value, options = {}) {
    const date = toDate(value);
    if (!isValid(date)) return "";
    return new Intl.DateTimeFormat("en-IN", {
        timeZone: IST_TIME_ZONE,
        year: "numeric",
        month: "short",
        day: "2-digit",
        ...options,
    }).format(date);
}
