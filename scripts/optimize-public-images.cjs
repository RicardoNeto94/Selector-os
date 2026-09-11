const sharp = require('sharp');
const { mkdir, stat } = require('node:fs/promises');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const assets = [
  ['vaxeron/hospitality-arrival.png', 'arrival'],
  ['vaxeron/sommelier-service.png', 'sommelier'],
  ['vaxeron/evening-service.png', 'evening'],
  ['vaxeron/burman-ipad-final.png', 'room-experience'],
  ['vaxeron/koyo-ipad-service.png', 'wine-experience'],
  ['platform/dashboard-overview.png', 'wine-workspace'],
  ['platform/stock-control.png', 'stock-control'],
  ['platform/venue-inventory.png', 'venue-inventory'],
];
(async () => {
  await mkdir(path.join(root, 'public/marketing'), { recursive: true });
  let before = 0, after = 0;
  for (const [file, name] of assets) {
    const input = path.join(root, 'public', file);
    const output = path.join(root, 'public/marketing', `${name}.webp`);
    await sharp(input).resize({ width: 1600, withoutEnlargement: true }).webp({ quality: 80 }).toFile(output);
    await sharp(input).resize({ width: 800, withoutEnlargement: true }).webp({ quality: 78 }).toFile(path.join(root, 'public/marketing', `${name}-small.webp`));
    before += (await stat(input)).size;
    after += (await stat(output)).size;
  }
  console.log(JSON.stringify({ originalBytes: before, optimizedBytes: after, reductionPercent: Math.round((1-after/before)*100) }));
})();
