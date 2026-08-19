export type CatalogItem = {
  id: string;
  name: string;
  category: string;
  sku: string;
  barcode: string;
  priceMinor: number;
  currency: "NGN";
  image: string;
  onHand: number;
  updatedAt: string;
};

const now = () => new Date().toISOString();

export const CATALOG_SEED: CatalogItem[] = [
  {
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
    updatedAt: now(),
  },
  {
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
    updatedAt: now(),
  },
  {
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
    updatedAt: now(),
  },
  {
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
    updatedAt: now(),
  },
  {
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
    updatedAt: now(),
  },
  {
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
    updatedAt: now(),
  },
  {
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
    updatedAt: now(),
  },
  {
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
    updatedAt: now(),
  },
  {
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
    updatedAt: now(),
  },
  {
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
    updatedAt: now(),
  },
  {
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
    updatedAt: now(),
  },
  {
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
    updatedAt: now(),
  },
  {
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
    updatedAt: now(),
  },
  {
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
    updatedAt: now(),
  },
];
