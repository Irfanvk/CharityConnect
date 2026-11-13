import React, { useEffect, useRef } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CITY_MAX_LENGTH, LIVING_COUNTRIES, countryFromPhone } from "@/lib/countries";

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
          onChange={(e) => onChange({ country, city: e.target.value })}
          placeholder="e.g. Dubai"
          required={required}
        />
      </div>
    </div>
  );
}
