const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

async function createIcons() {
  const svgPath = path.join(__dirname, '../app/icons/icon.svg');
  const assetsDir = path.join(__dirname, 'assets');

  // Create a simple icon if SVG doesn't exist
  const svgContent = fs.existsSync(svgPath) 
    ? fs.readFileSync(svgPath, 'utf8')
    : `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">
  <rect width="512" height="512" fill="#000"/>
  <rect x="96" y="256" width="32" height="32" fill="#14F195" rx="4"/>
  <rect x="128" y="256" width="32" height="32" fill="#14F195" rx="4"/>
  <rect x="160" y="256" width="32" height="32" fill="#14F195" rx="4"/>
  <rect x="192" y="256" width="32" height="32" fill="#14F195" rx="4"/>
  <rect x="224" y="256" width="32" height="32" fill="#14F195" rx="4"/>
  <rect x="256" y="256" width="32" height="32" fill="#0eb876" rx="4"/>
  <rect x="288" y="256" width="32" height="32" fill="#14F195" rx="4"/>
  <rect x="320" y="256" width="32" height="32" fill="#14F195" rx="4"/>
  <rect x="352" y="256" width="32" height="32" fill="#14F195" rx="4"/>
  <rect x="384" y="256" width="32" height="32" fill="#14F195" rx="4"/>
</svg>`;

  try {
    // Create icon.png (1024x1024)
    await sharp(Buffer.from(svgContent))
      .resize(1024, 1024)
      .png()
      .toFile(path.join(assetsDir, 'icon.png'));

    // Create adaptive-icon.png (1024x1024)
    await sharp(Buffer.from(svgContent))
      .resize(1024, 1024)
      .png()
      .toFile(path.join(assetsDir, 'adaptive-icon.png'));

    // Create splash.png (1284x2778 for Android)
    await sharp(Buffer.from(svgContent))
      .resize(1284, 1284)
      .extend({
        top: 0,
        bottom: 1494,
        left: 0,
        right: 0,
        background: { r: 0, g: 0, b: 0 }
      })
      .png()
      .toFile(path.join(assetsDir, 'splash.png'));

    console.log('✅ Icons created successfully');
  } catch (error) {
    console.error('Error creating icons:', error);
    process.exit(1);
  }
}

createIcons();
