import { useState } from "react";
import { ChevronRight } from "lucide-react";
import { formatMoney } from "../../lib/types";
import {
  TABLE_STATUS,
  tableTotal,
  type FloorTable,
  type TableStatus,
} from "../../lib/tables";

const AREAS: FloorTable["area"][] = ["Dining", "Terrace", "Bar"];
const FILTERS: Array<"all" | TableStatus> = [
  "all",
  "free",
  "occupied",
  "ready",
  "served",
  "billed",
];

type Props = {
  tables: FloorTable[];
  activeTableId: string | null;
  onSelect: (table: FloorTable) => void;
  onOpen: (table: FloorTable, guests: number) => void;
  onWalkIn: () => void;
};

export function TablesScreen({
  tables,
  activeTableId,
  onSelect,
  onOpen,
  onWalkIn,
}: Props) {
  const [filter, setFilter] = useState<(typeof FILTERS)[number]>("all");
  const [seat, setSeat] = useState<FloorTable | null>(null);
  const [guests, setGuests] = useState(2);

  const visible = tables.filter(
    (table) => filter === "all" || table.status === filter,
  );

  function tap(table: FloorTable) {
    if (table.status === "free") {
      setSeat(table);
      setGuests(Math.min(2, table.seats));
      return;
    }
    onSelect(table);
  }

  return (
    <section className="floor-page">
      <div className="header">
        <nav className="crumb" aria-label="Breadcrumb">
          <span>Home</span>
          <ChevronRight size={16} strokeWidth={2.2} />
          <strong>Tables</strong>
        </nav>
        <button className="floor-walkin" type="button" onClick={onWalkIn}>
          Walk-in
        </button>
      </div>

      <div className="chips" role="tablist" aria-label="Table status">
        {FILTERS.map((id) => (
          <button
            key={id}
            type="button"
            className={`chip ${filter === id ? "active" : ""}`}
            onClick={() => setFilter(id)}
          >
            {id === "all" ? "All tables" : TABLE_STATUS[id].label}
          </button>
        ))}
      </div>

      <div className="floor-legend">
        {(Object.keys(TABLE_STATUS) as TableStatus[]).map((id) => (
          <span key={id}>
            <i style={{ background: TABLE_STATUS[id].fill }} />
            {TABLE_STATUS[id].label}
          </span>
        ))}
      </div>

      <div className="floor-map">
        {AREAS.map((area) => (
          <div className="floor-area" key={area}>
            <h2>{area}</h2>
            <div className="floor-canvas">
              {visible
                .filter((table) => table.area === area)
                .map((table) => {
                  const meta = TABLE_STATUS[table.status];
                  const busy = table.status !== "free";
                  return (
                    <button
                      key={table.id}
                      type="button"
                      className={`floor-table ${table.shape} ${activeTableId === table.id ? "selected" : ""}`}
                      style={{
                        left: `${table.x}%`,
                        top: `${table.y}%`,
                        background: meta.fill,
                      }}
                      onClick={() => tap(table)}
                    >
                      <strong>{table.name}</strong>
                      <small>
                        {busy
                          ? `${table.guests} guest${table.guests === 1 ? "" : "s"}`
                          : `${table.seats} seats`}
                      </small>
                      {busy ? (
                        <em>{formatMoney(tableTotal(table))}</em>
                      ) : null}
                    </button>
                  );
                })}
            </div>
          </div>
        ))}
      </div>

      {seat && (
        <div className="dialog-scrim">
          <div className="shift-modal">
            <p className="shift-modal-kicker">Open table</p>
            <h3>Table {seat.name}</h3>
            <p className="shift-modal-copy">
              {seat.area} · {seat.seats} seats. Set covers, then start the order.
            </p>
            <div className="floor-covers">
              <button
                type="button"
                className="shift-modal-out"
                onClick={() => setGuests((n) => Math.max(1, n - 1))}
              >
                −
              </button>
              <strong>{guests}</strong>
              <button
                type="button"
                className="shift-modal-out"
                onClick={() => setGuests((n) => Math.min(seat.seats, n + 1))}
              >
                +
              </button>
            </div>
            <div className="shift-modal-actions">
              <button
                className="continue"
                onClick={() => {
                  onOpen(seat, guests);
                  setSeat(null);
                }}
              >
                Open table
              </button>
              <button
                className="shift-modal-out"
                type="button"
                onClick={() => setSeat(null)}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
