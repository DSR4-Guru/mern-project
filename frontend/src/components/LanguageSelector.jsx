import React from "react";
import { Languages } from "lucide-react";
import { LANGUAGES } from "../constants/languages.js";

export default function LanguageSelector({ value, onChange, disabled }) {
  return (
    <label className="lang-select">
      <Languages size={16} strokeWidth={1.75} />
      <select value={value} onChange={(e) => onChange(e.target.value)} disabled={disabled}>
        {LANGUAGES.map((lang) => (
          <option key={lang.code} value={lang.code}>
            {lang.label}
          </option>
        ))}
      </select>
    </label>
  );
}
