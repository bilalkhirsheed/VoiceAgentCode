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
          page: '#F1F5F9',
          border: '#E2E8F0',
          'border-light': '#F1F5F9',
          text: '#0F172A',
          text2: '#64748B',
          muted: '#94A3B8',
          primary: '#1D4ED8',
          'primary-hover': '#1E40AF',
          'primary-light': '#EFF6FF',
          'primary/10': 'rgba(29, 78, 216, 0.1)',
          'primary/20': 'rgba(29, 78, 216, 0.2)',
          success: '#15803D',
          warning: '#B45309',
          error: '#B91C1C'
        }
      },
      borderRadius: {
        crm: '8px',
        'crm-lg': '10px'
      },
      boxShadow: {
        'crm-sm': '0 1px 2px 0 rgba(15, 23, 42, 0.05)',
        'crm': '0 1px 3px 0 rgba(15, 23, 42, 0.08), 0 1px 2px -1px rgba(15, 23, 42, 0.06)',
        'crm-md': '0 4px 6px -1px rgba(15, 23, 42, 0.07), 0 2px 4px -2px rgba(15, 23, 42, 0.05)',
        'crm-lg': '0 10px 15px -3px rgba(15, 23, 42, 0.08), 0 4px 6px -4px rgba(15, 23, 42, 0.05)',
        'crm-primary': '0 4px 14px 0 rgba(29, 78, 216, 0.25)',
        'crm-inner': 'inset 0 1px 2px 0 rgba(15, 23, 42, 0.04)'
      },
      transitionDuration: {
        '150': '150ms',
        '200': '200ms'
      },
      transitionTimingFunction: {
        'smooth': 'cubic-bezier(0.4, 0, 0.2, 1)'
      }
    }
  },
  plugins: []
};

