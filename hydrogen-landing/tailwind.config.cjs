module.exports = {
  content: ['./index.html', './src/**/*.{js,jsx,ts,tsx,html}'],
  theme: {
    extend: {
      colors: {
        'brand-green': 'var(--color-brand-green)',
        'accent-gold': 'var(--color-accent-gold)',
        'accent-pale': '#F3E5AB',
        'footer-dark': '#2C2C2C',
        'bg-default': 'var(--color-bg)',
        'light-grey': 'var(--color-light-grey)',
        'dark-grey': 'var(--color-dark-grey)',
        'black-text': 'var(--color-black-text)'
      },
      fontFamily: {
        serif: ['"Cormorant Garamond"', 'serif'],
        sans: ['ui-sans-serif', 'system-ui']
      }
    }
  },
  plugins: []
}
