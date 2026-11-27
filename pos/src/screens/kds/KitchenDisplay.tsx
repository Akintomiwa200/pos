import { useMemo } from "react";
import { Clock, Flame, CheckCircle2, Bike, ChefHat } from "lucide-react";
import { useCatalog } from "../../lib/catalog";
import { useStoreSettings } from "../../lib/use-store-settings";
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
  onClearDispatched?: () => void;
};

export function KitchenDisplay({ tickets, onAdvance, onClearDispatched }: Props) {
  const settings = useStoreSettings();
  const { items } = useCatalog();
  const categoryByItemId = useMemo(
    () => new Map(items.map((item) => [item.id, item.category.trim()] as const)),
    [items],
  );
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
                {status === "dispatched" && lane.length && onClearDispatched ? (
                  <button type="button" className="kds-clear" onClick={onClearDispatched}>
                    Clear
                  </button>
                ) : null}
              </h2>
              {lane.length === 0 ? (
                <p className="kds-none">—</p>
              ) : (
                lane.map((ticket) => {
                  const card = (
                    <>
                      <span className="kds-card-top">
                        <strong>{ticket.orderNo}</strong>
                        <em>{channelLabel(ticket.channel)}</em>
                      </span>
                      {ticket.guestName ? (
                        <span className="kds-guest">{ticket.guestName}</span>
                      ) : null}
                      <ul>
                        {ticket.lines.map((line) => {
                          const category = settings.showCategoryOnKitchen
                            ? categoryByItemId.get(line.itemId)
                            : undefined;
                          return (
                            <li key={line.id}>
                              {line.quantity} × {line.name}
                              {category ? (
                                <span style={{ opacity: 0.65 }}> · {category}</span>
                              ) : null}
                            </li>
                          );
                        })}
                      </ul>
                      <span className="kds-meta">
                        {minutesSince(ticket.openedAt)} min · {formatMoney(ticketTotal(ticket))}
                      </span>
                    </>
                  );
                  return status === "dispatched" ? (
                    <div key={ticket.id} className="kds-card kds-card-done">
                      {card}
                    </div>
                  ) : (
                    <button
                      key={ticket.id}
                      type="button"
                      className={`kds-card${status === "ready" ? " kds-card-ready" : ""}`}
                      onClick={() => onAdvance?.(ticket.id)}
                    >
                      {card}
                    </button>
                  );
                })
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
