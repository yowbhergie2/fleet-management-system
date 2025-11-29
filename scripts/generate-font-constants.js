import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Read the Tahoma font files
const tahomaFontPath = path.join(__dirname, '../Tahoma.ttf');
const tahomaBoldFontPath = path.join(__dirname, '../tahomabd.ttf');

// Convert to base64
const tahomaBase64 = fs.readFileSync(tahomaFontPath).toString('base64');
const tahomaBoldBase64 = fs.readFileSync(tahomaBoldFontPath).toString('base64');

// Generate TypeScript constants file
const tsContent = `// Auto-generated file - Do not edit manually
// Generated from Tahoma.ttf and tahomabd.ttf font files

export const TAHOMA_FONT_BASE64 = '${tahomaBase64}';
export const TAHOMA_BOLD_FONT_BASE64 = '${tahomaBoldBase64}';
`;

const outputPath = path.join(__dirname, '../src/lib/font-constants.ts');
fs.writeFileSync(outputPath, tsContent);

console.log('✓ Font constants generated successfully!');
console.log(`  - Tahoma Regular: ${(tahomaBase64.length / 1024).toFixed(2)} KB`);
console.log(`  - Tahoma Bold: ${(tahomaBoldBase64.length / 1024).toFixed(2)} KB`);
