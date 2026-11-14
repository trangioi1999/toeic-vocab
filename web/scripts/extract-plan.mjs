// Extract the DAYS array from ../lo-trinh.html into src/data/plan-days.json.
import fs from 'node:fs';
const html = fs.readFileSync(new URL('../../lo-trinh.html', import.meta.url), 'utf8');
const m = html.match(/const DAYS = (\[.*?\]);\n/s);
if (!m) throw new Error('DAYS not found in lo-trinh.html');
const days = JSON.parse(m[1]);
fs.writeFileSync(new URL('../src/data/plan-days.json', import.meta.url), JSON.stringify(days, null, 1) + '\n');
console.log(`wrote ${days.length} days`);
