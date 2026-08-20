export const SITE = {
  name: "POS",
  tagline: "Till, HQ, and price check for supermarket, hotel, and restaurant.",
};

export type SiteLink = {
  href: string;
  label: string;
  children?: SiteLink[];
};

export const HEADER_NAV: SiteLink[] = [
  { href: "/", label: "Home" },
  { href: "/product", label: "Product" },
  { href: "/about", label: "About" },
  { href: "/contact", label: "Contact" },
];

export const FOOTER_COLUMNS: { heading: string; links: SiteLink[] }[] = [
  {
    heading: "Product",
    links: [
      { href: "/product", label: "Overview" },
      { href: "/pricing", label: "Pricing" },
      { href: "/download", label: "Download" },
      { href: "/login", label: "HQ login" },
      { href: "/register", label: "Create account" },
      { href: "/forgot-password", label: "Forgot password" },
    ],
  },
  {
    heading: "Solutions",
    links: [
      { href: "/solutions", label: "All verticals" },
      { href: "/solutions/supermarket", label: "Supermarket" },
      { href: "/solutions/hotel", label: "Hotel" },
      { href: "/solutions/restaurant", label: "Restaurant" },
      { href: "/solutions/dark-kitchen", label: "Dark kitchen" },
    ],
  },
  {
    heading: "Company",
    links: [
      { href: "/about", label: "About" },
      { href: "/contact", label: "Contact" },
      { href: "/support", label: "Support" },
    ],
  },
  {
    heading: "Legal",
    links: [
      { href: "/privacy", label: "Privacy" },
      { href: "/terms", label: "Terms" },
    ],
  },
];
