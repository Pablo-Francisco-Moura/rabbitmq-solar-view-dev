import "../../css/unit-field-decorations.css";

interface NavegarButtonProps {
  url: string;
}

export default function NavegarButton({ url }: NavegarButtonProps) {
  return (
    <a
      className="navegar-button"
      href={url}
      target="_blank"
      rel="noopener noreferrer"
    >
      Navegar
    </a>
  );
}
