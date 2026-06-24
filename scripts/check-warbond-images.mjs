import fs from 'fs';

const content = fs.readFileSync('cloud-functions/backend/services/warbond_scraper.py', 'utf-8');

// Extract SHIP_MEDIA_SLUG section
const startIdx = content.indexOf('SHIP_MEDIA_SLUG = {');
const endIdx = content.indexOf('}', startIdx) + 1;
const section = content.substring(startIdx, endIdx);

// Parse entries
const entries = [];
const lines = section.split('\n');
for (const line of lines) {
  const match = line.match(/^\s*"([^"]+)":\s*"([^"]*)"/);
  if (match) {
    entries.push({ name: match[1], slug: match[2] });
  }
}

const withImage = entries.filter(e => e.slug.length > 0);
const withoutImage = entries.filter(e => e.slug.length === 0);

console.log('Total entries:', entries.length);
console.log('With image:', withImage.length);
console.log('Without image:', withoutImage.length);
console.log('');
console.log('Missing images:');
withoutImage.forEach(e => console.log('  -', e.name));
