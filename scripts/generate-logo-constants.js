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

// Generate TypeScript file content
const tsContent = `// Auto-generated file - Do not edit manually
// Generated from logo images in /img folder

export const DPWH_LOGO_BASE64 = 'data:image/jpeg;base64,${dpwhBase64}';

export const BAGONG_PILIPINAS_LOGO_BASE64 = 'data:image/webp;base64,${bagonPilipinasBase64}';
`;

// Write to TypeScript file
const outputPath = path.join(__dirname, '../src/lib/logo-constants.ts');
fs.writeFileSync(outputPath, tsContent);

console.log('✓ Logo constants generated successfully!');
console.log('  File: src/lib/logo-constants.ts');
console.log(`  DPWH Logo size: ${Math.round(dpwhBase64.length / 1024)} KB`);
console.log(`  Bagong Pilipinas Logo size: ${Math.round(bagonPilipinasBase64.length / 1024)} KB`);
