export const PHONE_COUNTRIES = [
  {
    iso: "SA",
    shortName: "KSA",
    name: "Saudi Arabia",
    dialCode: "+966",
    exampleDisplay: "+966 560570553",
    placeholder: "560570553",
  },
  {
    iso: "AE",
    shortName: "UAE",
    name: "United Arab Emirates",
    dialCode: "+971",
    exampleDisplay: "+971 501234567",
    placeholder: "501234567",
  },
  {
    iso: "KW",
    shortName: "KWT",
    name: "Kuwait",
    dialCode: "+965",
    exampleDisplay: "+965 55512345",
    placeholder: "55512345",
  },
  {
    iso: "OM",
    shortName: "OMN",
    name: "Oman",
    dialCode: "+968",
    exampleDisplay: "+968 91234567",
    placeholder: "91234567",
  },
  {
    iso: "QA",
    shortName: "QAT",
    name: "Qatar",
    dialCode: "+974",
    exampleDisplay: "+974 55123456",
    placeholder: "55123456",
  },
  {
    iso: "BH",
    shortName: "BHR",
    name: "Bahrain",
    dialCode: "+973",
    exampleDisplay: "+973 36001234",
    placeholder: "36001234",
  },
  {
    iso: "IN",
    shortName: "IND",
    name: "India",
    dialCode: "+91",
    exampleDisplay: "+91 9876543210",
    placeholder: "9876543210",
  },
  {
    iso: "CA",
    shortName: "CAN",
    name: "Canada",
    dialCode: "+1",
    exampleDisplay: "+1 4165550123",
    placeholder: "4165550123",
  },
  {
    iso: "US",
    shortName: "USA",
    name: "United States",
    dialCode: "+1",
    exampleDisplay: "+1 2025550147",
    placeholder: "2025550147",
  },
  {
    iso: "GB",
    shortName: "UK",
    name: "United Kingdom",
    dialCode: "+44",
    exampleDisplay: "+44 7700900123",
    placeholder: "7700900123",
  },
  {
    iso: "AU",
    shortName: "AUS",
    name: "Australia",
    dialCode: "+61",
    exampleDisplay: "+61 412345678",
    placeholder: "412345678",
  },
  {
    iso: "IQ",
    shortName: "IRQ",
    name: "Iraq",
    dialCode: "+964",
    exampleDisplay: "+964 7701234567",
    placeholder: "7701234567",
  },
  {
    iso: "AZ",
    shortName: "AZE",
    name: "Azerbaijan",
    dialCode: "+994",
    exampleDisplay: "+994 501234567",
    placeholder: "501234567",
  },
  {
    iso: "MA",
    shortName: "MAR",
    name: "Morocco",
    dialCode: "+212",
    exampleDisplay: "+212 612345678",
    placeholder: "612345678",
  },
  {
    iso: "ZA",
    shortName: "ZAF",
    name: "South Africa",
    dialCode: "+27",
    exampleDisplay: "+27 821234567",
    placeholder: "821234567",
  },
];

const DEFAULT_COUNTRY_ISO = "SA";

export function getCountryByIso(iso) {
  return PHONE_COUNTRIES.find((country) => country.iso === iso) || PHONE_COUNTRIES.find((country) => country.iso === DEFAULT_COUNTRY_ISO);
}

export function normalizeLocalPhone(value = "") {
  const digitsOnly = String(value || "").replace(/\D/g, "");
  return digitsOnly.replace(/^0+/, "");
}

export function buildInternationalPhone(countryIso, localNumber) {
  const country = getCountryByIso(countryIso);
  const normalizedLocal = normalizeLocalPhone(localNumber);

  if (!country || !normalizedLocal) {
    return "";
  }

  const dialDigits = country.dialCode.replace("+", "");
  return `+${dialDigits}${normalizedLocal}`;
}

export function parseInternationalPhone(phone = "") {
  const raw = String(phone || "").trim();
  if (!raw.startsWith("+")) {
    return {
      countryIso: DEFAULT_COUNTRY_ISO,
      localNumber: normalizeLocalPhone(raw),
    };
  }

  const digits = raw.replace(/\D/g, "");

  // Prefer longest dial-code match first
  const matchedCountry = [...PHONE_COUNTRIES]
    .sort((a, b) => b.dialCode.length - a.dialCode.length)
    .find((country) => digits.startsWith(country.dialCode.replace("+", "")));

  if (!matchedCountry) {
    return {
      countryIso: DEFAULT_COUNTRY_ISO,
      localNumber: normalizeLocalPhone(raw),
    };
  }

  const dialDigits = matchedCountry.dialCode.replace("+", "");
  const localDigits = digits.slice(dialDigits.length);

  return {
    countryIso: matchedCountry.iso,
    localNumber: normalizeLocalPhone(localDigits),
  };
}

export function isValidInternationalPhone(value = "") {
  return /^\+[1-9]\d{7,14}$/.test(String(value || "").trim());
}
