import fs from 'fs';

const html = fs.readFileSync('_stitch_reference/stitch_prosa_gamified_language_platform/trilha_de_aventura_prosa/code.html', 'utf8');

const gridIdx = html.indexOf('grid grid-cols-1 lg:grid-cols-12');
if (gridIdx !== -1) {
  const rest = html.slice(gridIdx);
  // find closing tag or split by lg:col-span
  const parts = rest.split(/class=["']lg:col-span-/);
  console.log('Parts count:', parts.length);
  parts.forEach((p, idx) => {
    console.log(`Part ${idx} (first 300 chars):`, p.slice(0, 300).replace(/\n/g, ' '));
  });
}
