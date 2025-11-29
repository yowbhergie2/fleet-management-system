import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Read the logo files
const dpwhLogoPath = path.join(__dirname, '../img/DPWH_Logo.jpg');
const bagonPilipinasLogoPath = path.join(__dirname, '../img/Bagong Pilipinas Logo.webp');

// Convert to base64
const dpwhBase64 = fs.readFileSync(dpwhLogoPath).toString('base64');
const bagonPilipinasBase64 = fs.readFileSync(bagonPilipinasLogoPath).toString('base64');

// Output the base64 strings with data URI prefix
console.log('DPWH Logo (JPEG):');
console.log(`data:image/jpeg;base64,${dpwhBase64}`);
console.log('\n');
console.log('Bagong Pilipinas Logo (WEBP):');
console.log(`data:image/webp;base64,${bagonPilipinasBase64}`);
console.log('\n');
console.log('Note: For better PDF compatibility, consider converting these to PNG format.');
console.log('WEBP format may not be supported in all PDF viewers.');
