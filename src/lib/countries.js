import { PHONE_COUNTRIES } from "@/lib/phone-utils";

/*
 * Countries a member can live in: the same list as the phone country codes.
 * The backend keeps a copy in app/utils/countries.py; keep both in sync.
 */

export const LIVING_COUNTRIES = [...PHONE_COUNTRIES].sort((a, b) => a.name.localeCompare(b.name));

/** Dial codes for the phone filter; +1 is shared by Canada and the US, so it is listed once. */
export const PHONE_CODE_OPTIONS = (() => {
  const byCode = new Map();
  for (const c of PHONE_COUNTRIES) {
    const label = byCode.has(c.dialCode) ? `${byCode.get(c.dialCode)} / ${c.shortName || c.name}` : (c.shortName || c.name);
    byCode.set(c.dialCode, label);
  }
  return [...byCode.entries()]
    .map(([dialCode, label]) => ({ dialCode, label }))
    .sort((a, b) => a.label.localeCompare(b.label));
})();

export const CITY_MAX_LENGTH = 100;

export function countryName(iso) {
  return PHONE_COUNTRIES.find((c) => c.iso === iso)?.name || "";
}

/** "Dubai, United Arab Emirates", or "" when nothing is set. */
export function formatLocation(member) {
  return [member?.city, countryName(member?.country)].filter(Boolean).join(", ");
}

/** Country guessed from a +<code> phone number; null when unknown or shared (+1). */
export function countryFromPhone(phone) {
  const raw = String(phone || "").trim();
  if (!raw.startsWith("+")) return null;
  const digits = raw.replace(/\D/g, "");
  const matches = PHONE_COUNTRIES.filter((c) => digits.startsWith(c.dialCode.replace("+", "")));
  if (!matches.length) return null;
  const longest = Math.max(...matches.map((c) => c.dialCode.length));
  const best = matches.filter((c) => c.dialCode.length === longest);
  return best.length === 1 ? best[0].iso : null;
}

export function isLocationComplete(member) {
  return Boolean(member?.country && String(member?.city || "").trim());
}
