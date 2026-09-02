import "../css/queue-card.css";
import type { Queue } from "../types/queues.js";

interface QueueCardProps {
  queue: Queue;
  label: string;
  active: boolean;
  onSelect: () => void;
}

export default function QueueCard({ queue, label, active, onSelect }: QueueCardProps) {
  return (
    <button
      type="button"
      className={`queue-card${active ? " queue-card--active" : ""}`}
      onClick={onSelect}
    >
      <header>
        <span className="queue-card__label">{label}</span>
        <code className="queue-card__name">{queue?.name}</code>
      </header>
      <dl>
        <div>
          <dt>Prontas</dt>
          <dd>{queue?.messagesReady ?? "–"}</dd>
        </div>
        <div>
          <dt>Sem confirmação</dt>
          <dd>{queue?.messagesUnacknowledged ?? "–"}</dd>
        </div>
        <div>
          <dt>Consumidores</dt>
          <dd>{queue?.consumers ?? "–"}</dd>
        </div>
      </dl>
    </button>
  );
}
