import jsPDF from 'jspdf';
import type { TripTicketFormData } from '@/types';
import { DPWH_LOGO_BASE64, BAGONG_PILIPINAS_LOGO_BASE64 } from './logo-constants';
import { TAHOMA_FONT_BASE64, TAHOMA_BOLD_FONT_BASE64 } from './font-constants';

const monthNames = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

function formatPeriodDates(periodFrom?: string | Date, periodTo?: string | Date) {
  if (!periodFrom || !periodTo) return '_______________________________';
  try {
    const dateFrom = new Date(periodFrom);
    const dateTo = new Date(periodTo);

    const monthFrom = monthNames[dateFrom.getMonth()];
    const monthTo = monthNames[dateTo.getMonth()];
    const dayFrom = dateFrom.getDate();
    const dayTo = dateTo.getDate();
    const yearFrom = dateFrom.getFullYear();
    const yearTo = dateTo.getFullYear();

    if (monthFrom === monthTo && yearFrom === yearTo) {
      if (dayFrom === dayTo) return `${monthFrom} ${dayFrom}, ${yearFrom}`.toUpperCase();
      return `${monthFrom} ${dayFrom}-${dayTo}, ${yearFrom}`.toUpperCase();
    }
    return `${monthFrom} ${dayFrom}, ${yearFrom} - ${monthTo} ${dayTo}, ${yearTo}`.toUpperCase();
  } catch {
    return `${periodFrom} - ${periodTo}`.toUpperCase();
  }
}

type RenderPdfParams = {
  data: TripTicketFormData & {
    driverName?: string;
    vehicleDpwhNo?: string;
    plateNumber?: string;
    createdAt?: any;
  };
  controlNumber?: string;
};

