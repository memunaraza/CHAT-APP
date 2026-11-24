/** @type {import('tailwindcss').Config} */

// Rang CSS variables se aate hain (src/index.css), is liye theme badalne par poori app ka rang badal jata hai
const v = (name) => `rgb(var(--${name}) / <alpha-value>)`;

export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  darkMode: "class",
  theme: {
    extend: {
      fontFamily: {
        sans: ["Instrument Sans", "system-ui", "sans-serif"],
        display: ["Bricolage Grotesque", "Instrument Sans", "system-ui", "sans-serif"],
      },
      colors: {
        // Brand: buttons, links, active chat
        brand: { 50: v("brand-50"), 100: v("brand-100"), 200: v("brand-200"), 300: v("brand-300"), 400: v("brand-400"), 500: v("brand-500"), 600: v("brand-600"), 700: v("brand-700"), 800: v("brand-800"), 900: v("brand-900") },
        // Ink: dark mode surfaces
        ink: { 500: v("ink-500"), 600: v("ink-600"), 700: v("ink-700"), 800: v("ink-800"), 900: v("ink-900") },
        // Mist: light mode background
        mist: v("mist"),
        // Sun: tumhare bheje hue messages aur send button
        sun: { 300: v("sun-300"), 400: v("sun-400"), 500: v("sun-500"), 600: v("sun-600"), ink: v("sun-ink") },
      },
      keyframes: {
        pop: {
          "0%": { opacity: "0", transform: "translateY(14px) scale(.96)" },
          "100%": { opacity: "1", transform: "none" },
        },
      },
      animation: { pop: "pop .55s cubic-bezier(.2,.9,.3,1.15) both" },
    },
  },
  plugins: [],
};
