import { useCallback, useEffect, useState } from "react";
import QueueCard from "../components/QueueCard.jsx";
import MessageList from "../components/MessageList.jsx";
import PublishForm from "../components/PublishForm.jsx";
import {
  getConcessionarias,
  getQueues,
  getMessages,
  publishMessage,
  deleteMessage,
} from "../api.js";

const POLL_INTERVAL_MS = 4000;

export default function QueuesPage() {
  const [concessionarias, setConcessionarias] = useState([]);
  const [concessionariaId, setConcessionariaId] = useState(null);
  const [queues, setQueues] = useState([]);
  const [queuesError, setQueuesError] = useState(null);
  const [selectedQueue, setSelectedQueue] = useState(null);
  const [messages, setMessages] = useState([]);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [messagesError, setMessagesError] = useState(null);

  const concessionaria =
    concessionarias.find((c) => c.id === concessionariaId) || null;

  const refreshQueues = useCallback(async () => {
    try {
      const data = await getQueues();
      setQueues(data);
      setQueuesError(null);
    } catch (error) {
      setQueuesError(error.message);
    }
  }, []);

  const refreshMessages = useCallback(async (queueName) => {
    if (!queueName) return;
    setMessagesLoading(true);
    try {
      const data = await getMessages(queueName);
      setMessages(data);
      setMessagesError(null);
    } catch (error) {
      setMessagesError(error.message);
    } finally {
      setMessagesLoading(false);
    }
  }, []);

  useEffect(() => {
    getConcessionarias()
      .then((data) => {
        setConcessionarias(data);
        setConcessionariaId((current) => current || data[0]?.id || null);
      })
      .catch((error) => setQueuesError(error.message));
  }, []);

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

  async function handlePublish(queue, payload, priority) {
    await publishMessage(queue, payload, priority);
    await refreshQueues();
    if (queue === selectedQueue) await refreshMessages(queue);
  }

  async function handleRefresh() {
    await Promise.all([refreshQueues(), refreshMessages(selectedQueue)]);
  }

  async function handleDelete(index, payload) {
    let deleteError = null;
    try {
      await deleteMessage(selectedQueue, index, payload);
    } catch (error) {
      deleteError = error.message;
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
        <h1>Solar View Dev</h1>
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
