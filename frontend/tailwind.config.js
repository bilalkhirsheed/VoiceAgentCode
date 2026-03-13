/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./index.html', './src/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui', 'Segoe UI', 'Arial', 'sans-serif']
      },
      colors: {
        crm: {
          bg: '#FFFFFF',
          page: '#F8FAFC',
          border: '#E5E7EB',
          text: '#111827',
          text2: '#6B7280',
          muted: '#9CA3AF',
          primary: '#2563EB',
          success: '#16A34A',
          warning: '#F59E0B',
          error: '#DC2626'
        }
      },
      borderRadius: {
        crm: '6px'
      }
    }
  },
  plugins: []
};

