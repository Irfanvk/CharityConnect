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

/*
 * Common cities per country, offered as suggestions in the City box (any other city can be typed).
 * The backend keeps a copy (CITY_SUGGESTIONS in app/utils/countries.py); keep both in sync.
 */
export const CITY_SUGGESTIONS = {
  SA: ["Riyadh", "Jeddah", "Dammam", "Al Khobar", "Dhahran", "Makkah", "Madinah", "Jubail", "Taif",
    "Abha", "Khamis Mushait", "Tabuk", "Buraidah", "Hail", "Al Ahsa", "Hafar Al Batin", "Yanbu",
    "Jizan", "Najran", "Qatif", "Al Kharj", "Unaizah"],
  AE: ["Dubai", "Abu Dhabi", "Sharjah", "Ajman", "Al Ain", "Ras Al Khaimah", "Fujairah", "Umm Al Quwain",
    "Khor Fakkan", "Ruwais"],
  KW: ["Kuwait City", "Farwaniya", "Hawalli", "Salmiya", "Jahra", "Mangaf", "Fahaheel", "Abbasiya",
    "Mahboula", "Ahmadi"],
  OM: ["Muscat", "Salalah", "Sohar", "Nizwa", "Sur", "Ibri", "Barka", "Ruwi", "Seeb", "Duqm"],
  QA: ["Doha", "Al Wakrah", "Al Khor", "Al Rayyan", "Mesaieed", "Umm Salal", "Lusail"],
  BH: ["Manama", "Riffa", "Muharraq", "Isa Town", "Hamad Town", "Sitra", "Juffair", "Budaiya"],
  IN: ["Mangaluru", "Kasaragod", "Udupi", "Puttur", "Bantwal", "Belthangady", "Uppala", "Manjeshwar",
    "Bengaluru", "Mysuru", "Kozhikode", "Kannur", "Kochi", "Thiruvananthapuram", "Mumbai", "Chennai",
    "Hyderabad", "Delhi"],
};

const key = (v) => String(v || "").replace(/[.,]/g, " ").toLowerCase().split(/\s+/).filter(Boolean).join(" ");

// Words that name a country, not a city. Same list as the backend (app/utils/countries.py).
const COUNTRY_WORDS = new Set([
  ...PHONE_COUNTRIES.map((c) => c.name.toLowerCase()),
  "ksa", "k s a", "saudi", "saudia", "saudiarabia", "kingdom of saudi arabia", "uae", "u a e", "emirates",
  "the emirates", "united arab emirate", "oman", "sultanate of oman", "qatar", "bahrain", "kingdom of bahrain",
  "india", "bharat", "usa", "u s a", "us", "america", "united states of america", "uk", "u k", "england",
  "great britain", "britain", "canada", "australia", "gcc", "gulf", "middle east",
].map(key));
const COUNTRY_WORDS_JOINED = new Set([...COUNTRY_WORDS].map((w) => w.replace(/ /g, "")));
const CITY_FIXES = { kuwait: "Kuwait City" };
const KNOWN_CITIES = new Map(Object.values(CITY_SUGGESTIONS).flat().map((c) => [key(c), c]));

export function isCountryWord(value) {
  const k = key(value);
  return Boolean(k) && (COUNTRY_WORDS.has(k) || COUNTRY_WORDS_JOINED.has(k.replace(/ /g, "")));
}

/** Why this is not a usable city, or "" when it is fine (empty counts as fine here). */
export function cityProblem(value) {
  const k = key(value);
  if (!k || CITY_FIXES[k]) return "";
  if (isCountryWord(value)) return "Please enter your city, not the country (for example Riyadh, Dubai or Doha).";
  if (k.replace(/ /g, "").length < 2 || !/\p{L}/u.test(value)) return "Please enter the name of your city.";
  return "";
}

/** Usual spelling for a known city ("riyadh" -> "Riyadh"), otherwise the text with tidy spaces. */
export function tidyCity(value) {
  const k = key(value);
  return CITY_FIXES[k] || KNOWN_CITIES.get(k) || String(value || "").split(/\s+/).filter(Boolean).join(" ");
}

export function isLocationComplete(member) {
  const city = String(member?.city || "").trim();
  return Boolean(member?.country && city && !cityProblem(city));
}
