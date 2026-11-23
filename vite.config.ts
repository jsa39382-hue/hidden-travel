import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { readFileSync } from 'node:fs'
import { createHash } from 'node:crypto'
import { defineConfig, type Plugin } from 'vite'

// 빌드 결과 파일 목록을 서비스 워커에 넣어 dist/sw.js로 내보낸다 (새 패키지 없이 오프라인 지원)
function serviceWorker(): Plugin {
  return {
    name: 'hidden-travel-sw',
    apply: 'build',
    enforce: 'post',
    generateBundle(_, bundle) {
      // 글꼴 조각(.woff2)은 쓰는 것만 그때 받아 저장한다 (sw.js의 fonts 캐시)
      const files = Object.keys(bundle).filter((f) => !f.endsWith('.map') && !f.endsWith('.woff2') && f !== 'sw.js')
      const statics = ['favicon.svg', 'manifest.webmanifest', 'icon-192.png', 'icon-512.png', 'icon-maskable-512.png', 'apple-touch-icon.png']
      const list = ['./', ...new Set([...files, ...statics])]
      const version = createHash('sha256').update(list.join('|')).digest('hex').slice(0, 12)
      const src = readFileSync(new URL('./sw/sw.js', import.meta.url), 'utf8').replace("'__VERSION__'", `'${version}'`).replace('= __PRECACHE__', `= ${JSON.stringify(list)}`)
      this.emitFile({ type: 'asset', fileName: 'sw.js', source: src })
    },
  }
}

// GitHub Pages는 https://<아이디>.github.io/<저장소명>/ 경로에서 열리므로 빌드 때만 base를 저장소명으로 둔다.
// 다른 경로에 배포할 때는 BASE_PATH 환경 변수로 바꿀 수 있다.
export default defineConfig(({ command }) => ({
  base: command === 'build' ? (process.env.BASE_PATH ?? '/hidden-travel/') : '/',
  plugins: [react(), tailwindcss(), serviceWorker()],
  build: {
    rolldownOptions: {
      output: {
        // 잘 안 바뀌는 라이브러리는 따로 묶어, 새 버전을 배포해도 다시 받지 않게 한다
        codeSplitting: {
          groups: [
            { name: 'react', test: /node_modules[\\/](react|react-dom|scheduler)[\\/]/ },
            { name: 'motion', test: /node_modules[\\/](motion|framer-motion|motion-dom|motion-utils|@number-flow|number-flow|esm-env)[\\/]/ },
          ],
        },
      },
    },
  },
}))
