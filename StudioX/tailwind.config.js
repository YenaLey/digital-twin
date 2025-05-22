/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{js,ts,jsx,tsx}", // ✅ src 아래 모든 코드 포함
    "./app/**/*.{js,ts,jsx,tsx}", // ✅ app 디렉토리 사용 시
    "./pages/**/*.{js,ts,jsx,tsx}", // ✅ pages 디렉토리 사용 시
  ],
  darkMode: "class",
  theme: {
    extend: {},
  },
  plugins: [],
};
