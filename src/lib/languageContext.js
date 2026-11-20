import { createContext } from "react";

/** The app language shared by every screen (see appLanguage.jsx). null outside the provider. */
export const LanguageContext = createContext(null);

export const LANGUAGE_STORAGE_KEY = "charityhub.reports.language"; // one choice for the app, reports, sign-in and guide
export const APP_LANGUAGES = [
  { code: "en", label: "English", locale: "en-IN" },
  { code: "ml", label: "മലയാളം", locale: "ml-IN" },
  { code: "kn", label: "ಕನ್ನಡ", locale: "kn-IN" },
];
