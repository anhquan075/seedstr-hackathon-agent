/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'neon-cyan': '#00f3ff',
        'neon-magenta': '#ff00ff',
        'neon-purple': '#bd00ff',
        'neon-green': '#00ff9f',
        'cyber-black': '#050505',
        'cyber-gray': '#121212',
      },
      fontFamily: {
        'orbitron': ['Orbitron', 'sans-serif'],
        'fira-code': ['Fira Code', 'monospace'],
      },
    },
  },
  plugins: [],
}
