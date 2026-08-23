export type CatalogItem = {
  id: string;
  name: string;
  category: string;
  subcategory?: string;
  sku: string;
  barcode: string;
  batchNumber?: string;
  brand?: string;
  costMinor: number;
  priceMinor: number;
  currency: "NGN";
  image: string;
  onHand: number;
  reorderLevel: number;
  unit: string;
  unitLabel?: string;
  packSize: number;
  description?: string;
  active: boolean;
  updatedAt: string;
  expiresAt?: string;
};

const now = () => new Date().toISOString();
const daysOut = (days: number) => new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString();

function seed(partial: Omit<CatalogItem, "costMinor" | "reorderLevel" | "unit" | "unitLabel" | "packSize" | "active" | "updatedAt"> & {
  costMinor?: number;
  reorderLevel?: number;
  unit?: string;
  unitLabel?: string;
  packSize?: number;
}): CatalogItem {
  return {
    ...partial,
    costMinor: partial.costMinor ?? Math.round(partial.priceMinor * 0.65),
    reorderLevel: partial.reorderLevel ?? 5,
    unit: partial.unit ?? "each",
    unitLabel: partial.unitLabel ?? "Each",
    packSize: Math.max(1, partial.packSize ?? 1),
    active: true,
    updatedAt: now(),
  };
}

