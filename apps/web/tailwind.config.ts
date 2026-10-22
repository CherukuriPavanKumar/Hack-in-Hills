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
        canvas: "#0b0d11",
        surface: "#13161c",
        subtle: "#181c24",
        edge: "#252a36",
        "edge-subtle": "#1d212b",
        "edge-hover": "#363d4e",
        label: {
          primary: "#f3f4f6",
          secondary: "#94a3b8",
          muted: "#64748b",
        },
        signal: {
          blue: "#3b82f6",
          emerald: "#10b981",
          rose: "#ef4444",
          amber: "#f59e0b",
        },
      },
      fontFamily: {
        sans: ["Inter", "-apple-system", "BlinkMacSystemFont", "Segoe UI", "sans-serif"],
        mono: ["JetBrains Mono", "SFMono-Regular", "Menlo", "monospace"],
      },
      borderRadius: {
        DEFAULT: "6px",
        sm: "4px",
        md: "6px",
        lg: "8px",
        xl: "10px",
      },
    },
  },
  plugins: [],
};

export default config;
