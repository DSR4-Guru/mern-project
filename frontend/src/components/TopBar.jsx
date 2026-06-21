import React from "react";
import { Volume2, VolumeX } from "lucide-react";
import LanguageSelector from "./LanguageSelector.jsx";
import ThemeToggle from "./ThemeToggle.jsx";

export default function TopBar({ language, onLanguageChange, disabled, voiceMuted, onToggleVoice }) {
  return (
    <header className="topbar">
      <div className="brand">
        <span className="brand-mark" aria-hidden="true" />
        <span className="brand-name">Aura</span>
      </div>
      <div className="topbar-actions">
        <LanguageSelector value={language} onChange={onLanguageChange} disabled={disabled} />
        <button
          type="button"
          className="icon-btn"
          onClick={onToggleVoice}
          aria-label={voiceMuted ? "Turn on spoken replies" : "Turn off spoken replies"}
          title={voiceMuted ? "Turn on spoken replies" : "Turn off spoken replies"}
        >
          {voiceMuted ? (
            <VolumeX size={18} strokeWidth={1.75} />
          ) : (
            <Volume2 size={18} strokeWidth={1.75} />
          )}
        </button>
        <ThemeToggle />
      </div>
    </header>
  );
}
