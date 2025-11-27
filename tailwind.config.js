// tailwind.config.js
module.exports = {
  content: [
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          dark: "#15192c",
          darkAlt: "#242a46",
          accent: "#25D366", // keep your SelectorOS green
          muted: "#9ca3af",
        },
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
  plugins: [],
};
