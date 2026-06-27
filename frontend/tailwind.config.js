/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        mega: {
          red: {
            50: "#FDECEE",
            100: "#FAD0D5",
            200: "#F2A3AC",
            300: "#E8717E",
            400: "#D8404F",
            500: "#B3001B",
            600: "#960017",
            700: "#760012",
            800: "#56000D",
            900: "#380008",
          },
          black: "#111315",
          gray: {
            50: "#F7F7F8",
            100: "#EEEFF1",
            200: "#DEE0E3",
            300: "#C2C5CA",
            400: "#9A9EA6",
            500: "#71757D",
            600: "#52565D",
            700: "#3A3D42",
            800: "#272A2E",
            900: "#1A1C1F",
          },
        },
      },
      fontFamily: {
        sans: ["Inter", "ui-sans-serif", "system-ui", "-apple-system", "Segoe UI", "Roboto", "sans-serif"],
        mono: ["JetBrains Mono", "ui-monospace", "monospace"],
      },
      fontSize: {
        "2xs": "0.6875rem",
      },
      boxShadow: {
        card: "0 1px 2px 0 rgba(17, 19, 21, 0.04), 0 1px 3px 0 rgba(17, 19, 21, 0.06)",
        "card-hover": "0 2px 8px 0 rgba(17, 19, 21, 0.08)",
        popover: "0 4px 16px 0 rgba(17, 19, 21, 0.12)",
      },
      borderRadius: {
        card: "10px",
      },
      animation: {
        "fade-in": "fadeIn 0.15s ease-out",
        "slide-in": "slideIn 0.2s ease-out",
      },
      keyframes: {
        fadeIn: { "0%": { opacity: "0" }, "100%": { opacity: "1" } },
        slideIn: {
          "0%": { opacity: "0", transform: "translateY(-4px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
      },
    },
  },
  plugins: [],
};
