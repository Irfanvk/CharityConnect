import { useCallback } from "react";
import { useReportsLanguage } from "@/lib/reportsI18n";

/*
 * Forgot / reset password words in English, Malayalam and Kannada (same language switch as
 * Reports). Written by Claude; please have a native speaker check the Malayalam and Kannada.
 */

const en = {
  forgotTitle: "Forgot password",
  forgotSub: "No problem. Tell us your phone number and an admin will send you a WhatsApp message with a link.",
  step1: "1. Choose your country",
  step2: "2. Type your phone number",
  phoneHint: "Only the numbers. Spaces or a 0 at the start are fine.",
  sendRequest: "Send request",
  sending: "Sending…",
  tooShort: "Please type your full phone number.",
  sentTitle: "Request sent",
  sentWhat: "What happens now:",
  sent1: "An admin checks your request.",
  sent2: "You get a WhatsApp message with a link.",
  sent3: "Tap the link and choose a new password.",
  sentNote: "If you don't get a message soon, call a GCC admin.",
  useOther: "Use my username or email instead",
  usePhone: "Use my phone number instead",
  usernameOrEmail: "Username or email",
  backToLogin: "Back to sign in",
  resetTitle: "Choose a new password",
  resetFor: "For",
  checking: "Checking your link…",
  badLinkTitle: "This link does not work any more",
  badLinkText: "Links work only once and only for a short time. Ask for a new one.",
  askAgain: "Ask for a new link",
  newPassword: "New password",
  againPassword: "Type it again",
  show: "Show",
  hide: "Hide",
  suggest: "Suggest a password for me",
  suggested: "Write this password down safely:",
  rule_len: "At least 8 characters",
  rule_upper: "A capital letter (A–Z)",
  rule_lower: "A small letter (a–z)",
  rule_digit: "A number (0–9)",
  rule_symbol: "A sign like @ # ! *",
  match: "Both are the same",
  save: "Save new password",
  saving: "Saving…",
  doneTitle: "Your password is changed",
  doneText: "Sign in with your new password.",
  signIn: "Sign in",
  failed: "Could not save. The link may have expired.",
};

const ml = {
  forgotTitle: "പാസ്‌വേഡ് മറന്നോ",
  forgotSub: "പ്രശ്നമില്ല. നിങ്ങളുടെ ഫോൺ നമ്പർ നൽകുക; ഒരു അഡ്മിൻ വാട്ട്സ്ആപ്പിൽ ഒരു ലിങ്ക് അയയ്ക്കും.",
  step1: "1. നിങ്ങളുടെ രാജ്യം തിരഞ്ഞെടുക്കുക",
  step2: "2. ഫോൺ നമ്പർ ടൈപ്പ് ചെയ്യുക",
  phoneHint: "അക്കങ്ങൾ മാത്രം. സ്പേസോ തുടക്കത്തിലെ 0-ഓ കുഴപ്പമില്ല.",
  sendRequest: "അപേക്ഷ അയയ്ക്കുക",
  sending: "അയയ്ക്കുന്നു…",
  tooShort: "മുഴുവൻ ഫോൺ നമ്പർ ടൈപ്പ് ചെയ്യുക.",
  sentTitle: "അപേക്ഷ അയച്ചു",
  sentWhat: "ഇനി സംഭവിക്കുന്നത്:",
  sent1: "ഒരു അഡ്മിൻ നിങ്ങളുടെ അപേക്ഷ പരിശോധിക്കും.",
  sent2: "നിങ്ങൾക്ക് വാട്ട്സ്ആപ്പിൽ ഒരു ലിങ്ക് ലഭിക്കും.",
  sent3: "ലിങ്കിൽ തൊട്ട് പുതിയ പാസ്‌വേഡ് തിരഞ്ഞെടുക്കുക.",
  sentNote: "പെട്ടെന്ന് സന്ദേശം ലഭിച്ചില്ലെങ്കിൽ ഒരു ജിസിസി അഡ്മിനെ വിളിക്കുക.",
  useOther: "പകരം യൂസർനെയിം അല്ലെങ്കിൽ ഇമെയിൽ ഉപയോഗിക്കുക",
  usePhone: "പകരം ഫോൺ നമ്പർ ഉപയോഗിക്കുക",
  usernameOrEmail: "യൂസർനെയിം അല്ലെങ്കിൽ ഇമെയിൽ",
  backToLogin: "സൈൻ ഇൻ പേജിലേക്ക് മടങ്ങുക",
  resetTitle: "പുതിയ പാസ്‌വേഡ് തിരഞ്ഞെടുക്കുക",
  resetFor: "ആർക്ക്",
  checking: "ലിങ്ക് പരിശോധിക്കുന്നു…",
  badLinkTitle: "ഈ ലിങ്ക് ഇനി പ്രവർത്തിക്കില്ല",
  badLinkText: "ലിങ്ക് ഒരിക്കൽ മാത്രം, കുറച്ച് സമയത്തേക്ക് മാത്രം പ്രവർത്തിക്കും. പുതിയത് ചോദിക്കുക.",
  askAgain: "പുതിയ ലിങ്ക് ചോദിക്കുക",
  newPassword: "പുതിയ പാസ്‌വേഡ്",
  againPassword: "വീണ്ടും ടൈപ്പ് ചെയ്യുക",
  show: "കാണിക്കുക",
  hide: "മറയ്ക്കുക",
  suggest: "എനിക്കായി ഒരു പാസ്‌വേഡ് നിർദ്ദേശിക്കുക",
  suggested: "ഈ പാസ്‌വേഡ് സുരക്ഷിതമായി എഴുതി വയ്ക്കുക:",
  rule_len: "കുറഞ്ഞത് 8 അക്ഷരങ്ങൾ",
  rule_upper: "ഒരു വലിയ അക്ഷരം (A–Z)",
  rule_lower: "ഒരു ചെറിയ അക്ഷരം (a–z)",
  rule_digit: "ഒരു അക്കം (0–9)",
  rule_symbol: "@ # ! * പോലെ ഒരു ചിഹ്നം",
  match: "രണ്ടും ഒന്നുതന്നെ",
  save: "പുതിയ പാസ്‌വേഡ് സേവ് ചെയ്യുക",
  saving: "സേവ് ചെയ്യുന്നു…",
  doneTitle: "നിങ്ങളുടെ പാസ്‌വേഡ് മാറ്റി",
  doneText: "പുതിയ പാസ്‌വേഡ് ഉപയോഗിച്ച് സൈൻ ഇൻ ചെയ്യുക.",
  signIn: "സൈൻ ഇൻ",
  failed: "സേവ് ചെയ്യാനായില്ല. ലിങ്കിന്റെ സമയം കഴിഞ്ഞിരിക്കാം.",
};

