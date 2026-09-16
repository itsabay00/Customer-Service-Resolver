import { AlertCircle, Plus } from "lucide-react";
import { colors, SHADOW } from "../lib/colors.js";

export function StatusPill({ label, tint, dot }) {
  return (
    <span
      className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium shrink-0"
      style={{ backgroundColor: tint, color: "#171717" }}
    >
      <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: dot }} />
      {label}
    </span>
  );
}

export function Tag({ label }) {
  return (
    <span
      className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium shrink-0"
      style={{ backgroundColor: colors.blueTint, color: "#171717" }}
    >
      {label}
    </span>
  );
}

export function PrimaryButton({ children, onClick, disabled, className = "", type = "button" }) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`rsv-btn-primary inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-full text-sm font-semibold disabled:opacity-40 ${className}`}
    >
      {children}
    </button>
  );
}

export function GhostButton({ children, onClick, disabled, className = "" }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`rsv-btn-ghost inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-xs sm:text-sm font-medium disabled:opacity-40 ${className}`}
    >
      {children}
    </button>
  );
}

export function IconButton({ children, onClick, danger, className = "" }) {
  return (
    <button
      onClick={onClick}
      className={`p-2 rounded-full rsv-icon-btn ${className}`}
      style={{ color: danger ? colors.red : colors.gray }}
    >
      {children}
    </button>
  );
}

export function EmptyState({ icon: Icon, title, description, action }) {
  return (
    <div className="flex flex-col items-center text-center py-12 px-6">
      <div className="w-12 h-12 rounded-2xl flex items-center justify-center mb-4" style={{ backgroundColor: colors.blueTint }}>
        <Icon className="w-6 h-6" style={{ color: colors.blue }} />
      </div>
      <h3 className="text-sm font-semibold" style={{ color: "#000" }}>{title}</h3>
      <p className="text-sm mt-1 max-w-xs" style={{ color: colors.gray }}>{description}</p>
      {action && (
        <PrimaryButton onClick={action.onClick} className="mt-5">
          <Plus className="w-4 h-4" />
          {action.label}
        </PrimaryButton>
      )}
    </div>
  );
}

export function ErrorBanner({ message, onRetry, className = "" }) {
  return (
    <div className={`flex items-start gap-3 rounded-xl p-4 ${className}`} style={{ backgroundColor: colors.redTint }}>
      <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" style={{ color: colors.red }} />
      <div className="flex-1">
        <p className="text-sm" style={{ color: "#171717" }}>{message}</p>
        {onRetry && (
          <button onClick={onRetry} className="text-sm font-semibold mt-1" style={{ color: colors.red }}>
            Try again
          </button>
        )}
      </div>
    </div>
  );
}

export function Card({ children, className = "", style = {} }) {
  return (
    <div
      className={`rounded-2xl ${className}`}
      style={{ backgroundColor: "#fff", boxShadow: SHADOW, ...style }}
    >
      {children}
    </div>
  );
}
