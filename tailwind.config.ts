import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./lib/**/*.{js,ts,jsx,tsx,mdx}"
  ],
  theme: {
    extend: {
      colors: {
        ink: "#1f1c23",
        royal: {
          DEFAULT: "#102542",
          soft: "#214269",
          muted: "#536b8b"
        },
        pine: "#0f5a4c",
        champagne: "#f2dcc2",
        parchment: "#fbf4ea",
        blush: "#f4e1d8",
        gold: "#b98a46"
      },
      fontFamily: {
        body: ['var(--font-body)', '"Avenir Next"', '"Segoe UI"', "sans-serif"],
        display: ['var(--font-display)', '"Baskerville"', '"Times New Roman"', "serif"]
      },
      boxShadow: {
        royal: "0 24px 80px rgba(16, 37, 66, 0.18)",
        glow: "0 12px 30px rgba(185, 138, 70, 0.18)"
      },
      backgroundImage: {
        "royal-mesh":
          "radial-gradient(circle at top left, rgba(185,138,70,0.22), transparent 35%), radial-gradient(circle at 80% 20%, rgba(15,90,76,0.14), transparent 30%), linear-gradient(135deg, rgba(251,244,234,0.96), rgba(247,236,224,0.82))"
      }
    }
  },
  plugins: []
};

export default config;
