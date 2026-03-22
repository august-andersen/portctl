import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/** @type {import('tailwindcss').Config} */
export default {
  content: [
    path.resolve(__dirname, 'src/**/*.{ts,tsx}'),
    path.resolve(__dirname, 'index.html'),
  ],
  darkMode: 'class',
  theme: {
    extend: {
      fontFamily: {
        mono: ['SF Mono', 'Monaco', 'Menlo', 'Consolas', 'monospace'],
        sans: ['-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
      },
      colors: {
        surface: {
          50: '#fafafa',
          100: '#f0f0f0',
          200: '#d4d4d8',
          300: '#a1a1aa',
          400: '#71717a',
          500: '#52525b',
          600: '#27272a',
          700: '#1c1c1e',
          800: '#141416',
          900: '#0c0c0e',
          950: '#050506',
        },
      },
    },
  },
  plugins: [],
};
