import VerticalPage from "../_vertical";

export default function Page() {
  return (
    <VerticalPage
      kicker="Solutions · Hotel"
      title="Outlets that still share one HQ."
      copy="Restaurant, bar, and shop tills under the same company, with a year-long till licence each."
      points={[
        "Separate till names per outlet (for example TILL-FNB-01) issued in Setup → Till.",
        "HQ reports roll up sales, tax, and cashier shifts across the property.",
        "Night audit stays in HQ; the till only needs a live API and a valid code.",
      ]}
    />
  );
}
