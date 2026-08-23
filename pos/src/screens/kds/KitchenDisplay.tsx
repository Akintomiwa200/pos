import { Clock, Flame, CheckCircle2, Bike, ChefHat } from "lucide-react";
import { formatMoney } from "../../lib/types";
import {
  channelLabel,
  TICKET_STATUS,
  ticketTotal,
  type KitchenTicket,
  type TicketStatus,
} from "../../lib/tickets";

const LANES: { status: TicketStatus; icon: typeof Flame }[] = [
  { status: "new", icon: Clock },
  { status: "prep", icon: Flame },
  { status: "ready", icon: CheckCircle2 },
  { status: "dispatched", icon: Bike },
];

function minutesSince(iso: string | null) {
  if (!iso) return 0;
  return Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 60_000));
}

type Props = {
  tickets: KitchenTicket[];
  onAdvance?: (id: string) => void;
};

export function KitchenDisplay({ tickets, onAdvance }: Props) {
  const open = tickets.filter((ticket) => ticket.status !== "dispatched");
  const done = tickets.filter((ticket) => ticket.status === "dispatched").slice(0, 8);

  if (!tickets.length) {
    return (
      <section className="kds">
        <div className="kds-empty">
          <ChefHat size={40} strokeWidth={1.5} />
          <h1>Kitchen Display</h1>
          <p className="price">
            No tickets yet. Open a kitchen ticket from the dark-kitchen board and
            its lines will land here in real time.
          </p>
        </div>
      </section>
    );
  }

  return (
    <section className="kds">
      <header className="kds-head">
        <h1>Kitchen Display</h1>
        <span className="price">
          {open.length} open · tap a card to move it along
        </span>
      </header>
      <div className="kds-lanes">
        {LANES.map(({ status, icon: Icon }) => {
          const lane = tickets.filter((ticket) => ticket.status === status);
          const meta = TICKET_STATUS[status];
          return (
            <div key={status} className="kds-lane" style={{ borderTopColor: meta.fill }}>
              <h2>
                <Icon size={15} /> {meta.label}
                <span className="kds-count">{lane.length}</span>
              </h2>
              {lane.length === 0 ? (
                <p className="kds-none">—</p>
              ) : (
                lane.map((ticket) => (
                  <button
                    key={ticket.id}
                    type="button"
                    className={`kds-card${status === "ready" ? " kds-card-ready" : ""}`}
                    onClick={() =>
                      status === "dispatched"
                        ? undefined
                        : onAdvance?.(ticket.id)
                    }
                  >
                    <span className="kds-card-top">
                      <strong>{ticket.orderNo}</strong>
                      <em>{channelLabel(ticket.channel)}</em>
                    </span>
                    {ticket.guestName ? (
                      <span className="kds-guest">{ticket.guestName}</span>
                    ) : null}
                    <ul>
                      {ticket.lines.map((line) => (
                        <li key={line.id}>
                          {line.quantity} × {line.name}
                        </li>
                      ))}
                    </ul>
                    <span className="kds-meta">
                      {minutesSince(ticket.openedAt)} min · {formatMoney(ticketTotal(ticket))}
                    </span>
                  </button>
                ))
              )}
            </div>
          );
        })}
      </div>
      {done.length ? (
        <footer className="kds-done">
          <span>Recently dispatched:</span>
          {done.map((ticket) => (
            <span key={ticket.id} className="kds-done-chip">
              {ticket.orderNo}
            </span>
          ))}
        </footer>
      ) : null}
    </section>
  );
}

export type { KitchenTicket };
