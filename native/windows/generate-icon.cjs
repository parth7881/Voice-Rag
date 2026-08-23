const fs = require('fs');
const path = require('path');
const sharp = require('sharp');
const pngToIco = require('png-to-ico');

async function main() {
  const source = path.resolve(__dirname, '../../public/app-icon.svg');
  const buildDir = path.resolve(__dirname, 'build');
  fs.mkdirSync(buildDir, { recursive: true });

  const sizes = [16, 24, 32, 48, 64, 128, 256];
  const pngFiles = [];

  for (const size of sizes) {
    const output = path.join(buildDir, `icon-${size}.png`);
    await sharp(source)
      .resize(size, size, { fit: 'contain' })
      .png()
      .toFile(output);
    pngFiles.push(output);
  }

  const ico = await pngToIco(pngFiles);
  fs.writeFileSync(path.join(buildDir, 'icon.ico'), ico);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
