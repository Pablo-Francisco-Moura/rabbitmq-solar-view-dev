import { useEffect, useState } from "react";
import { extractFatura } from "../../api/fatura.js";
import "../../css/pdf-modal.css";
import type { ExtractEnv, ExtractResult } from "../../types/fatura.js";

interface FaturaPdfModalProps {
  url: string;
  companyId: number | null | undefined;
  onClose: () => void;
}

export default function FaturaPdfModal({ url, companyId, onClose }: FaturaPdfModalProps) {
  const [extracting, setExtracting] = useState<ExtractEnv | null>(null);
  const [extractResult, setExtractResult] = useState<ExtractResult | null>(null);
  const [extractError, setExtractError] = useState<string | null>(null);

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  async function handleExtract(env: ExtractEnv) {
    if (!Number.isInteger(companyId)) return;
    setExtracting(env);
    setExtractError(null);
    try {
      const result = await extractFatura(env, companyId as number, url);
      setExtractResult(result);
    } catch (err) {
      setExtractError((err as Error).message);
      setExtractResult(null);
    } finally {
      setExtracting(null);
    }
  }

  return (
    <div className="pdf-modal-overlay" onClick={onClose}>
      <div className="pdf-modal" onClick={(event) => event.stopPropagation()}>
        <div className="pdf-modal__header">
          <h3>Fatura (PDF)</h3>
          <button
            type="button"
            className="pdf-modal__close"
            aria-label="Fechar"
            onClick={onClose}
          >
            ×
          </button>
        </div>
        <div className="pdf-modal__body">
          <iframe
            src={`${url}#zoom=125`}
            title="Fatura PDF"
            className="pdf-modal__frame"
          />
          <div className="pdf-modal__sidebar">
            <div className="pdf-modal__extract-actions">
              <button
                type="button"
                disabled={extracting != null}
                onClick={() => handleExtract("prod")}
              >
                {extracting === "prod" ? "Extraindo…" : "Extrair Prod"}
              </button>
              <button
                type="button"
                disabled={extracting != null}
                onClick={() => handleExtract("local")}
              >
                {extracting === "local" ? "Extraindo…" : "Extrair Local"}
              </button>
            </div>
            <div className="pdf-modal__extract-result">
              {extractError && <p className="app__error">{extractError}</p>}
              {extractResult && <pre>{JSON.stringify(extractResult, null, 2)}</pre>}
              {!extractError && !extractResult && (
                <p className="pdf-modal__extract-placeholder">
                  Clique em "Extrair Prod" ou "Extrair Local" para rodar a
                  extração desta fatura.
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
