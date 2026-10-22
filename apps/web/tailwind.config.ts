import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        bayora: {
          dark: "#090d16",
          panel: "#0f172a",
          border: "#1e293b",
          red: "#f43f5e",
          blue: "#6366f1",
          gateway: "#06b6d4",
          target: "#10b981",
          warning: "#f59e0b",
        },
      },
      fontFamily: {
        mono: ["JetBrains Mono", "Fira Code", "Courier New", "monospace"],
      },
    },
  },
  plugins: [],
};

export default config;
