/*
 * User guide: "How do I…?" tasks in English, Malayalam and Kannada.
 * Each task: who sees it (member tasks are shown to everyone, admin tasks to admins),
 * the page its button opens, an optional screenshot (sample data only), search words,
 * and 3–5 short steps. The Malayalam and Kannada were written by Claude; please have a
 * native speaker check them. Keep steps short: one action per step.
 */

export const GUIDE_TEXT = {
  en: {
    title: "User guide",
    sub: "Find what you want to do, then follow the steps.",
    search: "Search, e.g. pay, photo, password",
    memberTasks: "For everyone",
    adminTasks: "For admins",
    open: "Open this page",
    back: "All topics",
    noResults: "Nothing found. Try another word.",
    stillStuck: "Still stuck? Ask a GCC admin, or send a request from Profile → Help.",
    steps: "Steps",
  },
  ml: {
    title: "ഉപയോഗ സഹായി",
    sub: "നിങ്ങൾക്ക് ചെയ്യേണ്ടത് കണ്ടെത്തി, ഘട്ടങ്ങൾ പിന്തുടരുക.",
    search: "തിരയുക, ഉദാ: അടയ്ക്കുക, ഫോട്ടോ, പാസ്‌വേഡ്",
    memberTasks: "എല്ലാവർക്കും",
    adminTasks: "അഡ്മിൻമാർക്ക്",
    open: "ഈ പേജ് തുറക്കുക",
    back: "എല്ലാ വിഷയങ്ങളും",
    noResults: "ഒന്നും കണ്ടെത്തിയില്ല. മറ്റൊരു വാക്ക് നോക്കുക.",
    stillStuck: "ഇനിയും സംശയമുണ്ടോ? ഒരു ജിസിസി അഡ്മിനോട് ചോദിക്കുക, അല്ലെങ്കിൽ പ്രൊഫൈൽ → സഹായം വഴി അപേക്ഷ അയയ്ക്കുക.",
    steps: "ഘട്ടങ്ങൾ",
  },
  kn: {
    title: "ಬಳಕೆದಾರರ ಮಾರ್ಗದರ್ಶಿ",
    sub: "ನೀವು ಮಾಡಬೇಕಾದದ್ದನ್ನು ಹುಡುಕಿ, ನಂತರ ಹಂತಗಳನ್ನು ಅನುಸರಿಸಿ.",
    search: "ಹುಡುಕಿ, ಉದಾ: ಪಾವತಿ, ಫೋಟೋ, ಪಾಸ್‌ವರ್ಡ್",
    memberTasks: "ಎಲ್ಲರಿಗೂ",
    adminTasks: "ಅಡ್ಮಿನ್‌ಗಳಿಗೆ",
    open: "ಈ ಪುಟ ತೆರೆಯಿರಿ",
    back: "ಎಲ್ಲಾ ವಿಷಯಗಳು",
    noResults: "ಏನೂ ಸಿಗಲಿಲ್ಲ. ಬೇರೆ ಪದ ಪ್ರಯತ್ನಿಸಿ.",
    stillStuck: "ಇನ್ನೂ ಸಮಸ್ಯೆಯೇ? ಜಿಸಿಸಿ ಅಡ್ಮಿನ್ ಅವರನ್ನು ಕೇಳಿ, ಅಥವಾ ಪ್ರೊಫೈಲ್ → ಸಹಾಯ ಮೂಲಕ ವಿನಂತಿ ಕಳುಹಿಸಿ.",
    steps: "ಹಂತಗಳು",
  },
};

