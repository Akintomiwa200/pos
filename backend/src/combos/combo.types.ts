export type ComboComponent = {
  itemId: string;
  quantity: number;
};

export type Combo = {
  id: string;
  name: string;
  description?: string;
  components: ComboComponent[];
  priceMinor: number;
  active: boolean;
  updatedAt: string;
};
