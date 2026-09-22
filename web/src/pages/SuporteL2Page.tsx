import { useEffect, useState } from "react";
import { acessarContaIntegrador, getColaboradorAtual } from "../api/suporteL2.js";
import type { ColaboradorAtualResult } from "../types/suporteL2.js";
import "../css/publish-form.css";
import "../css/units-details.css";

const COLABORADOR_EMAIL_FIXO = "colaborador.pablo@solarview.com.br";

export default function SuporteL2Page() {
  const [atual, setAtual] = useState<ColaboradorAtualResult | null>(null);
  const [atualError, setAtualError] = useState<string | null>(null);

  const [integrador, setIntegrador] = useState("");
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<{ ok: boolean; message: string } | null>(
    null,
  );

  useEffect(() => {
    getColaboradorAtual()
      .then(setAtual)
      .catch((error) => setAtualError((error as Error).message));
  }, []);

  async function handleAcessar(event: React.FormEvent) {
    event.preventDefault();
    const identificador = integrador.trim();
    if (!identificador) {
      setStatus({ ok: false, message: "Informe o usuarioId ou o e-mail do integrador." });
      return;
    }
    if (
      !window.confirm(
        `Isso vai fazer com que ${COLABORADOR_EMAIL_FIXO} passe a acessar a conta do integrador "${identificador}" no portal my.solarview.com.br. Essa troca e' imediata e afeta a conta de suporte compartilhada. Confirma?`,
      )
    )
      return;

    setLoading(true);
    setStatus(null);
    try {
      const result = await acessarContaIntegrador(identificador);
      setStatus({
        ok: true,
        message: `Colaborador agora acessa ${result.integrador.usuNome} (${result.integrador.usuEmail}).`,
      });
      setAtual({
        colaborador: result.colaborador,
        integradorAtual: result.integrador,
      });
      setIntegrador("");
    } catch (error) {
      setStatus({ ok: false, message: (error as Error).message });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <header className="app__header">
        <h1>Suporte L2</h1>
      </header>

      {atualError && (
        <p className="app__error">
          Nao foi possivel carregar o estado atual do colaborador: {atualError}
        </p>
      )}

      <section className="units-details">
        <h2>Acessar a conta do integrador</h2>

        <form className="publish-form" onSubmit={handleAcessar}>
          <div className="publish-form__row">
            <label>
              Colaborador
              <input type="text" value={atual?.colaborador.usuEmail ?? COLABORADOR_EMAIL_FIXO} disabled />
            </label>

            <label>
              Integrador (usuarioId ou e-mail)
              <input
                type="text"
                value={integrador}
                onChange={(event) => setIntegrador(event.target.value)}
                placeholder={
                  atual?.integradorAtual
                    ? `Atual: ${atual.integradorAtual.usuEmail}`
                    : "usuarioId ou e-mail do integrador"
                }
              />
            </label>
          </div>

          <div className="publish-form__actions">
            <button type="submit" disabled={loading}>
              {loading ? "Acessando…" : "Acessar"}
            </button>
            {status && (
              <span className={status.ok ? "status status--ok" : "status status--error"}>
                {status.message}
              </span>
            )}
          </div>
        </form>
      </section>
    </div>
  );
}
