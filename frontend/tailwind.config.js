/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Charte ARTCI / CERTINUM APDP
        brand: {
          primary: '#FF8C00',
          'primary-hover': '#E67E00',
          soft: '#FFF4E5',
          secondary: '#009E49',
          dark: '#0F172A',
          gray: '#E5E7EB',
          bg: '#F3F4F6',
        },
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
        sans: ['Inter', 'Segoe UI', 'system-ui', 'sans-serif'],
        display: ['Montserrat', 'Inter', 'Segoe UI', 'sans-serif'],
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
        'card': '0 4px 20px rgba(0,0,0,0.08)',
        'hover': '0 10px 30px rgba(0,0,0,0.14)',
      }
    },
  },
  plugins: [],
}
