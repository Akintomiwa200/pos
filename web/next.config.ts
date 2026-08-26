import type { NextConfig } from "next";

const googleClientId =
  process.env.GOOGLE_CLIENT_ID?.trim() ||
  process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID?.trim() ||
  "";

if (googleClientId) {
  process.env.GOOGLE_CLIENT_ID = googleClientId;
  process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID = googleClientId;
}

const nextConfig: NextConfig = {
  env: {
    GOOGLE_CLIENT_ID: googleClientId,
  },
  async redirects() {
    return [
      { source: "/super", destination: "/admin", permanent: false },
      { source: "/super/:path*", destination: "/admin/:path*", permanent: false },
      { source: "/admin/ceo", destination: "/admin", permanent: false },
      { source: "/admin/operations", destination: "/admin/tills", permanent: false },
      { source: "/admin/finance", destination: "/admin/billing/subscriptions", permanent: false },
      { source: "/admin/product", destination: "/admin/catalog/products", permanent: false },
      { source: "/admin/sales", destination: "/admin/companies/register", permanent: false },
      { source: "/admin/accounts", destination: "/admin/administrators", permanent: false },
      { source: "/admin/departments", destination: "/admin/administrators/roles", permanent: false },
      { source: "/admin/staff", destination: "/admin/administrators", permanent: false },
      { source: "/admin/access", destination: "/admin/administrators/roles", permanent: false },
      { source: "/admin/subscriptions", destination: "/admin/billing/subscriptions", permanent: false },
      { source: "/admin/licences", destination: "/admin/billing/usage", permanent: false },
      { source: "/admin/companies/profile", destination: "/admin/companies/current/profile", permanent: false },
      { source: "/admin/companies/branches", destination: "/admin/companies/current/branches", permanent: false },
      { source: "/admin/companies/stores", destination: "/admin/companies/current/stores", permanent: false },
      { source: "/admin/companies/storefronts", destination: "/admin/companies/current/storefronts", permanent: false },
      { source: "/admin/companies/owners", destination: "/admin/companies/current/owners", permanent: false },
      { source: "/admin/companies/gateways", destination: "/admin/commerce/gateways", permanent: false },
      { source: "/admin/companies/taxes", destination: "/admin/companies/current/billing", permanent: false },
    ];
  },
  async rewrites() {
    return [
      {
        source: "/api/:path*",
        destination: "http://localhost:3001/api/:path*",
      },
    ];
  },
};

export default nextConfig;
