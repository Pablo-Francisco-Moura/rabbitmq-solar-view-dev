import { useState } from "react";
import "../css/copyable-text.css";

interface CopyableTextProps {
  value: string;
  maxLength?: number;
}

// Mostra so os primeiros `maxLength` caracteres + "..." (a URL completa fica
// no title, pro hover); clicar copia o valor completo pra area de
// transferencia. Reutilizavel em qualquer tabela que precise exibir uma URL
// longa sem estourar a largura da coluna.
export default function CopyableText({ value, maxLength = 10 }: CopyableTextProps) {
  const [copied, setCopied] = useState(false);
  const truncated = value.length > maxLength ? `${value.slice(0, maxLength)}...` : value;

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // clipboard indisponivel (permissao negada, contexto nao seguro etc.)
    }
  }

  return (
    <button
      type="button"
      className="copyable-text"
      title={copied ? "Copiado!" : value}
      onClick={handleCopy}
    >
      {copied ? "Copiado!" : truncated}
    </button>
  );
}
