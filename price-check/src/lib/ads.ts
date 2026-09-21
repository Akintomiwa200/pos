export type Ad = {
  id: string;
  eyebrow: string;
  title: string;
  subtitle: string;
  accent: string;
};

// Edit this list to change what plays on the idle screen. Each ad rotates
// for `AD_DURATION_MS` before the next one fades in. Keep `accent` as a hex
// color — it drives the slide's background gradient.
export const ads: Ad[] = [
  {
    id: "loyalty",
    eyebrow: "Loyalty card",
    title: "Earn points on every visit",
    subtitle: "Ask at the till to link your number and start earning today.",
    accent: "#ec4899",
  },
  {
    id: "skincare",
    eyebrow: "This week",
    title: "Buy two, save 15% on skincare",
    subtitle: "Mix and match any lotion, wash, or cream in store.",
    accent: "#7c3aed",
  },
  {
    id: "new",
    eyebrow: "Just arrived",
    title: "New unscented hand soap range",
    subtitle: "Gentle on skin, tough on grime — now on the shelf.",
    accent: "#0891b2",
  },
  {
    id: "hours",
    eyebrow: "Good to know",
    title: "Open every day, 8am – 10pm",
    subtitle: "Need help finding something? Just ask a team member.",
    accent: "#d97706",
  },
];

export const AD_DURATION_MS = 7000;
