/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          dark: '#090514',       // Deepest dark background with a hint of purple
          card: '#140e28',       // Slightly lighter card bg for contrast
          border: '#241a45',     // Borders for containers
          purple: {
            DEFAULT: '#8b5cf6',  // Glow states, buttons
            light: '#a78bfa',    // Text highlights, hover state
            dark: '#6d28d9',     // Solid active states
          },
          emerald: {
            DEFAULT: '#10b981',  // Accents, completed tasks, gap score indicator
            light: '#34d399',    // High-confidence score hover
            dark: '#047857',     // Solid positive states
          },
          accent: '#c084fc',     // Secondary glowing pinkish-purple
        },
      },
      boxShadow: {
        'glow-purple': '0 0 20px rgba(139, 92, 246, 0.4)',
        'glow-emerald': '0 0 20px rgba(16, 185, 129, 0.4)',
      },
      fontFamily: {
        sans: ['Outfit', 'Inter', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
