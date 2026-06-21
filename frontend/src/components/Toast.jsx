import React from "react";
import { AlertTriangle, X } from "lucide-react";

export default function Toast({ message, onDismiss }) {
  if (!message) return null;

  return (
    <div className="toast" role="alert">
      <AlertTriangle size={16} strokeWidth={1.75} />
      <span>{message}</span>
      <button type="button" onClick={onDismiss} aria-label="Dismiss">
        <X size={14} strokeWidth={1.75} />
      </button>
    </div>
  );
}
