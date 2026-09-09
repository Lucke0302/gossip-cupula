/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // base — 1a · tokens de design
        ink: '#000000',
        card: '#FFFFFF',
        wordmark: '#EDEFC0',
        body: '#333333',
        link: '#1A5FB4',
        // seções
        welcome: '#6BB9E8',
        fofocas: '#E8763A',
        fotos: '#E8D44D',
        eventos: '#E86B9E',
        links: '#8DC63F',
        // apoio
        muted: '#9a9a90',
        'muted-dark': '#d7d7cd',
        'muted-dim': '#c9cba6',
        field: '#fbfbf6',
        'field-border': '#cfcfc4',
        hairline: '#ececE2',
        'hairline-dot': '#dcdcd2',
      },
      fontFamily: {
        display: ['Jost', 'Century Gothic', 'sans-serif'],
        serif: ['Georgia', 'Times New Roman', 'serif'],
        body: ['Verdana', 'Arial', 'sans-serif'],
        mono: ['ui-monospace', 'Menlo', 'monospace'],
      },
      fontSize: {
        // corpo denso de 2008
        post: ['12.5px', '1.35'],
        meta: ['11px', '1.35'],
        micro: ['10px', '1.4'],
      },
      spacing: { 1.5: '6px', 4.5: '18px', 13: '52px' },
      borderRadius: { card: '12px', field: '6px' },
      boxShadow: {
        paper: '0 6px 18px rgba(0,0,0,.55)',
        soft: '0 2px 8px rgba(0,0,0,.4)',
        btn: '0 2px 6px rgba(0,0,0,.25)',
        sunken: 'inset 0 1px 2px rgba(0,0,0,.06)',
        focusring: '0 0 0 3px rgba(107,185,232,.35)',
      },
      keyframes: {
        shimmer: {
          '0%': { backgroundPosition: '-320px 0' },
          '100%': { backgroundPosition: '320px 0' },
        },
        pulse2008: {
          '0%,100%': { opacity: '.35' },
          '50%': { opacity: '.9' },
        },
      },
      animation: {
        shimmer: 'shimmer 1.4s linear infinite',
        pulse2008: 'pulse2008 1.6s ease-in-out infinite',
      },
    },
  },
  plugins: [],
};
