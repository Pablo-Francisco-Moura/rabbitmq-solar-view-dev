import { useEffect, useState } from "react";
import { getUnidadeNomes } from "../api/unidades.js";
import "../css/message-list.css";
import type { QueueMessage } from "../types/queues.js";

interface ParsedPayload {
  credential?: { id?: number; unityId?: number };
  [key: string]: unknown;
}

function parsePayload(message: QueueMessage): ParsedPayload | null {
  if (message.payload == null) return null;
  try {
    return JSON.parse(message.payload);
  } catch {
    return null;
  }
}

interface MessageListProps {
  queueName: string | null;
  messages: QueueMessage[];
  loading: boolean;
  error: string | null;
  onRefresh: () => void;
  onDelete: (index: number, payload: string) => Promise<void>;
}

export default function MessageList({
  queueName,
  messages,
  loading,
  error,
  onRefresh,
  onDelete,
}: MessageListProps) {
  const [deletingIndex, setDeletingIndex] = useState<number | null>(null);
  const [unidadeNomes, setUnidadeNomes] = useState<Record<number, string>>({});

  useEffect(() => {
    const unityIds = [
      ...new Set(
        messages
          .map((message) => parsePayload(message)?.credential?.unityId)
          .filter(
            (id): id is number => id != null && !(id in unidadeNomes),
          ),
      ),
    ];
    if (unityIds.length === 0) return;
    getUnidadeNomes(unityIds)
      .then((nomes) =>
        setUnidadeNomes((current) => ({ ...current, ...nomes })),
      )
      .catch(() => {});
  }, [messages]);

  async function handleDelete(
    event: React.MouseEvent,
    index: number,
    message: QueueMessage,
  ) {
    event.preventDefault();
    event.stopPropagation();
    if (!window.confirm("Excluir esta mensagem da fila? Essa ação não pode ser desfeita."))
      return;
    setDeletingIndex(index);
    try {
      await onDelete(index, message.payload);
    } finally {
      setDeletingIndex(null);
    }
  }

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
        {messages.map((message, index) => {
          const parsed = parsePayload(message);
          const credentialId = parsed?.credential?.id;
          const unityId = parsed?.credential?.unityId;
          const titleParts: string[] = [];
          if (credentialId != null) titleParts.push(`Credencial: ${credentialId}`);
          if (unityId != null) {
            titleParts.push(`Unidade: ${unityId}`);
            titleParts.push(`Nome: ${unidadeNomes[unityId] ?? "—"}`);
          }

          return (
            <li key={message.id}>
              <details>
                <summary>
                  <div className="message-list__meta">
                    <span>
                      {message.redelivered ? "reentregue" : "original"}
                    </span>
                    {message.routingKey && (
                      <span>routing key: {message.routingKey}</span>
                    )}
                    {message.properties?.priority != null && (
                      <span>prioridade: {message.properties.priority}</span>
                    )}
                    <button
                      type="button"
                      className="message-list__delete"
                      title="Excluir mensagem"
                      aria-label="Excluir mensagem"
                      disabled={deletingIndex === index}
                      onClick={(event) => handleDelete(event, index, message)}
                    >
                      {deletingIndex === index ? "…" : "🗑"}
                    </button>
                  </div>
                  <div className="message-list__summary">
                    {titleParts.length > 0 ? (
                      <span>{titleParts.join(" - ")}</span>
                    ) : (
                      <span>Ver mensagem</span>
                    )}
                  </div>
                </summary>
                <pre>
                  {parsed ? JSON.stringify(parsed, null, 2) : message.payload}
                </pre>
              </details>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
