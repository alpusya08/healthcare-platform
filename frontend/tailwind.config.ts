import type { Config } from "tailwindcss";
import animate from "tailwindcss-animate";

const config: Config = {
  darkMode: ["class"],
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    container: {
      center: true,
      padding: "1rem",
      screens: { "2xl": "1400px" },
    },
    extend: {
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        // Warm "sage" palette overrides default teal — used as the brand color across the app.
        // Replaces clinical teal/cyan with a softer, more human medical green.
        teal: {
          50: "#f3f8f3",
          100: "#e1ede2",
          200: "#c2dac6",
          300: "#9bbfa3",
          400: "#74a17e",
          500: "#558461",
          600: "#41694c",
          700: "#34543e",
          800: "#2c4434",
          900: "#26392c",
          950: "#121f17",
        },
        // Warm coral for emergency / urgent banners — replaces harsh red.
        coral: {
          50: "#fff4f1",
          100: "#ffe4dc",
          200: "#ffcab9",
          300: "#ffa386",
          400: "#ff7551",
          500: "#fa5128",
          600: "#e8391b",
          700: "#c22b18",
          800: "#9d271a",
          900: "#80251b",
          950: "#460f08",
        },
        // Warm amber for ratings / highlights.
        sand: {
          50: "#fbf8f1",
          100: "#f4ecd9",
          200: "#e9d8b3",
          300: "#dcbd83",
          400: "#cf9f54",
          500: "#bf853a",
          600: "#a26b30",
          700: "#84522a",
          800: "#6d4327",
          900: "#5b3923",
          950: "#321d11",
        },
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
    },
  },
  plugins: [animate],
};

export default config;