// icon names are lucide-react icons, resolved in Documentation.jsx
export const GUIDE_TASKS = [
  // ── Everyone ──────────────────────────────────────────────────────────────
  {
    id: "pay", role: "member", icon: "Wallet", page: "/Challans", shot: "/guide/my-payments.jpg",
    words: "pay fee monthly challan owe due money",
    title: { en: "Pay my monthly fee", ml: "മാസവരി അടയ്ക്കുക", kn: "ಮಾಸಿಕ ಶುಲ್ಕ ಪಾವತಿಸಿ" },
    steps: {
      en: ["Open My payments (Challans in the menu).", "The top box shows what you owe. Tap Pay now.", "Tick the months you are paying for.", "Pay to the bank or UPI shown at the top of the form.", "Add the payment screenshot and tap Generate & Submit Proof."],
      ml: ["എന്റെ പണമടയ്ക്കലുകൾ തുറക്കുക (മെനുവിൽ ചലാൻസ്).", "മുകളിലെ ബോക്സിൽ അടയ്ക്കാനുള്ളത് കാണാം. Pay now തൊടുക.", "അടയ്ക്കുന്ന മാസങ്ങൾ ടിക്ക് ചെയ്യുക.", "ഫോമിന് മുകളിലുള്ള ബാങ്കിലോ UPI-യിലോ പണം അടയ്ക്കുക.", "പണമടച്ചതിന്റെ സ്ക്രീൻഷോട്ട് ചേർത്ത് Generate & Submit Proof തൊടുക."],
      kn: ["ನನ್ನ ಪಾವತಿಗಳು ತೆರೆಯಿರಿ (ಮೆನುವಿನಲ್ಲಿ ಚಲನ್ಸ್).", "ಮೇಲಿನ ಪೆಟ್ಟಿಗೆಯಲ್ಲಿ ಬಾಕಿ ಕಾಣುತ್ತದೆ. Pay now ಒತ್ತಿ.", "ಪಾವತಿಸುವ ತಿಂಗಳುಗಳನ್ನು ಟಿಕ್ ಮಾಡಿ.", "ಫಾರ್ಮ್‌ನ ಮೇಲಿರುವ ಬ್ಯಾಂಕ್ ಅಥವಾ UPI ಗೆ ಹಣ ಕಳುಹಿಸಿ.", "ಪಾವತಿಯ ಸ್ಕ್ರೀನ್‌ಶಾಟ್ ಸೇರಿಸಿ Generate & Submit Proof ಒತ್ತಿ."],
    },
  },
  {
    id: "proof", role: "member", icon: "Upload", page: "/Challans", shot: "/guide/upload-proof.jpg",
    words: "proof screenshot receipt upload not paid rejected",
    title: { en: "Upload a payment proof", ml: "പണമടച്ചതിന്റെ തെളിവ് ചേർക്കുക", kn: "ಪಾವತಿ ಪುರಾವೆ ಅಪ್‌ಲೋಡ್ ಮಾಡಿ" },
    steps: {
      en: ["Open My payments and tap the To pay tab.", "Find the month and tap Upload proof.", "Choose the screenshot or receipt photo.", "It moves to Waiting. An admin checks it; you get a notification."],
      ml: ["എന്റെ പണമടയ്ക്കലുകൾ തുറന്ന് To pay ടാബ് തൊടുക.", "മാസം കണ്ടെത്തി Upload proof തൊടുക.", "സ്ക്രീൻഷോട്ടോ രസീത് ഫോട്ടോയോ തിരഞ്ഞെടുക്കുക.", "അത് Waiting-ലേക്ക് മാറും. അഡ്മിൻ പരിശോധിക്കും; നിങ്ങൾക്ക് അറിയിപ്പ് ലഭിക്കും."],
      kn: ["ನನ್ನ ಪಾವತಿಗಳು ತೆರೆದು To pay ಟ್ಯಾಬ್ ಒತ್ತಿ.", "ತಿಂಗಳನ್ನು ಹುಡುಕಿ Upload proof ಒತ್ತಿ.", "ಸ್ಕ್ರೀನ್‌ಶಾಟ್ ಅಥವಾ ರಸೀದಿ ಫೋಟೋ ಆಯ್ಕೆಮಾಡಿ.", "ಅದು Waiting ಗೆ ಹೋಗುತ್ತದೆ. ಅಡ್ಮಿನ್ ಪರಿಶೀಲಿಸುತ್ತಾರೆ; ನಿಮಗೆ ಸೂಚನೆ ಬರುತ್ತದೆ."],
    },
  },
  {
    id: "ahead", role: "member", icon: "CalendarPlus", page: "/Challans",
    words: "advance ahead future months early",
    title: { en: "Pay months in advance", ml: "മുൻകൂട്ടി മാസങ്ങൾ അടയ്ക്കുക", kn: "ಮುಂಗಡವಾಗಿ ತಿಂಗಳು ಪಾವತಿಸಿ" },
    steps: {
      en: ["Open My payments and tap Pay now.", "At Pay ahead, choose how many months (up to 12).", "Tick the months and add the proof as usual."],
      ml: ["എന്റെ പണമടയ്ക്കലുകൾ തുറന്ന് Pay now തൊടുക.", "Pay ahead-ൽ എത്ര മാസം എന്ന് തിരഞ്ഞെടുക്കുക (12 വരെ).", "മാസങ്ങൾ ടിക്ക് ചെയ്ത് സാധാരണ പോലെ തെളിവ് ചേർക്കുക."],
      kn: ["ನನ್ನ ಪಾವತಿಗಳು ತೆರೆದು Pay now ಒತ್ತಿ.", "Pay ahead ನಲ್ಲಿ ಎಷ್ಟು ತಿಂಗಳು ಎಂದು ಆಯ್ಕೆಮಾಡಿ (12 ರವರೆಗೆ).", "ತಿಂಗಳುಗಳನ್ನು ಟಿಕ್ ಮಾಡಿ ಎಂದಿನಂತೆ ಪುರಾವೆ ಸೇರಿಸಿ."],
    },
  },
  {
    id: "bank", role: "member", icon: "Landmark", page: "/BankDetails",
    words: "bank account upi qr ifsc where to pay",
    title: { en: "Where to send the money", ml: "പണം എവിടെ അയയ്ക്കണം", kn: "ಹಣ ಎಲ್ಲಿಗೆ ಕಳುಹಿಸಬೇಕು" },
    steps: {
      en: ["Open Bank Details from the menu.", "Copy the account number, IFSC or UPI ID, or scan the QR code.", "Pay only to this account, then upload the proof."],
      ml: ["മെനുവിൽ നിന്ന് ബാങ്ക് വിവരങ്ങൾ തുറക്കുക.", "അക്കൗണ്ട് നമ്പർ, IFSC അല്ലെങ്കിൽ UPI ഐഡി കോപ്പി ചെയ്യുക, അല്ലെങ്കിൽ QR സ്കാൻ ചെയ്യുക.", "ഈ അക്കൗണ്ടിലേക്ക് മാത്രം പണം അയച്ച് തെളിവ് ചേർക്കുക."],
      kn: ["ಮೆನುವಿನಿಂದ ಬ್ಯಾಂಕ್ ವಿವರಗಳು ತೆರೆಯಿರಿ.", "ಖಾತೆ ಸಂಖ್ಯೆ, IFSC ಅಥವಾ UPI ಐಡಿ ಕಾಪಿ ಮಾಡಿ, ಅಥವಾ QR ಸ್ಕ್ಯಾನ್ ಮಾಡಿ.", "ಈ ಖಾತೆಗೆ ಮಾತ್ರ ಪಾವತಿಸಿ, ನಂತರ ಪುರಾವೆ ಅಪ್‌ಲೋಡ್ ಮಾಡಿ."],
    },
  },
  {
    id: "photo", role: "member", icon: "Camera", page: "/Profile?photo=1", shot: "/guide/profile.jpg",
    words: "photo picture avatar profile image",
    title: { en: "Add or change my photo", ml: "എന്റെ ഫോട്ടോ ചേർക്കുക / മാറ്റുക", kn: "ನನ್ನ ಫೋಟೋ ಸೇರಿಸಿ / ಬದಲಿಸಿ" },
    steps: {
      en: ["Tap your round photo (or initials) at the top right, then Add your photo.", "Choose a clear photo of your face and fit it in the circle.", "Tap Save. An admin approves it, then everyone sees it."],
      ml: ["മുകളിൽ വലതുവശത്തെ നിങ്ങളുടെ ഫോട്ടോ (അല്ലെങ്കിൽ ഇനീഷ്യലുകൾ) തൊട്ട് Add your photo തൊടുക.", "മുഖം വ്യക്തമായ ഫോട്ടോ തിരഞ്ഞെടുത്ത് വൃത്തത്തിൽ ഒതുക്കുക.", "Save തൊടുക. അഡ്മിൻ അംഗീകരിച്ചാൽ എല്ലാവർക്കും കാണാം."],
      kn: ["ಮೇಲಿನ ಬಲಭಾಗದ ನಿಮ್ಮ ಫೋಟೋ (ಅಥವಾ ಅಕ್ಷರಗಳು) ಒತ್ತಿ, ನಂತರ Add your photo ಒತ್ತಿ.", "ಮುಖ ಸ್ಪಷ್ಟವಾಗಿರುವ ಫೋಟೋ ಆಯ್ಕೆಮಾಡಿ ವೃತ್ತದಲ್ಲಿ ಹೊಂದಿಸಿ.", "Save ಒತ್ತಿ. ಅಡ್ಮಿನ್ ಅನುಮೋದಿಸಿದ ನಂತರ ಎಲ್ಲರಿಗೂ ಕಾಣುತ್ತದೆ."],
    },
  },
  {
    id: "details", role: "member", icon: "UserPen", page: "/Profile",
    words: "phone email name address change details city country",
    title: { en: "Change my phone or details", ml: "ഫോൺ / വിവരങ്ങൾ മാറ്റുക", kn: "ಫೋನ್ / ವಿವರ ಬದಲಿಸಿ" },
    steps: {
      en: ["Open Profile.", "Tap the detail you want to change (phone, email…).", "Type the new value and tap Send for approval.", "Where you live (country and city) changes straight away."],
      ml: ["പ്രൊഫൈൽ തുറക്കുക.", "മാറ്റേണ്ട വിവരം തൊടുക (ഫോൺ, ഇമെയിൽ…).", "പുതിയത് ടൈപ്പ് ചെയ്ത് Send for approval തൊടുക.", "താമസം (രാജ്യം, നഗരം) ഉടൻ മാറും."],
      kn: ["ಪ್ರೊಫೈಲ್ ತೆರೆಯಿರಿ.", "ಬದಲಿಸಬೇಕಾದ ವಿವರ ಒತ್ತಿ (ಫೋನ್, ಇಮೇಲ್…).", "ಹೊಸದನ್ನು ಟೈಪ್ ಮಾಡಿ Send for approval ಒತ್ತಿ.", "ವಾಸ (ದೇಶ, ನಗರ) ತಕ್ಷಣ ಬದಲಾಗುತ್ತದೆ."],
    },
  },
  {
    id: "notifications", role: "member", icon: "Bell", page: "/Notifications",
    words: "notification alert push phone bell",
    title: { en: "Get notifications on my phone", ml: "ഫോണിൽ അറിയിപ്പുകൾ ലഭിക്കാൻ", kn: "ಫೋನ್‌ನಲ್ಲಿ ಸೂಚನೆಗಳು ಪಡೆಯಲು" },
    steps: {
      en: ["Open Notifications and tap Settings.", "Tap Enable on this device and allow it.", "Tap a notification to open its page; it is marked read."],
      ml: ["അറിയിപ്പുകൾ തുറന്ന് Settings തൊടുക.", "Enable on this device തൊട്ട് അനുവദിക്കുക.", "അറിയിപ്പ് തൊട്ടാൽ അതിന്റെ പേജ് തുറക്കും; വായിച്ചതായി മാറും."],
      kn: ["ಸೂಚನೆಗಳು ತೆರೆದು Settings ಒತ್ತಿ.", "Enable on this device ಒತ್ತಿ ಅನುಮತಿಸಿ.", "ಸೂಚನೆ ಒತ್ತಿದರೆ ಅದರ ಪುಟ ತೆರೆಯುತ್ತದೆ; ಓದಿದೆ ಎಂದು ಗುರುತಾಗುತ್ತದೆ."],
    },
  },
  {
    id: "forgot", role: "member", icon: "KeyRound", page: "/ForgotPassword", shot: "/guide/forgot-password.jpg",
    words: "forgot password reset login cannot sign in",
    title: { en: "I forgot my password", ml: "പാസ്‌വേഡ് മറന്നു", kn: "ಪಾಸ್‌ವರ್ಡ್ ಮರೆತಿದ್ದೇನೆ" },
    steps: {
      en: ["On the sign-in page tap Forgot password?", "Choose your country and type your phone number.", "Wait for a WhatsApp message from an admin and tap the link.", "Choose a new password (tap Suggest a password if you like)."],
      ml: ["സൈൻ ഇൻ പേജിൽ Forgot password? തൊടുക.", "രാജ്യം തിരഞ്ഞെടുത്ത് ഫോൺ നമ്പർ ടൈപ്പ് ചെയ്യുക.", "അഡ്മിനിൽ നിന്നുള്ള വാട്ട്സ്ആപ്പ് സന്ദേശത്തിലെ ലിങ്ക് തൊടുക.", "പുതിയ പാസ്‌വേഡ് തിരഞ്ഞെടുക്കുക (വേണമെങ്കിൽ Suggest a password തൊടുക)."],
      kn: ["ಸೈನ್ ಇನ್ ಪುಟದಲ್ಲಿ Forgot password? ಒತ್ತಿ.", "ದೇಶ ಆಯ್ಕೆಮಾಡಿ ಫೋನ್ ಸಂಖ್ಯೆ ಟೈಪ್ ಮಾಡಿ.", "ಅಡ್ಮಿನ್‌ರಿಂದ ಬರುವ ವಾಟ್ಸಾಪ್ ಸಂದೇಶದ ಲಿಂಕ್ ಒತ್ತಿ.", "ಹೊಸ ಪಾಸ್‌ವರ್ಡ್ ಆಯ್ಕೆಮಾಡಿ (ಬೇಕಾದರೆ Suggest a password ಒತ್ತಿ)."],
    },
  },
  {
    id: "install", role: "member", icon: "Smartphone", page: null,
    words: "install app home screen download",
    title: { en: "Put the app on my phone", ml: "ആപ്പ് ഫോണിൽ ചേർക്കുക", kn: "ಆಪ್ ಅನ್ನು ಫೋನ್‌ಗೆ ಸೇರಿಸಿ" },
    steps: {
      en: ["Tap the download icon at the top (Install app).", "Android: tap Install. iPhone: tap Share, then Add to Home Screen.", "Open it from your home screen like any app."],
      ml: ["മുകളിലെ ഡൗൺലോഡ് ഐക്കൺ (Install app) തൊടുക.", "ആൻഡ്രോയിഡ്: Install തൊടുക. ഐഫോൺ: Share തൊട്ട് Add to Home Screen.", "മറ്റ് ആപ്പുകൾ പോലെ ഹോം സ്ക്രീനിൽ നിന്ന് തുറക്കുക."],
      kn: ["ಮೇಲಿನ ಡೌನ್‌ಲೋಡ್ ಐಕಾನ್ (Install app) ಒತ್ತಿ.", "ಆಂಡ್ರಾಯ್ಡ್: Install ಒತ್ತಿ. ಐಫೋನ್: Share ಒತ್ತಿ, ನಂತರ Add to Home Screen.", "ಇತರ ಆಪ್‌ಗಳಂತೆ ಹೋಮ್ ಸ್ಕ್ರೀನ್‌ನಿಂದ ತೆರೆಯಿರಿ."],
    },
  },
  {
    id: "relief", role: "member", icon: "HandHeart", page: "/Relief", shot: "/guide/relief.jpg",
    words: "relief fund help death illness retirement eligible",
    title: { en: "Relief fund: am I eligible?", ml: "സഹായ നിധി: എനിക്ക് അർഹതയുണ്ടോ?", kn: "ಪರಿಹಾರ ನಿಧಿ: ನಾನು ಅರ್ಹನೇ?" },
    steps: {
      en: ["Open Relief Fund from the menu.", "Am I eligible? shows each rule with ✓ or ✕.", "To apply, give a written application to a GCC admin."],
      ml: ["മെനുവിൽ നിന്ന് സഹായ നിധി തുറക്കുക.", "എനിക്ക് അർഹതയുണ്ടോ? എന്നതിൽ ഓരോ നിബന്ധനയും ✓ / ✕ ആയി കാണാം.", "അപേക്ഷിക്കാൻ രേഖാമൂലമുള്ള അപേക്ഷ ഒരു ജിസിസി അഡ്മിന് നൽകുക."],
      kn: ["ಮೆನುವಿನಿಂದ ಪರಿಹಾರ ನಿಧಿ ತೆರೆಯಿರಿ.", "ನಾನು ಅರ್ಹನೇ? ನಲ್ಲಿ ಪ್ರತಿ ನಿಯಮ ✓ / ✕ ಆಗಿ ಕಾಣುತ್ತದೆ.", "ಅರ್ಜಿ ಸಲ್ಲಿಸಲು ಲಿಖಿತ ಅರ್ಜಿಯನ್ನು ಜಿಸಿಸಿ ಅಡ್ಮಿನ್‌ಗೆ ನೀಡಿ."],
    },
  },
  {
    id: "donate", role: "member", icon: "Heart", page: "/Campaigns",
    words: "donate donation campaign give",
    title: { en: "Donate to a campaign", ml: "ക്യാമ്പെയിനിലേക്ക് സംഭാവന നൽകുക", kn: "ಅಭಿಯಾನಕ್ಕೆ ದೇಣಿಗೆ ನೀಡಿ" },
    steps: {
      en: ["Open Campaigns and choose one.", "Tap Donate and type the amount.", "Pay to the bank or UPI shown, then add the proof."],
      ml: ["ക്യാമ്പെയിനുകൾ തുറന്ന് ഒന്ന് തിരഞ്ഞെടുക്കുക.", "Donate തൊട്ട് തുക ടൈപ്പ് ചെയ്യുക.", "കാണിച്ച ബാങ്കിലോ UPI-യിലോ അടച്ച് തെളിവ് ചേർക്കുക."],
      kn: ["ಅಭಿಯಾನಗಳು ತೆರೆದು ಒಂದನ್ನು ಆಯ್ಕೆಮಾಡಿ.", "Donate ಒತ್ತಿ ಮೊತ್ತ ಟೈಪ್ ಮಾಡಿ.", "ತೋರಿಸಿದ ಬ್ಯಾಂಕ್ ಅಥವಾ UPI ಗೆ ಪಾವತಿಸಿ, ನಂತರ ಪುರಾವೆ ಸೇರಿಸಿ."],
    },
  },
  {
    id: "request", role: "member", icon: "MessageSquare", page: "/Requests",
    words: "request complaint help question suggestion",
    title: { en: "Ask for help or send a request", ml: "സഹായം ചോദിക്കുക / അപേക്ഷ അയയ്ക്കുക", kn: "ಸಹಾಯ ಕೇಳಿ / ವಿನಂತಿ ಕಳುಹಿಸಿ" },
    steps: {
      en: ["Open Profile and tap Help.", "Choose the kind (question, complaint, suggestion) and type your message.", "See the answer under My requests (Open and Done tabs)."],
      ml: ["പ്രൊഫൈൽ തുറന്ന് Help തൊടുക.", "തരം തിരഞ്ഞെടുത്ത് (ചോദ്യം, പരാതി, നിർദ്ദേശം) സന്ദേശം ടൈപ്പ് ചെയ്യുക.", "മറുപടി My requests-ൽ കാണാം (Open, Done ടാബുകൾ)."],
      kn: ["ಪ್ರೊಫೈಲ್ ತೆರೆದು Help ಒತ್ತಿ.", "ವಿಧ ಆಯ್ಕೆಮಾಡಿ (ಪ್ರಶ್ನೆ, ದೂರು, ಸಲಹೆ) ಸಂದೇಶ ಟೈಪ್ ಮಾಡಿ.", "ಉತ್ತರ My requests ನಲ್ಲಿ ಕಾಣುತ್ತದೆ (Open, Done ಟ್ಯಾಬ್‌ಗಳು)."],
    },
  },

  // ── Admins ────────────────────────────────────────────────────────────────
  {
    id: "record", role: "admin", icon: "HandCoins", page: "/Challans", shot: "/guide/money-received.jpg",
    words: "record cash received bank transfer member paid admin entry many months",
    title: { en: "Record money a member gave you", ml: "അംഗം നൽകിയ പണം രേഖപ്പെടുത്തുക", kn: "ಸದಸ್ಯರು ಕೊಟ್ಟ ಹಣವನ್ನು ದಾಖಲಿಸಿ" },
    steps: {
      en: ["Open Challans, tap New payment, then Money already received.", "Search the member and tap All owed (or pick months).", "Choose how it was paid, add the reference or a note.", "Tap Review, then Confirm. Another admin approves it."],
      ml: ["ചലാൻസ് തുറന്ന് New payment, പിന്നെ Money already received തൊടുക.", "അംഗത്തെ തിരഞ്ഞ് All owed തൊടുക (അല്ലെങ്കിൽ മാസങ്ങൾ തിരഞ്ഞെടുക്കുക).", "അടച്ച രീതി തിരഞ്ഞെടുത്ത് റഫറൻസോ കുറിപ്പോ ചേർക്കുക.", "Review, പിന്നെ Confirm തൊടുക. മറ്റൊരു അഡ്മിൻ അംഗീകരിക്കും."],
      kn: ["ಚಲನ್ಸ್ ತೆರೆದು New payment, ನಂತರ Money already received ಒತ್ತಿ.", "ಸದಸ್ಯರನ್ನು ಹುಡುಕಿ All owed ಒತ್ತಿ (ಅಥವಾ ತಿಂಗಳು ಆಯ್ಕೆಮಾಡಿ).", "ಪಾವತಿ ವಿಧಾನ ಆಯ್ಕೆಮಾಡಿ, ಉಲ್ಲೇಖ ಅಥವಾ ಟಿಪ್ಪಣಿ ಸೇರಿಸಿ.", "Review, ನಂತರ Confirm ಒತ್ತಿ. ಇನ್ನೊಬ್ಬ ಅಡ್ಮಿನ್ ಅನುಮೋದಿಸುತ್ತಾರೆ."],
    },
  },
  {
    id: "approve", role: "admin", icon: "BadgeCheck", page: "/admin/requests?tab=challans",
    words: "approve reject payment proof verify pending",
    title: { en: "Approve or reject a payment", ml: "പണമടയ്ക്കൽ അംഗീകരിക്കുക / നിരസിക്കുക", kn: "ಪಾವತಿ ಅನುಮೋದಿಸಿ / ತಿರಸ್ಕರಿಸಿ" },
    steps: {
      en: ["Open Requests, tab Pending Challans.", "Open the payment and look at the proof.", "Tap Approve, or Reject with a reason the member will read.", "You cannot approve a payment you entered yourself."],
      ml: ["അപേക്ഷകൾ തുറന്ന് Pending Challans ടാബ്.", "പണമടയ്ക്കൽ തുറന്ന് തെളിവ് നോക്കുക.", "Approve തൊടുക, അല്ലെങ്കിൽ അംഗം വായിക്കുന്ന കാരണം നൽകി Reject.", "നിങ്ങൾ തന്നെ ചേർത്തത് നിങ്ങൾക്ക് അംഗീകരിക്കാനാവില്ല."],
      kn: ["ವಿನಂತಿಗಳು ತೆರೆದು Pending Challans ಟ್ಯಾಬ್.", "ಪಾವತಿ ತೆರೆದು ಪುರಾವೆ ನೋಡಿ.", "Approve ಒತ್ತಿ, ಅಥವಾ ಸದಸ್ಯರು ಓದುವ ಕಾರಣದೊಂದಿಗೆ Reject.", "ನೀವೇ ನಮೂದಿಸಿದ ಪಾವತಿಯನ್ನು ನೀವು ಅನುಮೋದಿಸಲಾಗದು."],
    },
  },
  {
    id: "member-requests", role: "admin", icon: "Inbox", page: "/admin/requests",
    words: "member request photo change details approve",
    title: { en: "Answer member requests (photo, details)", ml: "അംഗങ്ങളുടെ അപേക്ഷകൾക്ക് മറുപടി", kn: "ಸದಸ್ಯರ ವಿನಂತಿಗಳಿಗೆ ಉತ್ತರಿಸಿ" },
    steps: {
      en: ["Open Requests, tab Member Requests.", "Tap Review to see the change (e.g. the new photo).", "Approve or Reject with a reason.", "Old pending or rejected requests can be deleted after 7 days."],
      ml: ["അപേക്ഷകൾ തുറന്ന് Member Requests ടാബ്.", "Review തൊട്ട് മാറ്റം കാണുക (ഉദാ: പുതിയ ഫോട്ടോ).", "Approve, അല്ലെങ്കിൽ കാരണം നൽകി Reject.", "7 ദിവസം കഴിഞ്ഞ പഴയ അപേക്ഷകൾ ഡിലീറ്റ് ചെയ്യാം."],
      kn: ["ವಿನಂತಿಗಳು ತೆರೆದು Member Requests ಟ್ಯಾಬ್.", "Review ಒತ್ತಿ ಬದಲಾವಣೆ ನೋಡಿ (ಉದಾ: ಹೊಸ ಫೋಟೋ).", "Approve, ಅಥವಾ ಕಾರಣದೊಂದಿಗೆ Reject.", "7 ದಿನ ಕಳೆದ ಹಳೆಯ ವಿನಂತಿಗಳನ್ನು ಅಳಿಸಬಹುದು."],
    },
  },
  {
    id: "add-member", role: "admin", icon: "UserPlus", page: "/Members",
    words: "add new member invite register",
    title: { en: "Add a new member", ml: "പുതിയ അംഗത്തെ ചേർക്കുക", kn: "ಹೊಸ ಸದಸ್ಯರನ್ನು ಸೇರಿಸಿ" },
    steps: {
      en: ["Open Members and tap Add Member.", "Fill in the name, phone, monthly fee and join date.", "Save. The member ID is given automatically.", "Send them an invite so they can sign in."],
      ml: ["അംഗങ്ങൾ തുറന്ന് Add Member തൊടുക.", "പേര്, ഫോൺ, മാസവരി, ചേർന്ന തീയതി നൽകുക.", "Save. അംഗ ഐഡി സ്വയം ലഭിക്കും.", "സൈൻ ഇൻ ചെയ്യാൻ അവർക്ക് ഒരു ക്ഷണം അയയ്ക്കുക."],
      kn: ["ಸದಸ್ಯರು ತೆರೆದು Add Member ಒತ್ತಿ.", "ಹೆಸರು, ಫೋನ್, ಮಾಸಿಕ ಶುಲ್ಕ, ಸೇರಿದ ದಿನಾಂಕ ತುಂಬಿ.", "Save. ಸದಸ್ಯ ಐಡಿ ಸ್ವಯಂ ಸಿಗುತ್ತದೆ.", "ಸೈನ್ ಇನ್ ಮಾಡಲು ಅವರಿಗೆ ಆಹ್ವಾನ ಕಳುಹಿಸಿ."],
    },
  },
  {
    id: "find-member", role: "admin", icon: "Search", page: "/Members",
    words: "find search member filter phone country registered",
    title: { en: "Find members", ml: "അംഗങ്ങളെ കണ്ടെത്തുക", kn: "ಸದಸ್ಯರನ್ನು ಹುಡುಕಿ" },
    steps: {
      en: ["Open Members and type a name, ID, phone or city.", "Tap Filters for status, registered, country, phone code or number.", "Remove a filter by tapping ✕ on its chip."],
      ml: ["അംഗങ്ങൾ തുറന്ന് പേര്, ഐഡി, ഫോൺ അല്ലെങ്കിൽ നഗരം ടൈപ്പ് ചെയ്യുക.", "നില, രജിസ്ട്രേഷൻ, രാജ്യം, ഫോൺ കോഡ്/നമ്പർ എന്നിവയ്ക്ക് Filters തൊടുക.", "ഫിൽട്ടർ മാറ്റാൻ അതിന്റെ ✕ തൊടുക."],
      kn: ["ಸದಸ್ಯರು ತೆರೆದು ಹೆಸರು, ಐಡಿ, ಫೋನ್ ಅಥವಾ ನಗರ ಟೈಪ್ ಮಾಡಿ.", "ಸ್ಥಿತಿ, ನೋಂದಣಿ, ದೇಶ, ಫೋನ್ ಕೋಡ್/ಸಂಖ್ಯೆಗೆ Filters ಒತ್ತಿ.", "ಫಿಲ್ಟರ್ ತೆಗೆಯಲು ಅದರ ✕ ಒತ್ತಿ."],
    },
  },
  {
    id: "statement", role: "admin", icon: "UserRound", page: "/Reports?view=member", shot: "/guide/statement.jpg",
    words: "statement report member paid due pdf whatsapp excel share",
    title: { en: "Share a member's statement", ml: "അംഗത്തിന്റെ സ്റ്റേറ്റ്മെന്റ് അയയ്ക്കുക", kn: "ಸದಸ್ಯರ ವಿವರ ಹಂಚಿಕೊಳ್ಳಿ" },
    steps: {
      en: ["Open Reports and tap One member.", "Search the member and tap their name.", "See paid, waiting and due months in colours.", "Tap Download PDF, Share on WhatsApp, Print or Excel."],
      ml: ["റിപ്പോർട്ടുകൾ തുറന്ന് ഒരു അംഗം തൊടുക.", "അംഗത്തെ തിരഞ്ഞ് പേര് തൊടുക.", "അടച്ചതും കാത്തിരിക്കുന്നതും ബാക്കിയുമായ മാസങ്ങൾ നിറങ്ങളിൽ കാണാം.", "PDF, വാട്ട്സ്ആപ്പ്, പ്രിന്റ് അല്ലെങ്കിൽ എക്സൽ തൊടുക."],
      kn: ["ವರದಿಗಳು ತೆರೆದು ಒಬ್ಬ ಸದಸ್ಯ ಒತ್ತಿ.", "ಸದಸ್ಯರನ್ನು ಹುಡುಕಿ ಹೆಸರು ಒತ್ತಿ.", "ಪಾವತಿಸಿದ, ಕಾಯುತ್ತಿರುವ, ಬಾಕಿ ತಿಂಗಳುಗಳು ಬಣ್ಣಗಳಲ್ಲಿ ಕಾಣುತ್ತವೆ.", "PDF, ವಾಟ್ಸಾಪ್, ಮುದ್ರಣ ಅಥವಾ ಎಕ್ಸೆಲ್ ಒತ್ತಿ."],
    },
  },
  {
    id: "dues", role: "admin", icon: "AlertCircle", page: "/Reports?view=dues",
    words: "dues not paid owe remind whatsapp list",
    title: { en: "See who has not paid, and remind them", ml: "അടയ്ക്കാത്തവരെ കാണുക, ഓർമ്മിപ്പിക്കുക", kn: "ಪಾವತಿಸದವರನ್ನು ನೋಡಿ, ನೆನಪಿಸಿ" },
    steps: {
      en: ["Open Reports and tap Who has not paid.", "Choose filters, e.g. Not paid for at least 3 months.", "Tap Remind on WhatsApp next to a member, or download the list."],
      ml: ["റിപ്പോർട്ടുകൾ തുറന്ന് അടയ്ക്കാത്തവർ തൊടുക.", "ഫിൽട്ടർ തിരഞ്ഞെടുക്കുക, ഉദാ: കുറഞ്ഞത് 3 മാസം അടയ്ക്കാത്തവർ.", "അംഗത്തിന് അരികിലെ വാട്ട്സ്ആപ്പിൽ ഓർമ്മിപ്പിക്കുക തൊടുക, അല്ലെങ്കിൽ പട്ടിക ഡൗൺലോഡ് ചെയ്യുക."],
      kn: ["ವರದಿಗಳು ತೆರೆದು ಪಾವತಿಸದವರು ಒತ್ತಿ.", "ಫಿಲ್ಟರ್ ಆಯ್ಕೆಮಾಡಿ, ಉದಾ: ಕನಿಷ್ಠ 3 ತಿಂಗಳು ಪಾವತಿಸದವರು.", "ಸದಸ್ಯರ ಪಕ್ಕದ ವಾಟ್ಸಾಪ್‌ನಲ್ಲಿ ನೆನಪಿಸಿ ಒತ್ತಿ, ಅಥವಾ ಪಟ್ಟಿ ಡೌನ್‌ಲೋಡ್ ಮಾಡಿ."],
    },
  },
  {
    id: "payments-report", role: "admin", icon: "FileSpreadsheet", page: "/Reports?view=payments",
    words: "payments report excel csv pdf export year chart download all",
    title: { en: "Download a payments report", ml: "പണമടയ്ക്കൽ റിപ്പോർട്ട് ഡൗൺലോഡ് ചെയ്യുക", kn: "ಪಾವತಿಗಳ ವರದಿ ಡೌನ್‌ಲೋಡ್ ಮಾಡಿ" },
    steps: {
      en: ["Open Reports and tap All payments.", "Choose When, Status, Type and other filters first.", "Check the totals, then tap Excel, CSV, PDF or Year chart."],
      ml: ["റിപ്പോർട്ടുകൾ തുറന്ന് എല്ലാ പണമടയ്ക്കലുകളും തൊടുക.", "ആദ്യം എപ്പോൾ, നില, തരം തുടങ്ങിയ ഫിൽട്ടറുകൾ തിരഞ്ഞെടുക്കുക.", "ആകെത്തുക നോക്കി എക്സൽ, CSV, PDF അല്ലെങ്കിൽ വർഷ ചാർട്ട് തൊടുക."],
      kn: ["ವರದಿಗಳು ತೆರೆದು ಎಲ್ಲಾ ಪಾವತಿಗಳು ಒತ್ತಿ.", "ಮೊದಲು ಯಾವಾಗ, ಸ್ಥಿತಿ, ವಿಧ ಮುಂತಾದ ಫಿಲ್ಟರ್ ಆಯ್ಕೆಮಾಡಿ.", "ಒಟ್ಟು ನೋಡಿ, ನಂತರ ಎಕ್ಸೆಲ್, CSV, PDF ಅಥವಾ ವರ್ಷದ ಚಾರ್ಟ್ ಒತ್ತಿ."],
    },
  },
  {
    id: "relief-claim", role: "admin", icon: "HandHeart", page: "/Relief?tab=new",
    words: "relief claim create approve paid death illness retirement",
    title: { en: "Make and approve a relief claim", ml: "സഹായ അപേക്ഷ ചേർക്കുക, അംഗീകരിക്കുക", kn: "ಪರಿಹಾರ ಅರ್ಜಿ ಮಾಡಿ, ಅನುಮೋದಿಸಿ" },
    steps: {
      en: ["Open Relief Fund, tab New claim.", "Pick the member and the reason; check the rules shown.", "Add who receives it and upload the papers, then Send for approval.", "Three other admins approve. Then tap Mark as paid."],
      ml: ["സഹായ നിധി തുറന്ന് പുതിയ അപേക്ഷ ടാബ്.", "അംഗത്തെയും കാരണവും തിരഞ്ഞെടുത്ത് കാണിക്കുന്ന നിബന്ധനകൾ നോക്കുക.", "സ്വീകരിക്കുന്നയാളെ ചേർത്ത് രേഖകൾ അപ്‌ലോഡ് ചെയ്ത് അംഗീകാരത്തിന് അയയ്ക്കുക.", "മറ്റ് മൂന്ന് അഡ്മിൻമാർ അംഗീകരിക്കും. പിന്നെ Mark as paid തൊടുക."],
      kn: ["ಪರಿಹಾರ ನಿಧಿ ತೆರೆದು ಹೊಸ ಅರ್ಜಿ ಟ್ಯಾಬ್.", "ಸದಸ್ಯ ಮತ್ತು ಕಾರಣ ಆಯ್ಕೆಮಾಡಿ; ತೋರಿಸಿದ ನಿಯಮಗಳನ್ನು ನೋಡಿ.", "ಸ್ವೀಕರಿಸುವವರನ್ನು ಸೇರಿಸಿ ದಾಖಲೆ ಅಪ್‌ಲೋಡ್ ಮಾಡಿ ಅನುಮೋದನೆಗೆ ಕಳುಹಿಸಿ.", "ಇತರ ಮೂವರು ಅಡ್ಮಿನ್‌ಗಳು ಅನುಮೋದಿಸುತ್ತಾರೆ. ನಂತರ Mark as paid ಒತ್ತಿ."],
    },
  },
  {
    id: "banner", role: "admin", icon: "Image", page: "/Banners", shot: "/guide/banner.jpg",
    words: "banner festival occasion picture login dashboard eid",
    title: { en: "Show a banner for an occasion", ml: "ഒരു വിശേഷത്തിന് ബാനർ കാണിക്കുക", kn: "ಸಂದರ್ಭಕ್ಕೆ ಬ್ಯಾನರ್ ತೋರಿಸಿ" },
    steps: {
      en: ["Open Banners and tap New banner.", "Upload a wide picture and give it a title (and a message if you like).", "Tick where it shows and choose how long (e.g. 3 days).", "Tap Create banner. It hides by itself when it ends."],
      ml: ["ബാനറുകൾ തുറന്ന് New banner തൊടുക.", "വീതിയുള്ള ചിത്രം അപ്‌ലോഡ് ചെയ്ത് തലക്കെട്ട് നൽകുക (വേണമെങ്കിൽ സന്ദേശവും).", "എവിടെ കാണിക്കണമെന്ന് ടിക്ക് ചെയ്ത് എത്ര ദിവസം എന്ന് തിരഞ്ഞെടുക്കുക (ഉദാ: 3 ദിവസം).", "Create banner തൊടുക. സമയം കഴിഞ്ഞാൽ സ്വയം മറയും."],
      kn: ["ಬ್ಯಾನರ್‌ಗಳು ತೆರೆದು New banner ಒತ್ತಿ.", "ಅಗಲವಾದ ಚಿತ್ರ ಅಪ್‌ಲೋಡ್ ಮಾಡಿ ಶೀರ್ಷಿಕೆ ನೀಡಿ (ಬೇಕಾದರೆ ಸಂದೇಶವೂ).", "ಎಲ್ಲಿ ತೋರಿಸಬೇಕು ಎಂದು ಟಿಕ್ ಮಾಡಿ, ಎಷ್ಟು ದಿನ ಎಂದು ಆಯ್ಕೆಮಾಡಿ (ಉದಾ: 3 ದಿನ).", "Create banner ಒತ್ತಿ. ಸಮಯ ಮುಗಿದಾಗ ತಾನೇ ಮರೆಯಾಗುತ್ತದೆ."],
    },
  },
  {
    id: "announce", role: "admin", icon: "Megaphone", page: "/Notifications",
    words: "announcement message send all members notification",
    title: { en: "Send an announcement", ml: "ഒരു അറിയിപ്പ് അയയ്ക്കുക", kn: "ಪ್ರಕಟಣೆ ಕಳುಹಿಸಿ" },
    steps: {
      en: ["Open Notifications and tap Send Announcement.", "Type a short title and message and choose who gets it.", "Tap Send. It reaches phones with notifications turned on."],
      ml: ["അറിയിപ്പുകൾ തുറന്ന് Send Announcement തൊടുക.", "ചെറിയ തലക്കെട്ടും സന്ദേശവും ടൈപ്പ് ചെയ്ത് ആർക്കെന്ന് തിരഞ്ഞെടുക്കുക.", "Send തൊടുക. അറിയിപ്പുകൾ ഓണാക്കിയ ഫോണുകളിൽ എത്തും."],
      kn: ["ಸೂಚನೆಗಳು ತೆರೆದು Send Announcement ಒತ್ತಿ.", "ಸಣ್ಣ ಶೀರ್ಷಿಕೆ ಮತ್ತು ಸಂದೇಶ ಟೈಪ್ ಮಾಡಿ, ಯಾರಿಗೆ ಎಂದು ಆಯ್ಕೆಮಾಡಿ.", "Send ಒತ್ತಿ. ಸೂಚನೆ ಆನ್ ಮಾಡಿದ ಫೋನ್‌ಗಳಿಗೆ ತಲುಪುತ್ತದೆ."],
    },
  },
  {
    id: "reset-requests", role: "admin", icon: "KeyRound", page: "/admin/requests?tab=password",
    words: "password reset request whatsapp link member forgot",
    title: { en: "Help a member who forgot the password", ml: "പാസ്‌വേഡ് മറന്ന അംഗത്തെ സഹായിക്കുക", kn: "ಪಾಸ್‌ವರ್ಡ್ ಮರೆತ ಸದಸ್ಯರಿಗೆ ಸಹಾಯ" },
    steps: {
      en: ["Open Requests, tab Password Resets.", "Check the name and phone, then tap Approve.", "Tap the WhatsApp button: the message with the link is ready, just send it."],
      ml: ["അപേക്ഷകൾ തുറന്ന് Password Resets ടാബ്.", "പേരും ഫോണും നോക്കി Approve തൊടുക.", "വാട്ട്സ്ആപ്പ് ബട്ടൺ തൊടുക: ലിങ്കുള്ള സന്ദേശം തയ്യാർ, അയച്ചാൽ മതി."],
      kn: ["ವಿನಂತಿಗಳು ತೆರೆದು Password Resets ಟ್ಯಾಬ್.", "ಹೆಸರು ಮತ್ತು ಫೋನ್ ನೋಡಿ Approve ಒತ್ತಿ.", "ವಾಟ್ಸಾಪ್ ಬಟನ್ ಒತ್ತಿ: ಲಿಂಕ್ ಇರುವ ಸಂದೇಶ ಸಿದ್ಧ, ಕಳುಹಿಸಿದರೆ ಸಾಕು."],
    },
  },
  {
    id: "audit", role: "admin", icon: "Shield", page: "/AuditLogs",
    words: "audit log history who changed what",
    title: { en: "See who changed what", ml: "ആര് എന്ത് മാറ്റി എന്ന് കാണുക", kn: "ಯಾರು ಏನು ಬದಲಿಸಿದರು ನೋಡಿ" },
    steps: {
      en: ["Open Audit Logs.", "Use Who, Area, Action and When to narrow it down.", "Tap an entry to see what changed, before → after."],
      ml: ["ഓഡിറ്റ് ലോഗുകൾ തുറക്കുക.", "ആര്, മേഖല, പ്രവൃത്തി, എപ്പോൾ എന്നിവ ഉപയോഗിച്ച് ചുരുക്കുക.", "ഒരു എൻട്രി തൊട്ടാൽ മുമ്പും ശേഷവുമുള്ള മാറ്റം കാണാം."],
      kn: ["ಆಡಿಟ್ ಲಾಗ್‌ಗಳು ತೆರೆಯಿರಿ.", "ಯಾರು, ಕ್ಷೇತ್ರ, ಕ್ರಿಯೆ, ಯಾವಾಗ ಬಳಸಿ ಕಡಿಮೆ ಮಾಡಿ.", "ಒಂದು ನಮೂದನ್ನು ಒತ್ತಿದರೆ ಮೊದಲು → ನಂತರದ ಬದಲಾವಣೆ ಕಾಣುತ್ತದೆ."],
    },
  },
];
