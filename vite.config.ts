import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig } from 'vite'

// GitHub Pages는 https://<아이디>.github.io/<저장소명>/ 경로에서 열리므로 빌드 때만 base를 저장소명으로 둔다.
// 다른 경로에 배포할 때는 BASE_PATH 환경 변수로 바꿀 수 있다.
export default defineConfig(({ command }) => ({
  base: command === 'build' ? (process.env.BASE_PATH ?? '/hidden-travel/') : '/',
  plugins: [react(), tailwindcss()],
}))
