/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Couleurs ARTCI officielles
        artci: {
          orange: '#FF8C00',
          green: '#228B22',
          black: '#000000',
          white: '#FFFFFF',
          gray: {
            light: '#F5F5F5',
            DEFAULT: '#666666',
            dark: '#333333'
          }
        },
        // Statuts de conformité
        status: {
          conforme: '#228B22',
          achevee: '#FF8C00',
          encours: '#4A90E2',
          rejete: '#DC143C'
        }
      },
      fontFamily: {
        sans: ['Arial', 'sans-serif'],
      },
      fontSize: {
        'h1': '32px',
        'h2': '28px',
        'h3': '24px',
      },
      spacing: {
        'navbar-height': '70px',
      },
      boxShadow: {
        'card': '0 2px 8px rgba(0,0,0,0.1)',
        'hover': '0 4px 16px rgba(0,0,0,0.15)',
      }
    },
  },
  plugins: [],
}
