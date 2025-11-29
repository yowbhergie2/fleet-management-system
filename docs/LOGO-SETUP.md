# Logo Setup for PDF Generator

## Current Status
✅ DPWH Logo - JPEG format (supported)
⚠️ Bagong Pilipinas Logo - WEBP format (may not be supported by jsPDF)

## Issue
jsPDF may not support WEBP image format. If the Bagong Pilipinas logo doesn't appear in the PDF, you need to convert it to PNG or JPEG.

## Solution

### Option 1: Convert to PNG using online tool
1. Go to https://convertio.co/webp-png/
2. Upload `img/Bagong Pilipinas Logo.webp`
3. Download the converted PNG file
4. Rename it to `Bagong Pilipinas Logo.png`
5. Replace the WEBP file in `/img` folder
6. Run the script again:
   ```bash
   node scripts/generate-logo-constants.js
   ```

### Option 2: Use image editing software
1. Open `img/Bagong Pilipinas Logo.webp` in GIMP, Photoshop, or any image editor
2. Export/Save as PNG format
3. Save as `Bagong Pilipinas Logo.png` in the `/img` folder
4. Run: `node scripts/generate-logo-constants.js`

### Option 3: Keep both formats
Keep the WEBP for web use, but add a PNG version for PDF:
1. Convert WEBP to PNG (using Option 1 or 2)
2. Save as `Bagong Pilipinas Logo.png` alongside the WEBP
3. Update `scripts/generate-logo-constants.js` to use the PNG version

## Recommended Image Specs
- Format: PNG or JPEG
- Size: 400x400 pixels minimum
- DPI: 300 for print quality
- File size: < 200KB recommended

## Regenerating Logo Constants
After changing the logo files, run:
```bash
npm run generate-logos
```

Or manually:
```bash
node scripts/generate-logo-constants.js
```

This will update `src/lib/logo-constants.ts` with the new base64 encoded images.
