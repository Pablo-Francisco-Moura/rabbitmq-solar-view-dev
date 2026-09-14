import "../../css/unit-field-decorations.css";

interface FieldWarningIconProps {
  message: string;
}

export default function FieldWarningIcon({ message }: FieldWarningIconProps) {
  return (
    <span className="field-warning-icon" title={message} aria-label={message}>
      ⚠️
    </span>
  );
}
