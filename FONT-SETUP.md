# Font Setup for PDF Generator

## Current Status
✅ Tahoma Regular font successfully integrated
✅ Tahoma Bold font successfully integrated
✅ Both normal and bold text styles use actual Tahoma fonts throughout the entire document

## How It Works

1. **Font Files**:
   - `Tahoma.ttf` (Regular) - located in the project root
   - `tahomabd.ttf` (Bold) - located in the project root
2. **Base64 Conversion**: Both fonts are converted to base64 and stored in `src/lib/font-constants.ts`
3. **PDF Integration**:
   - Both font files are registered in jsPDF's virtual file system
   - Normal text uses `Tahoma.ttf` (regular weight)
   - Bold text uses `TahomaBold.ttf` (actual bold font, not simulated)
   - Tahoma is set as the default font for all text throughout the PDF

## Regenerating Font Constants

If you change or update the Tahoma.ttf file, run:

```bash
npm run generate-fonts
```

Or manually:
```bash
node scripts/generate-font-constants.js
```

This will update `src/lib/font-constants.ts` with the new base64 encoded font.

## Font Usage in PDF

The Tahoma font is used throughout the entire document:
- **Header**: Republic of the Philippines, DPWH, Regional Office II
- **Title**: Driver's Trip Ticket
- **Body Text**: All fields, labels, and values
- **Signatures**: Driver and passenger signatures
- **Multiline Text**: Passengers, purposes, etc.

All font calls use `doc.setFont('Tahoma', 'normal')` or `doc.setFont('Tahoma', 'bold')` for consistent typography.

## Technical Details

- Font file size: ~909 KB
- Base64 encoded size: stored in memory during PDF generation
- Supports: normal and bold weights
- Fallback: If font loading fails, jsPDF will use default font
