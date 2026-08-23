import coreWebVitals from "eslint-config-next/core-web-vitals";

export default [
  {
    ignores: [".next/**", "node_modules/**", "out/**", "next-env.d.ts"],
  },
  ...coreWebVitals,
  {
    rules: {
      // Console pages intentionally read/write browser storage in effects.
      "@typescript-eslint/no-explicit-any": "off",
    },
  },
];
