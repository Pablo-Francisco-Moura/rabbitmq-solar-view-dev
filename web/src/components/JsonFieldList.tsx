import { useRef, useState } from "react";
import "../css/json-field-list.css";

function formatFieldValue(value: unknown): string {
  if (value === null || value === undefined) return "";
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
}

function CopyIcon() {
  return (
    <svg
      viewBox="0 0 16 16"
      width="13"
      height="13"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.3"
      aria-hidden="true"
    >
      <rect x="5.5" y="5.5" width="8" height="8" rx="1.3" />
      <path d="M3.5 10.5h-1a1 1 0 0 1-1-1v-6a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v1" />
    </svg>
  );
}

interface CopyableFieldProps {
  label: string;
  value: unknown;
  action?: React.ReactNode;
}

function CopyableField({ label, value, action }: CopyableFieldProps) {
  const [tooltipVisible, setTooltipVisible] = useState(false);
  const [copied, setCopied] = useState(false);
  const hoverTimeoutRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  function handleMouseEnter() {
    hoverTimeoutRef.current = setTimeout(() => setTooltipVisible(true), 2000);
  }

  function handleMouseLeave() {
    clearTimeout(hoverTimeoutRef.current);
    setTooltipVisible(false);
  }

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(formatFieldValue(value));
      setCopied(true);
      setTooltipVisible(false);
      setTimeout(() => setCopied(false), 1200);
    } catch {
      // clipboard indisponivel (permissao negada, contexto nao seguro etc.)
    }
  }

  return (
    <div
      className="json-field"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <button
        type="button"
        className="json-field__copy"
        onClick={handleCopy}
        aria-label={`Copiar ${label}`}
      >
        {copied ? "✓" : <CopyIcon />}
      </button>
      <span className="json-field__key">{label}:</span>
      <span className="json-field__value">{formatFieldValue(value)}</span>
      {action}
      {tooltipVisible && !copied && (
        <span className="json-field__tooltip">Copiar {label}</span>
      )}
    </div>
  );
}

interface JsonFieldListProps {
  data: Record<string, unknown>;
  renderAction?: (key: string, value: unknown) => React.ReactNode;
}

export default function JsonFieldList({ data, renderAction }: JsonFieldListProps) {
  return (
    <div className="json-field-list">
      {Object.entries(data).map(([key, value]) => (
        <CopyableField
          key={key}
          label={key}
          value={value}
          action={renderAction?.(key, value)}
        />
      ))}
    </div>
  );
}