function renderDttPdf({ data, controlNumber }: RenderPdfParams) {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });

  // Add Tahoma fonts to the PDF
  try {
    // Add the Tahoma font files to the virtual file system
    doc.addFileToVFS('Tahoma.ttf', TAHOMA_FONT_BASE64);
    doc.addFileToVFS('TahomaBold.ttf', TAHOMA_BOLD_FONT_BASE64);

    // Register both normal and bold fonts with their actual font files
    doc.addFont('Tahoma.ttf', 'Tahoma', 'normal');
    doc.addFont('TahomaBold.ttf', 'Tahoma', 'bold');

    // Set Tahoma as the default font
    doc.setFont('Tahoma', 'normal');
  } catch (e) {
    console.warn('Failed to load Tahoma fonts, falling back to default:', e);
    // Fallback to default font if Tahoma fails to load
  }

  const pageWidth = doc.internal.pageSize.getWidth();

  const topMargin = 12.7;
  const sideLogoMargin = 15;
  const logoWidth = 25;
  const logoHeight = 25;
  const leftLogoX = sideLogoMargin;
  const rightLogoX = pageWidth - sideLogoMargin - logoWidth;
  const rightColumnX = rightLogoX + logoWidth;
  let yPos = topMargin;

  doc.setFontSize(9);
  doc.setFont('Tahoma', 'normal');
  doc.text('Republic of the Philippines', 105, yPos, { align: 'center' });
  yPos += 4;

  doc.setFontSize(11);
  doc.setFont('Tahoma', 'normal');
  doc.text('DEPARTMENT OF PUBLIC WORKS AND HIGHWAYS', 105, yPos, { align: 'center' });
  yPos += 4;

  doc.setFontSize(11);
  doc.setFont('Tahoma', 'bold');
  doc.text('REGIONAL OFFICE II', 105, yPos, { align: 'center' });
  yPos += 3;

  doc.setFontSize(9);
  doc.setFont('Tahoma', 'normal');
  doc.text(
    'Dalan na Pavvurulun, Regional Government Center, Carig Sur, Tuguegarao City, Cagayan',
    105,
    yPos,
    { align: 'center' }
  );
  const headerBottomY = yPos;
  const headerContentCenterY = topMargin + (headerBottomY - topMargin) / 2;
  const logoYPos = headerContentCenterY - logoHeight / 2;

  try {
    if (DPWH_LOGO_BASE64) {
      doc.addImage(DPWH_LOGO_BASE64, 'JPEG', leftLogoX, logoYPos, logoWidth, logoHeight);
    }
    if (BAGONG_PILIPINAS_LOGO_BASE64) {
      // Note: jsPDF may not support WEBP format directly, it will try to render it
      doc.addImage(BAGONG_PILIPINAS_LOGO_BASE64, 'WEBP', rightLogoX, logoYPos, logoWidth, logoHeight);
    }
  } catch (e) {
    console.warn('Logo loading failed:', e);
  }

  yPos += 8;

  doc.setFontSize(14);
  doc.setFont('Tahoma', 'bold');
  doc.text("DRIVER'S TRIP TICKET", 105, yPos, { align: 'center' });
  yPos += 10;

  doc.setFontSize(10);
  doc.setFont('Tahoma', 'bold');
  const dateStr = data.createdAt
    ? data.createdAt.toDate
      ? data.createdAt.toDate().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
      : new Date(data.createdAt).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
    : new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
  doc.text(dateStr, rightColumnX, yPos, { align: 'right' });
  yPos += 4;

  doc.setFont('Tahoma', 'normal');
  doc.setFontSize(9);
  doc.text('(Date)', rightColumnX, yPos, { align: 'right' });
  yPos += 4;

  doc.setTextColor(0, 128, 0);
  doc.setFont('Tahoma', 'bold');
  doc.text(`Control No.: ${controlNumber || '_________________'}`, rightColumnX, yPos, { align: 'right' });
  doc.setTextColor(0, 0, 0);
  yPos += 8;

  doc.setFontSize(10);
  doc.setFont('Tahoma', 'normal');

  const leftMargin = leftLogoX;
  const colonPos = 80;
  const valuePos = 85;
  const underlineWidth = 110;
  const bodyFontSize = 10;
  doc.setFontSize(bodyFontSize);

  const centerX = valuePos + underlineWidth / 2;

  // Word-aware text splitting to avoid breaking words in the middle
  const splitTextByWords = (text: string, maxWidth: number): string[] => {
    const words = text.split(' ');
    const lines: string[] = [];
    let currentLine = '';

    words.forEach((word) => {
      const testLine = currentLine ? `${currentLine} ${word}` : word;
      const testWidth = doc.getTextWidth(testLine);

      if (testWidth > maxWidth && currentLine) {
        // Current line is full, push it and start new line with current word
        lines.push(currentLine);
        currentLine = word;
      } else {
        // Word fits, add it to current line
        currentLine = testLine;
      }
    });

    // Push the last line if it has content
    if (currentLine) {
      lines.push(currentLine);
    }

    return lines.length > 0 ? lines : [' '];
  };

  const renderMultilineValue = (
    lines: string[],
    gapAfter: number = 1,
    align: 'left' | 'center' | 'justify' = 'left',
    bold: boolean = false
  ) => {
    // Tighter line spacing - use 4.5mm between lines
    const lineHeight = 4.5;
    const safeLines = lines.length > 0 ? lines : [' '];
    safeLines.forEach((line, index) => {
      doc.setFont('Tahoma', bold ? 'bold' : 'normal');
      const anchorX = align === 'center' ? centerX : valuePos;
      const isLastLine = index === safeLines.length - 1;

      // For justified text, the last line should be left-aligned
      const lineAlign = align === 'justify' && isLastLine ? 'left' : align;

      const opts =
        lineAlign === 'left'
          ? undefined
          : {
              align: lineAlign === 'center' ? 'center' : 'justify',
              maxWidth: underlineWidth,
            };
      doc.text(line, anchorX, yPos, opts as any);
      doc.setFont('Tahoma', 'normal');
      // Position underline below the text (baseline + 0.5mm offset for proper spacing)
      doc.line(valuePos, yPos + 0.5, valuePos + underlineWidth, yPos + 0.5);
      yPos += lineHeight;
    });
    yPos += gapAfter;
  };

  const addLabeledLine = (label: string, value: string, boldValue: boolean = false) => {
    doc.setFont('Tahoma', 'normal');
    doc.text(label, leftMargin, yPos);
    doc.text(':', colonPos, yPos);
    doc.setFont('Tahoma', boldValue ? 'bold' : 'normal');
    doc.text(value, valuePos, yPos);
    doc.setFont('Tahoma', 'normal');
    // Position underline below the text (baseline + 0.5mm offset for proper spacing)
    doc.line(valuePos, yPos + 0.5, valuePos + underlineWidth, yPos + 0.5);
    yPos += 5; // slightly tighter spacing between single-line rows
  };

  const driverName = data.driverName || '';
  addLabeledLine('1.  Name of Driver', driverName.toUpperCase(), true);

  // Display DPWH number as primary identifier, fallback to plate number if not available
  const vehicle = (data as any).vehicleDpwhNo || (data as any).dpwhNumber || (data as any).plateNumber || '';
  addLabeledLine("2.  Gov't. Vehicle to be used", vehicle.toUpperCase());

  doc.setFont('Tahoma', 'normal');
  doc.text('3.  Name of authorized passenger/s', leftMargin, yPos);
  doc.text(':', colonPos, yPos);
  const passengersArray =
    (data as any).passengers ||
    (data.authorizedPassengers || []).map((p) => (typeof p === 'string' ? p : p?.name || '')).filter(Boolean);
  const passengersText = passengersArray.length > 0 ? passengersArray.join(', ').toUpperCase() : '';
  const passengerLines = splitTextByWords(passengersText || ' ', underlineWidth);
  renderMultilineValue(passengerLines, 1, 'left', false);

  addLabeledLine('4.  Places to be visited/inspected', (data.destination || '').toUpperCase());

  const period = formatPeriodDates((data as any).periodCoveredFrom || (data as any).periodFrom, (data as any).periodCoveredTo || (data as any).periodTo);
  addLabeledLine('5.  Period Covered', period);

  doc.setFont('Tahoma', 'normal');
  doc.text('6.  Purpose', leftMargin, yPos);
  doc.text(':', colonPos, yPos);
  const purposes = data.purposes && data.purposes.length > 0 ? data.purposes.join(', ') : '';
  const purposeLength = (purposes || '').length;
  const purposeFontSize = purposeLength > 450 ? 8 : purposeLength > 250 ? 9 : bodyFontSize;
  doc.setFontSize(purposeFontSize);
  // Use word-aware splitting to prevent breaking words in the middle
  const purposeLines = splitTextByWords(purposes || ' ', underlineWidth);
  // Use justify alignment with last line left-aligned for professional appearance
  renderMultilineValue(purposeLines, 3, 'justify', false);
  doc.setFontSize(bodyFontSize);

  yPos += 3;
  doc.setFont('Tahoma', 'normal');
  doc.text('Recommending Approval:', leftMargin, yPos);
  doc.text('Approved:', 115, yPos);

  const approvalLineSpacing = 4;
  let leftApprovalY = yPos;
  let rightApprovalY = yPos;
  const authorityPrefixValue = (data as any).authorityPrefix?.trim();
  const hasAuthorityPrefix = authorityPrefixValue && authorityPrefixValue.toLowerCase() !== 'none';

  leftApprovalY += approvalLineSpacing * (hasAuthorityPrefix ? 4 : 3);

  if (hasAuthorityPrefix) {
    rightApprovalY += approvalLineSpacing;
    doc.text(authorityPrefixValue, 115, rightApprovalY);
    rightApprovalY += approvalLineSpacing * 3;
  } else {
    rightApprovalY += approvalLineSpacing * 3;
  }

  const renderSignatoryBlock = (x: number, y: number, name: string, position: string, lineGap: number) => {
    const lines = (position || '')
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter(Boolean);

    doc.setFont('Tahoma', 'bold');
    doc.text((name || '').toUpperCase(), x, y, { align: 'left' });
    doc.setFont('Tahoma', 'normal');

    let cursorY = y + lineGap;
    lines.forEach((line) => {
      doc.text(line, x, cursorY, { align: 'left' });
      cursorY += lineGap;
    });

    return cursorY;
  };

  const recommendingOfficer = (data as any).recommendingOfficerName || '';
  const recommendingPosition = (data as any).recommendingOfficerPosition || '';
  const approvingAuthorityName = (data as any).approvingAuthorityName || '';
  const approvingAuthorityPosition = (data as any).approvingAuthorityPosition || '';

  const leftEndY = renderSignatoryBlock(leftMargin, leftApprovalY, recommendingOfficer, recommendingPosition, approvalLineSpacing);
  const rightEndY = renderSignatoryBlock(115, rightApprovalY, approvingAuthorityName, approvingAuthorityPosition, approvalLineSpacing);
  leftApprovalY = leftEndY;
  rightApprovalY = rightEndY;

  yPos = Math.max(leftApprovalY, rightApprovalY) + 10;

  const driverSectionOffset = 12;
  const driverSectionIndent = leftMargin + driverSectionOffset;
  doc.text('To be filled out by Driver:', driverSectionIndent, yPos);
  yPos += 5;

  const driverColonPos = driverSectionIndent + 65;
  const fuelIndent = driverSectionIndent + 8;

  const addBlank = (label: string) => {
    doc.text(label, driverSectionIndent, yPos);
    doc.text(':', driverColonPos, yPos);
    doc.text('____________________ AM/PM', driverColonPos + 5, yPos);
    yPos += 5;
  };

  addBlank('1.  Time of departure from office/garage');
  addBlank('2.  Time of arrival at (No. 4 above)');
  addBlank('3.  Time of arrival from (No. 4 above)');
  addBlank('4.  Time of arrival back to office/garage');

  doc.text('5.  Approximate distance traveled', driverSectionIndent, yPos);
  doc.text(':', driverColonPos, yPos);
  doc.text('____________________ kms.', driverColonPos + 5, yPos);
  yPos += 5;

  doc.text('6.  Gasoline issued, purchased and consumed', driverSectionIndent, yPos);
  yPos += 5;

  const fuelLine = (label: string) => {
    doc.text(label, fuelIndent, yPos);
    doc.text(':', driverColonPos, yPos);
    doc.text('____________________ liters', driverColonPos + 5, yPos);
    yPos += 5;
  };

  fuelLine('a.  Balance in tank');
  fuelLine('b.  Issued by office from stock');
  fuelLine('c.  ADD: Purchased during the trip');

  doc.text('TOTAL', fuelIndent + 30, yPos);
  doc.text(':', driverColonPos, yPos);
  doc.text('____________________ liters', driverColonPos + 5, yPos);
  yPos += 5;

  fuelLine('d)  DEDUCT: Used during the trip');
  fuelLine('e)  Balance in tank at the end of trip');

  fuelLine('7.  Motor oil issued');
  fuelLine('8.  Lubricating oil issued');
  fuelLine('9.  Grease issued');
  fuelLine('10. Brake Fluid');

  doc.text('11. Speedometer reading (if any)', driverSectionIndent, yPos);
  yPos += 5;

  const odoLine = (label: string) => {
    doc.text(label, fuelIndent, yPos);
    doc.text(':', driverColonPos, yPos);
    doc.text('____________________ kms.', driverColonPos + 5, yPos);
    yPos += 5;
  };

  odoLine('a.  At the end of a trip');
  odoLine('b.  At the beginning of a trip');
  odoLine('c.  Distance traveled');
  yPos += 8;

  doc.text('I HEREBY CERTIFY the correctness of the above statement of record of travel.', leftMargin, yPos);
  yPos += 10;

  const signatureRightX = rightColumnX;
  const minSignatureLineWidth = 60;
  const computeSignatureLineWidth = (text: string) => {
    const hasText = text && text.trim() !== '';
    return hasText ? doc.getTextWidth(text) : minSignatureLineWidth;
  };
  const drawSignatureLine = (width: number, y: number) => {
    const startX = signatureRightX - width;
    doc.line(startX, y, signatureRightX, y);
  };

  doc.setFont('Tahoma', 'bold');
  const driverNameForSignature = driverName ? driverName.toUpperCase() : '';
  doc.text(driverNameForSignature, signatureRightX, yPos, { align: 'right' });
  const driverLineWidth = computeSignatureLineWidth(driverNameForSignature);
  yPos += 1;
  doc.setFont('Tahoma', 'normal');
  drawSignatureLine(driverLineWidth, yPos);
  yPos += 4;
  doc.text('Driver', signatureRightX, yPos, { align: 'right' });
  yPos += 8;

  doc.text('I HEREBY CERTIFY that I used this vehicle on official business.', leftMargin, yPos);
  yPos += 10;

  let passengerText = '';
  if (passengersArray && passengersArray.length > 0) {
    passengerText = passengersArray.map((p: string) => p.toUpperCase()).join(' / ');
  }

  doc.setFont('Tahoma', 'bold');
  doc.text(passengerText, signatureRightX, yPos, { align: 'right' });
  const passengerLineWidth = computeSignatureLineWidth(passengerText);
  yPos += 1;
  doc.setFont('Tahoma', 'normal');
  drawSignatureLine(passengerLineWidth, yPos);
  yPos += 4;
  doc.text('Passenger/s', signatureRightX, yPos, { align: 'right' });

  return doc;
}

export function generateTripTicketPDF(data: TripTicketFormData, serialNumber: string = 'DTT-XXXX-XXXX', driverName: string = 'Driver Name') {
  const pdf = renderDttPdf({ data: { ...data, driverName }, controlNumber: serialNumber });
  const filename = `TripTicket_${serialNumber.replace(/\//g, '-')}_${new Date().toISOString().split('T')[0]}.pdf`;
  pdf.save(filename);
}

export function previewTripTicketPDF(data: TripTicketFormData, serialNumber: string = 'DTT-XXXX-XXXX', driverName: string = 'Driver Name') {
  const pdf = renderDttPdf({ data: { ...data, driverName }, controlNumber: serialNumber });
  const pdfBlob = pdf.output('blob');
  const pdfUrl = URL.createObjectURL(pdfBlob);
  window.open(pdfUrl, '_blank');
}
