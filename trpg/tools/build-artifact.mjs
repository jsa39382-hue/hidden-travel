// 한 장짜리 HTML로 묶는다 (three.js는 CDN에서 불러옴). 실행: node trpg/tools/build-artifact.mjs <출력파일>
import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const out = process.argv[2] || path.join(root, 'dist', 'index.html');
const js = execSync(`npx -y esbuild@0.24.0 ${path.join(root, 'src/main.js')} --bundle --format=esm --external:three --minify --log-level=warning`, { maxBuffer: 1 << 26 }).toString();
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const css = fs.readFileSync(path.join(root, 'style.css'), 'utf8');
const body = html.split('<!--BODY-->')[1].split('<!--/BODY-->')[0];
const fonts = html.match(/<link rel="stylesheet" href="https:\/\/fonts[^>]+>/)[0];
const importmap = html.match(/<script type="importmap">[\s\S]*?<\/script>/)[0];
const page = `<title>잿빛 왕관</title>\n${fonts}\n<style>\n${css}\n</style>\n${importmap}\n${body}\n<script type="module">\n${js.replace(/<\/script/g, '<\\/script')}\n</script>\n`;
fs.mkdirSync(path.dirname(out), { recursive: true });
fs.writeFileSync(out, page);
console.log('wrote', out, Math.round(page.length / 1024) + 'KB');
