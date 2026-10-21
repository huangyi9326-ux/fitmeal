/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{vue,js}'],
  theme: {
    extend: {
      colors: {
        // 清新浅绿主色
        primary: {
          50: '#F3FAEF',
          100: '#E7F5DF',
          200: '#D3EDC8',
          300: '#B4E1A4',
          400: '#8CD076',
          500: '#5FC24D',
          600: '#48A638',
          700: '#3A8630',
          800: '#326C2C',
          900: '#2A5827',
        },
        ink: '#263323',
        muted: '#8B9986',
        cream: '#F5F9F1',
      },
      boxShadow: {
        soft: '0 6px 24px rgba(78, 140, 60, 0.08)',
        card: '0 2px 12px rgba(78, 140, 60, 0.06)',
      },
      fontFamily: {
        sans: [
          '-apple-system',
          'BlinkMacSystemFont',
          '"PingFang SC"',
          '"Hiragino Sans GB"',
          '"Microsoft YaHei"',
          '"Noto Sans SC"',
          'sans-serif',
        ],
      },
    },
  },
  plugins: [],
};