export const CATALOG_SEED: CatalogItem[] = [
  seed({
    id: "raspberry-tart",
    name: "Raspberry Tart",
    category: "Cakes",
    sku: "CK-RT-001",
    barcode: "8901234560001",
    priceMinor: 350000,
    currency: "NGN",
    image:
      "https://images.unsplash.com/photo-1464305795204-6f5bbfc7fb81?auto=format&fit=crop&w=600&q=80",
    onHand: 24,
    expiresAt: daysOut(-4),
  }),
  seed({
    id: "chocolate-cake",
    name: "Chocolate Cake",
    category: "Cakes",
    sku: "CK-CC-002",
    barcode: "8901234560002",
    priceMinor: 850000,
    currency: "NGN",
    image:
      "https://images.unsplash.com/photo-1578985545062-69928b1d9587?auto=format&fit=crop&w=600&q=80",
    onHand: 12,
  }),
  seed({
    id: "fruit-tart",
    name: "Fruit Tart",
    category: "Cakes",
    sku: "CK-FT-003",
    barcode: "8901234560003",
    priceMinor: 450000,
    currency: "NGN",
    image:
      "https://images.unsplash.com/photo-1519915028121-7d3463d20b13?auto=format&fit=crop&w=600&q=80",
    onHand: 8,
    expiresAt: daysOut(-1),
  }),
  seed({
    id: "lemon-tart",
    name: "Lemon Tart",
    category: "Cakes",
    sku: "CK-LT-004",
    barcode: "8901234560004",
    priceMinor: 150000,
    currency: "NGN",
    image:
      "https://images.unsplash.com/photo-1519915308083-83c9c7c5e3c6?auto=format&fit=crop&w=600&q=80",
    onHand: 30,
    expiresAt: daysOut(6),
  }),
  seed({
    id: "berry-cheesecake",
    name: "Berry Cheesecake",
    category: "Cakes",
    sku: "CK-BC-005",
    barcode: "8901234560005",
    priceMinor: 400000,
    currency: "NGN",
    image:
      "https://images.unsplash.com/photo-1533134242443-d4fd215305ad?auto=format&fit=crop&w=600&q=80",
    onHand: 6,
  }),
  seed({
    id: "vanilla-slice",
    name: "Vanilla Slice",
    category: "Pastry",
    sku: "PS-VS-006",
    barcode: "8901234560006",
    priceMinor: 200000,
    currency: "NGN",
    image:
      "https://images.unsplash.com/photo-1486427944299-d1955d23e34d?auto=format&fit=crop&w=600&q=80",
    onHand: 18,
  }),
  seed({
    id: "butter-croissant",
    name: "Butter Croissant",
    category: "Pastry",
    sku: "PS-CR-007",
    barcode: "8901234560007",
    priceMinor: 120000,
    currency: "NGN",
    image:
      "https://images.unsplash.com/photo-1555507036-ab1f4038808a?auto=format&fit=crop&w=600&q=80",
    onHand: 40,
    expiresAt: daysOut(2),
  }),
  seed({
    id: "cinnamon-roll",
    name: "Cinnamon Roll",
    category: "Pastry",
    sku: "PS-CN-008",
    barcode: "8901234560008",
    priceMinor: 180000,
    currency: "NGN",
    image:
      "https://images.unsplash.com/photo-1509365465985-1138a7d3746e?auto=format&fit=crop&w=600&q=80",
    onHand: 22,
  }),
  seed({
    id: "vanilla-scoop",
    name: "Vanilla Scoop",
    category: "Ice Cream",
    sku: "IC-VN-009",
    barcode: "8901234560009",
    priceMinor: 90000,
    currency: "NGN",
    image:
      "https://images.unsplash.com/photo-1570197788417-0e82375c9371?auto=format&fit=crop&w=600&q=80",
    onHand: 50,
    expiresAt: daysOut(-10),
  }),
  seed({
    id: "chocolate-scoop",
    name: "Chocolate Scoop",
    category: "Ice Cream",
    sku: "IC-CH-010",
    barcode: "8901234560010",
    priceMinor: 90000,
    currency: "NGN",
    image:
      "https://images.unsplash.com/photo-1563805042-7684c019e1cb?auto=format&fit=crop&w=600&q=80",
    onHand: 44,
    expiresAt: daysOut(-2),
  }),
  seed({
    id: "classic-pancakes",
    name: "Classic Pancakes",
    category: "Pancakes",
    sku: "PK-CL-011",
    barcode: "8901234560011",
    priceMinor: 250000,
    currency: "NGN",
    image:
      "https://images.unsplash.com/photo-1528207776546-365bb710ee93?auto=format&fit=crop&w=600&q=80",
    onHand: 16,
  }),
  seed({
    id: "berry-pancakes",
    name: "Berry Pancakes",
    category: "Pancakes",
    sku: "PK-BR-012",
    barcode: "8901234560012",
    priceMinor: 280000,
    currency: "NGN",
    image:
      "https://images.unsplash.com/photo-1506084868230-bb9d95c24759?auto=format&fit=crop&w=600&q=80",
    onHand: 14,
  }),
  seed({
    id: "vegan-brownie",
    name: "Vegan Brownie",
    category: "Vegan",
    sku: "VG-BR-013",
    barcode: "8901234560013",
    priceMinor: 220000,
    currency: "NGN",
    image:
      "https://images.unsplash.com/photo-1606313564200-e75d5e30476c?auto=format&fit=crop&w=600&q=80",
    onHand: 20,
  }),
  seed({
    id: "coconut-tart",
    name: "Coconut Tart",
    category: "Vegan",
    sku: "VG-CT-014",
    barcode: "8901234560014",
    priceMinor: 240000,
    currency: "NGN",
    image:
      "https://images.unsplash.com/photo-1519915308083-83c9c7c5e3c6?auto=format&fit=crop&w=600&q=80",
    onHand: 11,
  }),
  seed({
    id: "biscuit-carton",
    name: "Assorted Biscuits",
    category: "Pastry",
    subcategory: "Packaged",
    sku: "PS-BC-015",
    barcode: "8901234560015",
    priceMinor: 450000,
    currency: "NGN",
    unit: "ctn",
    unitLabel: "Carton",
    packSize: 24,
    onHand: 18,
    image:
      "https://images.unsplash.com/photo-1558961363-fa8aad7a81e4?auto=format&fit=crop&w=600&q=80",
  }),
  seed({
    id: "flour-bag",
    name: "Premium Flour",
    category: "Pastry",
    subcategory: "Ingredients",
    sku: "PS-FL-016",
    barcode: "8901234560016",
    priceMinor: 820000,
    currency: "NGN",
    unit: "bag",
    unitLabel: "Bag",
    packSize: 10,
    onHand: 6,
    image:
      "https://images.unsplash.com/photo-1509440159596-0249088772ff?auto=format&fit=crop&w=600&q=80",
  }),
  seed({
    id: "water-pack",
    name: "Bottled Water",
    category: "Pastry",
    subcategory: "Beverages",
    sku: "PS-WT-017",
    barcode: "8901234560017",
    priceMinor: 180000,
    currency: "NGN",
    unit: "pack",
    unitLabel: "Pack",
    packSize: 12,
    onHand: 40,
    image:
      "https://images.unsplash.com/photo-1548839140-29a7492991bd?auto=format&fit=crop&w=600&q=80",
  }),
];
