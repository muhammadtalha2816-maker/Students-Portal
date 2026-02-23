import type { Config } from "tailwindcss";

const config: Config = {
  // This line is the magic fix! It forces manual dark mode only.
  darkMode: 'class',

  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {},
  },
  plugins: [],
};
export default config;