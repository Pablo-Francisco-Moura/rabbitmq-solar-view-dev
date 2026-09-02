import "../../css/publish-form.css";

export default function InstallationCodesForm({
  faturaCodigoInstalacao,
  onFaturaCodigoInstalacaoChange,
  faturaNewCodigoInstalacao,
  onFaturaNewCodigoInstalacaoChange,
  onSubmit,
  saving,
  saveStatus,
}) {
  return (
    <form className="publish-form" onSubmit={onSubmit}>
      <h2>Atualizar códigos de instalação</h2>
      <p>
        Atualiza <code>faturaCodigoInstalacao</code> e{" "}
        <code>faturaNewCodigoInstalacao</code> nas tabelas <code>unidade</code>{" "}
        e <code>faturaCredencial</code> desta unidade. Nenhum outro campo é
        alterado.
      </p>

      <div className="publish-form__row">
        <label>
          Código de instalação
          <input
            type="text"
            value={faturaCodigoInstalacao}
            onChange={(event) => onFaturaCodigoInstalacaoChange(event.target.value)}
          />
        </label>

        <label>
          Novo código de instalação
          <input
            type="text"
            value={faturaNewCodigoInstalacao}
            onChange={(event) =>
              onFaturaNewCodigoInstalacaoChange(event.target.value)
            }
          />
        </label>
      </div>

      <div className="publish-form__actions">
        <button type="submit" disabled={saving}>
          {saving ? "Salvando…" : "Salvar"}
        </button>
        {saveStatus && (
          <span
            className={
              saveStatus.ok ? "status status--ok" : "status status--error"
            }
          >
            {saveStatus.message}
          </span>
        )}
      </div>
    </form>
  );
}
