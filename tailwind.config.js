/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./*.{js,ts,jsx,tsx}",
    "./components/**/*.{js,ts,jsx,tsx}",
    "./services/**/*.{js,ts,jsx,tsx}",
    "./public/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Existing klo-antigravity tokens
        'luxury-teal': '#00a8b5',
        'luxury-navy': '#1a2e35',
        'luxury-gold': '#B8963E',
        // KLO-FULLSTACK tokens (added for component parity during port)
        'luxury-black': '#080808',
        'luxury-slate': '#1a2e35',
        'gold': '#B8963E',
        'text-main': '#f5f5f0',
        'border-main': '#1a2e35',
      },
      fontFamily: {
        'serif': ['Cormorant Garamond', 'Georgia', 'serif'],
        'sans': ['Inter', 'system-ui', 'sans-serif'],
      },
      keyframes: {
        slideup: {
          '0%': { opacity: '0', transform: 'translateY(20px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        pulse: {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '.7' },
        },
        bounce: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-4px)' },
        },
      },
      animation: {
        slideup: 'slideup 0.4s ease-out',
        pulse: 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        bounce: 'bounce 1s infinite',
      },
      transitionDelay: {
        '100': '100ms',
        '200': '200ms',
      },
      backdropBlur: {
        'xl': '16px',
      },
    },
  },
  plugins: [],
}
