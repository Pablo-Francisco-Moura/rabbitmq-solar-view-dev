import { useCallback, useEffect, useState } from "react";
import QueueCard from "./components/QueueCard.jsx";
import MessageList from "./components/MessageList.jsx";
import PublishForm from "./components/PublishForm.jsx";
import { getQueues, getMessages, publishMessage } from "./api.js";

const POLL_INTERVAL_MS = 4000;

export default function App() {
  const [queues, setQueues] = useState([]);
  const [queuesError, setQueuesError] = useState(null);
  const [selectedQueue, setSelectedQueue] = useState(null);
  const [messages, setMessages] = useState([]);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [messagesError, setMessagesError] = useState(null);

  const refreshQueues = useCallback(async () => {
    try {
      const data = await getQueues();
      setQueues(data);
      setQueuesError(null);
      setSelectedQueue((current) => current || data[0]?.name || null);
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
    refreshQueues();
    const interval = setInterval(refreshQueues, POLL_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [refreshQueues]);

  useEffect(() => {
    refreshMessages(selectedQueue);
  }, [selectedQueue, refreshMessages]);

  async function handlePublish(queue, payload, priority) {
    await publishMessage(queue, payload, priority);
    await refreshQueues();
    if (queue === selectedQueue) await refreshMessages(queue);
  }

  return (
    <div className="app">
      <header className="app__header">
        <h1>Solar View Dev</h1>
        <p>Equatorial GO</p>
      </header>

      {queuesError && (
        <p className="app__error">
          Não foi possível falar com a API: {queuesError}
        </p>
      )}

      <section className="queue-grid">
        {queues.map((queue, index) => (
          <QueueCard
            key={queue.name}
            queue={queue}
            label={index === 0 ? "Entrada" : "Saída"}
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
          onRefresh={() => refreshMessages(selectedQueue)}
        />
        <PublishForm queues={queues} onPublish={handlePublish} />
      </div>
    </div>
  );
}
