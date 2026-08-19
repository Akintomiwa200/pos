import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        pos: {
          bg: "#F3F4F8",
          ink: "#1C1C1E",
          primary: "#7B61FF",
        },
      },
    },
  },
  plugins: [],
};

export default config;
