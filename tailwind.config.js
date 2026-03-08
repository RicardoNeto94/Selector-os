/** @type {import('tailwindcss').Config} */
const forms = require("@tailwindcss/forms");

module.exports = {
  content: ["./src/**/*.{js,ts,jsx,tsx}"],

  /* Dark mode controlled via class instead of OS */
  darkMode: "class",

  theme: {
    container: {
      center: true,
      padding: "1.5rem",
      screens: {
        "2xl": "1400px",
      },
    },

    extend: {
      colors: {
        brand: {
          dark: "#15192c",
          darkAlt: "#242a46",
          accent: "#25D366",
          muted: "#9ca3af",
        },
      },

      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
      },

      boxShadow: {
        card: "0 18px 45px rgba(15, 23, 42, 0.12)",
        soft: "0 10px 30px rgba(15, 23, 42, 0.08)",
      },

      borderRadius: {
        xl2: "1.25rem",
        xl3: "1.75rem",
      },
    },
  },

  plugins: [forms],
};