const kn = {
  forgotTitle: "ಪಾಸ್‌ವರ್ಡ್ ಮರೆತಿರಾ",
  forgotSub: "ಚಿಂತಿಸಬೇಡಿ. ನಿಮ್ಮ ಫೋನ್ ಸಂಖ್ಯೆ ನೀಡಿ; ಒಬ್ಬ ಅಡ್ಮಿನ್ ವಾಟ್ಸಾಪ್‌ನಲ್ಲಿ ಲಿಂಕ್ ಕಳುಹಿಸುತ್ತಾರೆ.",
  step1: "1. ನಿಮ್ಮ ದೇಶ ಆಯ್ಕೆಮಾಡಿ",
  step2: "2. ಫೋನ್ ಸಂಖ್ಯೆ ಟೈಪ್ ಮಾಡಿ",
  phoneHint: "ಸಂಖ್ಯೆಗಳು ಮಾತ್ರ. ಸ್ಪೇಸ್ ಅಥವಾ ಆರಂಭದ 0 ಇದ್ದರೂ ಪರವಾಗಿಲ್ಲ.",
  sendRequest: "ವಿನಂತಿ ಕಳುಹಿಸಿ",
  sending: "ಕಳುಹಿಸಲಾಗುತ್ತಿದೆ…",
  tooShort: "ಪೂರ್ಣ ಫೋನ್ ಸಂಖ್ಯೆ ಟೈಪ್ ಮಾಡಿ.",
  sentTitle: "ವಿನಂತಿ ಕಳುಹಿಸಲಾಗಿದೆ",
  sentWhat: "ಮುಂದೆ ಏನಾಗುತ್ತದೆ:",
  sent1: "ಒಬ್ಬ ಅಡ್ಮಿನ್ ನಿಮ್ಮ ವಿನಂತಿಯನ್ನು ಪರಿಶೀಲಿಸುತ್ತಾರೆ.",
  sent2: "ನಿಮಗೆ ವಾಟ್ಸಾಪ್‌ನಲ್ಲಿ ಒಂದು ಲಿಂಕ್ ಬರುತ್ತದೆ.",
  sent3: "ಲಿಂಕ್ ಒತ್ತಿ ಹೊಸ ಪಾಸ್‌ವರ್ಡ್ ಆಯ್ಕೆಮಾಡಿ.",
  sentNote: "ಬೇಗ ಸಂದೇಶ ಬರದಿದ್ದರೆ, ಜಿಸಿಸಿ ಅಡ್ಮಿನ್‌ಗೆ ಕರೆ ಮಾಡಿ.",
  useOther: "ಬದಲಾಗಿ ಯೂಸರ್‌ನೇಮ್ ಅಥವಾ ಇಮೇಲ್ ಬಳಸಿ",
  usePhone: "ಬದಲಾಗಿ ಫೋನ್ ಸಂಖ್ಯೆ ಬಳಸಿ",
  usernameOrEmail: "ಯೂಸರ್‌ನೇಮ್ ಅಥವಾ ಇಮೇಲ್",
  backToLogin: "ಸೈನ್ ಇನ್‌ಗೆ ಹಿಂತಿರುಗಿ",
  resetTitle: "ಹೊಸ ಪಾಸ್‌ವರ್ಡ್ ಆಯ್ಕೆಮಾಡಿ",
  resetFor: "ಯಾರಿಗೆ",
  checking: "ನಿಮ್ಮ ಲಿಂಕ್ ಪರಿಶೀಲಿಸಲಾಗುತ್ತಿದೆ…",
  badLinkTitle: "ಈ ಲಿಂಕ್ ಇನ್ನು ಕೆಲಸ ಮಾಡುವುದಿಲ್ಲ",
  badLinkText: "ಲಿಂಕ್ ಒಮ್ಮೆ ಮಾತ್ರ, ಸ್ವಲ್ಪ ಸಮಯ ಮಾತ್ರ ಕೆಲಸ ಮಾಡುತ್ತದೆ. ಹೊಸದನ್ನು ಕೇಳಿ.",
  askAgain: "ಹೊಸ ಲಿಂಕ್ ಕೇಳಿ",
  newPassword: "ಹೊಸ ಪಾಸ್‌ವರ್ಡ್",
  againPassword: "ಮತ್ತೊಮ್ಮೆ ಟೈಪ್ ಮಾಡಿ",
  show: "ತೋರಿಸಿ",
  hide: "ಮರೆಮಾಡಿ",
  suggest: "ನನಗಾಗಿ ಒಂದು ಪಾಸ್‌ವರ್ಡ್ ಸೂಚಿಸಿ",
  suggested: "ಈ ಪಾಸ್‌ವರ್ಡ್ ಅನ್ನು ಸುರಕ್ಷಿತವಾಗಿ ಬರೆದಿಡಿ:",
  rule_len: "ಕನಿಷ್ಠ 8 ಅಕ್ಷರಗಳು",
  rule_upper: "ಒಂದು ದೊಡ್ಡ ಅಕ್ಷರ (A–Z)",
  rule_lower: "ಒಂದು ಸಣ್ಣ ಅಕ್ಷರ (a–z)",
  rule_digit: "ಒಂದು ಸಂಖ್ಯೆ (0–9)",
  rule_symbol: "@ # ! * ನಂತಹ ಒಂದು ಚಿಹ್ನೆ",
  match: "ಎರಡೂ ಒಂದೇ",
  save: "ಹೊಸ ಪಾಸ್‌ವರ್ಡ್ ಉಳಿಸಿ",
  saving: "ಉಳಿಸಲಾಗುತ್ತಿದೆ…",
  doneTitle: "ನಿಮ್ಮ ಪಾಸ್‌ವರ್ಡ್ ಬದಲಾಗಿದೆ",
  doneText: "ಹೊಸ ಪಾಸ್‌ವರ್ಡ್‌ನಿಂದ ಸೈನ್ ಇನ್ ಮಾಡಿ.",
  signIn: "ಸೈನ್ ಇನ್",
  failed: "ಉಳಿಸಲಾಗಲಿಲ್ಲ. ಲಿಂಕ್‌ನ ಸಮಯ ಮುಗಿದಿರಬಹುದು.",
};

