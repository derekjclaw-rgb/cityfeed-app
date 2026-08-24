/* One-off: convert CF lettermark JPG (white bg) → transparent favicon set. */
const sharp = require('sharp')
const path = require('path')

const SRC = '/Users/michaeld/.openclaw/workspace/assets/cf-favicon-source.jpg'
const PUB = path.join(__dirname, '..', 'public')

async function main() {
  const { data, info } = await sharp(SRC).ensureAlpha().raw().toBuffer({ resolveWithObject: true })
  // White → transparent (keep cream letters + black outlines)
  for (let i = 0; i < data.length; i += 4) {
    const r = data[i], g = data[i + 1], b = data[i + 2]
    if (r > 245 && g > 245 && b > 245) data[i + 3] = 0
  }
  const base = sharp(data, { raw: { width: info.width, height: info.height, channels: 4 } })

  // Trim transparent padding so the mark fills the icon box
  const trimmed = await base.png().toBuffer()
  const mark = sharp(trimmed).trim()

  const buf = await mark.png().toBuffer()

  const out = async (size, file, bg) => {
    let img = sharp(buf).resize(size, size, { fit: 'contain', background: bg || { r: 0, g: 0, b: 0, alpha: 0 } })
    if (bg) img = img.flatten({ background: bg })
    await img.png().toFile(path.join(PUB, file))
    console.log('wrote', file)
  }

  await out(16, 'favicon-16.png')
  await out(32, 'favicon-32.png')
  await out(500, 'favicon.png')
  await out(500, 'C.png')
  // apple-touch: iOS fills transparency with BLACK — use cream brand bg instead
  await out(180, 'apple-touch-icon.png', { r: 240, g: 240, b: 236 })
}

main().catch(e => { console.error(e); process.exit(1) })
