const fs = require('fs');
const path = require('path');

try {
  const sharp = require('sharp');
  const assetsDir = path.join(__dirname, 'assets');

  if (!fs.existsSync(assetsDir)) {
    fs.mkdirSync(assetsDir, { recursive: true });
  }

  const greenColor = '#1F6B45';
  const svgImage = `<svg width="1024" height="1024" xmlns="http://www.w3.org/2000/svg">
    <rect width="1024" height="1024" fill="${greenColor}"/>
  </svg>`;

  const buffer = Buffer.from(svgImage);

  const files = ['icon.png', 'splash.png', 'adaptive-icon.png', 'notification-icon.png'];

  files.forEach(file => {
    sharp(buffer)
      .png()
      .toFile(path.join(assetsDir, file), (err) => {
        if (err) throw err;
        console.log(`Generated ${file}`);
      });
  });

  console.log('Assets generation initiated');
} catch (err) {
  console.error('Asset generation failed (sharp not installed):', err.message);
  console.log('Please install sharp manually: pnpm add -D sharp');
}
