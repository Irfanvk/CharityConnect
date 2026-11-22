import React, { useEffect, useRef } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CITY_MAX_LENGTH, CITY_SUGGESTIONS, LIVING_COUNTRIES, cityProblem, countryFromPhone, tidyCity } from "@/lib/countries";

/**
 * "Country you live in" + "City". The country is pre-filled from the phone's country code
 * until the person picks one themselves (someone in the UAE may keep an Indian number).
 */
export default function LocationFields({
  country, city, onChange, phone, required = true, idPrefix = "loc", disabled = false, guessFromPhone = true,
}) {
  const pickedByHand = useRef(Boolean(country));

  useEffect(() => {
    if (!guessFromPhone || pickedByHand.current || country) return;
    const guess = countryFromPhone(phone);
    if (guess) onChange({ country: guess, city });
  }, [phone]);

  const star = required ? " *" : "";
  const suggestions = CITY_SUGGESTIONS[country] || [];
  const problem = cityProblem(city);
  const example = suggestions[0] ? `e.g. ${suggestions.slice(0, 2).join(", ")}` : "e.g. Dubai";
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      <div className="space-y-2">
        <Label htmlFor={`${idPrefix}-country`}>Country you live in{star}</Label>
        <Select
          value={country || ""}
          disabled={disabled}
          onValueChange={(value) => {
            pickedByHand.current = true;
            onChange({ country: value, city });
          }}
        >
          <SelectTrigger id={`${idPrefix}-country`}>
            <SelectValue placeholder="Choose a country" />
          </SelectTrigger>
          <SelectContent>
            {LIVING_COUNTRIES.map((c) => (
              <SelectItem key={c.iso} value={c.iso}>{c.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-2">
        <Label htmlFor={`${idPrefix}-city`}>City{star}</Label>
        <Input
          id={`${idPrefix}-city`}
          value={city || ""}
          disabled={disabled}
          maxLength={CITY_MAX_LENGTH}
          autoComplete="address-level2"
          list={suggestions.length ? `${idPrefix}-cities` : undefined}
          onChange={(e) => onChange({ country, city: e.target.value })}
          onBlur={() => { const tidy = tidyCity(city); if (tidy !== (city || "")) onChange({ country, city: tidy }); }}
          placeholder={example}
          required={required}
          aria-invalid={Boolean(problem)}
          className={problem ? "border-rose-400 focus-visible:ring-rose-400" : undefined}
        />
        {suggestions.length > 0 && (
          <datalist id={`${idPrefix}-cities`}>
            {suggestions.map((c) => <option key={c} value={c} />)}
          </datalist>
        )}
        {problem ? (
          <p className="text-xs text-rose-600" role="alert">{problem}</p>
        ) : suggestions.length > 0 && !city ? (
          <div className="flex flex-wrap gap-1.5">
            {suggestions.slice(0, 6).map((c) => (
              <button key={c} type="button" disabled={disabled}
                className="rounded-full border border-slate-200 px-2.5 py-0.5 text-xs text-slate-600 hover:border-emerald-300 hover:bg-emerald-50"
                onClick={() => onChange({ country, city: c })}>
                {c}
              </button>
            ))}
          </div>
        ) : null}
      </div>
    </div>
  );
}
