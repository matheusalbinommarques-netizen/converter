/** @type {import('tailwindcss').Config} */
module.exports = {
  // O ponto importante é esta linha abaixo:
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"], 
  theme: {
    extend: {},
  },
  plugins: [],
}