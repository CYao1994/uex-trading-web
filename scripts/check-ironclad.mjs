import fs from 'fs';

const content = fs.readFileSync('cloud-functions/backend/services/warbond_scraper.py', 'utf-8');

// Check Ironclad entries
console.log('=== Ironclad in SHIP_MEDIA_SLUG ===');
const mediaSection = content.substring(content.indexOf('SHIP_MEDIA_SLUG = {'), content.indexOf('}', content.indexOf('SHIP_MEDIA_SLUG = {')) + 1);
const ironcladMedia = mediaSection.split('\n').filter(l => l.includes('Ironclad'));
ironcladMedia.forEach(l => console.log('  ' + l.trim()));

console.log('\n=== Ironclad in SHIP_NAME_ZH ===');
const nameZhSection = content.substring(content.indexOf('SHIP_NAME_ZH = {'), content.indexOf('}', content.indexOf('SHIP_NAME_ZH = {')) + 1);
const ironcladName = nameZhSection.split('\n').filter(l => l.includes('Ironclad'));
ironcladName.forEach(l => console.log('  ' + l.trim()));

console.log('\n=== Ironclad in _SHIP_NAME_ALIASES ===');
const aliasSection = content.substring(content.indexOf('_SHIP_NAME_ALIASES = {'), content.indexOf('}', content.indexOf('_SHIP_NAME_ALIASES = {')) + 1);
const ironcladAlias = aliasSection.split('\n').filter(l => l.includes('Ironclad'));
ironcladAlias.forEach(l => console.log('  ' + l.trim()));