const DICT = { en, ml, kn };

export function useAuthText() {
  const L = useReportsLanguage();
  const dict = DICT[L.lang] || en;
  const t = useCallback((key) => dict[key] ?? en[key] ?? key, [dict]);
  return { ...L, t };
}

/** The same rules the server checks for a new password. */
export const PASSWORD_RULES = [
  ["rule_len", (p) => p.length >= 8],
  ["rule_upper", (p) => /[A-Z]/.test(p)],
  ["rule_lower", (p) => /[a-z]/.test(p)],
  ["rule_digit", (p) => /\d/.test(p)],
  ["rule_symbol", (p) => /[^A-Za-z0-9]/.test(p)],
];

const WORDS = ["Mango", "River", "Garden", "Star", "Lamp", "Cloud", "Tiger", "Palm", "Sea", "Moon", "Rose", "Hill"];

/** Easy to read and write down, and meets every rule: e.g. "Mango-River-47!" */
export function suggestPassword() {
  const pick = () => WORDS[crypto.getRandomValues(new Uint32Array(1))[0] % WORDS.length];
  const num = 10 + (crypto.getRandomValues(new Uint32Array(1))[0] % 90);
  const first = pick();
  let second = pick();
  while (second === first) second = pick();
  return `${first}-${second}-${num}!`;
}
