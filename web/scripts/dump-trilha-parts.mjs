import fs from 'fs';

const html = fs.readFileSync('_stitch_reference/stitch_prosa_gamified_language_platform/trilha_de_aventura_prosa/code.html', 'utf8');

const banner = html.match(/<!-- Top Highlights Banner[\s\S]*?<\/section>/)?.[0] || '';
fs.writeFileSync('mobile/scripts/banner.html', banner);

const trail = html.match(/<!-- Interactive Quest Trail[\s\S]*?<!-- Gamified Sidebar Rail/)?.[0] || '';
fs.writeFileSync('mobile/scripts/trail.html', trail);

const rail = html.match(/<!-- Gamified Sidebar Rail[\s\S]*?<\/aside>/)?.[0] || html.match(/class="lg:col-span-4[\s\S]*?<\/main>/)?.[0] || '';
fs.writeFileSync('mobile/scripts/rail.html', rail);

console.log('Saved banner, trail, rail snippets');

