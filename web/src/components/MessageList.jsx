function formatPayload(message) {
  if (message.payload == null) return "";
  try {
    return JSON.stringify(JSON.parse(message.payload), null, 2);
  } catch {
    return message.payload;
  }
}

export default function MessageList({ queueName, messages, loading, error, onRefresh }) {
  return (
    <section className="message-list">
      <header className="message-list__header">
        <h2>
          Mensagens em <code>{queueName}</code>
        </h2>
        <button type="button" onClick={onRefresh} disabled={loading}>
          {loading ? "Atualizando…" : "Atualizar"}
        </button>
      </header>

      {error && <p className="message-list__error">{error}</p>}

      {!error && messages.length === 0 && !loading && (
        <p className="message-list__empty">Nenhuma mensagem nesta fila.</p>
      )}

      <ul>
        {messages.map((message) => (
          <li key={message.id}>
            <div className="message-list__meta">
              <span>{message.redelivered ? "reentregue" : "original"}</span>
              {message.routingKey && <span>routing key: {message.routingKey}</span>}
              {message.properties?.priority != null && (
                <span>prioridade: {message.properties.priority}</span>
              )}
            </div>
            <pre>{formatPayload(message)}</pre>
          </li>
        ))}
      </ul>
    </section>
  );
}
