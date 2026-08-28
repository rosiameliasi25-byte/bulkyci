/** @type {import('tailwindcss').Config} */
export default {
  darkMode: "class", // toggle lewat class `.dark` di <html>, dikontrol oleh ThemeContext
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        // Sage green — trust, growth, "health" without feeling clinical
        sage: {
          50: "#F3F6F0",
          100: "#E4EBDD",
          200: "#C9D8BC",
          300: "#AAC098",
          400: "#8CA878",
          500: "#71915F", // primary sage
          600: "#5A7549",
          700: "#485D3B",
          800: "#3A4B30",
          900: "#2E3B27",
        },
        // Warm amber — appetite, energy, the calorie "surplus" this app is built around
        amber: {
          50: "#FDF6E9",
          100: "#FAEBCB",
          200: "#F4D394",
          300: "#EDB75C",
          400: "#E7A233", // primary amber
          500: "#D3891C",
          600: "#B06E14",
          700: "#875313",
          800: "#5F3A11",
          900: "#412810",
        },
        // Cream & ink sekarang membaca dari CSS variable (lihat index.css)
        // supaya bisa berubah otomatis di seluruh aplikasi saat mode gelap
        // aktif — TANPA perlu mengubah satu pun class `bg-cream`/`text-ink`
        // yang sudah dipakai di komponen manapun. Nilai default (light mode)
        // persis sama dengan hex lama, jadi tampilan terang tidak berubah.
        cream: {
          DEFAULT: "rgb(var(--color-cream) / <alpha-value>)",
          soft: "rgb(var(--color-cream-soft) / <alpha-value>)",
          card: "rgb(var(--color-cream-card) / <alpha-value>)",
        },
        ink: {
          DEFAULT: "rgb(var(--color-ink) / <alpha-value>)",
          soft: "rgb(var(--color-ink-soft) / <alpha-value>)",
          faint: "rgb(var(--color-ink-faint) / <alpha-value>)",
        },
      },
      fontFamily: {
        display: ["'Plus Jakarta Sans'", "sans-serif"],
        body: ["'Inter'", "sans-serif"],
      },
      borderRadius: {
        "3xl": "1.75rem",
        "4xl": "2.25rem",
      },
      boxShadow: {
        soft: "0 8px 30px -12px rgba(42, 43, 34, 0.18)",
        card: "0 4px 20px -6px rgba(42, 43, 34, 0.10)",
        glow: "0 8px 24px -8px rgba(231, 162, 51, 0.45)",
      },
      keyframes: {
        "fade-up": {
          "0%": { opacity: 0, transform: "translateY(12px)" },
          "100%": { opacity: 1, transform: "translateY(0)" },
        },
        "scale-in": {
          "0%": { opacity: 0, transform: "scale(0.95)" },
          "100%": { opacity: 1, transform: "scale(1)" },
        },
        "pulse-soft": {
          "0%, 100%": { opacity: 1 },
          "50%": { opacity: 0.6 },
        },
      },
      animation: {
        "fade-up": "fade-up 0.5s ease-out both",
        "scale-in": "scale-in 0.25s ease-out both",
        "pulse-soft": "pulse-soft 1.8s ease-in-out infinite",
      },
    },
  },
  plugins: [],
};

