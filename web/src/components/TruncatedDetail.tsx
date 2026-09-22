import { useEffect, useState } from "react";
import "../css/truncated-detail.css";

interface TruncatedDetailProps {
  value: string;
  maxLength?: number;
  title?: string;
}

// Mesmo esquema do CopyableText (mostra so os primeiros `maxLength`
// caracteres + "..."), mas pro caso de texto longo demais pra caber num
// title de hover — clicar abre um modal com o conteudo completo em vez de
// copiar. Usado pra campos tipo erro_processamento, onde o valor precisa ser
// lido, nao colado em outro lugar.
export default function TruncatedDetail({
  value,
  maxLength = 10,
  title = "Detalhes",
}: TruncatedDetailProps) {
  const [open, setOpen] = useState(false);
  const truncated = value.length > maxLength ? `${value.slice(0, maxLength)}...` : value;

  useEffect(() => {
    if (!open) return;
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open]);

  return (
    <>
      <button
        type="button"
        className="truncated-detail"
        title="Ver detalhes"
        onClick={() => setOpen(true)}
      >
        {truncated}
      </button>
      {open && (
        <div className="truncated-detail-overlay" onClick={() => setOpen(false)}>
          <div className="truncated-detail-modal" onClick={(event) => event.stopPropagation()}>
            <div className="truncated-detail-modal__header">
              <h3>{title}</h3>
              <button
                type="button"
                className="truncated-detail-modal__close"
                aria-label="Fechar"
                onClick={() => setOpen(false)}
              >
                ×
              </button>
            </div>
            <div className="truncated-detail-modal__body">
              <pre>{value}</pre>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
