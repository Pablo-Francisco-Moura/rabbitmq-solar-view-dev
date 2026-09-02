import { useCallback, useEffect, useState } from "react";
import QueueCard from "../components/QueueCard.js";
import MessageList from "../components/MessageList.js";
import PublishForm from "../components/PublishForm.js";
import { getConcessionarias } from "../api/concessionarias.js";
import {
  getQueues,
  getMessages,
  publishMessage,
  deleteMessage,
} from "../api/queues.js";
import type { Concessionaria } from "../types/concessionarias.js";
import type { Queue, QueueMessage } from "../types/queues.js";

const POLL_INTERVAL_MS = 4000;
const STORAGE_KEY = "rabbitmq-solar-view-dev:queues-page";

function loadStoredConcessionariaId(): string | null {
  try {
    return localStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
}

export default function QueuesPage() {
  const [concessionarias, setConcessionarias] = useState<Concessionaria[]>([]);
  const [concessionariaId, setConcessionariaId] = useState<string | null>(
    () => loadStoredConcessionariaId(),
  );
  const [queues, setQueues] = useState<Queue[]>([]);
  const [queuesError, setQueuesError] = useState<string | null>(null);
  const [selectedQueue, setSelectedQueue] = useState<string | null>(null);
  const [messages, setMessages] = useState<QueueMessage[]>([]);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [messagesError, setMessagesError] = useState<string | null>(null);

  const concessionaria =
    concessionarias.find((c) => c.id === concessionariaId) || null;

  const refreshQueues = useCallback(async () => {
    try {
      const data = await getQueues();
      setQueues(data);
      setQueuesError(null);
    } catch (error) {
      setQueuesError((error as Error).message);
    }
  }, []);

  const refreshMessages = useCallback(async (queueName: string | null) => {
    if (!queueName) return;
    setMessagesLoading(true);
    try {
      const data = await getMessages(queueName);
      setMessages(data);
      setMessagesError(null);
    } catch (error) {
      setMessagesError((error as Error).message);
    } finally {
      setMessagesLoading(false);
    }
  }, []);

  useEffect(() => {
    getConcessionarias()
      .then((data) => {
        setConcessionarias(data);
        setConcessionariaId((current) => {
          const stillExists = data.some(
            (c) => String(c.id) === String(current),
          );
          return stillExists ? current : data[0]?.id || null;
        });
      })
      .catch((error) => setQueuesError(error.message));
  }, []);

  useEffect(() => {
    try {
      if (concessionariaId) localStorage.setItem(STORAGE_KEY, concessionariaId);
    } catch {
      // localStorage indisponivel (modo privado, storage cheio etc.)
    }
  }, [concessionariaId]);

  useEffect(() => {
    refreshQueues();
    const interval = setInterval(refreshQueues, POLL_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [refreshQueues]);

  useEffect(() => {
    if (concessionaria) setSelectedQueue(concessionaria.queueIn);
  }, [concessionaria]);

  useEffect(() => {
    refreshMessages(selectedQueue);
  }, [selectedQueue, refreshMessages]);

  async function handlePublish(queue: string, payload: Record<string, unknown>, priority: number) {
    await publishMessage(queue, payload, priority);
    await refreshQueues();
    if (queue === selectedQueue) await refreshMessages(queue);
  }

  async function handleRefresh() {
    await Promise.all([refreshQueues(), refreshMessages(selectedQueue)]);
  }

  async function handleDelete(index: number, payload: string) {
    let deleteError: string | null = null;
    try {
      await deleteMessage(selectedQueue as string, index, payload);
    } catch (error) {
      deleteError = (error as Error).message;
    }
    await refreshQueues();
    await refreshMessages(selectedQueue);
    if (deleteError) setMessagesError(deleteError);
  }

  const visibleQueues = concessionaria
    ? queues.filter(
        (q) =>
          q.name === concessionaria.queueIn ||
          q.name === concessionaria.queueOut,
      )
    : [];

  return (
    <div>
      <header className="app__header">
        <h1>Filas das concessionárias</h1>
        <select
          className="app__concessionaria"
          value={concessionariaId || ""}
          onChange={(event) => setConcessionariaId(event.target.value)}
        >
          {concessionarias.map((c) => (
            <option key={c.id} value={c.id}>
              {c.nome}
            </option>
          ))}
        </select>
      </header>

      {queuesError && (
        <p className="app__error">
          Não foi possível falar com a API: {queuesError}
        </p>
      )}

      <section className="queue-grid">
        {visibleQueues.map((queue) => (
          <QueueCard
            key={queue.name}
            queue={queue}
            label={queue.name === concessionaria?.queueIn ? "Entrada" : "Saída"}
            active={queue.name === selectedQueue}
            onSelect={() => setSelectedQueue(queue.name)}
          />
        ))}
      </section>

      <div className="app__grid">
        <MessageList
          queueName={selectedQueue}
          messages={messages}
          loading={messagesLoading}
          error={messagesError}
          onRefresh={handleRefresh}
          onDelete={handleDelete}
        />
        <PublishForm
          queues={visibleQueues}
          concessionaria={concessionaria}
          onPublish={handlePublish}
        />
      </div>
    </div>
  );
}
