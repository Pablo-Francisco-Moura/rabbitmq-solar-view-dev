import { useState } from "react";
import { acessarContaIntegrador } from "../../api/suporteL2.js";
import "../../css/acessar-integrador.css";

interface AcessarIntegradorButtonProps {
  usuarioId: number;
  usuNome: string;
  usuEmail: string;
}

export default function AcessarIntegradorButton({
  usuarioId,
  usuNome,
  usuEmail,
}: AcessarIntegradorButtonProps) {
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<{ ok: boolean; message: string } | null>(
    null,
  );

  async function handleClick() {
    if (
      !window.confirm(
        `Isso vai fazer com que colaborador.pablo@solarview.com.br passe a acessar a conta do integrador "${usuNome}" (${usuEmail}) no portal my.solarview.com.br. Essa troca é imediata e afeta a conta de suporte compartilhada. Confirma?`,
      )
    )
      return;

    setLoading(true);
    setStatus(null);
    try {
      const result = await acessarContaIntegrador(usuarioId);
      setStatus({
        ok: true,
        message: `Colaborador agora acessa ${result.integrador.usuNome} (${result.integrador.usuEmail}).`,
      });
    } catch (err) {
      setStatus({ ok: false, message: (err as Error).message });
    } finally {
      setLoading(false);
    }
  }

  return (
    <span className="acessar-integrador">
      <button
        type="button"
        className="acessar-integrador__button"
        onClick={handleClick}
        disabled={loading}
      >
        {loading ? "Acessando…" : "Acessar"}
      </button>
      {status && (
        <span
          className={`acessar-integrador__status ${
            status.ok
              ? "acessar-integrador__status--ok"
              : "acessar-integrador__status--error"
          }`}
        >
          {status.message}
        </span>
      )}
    </span>
  );
}
