import { useState } from "react";
import { ChevronRight } from "lucide-react";
import { formatMoney } from "../../lib/types";
import {
  ROOM_STATUS,
  roomTotal,
  type HotelRoom,
  type RoomStatus,
} from "../../lib/rooms";

const FILTERS: Array<"all" | RoomStatus> = [
  "all",
  "vacant",
  "occupied",
  "checkout",
  "dirty",
];

type Props = {
  rooms: HotelRoom[];
  activeRoomId: string | null;
  onSelect: (room: HotelRoom) => void;
  onOpen: (room: HotelRoom, guests: number, guestName: string) => void;
  onFrontDesk: () => void;
};

export function RoomsScreen({
  rooms,
  activeRoomId,
  onSelect,
  onOpen,
  onFrontDesk,
}: Props) {
  const [filter, setFilter] = useState<(typeof FILTERS)[number]>("all");
  const [seat, setSeat] = useState<HotelRoom | null>(null);
  const [guests, setGuests] = useState(1);
  const [guestName, setGuestName] = useState("");

  const floors = Array.from(new Set(rooms.map((room) => room.floor)));
  const visible = rooms.filter((room) => filter === "all" || room.status === filter);

  function tap(room: HotelRoom) {
    if (room.status === "vacant" || room.status === "dirty") {
      setSeat(room);
      setGuests(1);
      setGuestName("");
      return;
    }
    onSelect(room);
  }

  return (
    <section className="floor-page">
      <div className="header">
        <nav className="crumb" aria-label="Breadcrumb">
          <span>Home</span>
          <ChevronRight size={16} strokeWidth={2.2} />
          <strong>Rooms</strong>
        </nav>
        <button className="floor-walkin" type="button" onClick={onFrontDesk}>
          Front desk
        </button>
      </div>

      <div className="chips" role="tablist" aria-label="Room status">
        {FILTERS.map((id) => (
          <button
            key={id}
            type="button"
            className={`chip ${filter === id ? "active" : ""}`}
            onClick={() => setFilter(id)}
          >
            {id === "all" ? "All rooms" : ROOM_STATUS[id].label}
          </button>
        ))}
      </div>

      <div className="floor-legend">
        {(Object.keys(ROOM_STATUS) as RoomStatus[]).map((id) => (
          <span key={id}>
            <i style={{ background: ROOM_STATUS[id].fill }} />
            {ROOM_STATUS[id].label}
          </span>
        ))}
      </div>

      <div className="room-floors">
        {floors.map((floor) => (
          <div className="floor-area" key={floor}>
            <h2>{floor}</h2>
            <div className="room-grid">
              {visible
                .filter((room) => room.floor === floor)
                .map((room) => {
                  const meta = ROOM_STATUS[room.status];
                  const busy = room.status === "occupied" || room.status === "checkout";
                  return (
                    <button
                      key={room.id}
                      type="button"
                      className={`room-card ${activeRoomId === room.id ? "selected" : ""}`}
                      style={{ background: meta.fill }}
                      onClick={() => tap(room)}
                    >
                      <strong>{room.name}</strong>
                      <small>
                        {busy
                          ? room.guestName || `${room.guests} in house`
                          : ROOM_STATUS[room.status].label}
                      </small>
                      {busy ? <em>{formatMoney(roomTotal(room))}</em> : null}
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
            <p className="shift-modal-kicker">Open folio</p>
            <h3>Room {seat.name}</h3>
            <p className="shift-modal-copy">
              {seat.floor}. Guest name and covers go on this folio, then F&amp;B can be added.
            </p>
            <label className="shift-modal-copy" htmlFor="guest-name">
              Guest name
            </label>
            <input
              id="guest-name"
              value={guestName}
              onChange={(event) => setGuestName(event.target.value)}
              className="room-guest-input"
              placeholder="Adeola Mensah"
              autoFocus
            />
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
                onClick={() => setGuests((n) => n + 1)}
              >
                +
              </button>
            </div>
            <div className="shift-modal-actions">
              <button
                className="continue"
                onClick={() => {
                  onOpen(seat, guests, guestName.trim() || "Guest");
                  setSeat(null);
                }}
              >
                Open room
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
