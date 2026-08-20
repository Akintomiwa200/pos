import { ChevronRight } from "lucide-react";
import { formatMoney } from "../../lib/types";
import {
  KITCHEN_CHANNELS,
  TICKET_STATUS,
  channelLabel,
  ticketTotal,
  type KitchenChannel,
  type KitchenTicket,
  type TicketStatus,
} from "../../lib/tickets";

type Props = {
  tickets: KitchenTicket[];
  activeTicketId: string | null;
  onSelect: (ticket: KitchenTicket) => void;
  onNew: (channel: KitchenChannel) => void;
};

export function KitchenHome({ tickets, activeTicketId, onSelect, onNew }: Props) {
  return (
    <section className="floor-page">
      <div className="header">
        <nav className="crumb" aria-label="Breadcrumb">
          <span>Home</span>
          <ChevronRight size={16} strokeWidth={2.2} />
          <strong>Tickets</strong>
        </nav>
      </div>

      <div className="floor-legend">
        {(Object.keys(TICKET_STATUS) as TicketStatus[]).map((id) => (
          <span key={id}>
            <i style={{ background: TICKET_STATUS[id].fill }} />
            {TICKET_STATUS[id].label}
          </span>
        ))}
      </div>

      <div className="ticket-board">
        {KITCHEN_CHANNELS.map((channel) => {
          const rows = tickets.filter((ticket) => ticket.channel === channel.id);
          return (
            <div className="floor-area" key={channel.id}>
              <h2>{channel.label}</h2>
              <button
                type="button"
                className="ticket-new"
                onClick={() => onNew(channel.id)}
              >
                New {channel.label.toLowerCase()} ticket
              </button>
              <div className="ticket-list">
                {rows.length === 0 ? (
                  <p className="ticket-empty">No open tickets</p>
                ) : (
                  rows.map((ticket) => {
                    const meta = TICKET_STATUS[ticket.status];
                    return (
                      <button
                        key={ticket.id}
                        type="button"
                        className={`ticket-card ${activeTicketId === ticket.id ? "selected" : ""}`}
                        style={{ background: meta.fill }}
                        onClick={() => onSelect(ticket)}
                      >
                        <strong>{ticket.orderNo}</strong>
                        <small>{ticket.guestName || channelLabel(ticket.channel)}</small>
                        <em>{formatMoney(ticketTotal(ticket))}</em>
                      </button>
                    );
                  })
                )}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
