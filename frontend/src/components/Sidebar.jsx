import React from "react";
import { Plus, MessageSquare, Trash2, PanelLeftClose, PanelLeft } from "lucide-react";
import { formatRelativeTime } from "../utils/formatTime.js";

export default function Sidebar({
  sessions,
  currentSessionId,
  onSelect,
  onNewChat,
  onDelete,
  isOpen,
  onToggle,
  isLoading,
  persisted,
}) {
  return (
    <>
      {isOpen && <div className="sidebar-backdrop" onClick={onToggle} />}

      <aside className={`sidebar ${isOpen ? "sidebar--open" : "sidebar--closed"}`}>
        <div className="sidebar-header">
          <button type="button" className="new-chat-btn" onClick={onNewChat}>
            <Plus size={16} strokeWidth={2} />
            <span>New chat</span>
          </button>
          <button
            type="button"
            className="icon-btn sidebar-collapse-btn"
            onClick={onToggle}
            aria-label="Collapse sidebar"
            title="Collapse sidebar"
          >
            <PanelLeftClose size={18} strokeWidth={1.75} />
          </button>
        </div>

        <div className="sidebar-list">
          {isLoading ? (
            <p className="sidebar-empty">Loading history…</p>
          ) : sessions.length === 0 ? (
            <p className="sidebar-empty">
              {persisted
                ? "No conversations yet — say something to start one."
                : "Chat history needs MongoDB connected to be saved."}
            </p>
          ) : (
            sessions.map((s) => (
              <div
                key={s.sessionId}
                className={`session-item ${s.sessionId === currentSessionId ? "session-item--active" : ""}`}
              >
                <button
                  type="button"
                  className="session-item-main"
                  onClick={() => onSelect(s.sessionId)}
                  title={s.title}
                >
                  <MessageSquare size={15} strokeWidth={1.75} className="session-icon" />
                  <span className="session-title">{s.title}</span>
                </button>
                <span className="session-time">{formatRelativeTime(s.updatedAt)}</span>
                <button
                  type="button"
                  className="session-delete-btn"
                  onClick={(e) => {
                    e.stopPropagation();
                    onDelete(s.sessionId);
                  }}
                  aria-label="Delete conversation"
                  title="Delete conversation"
                >
                  <Trash2 size={14} strokeWidth={1.75} />
                </button>
              </div>
            ))
          )}
        </div>
      </aside>

      {!isOpen && (
        <button
          type="button"
          className="icon-btn sidebar-open-btn"
          onClick={onToggle}
          aria-label="Open chat history"
          title="Open chat history"
        >
          <PanelLeft size={18} strokeWidth={1.75} />
        </button>
      )}
    </>
  );
}
