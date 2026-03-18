/** @type {import('tailwindcss').Config} *//** @type {import('tailwindcss').Config} */
import typography from '@tailwindcss/typography'; // 注意这里引入方式

export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  // 👇 重点在这里：v4 必须用 'selector'
  darkMode: 'selector', 
  theme: {
    extend: {},
  },
  plugins: [
    // 确保你的排版插件在这里
    require('@tailwindcss/typography'),
  ],
}