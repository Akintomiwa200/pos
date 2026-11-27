export type Ad = {
  id: string;
  eyebrow: string;
  title: string;
  subtitle: string;
  accent: string;
  /** Every built-in slide is explicitly sample content. */
  sample: boolean;
};

// Edit this list to change what plays on the idle screen. Each ad rotates
// for `AD_DURATION_MS` before the next one fades in. Keep `accent` as a hex
// color — it drives the slide's background gradient.
// These are sample placeholders, not store-backed offers or store facts:
// keep `sample: true` so the screen labels every slide as a sample.
export const ads: Ad[] = [
  {
    id: "loyalty",
    eyebrow: "Loyalty example",
    title: "Ask about loyalty points",
    subtitle: "Sample message only — check at the till for current loyalty terms.",
    accent: "#ec4899",
    sample: true,
  },
  {
    id: "skincare",
    eyebrow: "Offer example",
    title: "Sample offer: buy two, save 15%",
    subtitle: "Illustrative only — not a store-backed discount.",
    accent: "#7c3aed",
    sample: true,
  },
  {
    id: "new",
    eyebrow: "New arrivals example",
    title: "Sample: new arrivals on the shelf",
    subtitle: "Illustrative only — nothing here reflects live stock.",
    accent: "#0891b2",
    sample: true,
  },
  {
    id: "hours",
    eyebrow: "Help example",
    title: "Need help finding something?",
    subtitle: "Ask a team member. Opening hours are not shown on this screen.",
    accent: "#d97706",
    sample: true,
  },
];

export const AD_DURATION_MS = 7000;
