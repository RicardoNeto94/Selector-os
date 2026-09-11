// Download only the public marketing fonts; no changes to guest-app fonts.
const fs = require('node:fs/promises');
async function main() {
  const css = await fetch('https://fonts.googleapis.com/css2?family=Manrope:wght@300;400;500;600&family=Tenor+Sans&display=swap', { headers: { 'User-Agent': 'Mozilla/5.0 AppleWebKit/537.36 Chrome/130.0.0.0 Safari/537.36' } }).then(r => { if(!r.ok) throw new Error('Font stylesheet unavailable'); return r.text(); });
  for (const [family, slug, license] of [['Manrope','manrope','manrope'],['Tenor Sans','tenor-sans','tenorsans']]) {
    const face = [...css.matchAll(/\/\* latin \*\/[\s\S]*?\}/g)].map(m=>m[0]).find(block=>block.includes(`font-family: '${family}'`));
    const url = face?.match(/url\((https:[^)]+)\)/)?.[1];
    if (!url) throw new Error('Latin font not found: '+family);
    const font = await fetch(url); if (!font.ok) throw new Error('Font unavailable');
    await fs.writeFile(`public/marketing/${slug}.woff2`, Buffer.from(await font.arrayBuffer()));
    const ofl = await fetch(`https://raw.githubusercontent.com/google/fonts/main/ofl/${license}/OFL.txt`); if(!ofl.ok) throw new Error('Font license unavailable');
    await fs.writeFile(`public/marketing/${slug}-OFL.txt`, await ofl.text());
    console.log('Cached',family);
  }
}
main().catch(e=>{console.error(e.message);process.exitCode=1;});
