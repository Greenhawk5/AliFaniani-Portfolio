// One-off font self-hosting helper — downloads the latin-subset woff2 files
// from Google Fonts and emits local @font-face rules for index.css.
// Usage: node scripts/self-host-fonts.mjs
import { writeFile } from 'node:fs/promises'

const CSS_URL =
  'https://fonts.googleapis.com/css2?family=Inter:opsz,wght@14..32,300..800&family=JetBrains+Mono:wght@400;600&display=swap'
const UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0 Safari/537.36'

const css = await (await fetch(CSS_URL, { headers: { 'User-Agent': UA } })).text()

// Split into "/* subset */ @font-face {...}" blocks.
const blocks = [...css.matchAll(/\/\*\s*([\w-]+)\s*\*\/\s*(@font-face\s*\{[^}]+\})/g)]
const latinBlocks = blocks.filter(([, subset]) => subset === 'latin').map(([, block]) => block)

const faces = []
let emitted = ''
for (const [, subset, block] of blocks) {
  if (subset !== 'latin') continue
  console.log('--- block head:', JSON.stringify(block.slice(0, 120)))
  const family = block.match(/font-family:\s*'([^']+)'/)?.[1]
  const weight = block.match(/font-weight:\s*([\d ]+);/)?.[1]
  const url = block.match(/url\((https:[^)]+)\)/)?.[1]
  const unicodeRange = block.match(/unicode-range:\s*([^;]+);/)?.[1]
  if (!family || !weight || !url || !unicodeRange) {
    console.log('  skip unparseable block')
    continue
  }
  const fileName =
    `${family.toLowerCase().replace(/\s+/g, '-')}-latin-${weight.replace(' ', '-')}.woff2`
      .replace('300-800', 'var')
  const buf = Buffer.from(await (await fetch(url)).arrayBuffer())
  await writeFile(`public/fonts/${fileName}`, buf)
  emitted += `/* ${family} ${weight} — latin subset, self-hosted (was fonts.gstatic.com) */
@font-face {
  font-family: '${family}';
  font-style: normal;
  font-weight: ${weight};
  font-display: swap;
  src: url('/fonts/${fileName}') format('woff2');
  unicode-range: ${unicodeRange};
}
`
  faces.push(`${fileName}: ${Math.round(buf.length / 1024)} KB`)
}
await writeFile('src/styles/font-faces.css', emitted)
console.log(faces.join('\n'))
console.log('emitted src/styles/font-faces.css')
