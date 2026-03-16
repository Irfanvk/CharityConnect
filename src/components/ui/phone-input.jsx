import React from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  PHONE_COUNTRIES,
  buildInternationalPhone,
  getCountryByIso,
  normalizeLocalPhone,
  parseInternationalPhone,
} from "@/lib/phone-utils";

export default function PhoneInput({
  id,
  label = "Phone Number",
  value,
  onChange,
  required = false,
  disabled = false,
  className = "",
  showExamples = true,
  helperText,
}) {
  const parsed = React.useMemo(() => parseInternationalPhone(value), [value]);
  const [countryIso, setCountryIso] = React.useState(parsed.countryIso);
  const [localNumber, setLocalNumber] = React.useState(parsed.localNumber);

  React.useEffect(() => {
    setCountryIso(parsed.countryIso);
    setLocalNumber(parsed.localNumber);
  }, [parsed.countryIso, parsed.localNumber]);

  const selectedCountry = getCountryByIso(countryIso);
  const sortedCountries = React.useMemo(
    () => [...PHONE_COUNTRIES].sort((a, b) => (a.shortName || a.name).localeCompare(b.shortName || b.name)),
    []
  );

  const emitValue = (nextCountryIso, nextLocalNumber) => {
    const formatted = buildInternationalPhone(nextCountryIso, nextLocalNumber);
    onChange?.(formatted);
  };

  const handleCountryChange = (nextCountryIso) => {
    setCountryIso(nextCountryIso);
    emitValue(nextCountryIso, localNumber);
  };

  const handleLocalNumberChange = (event) => {
    const normalized = normalizeLocalPhone(event.target.value);
    setLocalNumber(normalized);
    emitValue(countryIso, normalized);
  };

  return (
    <div className={`space-y-2 ${className}`.trim()}>
      <Label htmlFor={id}>{label}{required ? " *" : ""}</Label>
      <div className="grid grid-cols-1 sm:grid-cols-[160px_minmax(0,1fr)] gap-2">
        <Select value={countryIso} onValueChange={handleCountryChange} disabled={disabled}>
          <SelectTrigger>
            <SelectValue placeholder="Select country" />
          </SelectTrigger>
          <SelectContent>
            {sortedCountries.map((country) => (
              <SelectItem key={country.iso} value={country.iso}>
                {(country.shortName || country.name)} ({country.dialCode})
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Input
          id={id}
          type="tel"
          inputMode="numeric"
          value={localNumber}
          onChange={handleLocalNumberChange}
          placeholder={selectedCountry?.placeholder || "Phone number"}
          disabled={disabled}
          required={required}
        />
      </div>

      <p className="text-xs text-slate-500">
        {selectedCountry?.dialCode} is added automatically. Leading 0 is removed automatically from local number.
      </p>

      {showExamples && (
        <p className="text-xs text-slate-500">
          Examples: UAE {PHONE_COUNTRIES.find((c) => c.iso === "AE")?.exampleDisplay} | India {PHONE_COUNTRIES.find((c) => c.iso === "IN")?.exampleDisplay}
        </p>
      )}

      {helperText && <p className="text-xs text-slate-500">{helperText}</p>}
    </div>
  );
}
