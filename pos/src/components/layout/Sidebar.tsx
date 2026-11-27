import {
  BedDouble,
  Bookmark,
  ChefHat,
  CookingPot,
  Home,
  LayoutGrid,
  Power,
  Settings,
  ShoppingCart,
  UtensilsCrossed,
} from "lucide-react";
import type { TillProduct } from "../../lib/till-code";

export type NavId =
  | "home"
  | "tables"
  | "rooms"
  | "kitchen"
  | "items"
  | "saved"
  | "orders"
  | "kds";

type Props = {
  active: NavId;
  product: TillProduct;
  onSelect: (id: NavId) => void;
  onSettings: () => void;
  onLogout: () => void;
};

function LogoMark() {
  return (
    <svg className="nav-logo" viewBox="0 0 32 32" aria-hidden="true">
      <circle
        cx="16"
        cy="16"
        r="11"
        fill="none"
        stroke="currentColor"
        strokeWidth="5"
        strokeLinecap="round"
        strokeDasharray="58 11"
        transform="rotate(-38 16 16)"
      />
    </svg>
  );
}

const NAV_LABEL: Record<NavId, string> = {
  home: "home",
  tables: "tables",
  rooms: "rooms",
  kitchen: "kitchen",
  items: "items",
  saved: "saved",
  orders: "orders",
  kds: "kds",
};

const PRODUCT_NAV: Record<TillProduct, { id: NavId; icon: typeof Home }[]> = {
  supermarket: [
    { id: "home", icon: Home },
    { id: "items", icon: LayoutGrid },
    { id: "saved", icon: Bookmark },
    { id: "orders", icon: ShoppingCart },
  ],
  restaurant: [
    { id: "tables", icon: UtensilsCrossed },
    { id: "items", icon: LayoutGrid },
    { id: "saved", icon: Bookmark },
    { id: "orders", icon: ShoppingCart },
  ],
  hotel: [
    { id: "rooms", icon: BedDouble },
    { id: "items", icon: LayoutGrid },
    { id: "saved", icon: Bookmark },
    { id: "orders", icon: ShoppingCart },
  ],
  "dark-kitchen": [
    { id: "kitchen", icon: CookingPot },
    { id: "items", icon: LayoutGrid },
    { id: "saved", icon: Bookmark },
    { id: "orders", icon: ShoppingCart },
  ],
};

export function Sidebar({
  active,
  product,
  onSelect,
  onSettings,
  onLogout,
}: Props) {
  const items = [...PRODUCT_NAV[product], { id: "kds" as NavId, icon: ChefHat }];

  return (
    <aside className="nav-wrap">
      <nav className="nav" aria-label="POS">
        <LogoMark />
        <div className="nav-mid">
          {items.map(({ id, icon: Icon }) => {
            const isActive = active === id;
            return (
              <button
                key={id}
                className={`nav-btn ${isActive ? "active" : ""}`}
                onClick={() => onSelect(id)}
                aria-label={NAV_LABEL[id]}
                aria-current={isActive ? "page" : undefined}
              >
                <Icon
                  size={22}
                  strokeWidth={isActive ? 0 : 1.75}
                  fill={isActive ? "currentColor" : "none"}
                />
              </button>
            );
          })}
        </div>
        <div className="nav-bottom">
          <button className="nav-btn" aria-label="settings" onClick={onSettings}>
            <Settings size={22} strokeWidth={1.75} />
          </button>
          <button className="nav-btn nav-power" aria-label="logout" onClick={onLogout}>
            <span className="nav-power-ring">
              <Power size={14} strokeWidth={2} />
            </span>
          </button>
        </div>
      </nav>
    </aside>
  );
}
