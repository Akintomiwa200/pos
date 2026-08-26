"use client";

import { useMemo, useState } from "react";
import { COUNTRIES, DEFAULT_COUNTRY, statesForCountry } from "@/lib/geo";
import { Field, FormSelect } from "@/components/setup/SetupChrome";
import { AuthSelect } from "@/components/site/AuthSplit";

function optionsWithCurrent(list: string[], current: string) {
  if (current && !list.includes(current)) return [current, ...list];
  return list;
}

export function AuthCountryStateFields({
  countryName = "companyCountry",
  stateName = "companyState",
  defaultCountry = DEFAULT_COUNTRY,
  defaultState = "",
}: {
  countryName?: string;
  stateName?: string;
  defaultCountry?: string;
  defaultState?: string;
}) {
  const [country, setCountry] = useState(defaultCountry);
  const states = useMemo(() => statesForCountry(country), [country]);
  const [state, setState] = useState(() =>
    defaultState && statesForCountry(defaultCountry).includes(defaultState)
      ? defaultState
      : "",
  );

  return (
    <div className="mb-3.5 grid min-w-0 grid-cols-2 gap-3">
      <AuthSelect
        label="Country"
        name={countryName}
        value={country}
        required
        onChange={(event) => {
          const next = event.target.value;
          setCountry(next);
          const nextStates = statesForCountry(next);
          setState(nextStates.includes(state) ? state : "");
        }}
      >
        {COUNTRIES.map((name) => (
          <option key={name} value={name}>
            {name}
          </option>
        ))}
      </AuthSelect>
      <AuthSelect
        label="State"
        name={stateName}
        value={state}
        required
        onChange={(event) => setState(event.target.value)}
      >
        <option value="">State</option>
        {states.map((name) => (
          <option key={name} value={name}>
            {name}
          </option>
        ))}
      </AuthSelect>
    </div>
  );
}

export function SetupCountryStateFields({
  country,
  state,
  onChange,
}: {
  country: string;
  state: string;
  onChange: (next: { country: string; state: string }) => void;
}) {
  const states = optionsWithCurrent(statesForCountry(country), state);
  const countries = optionsWithCurrent(COUNTRIES, country);

  return (
    <div className="grid min-w-0 grid-cols-2 gap-3 [&>*]:min-w-0">
      <Field label="Country">
        <FormSelect
          value={country}
          onChange={(event) => {
            const nextCountry = event.target.value;
            const nextStates = statesForCountry(nextCountry);
            onChange({
              country: nextCountry,
              state: nextStates.includes(state) ? state : "",
            });
          }}
        >
          {countries.map((name) => (
            <option key={name} value={name}>
              {name}
            </option>
          ))}
        </FormSelect>
      </Field>
      <Field label="State">
        <FormSelect
          value={state}
          onChange={(event) => onChange({ country, state: event.target.value })}
        >
          <option value="">Select state</option>
          {states.map((name) => (
            <option key={name} value={name}>
              {name}
            </option>
          ))}
        </FormSelect>
      </Field>
    </div>
  );
}

export function SetupStateSelect({
  country,
  value,
  onChange,
}: {
  country: string;
  value: string;
  onChange: (state: string) => void;
}) {
  const states = optionsWithCurrent(statesForCountry(country || DEFAULT_COUNTRY), value);
  return (
    <FormSelect value={value} onChange={(event) => onChange(event.target.value)}>
      <option value="">Select state</option>
      {states.map((name) => (
        <option key={name} value={name}>
          {name}
        </option>
      ))}
    </FormSelect>
  );
}
