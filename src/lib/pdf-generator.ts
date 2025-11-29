import jsPDF from 'jspdf';
import type { TripTicketFormData } from '@/types';

// Placeholders for logos – replace with real base64 strings when available
const DPWH_LOGO_BASE64 = '';
const BAGONG_PILIPINAS_LOGO_BASE64 = '';

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
  doc.setFont(undefined, 'normal');
  doc.text('Republic of the Philippines', 105, yPos, { align: 'center' });
  yPos += 4;

  doc.setFontSize(11);
  doc.setFont(undefined, 'normal');
  doc.text('DEPARTMENT OF PUBLIC WORKS AND HIGHWAYS', 105, yPos, { align: 'center' });
  yPos += 4;

  doc.setFontSize(11);
  doc.setFont(undefined, 'bold');
  doc.text('REGIONAL OFFICE II', 105, yPos, { align: 'center' });
  yPos += 3;

  doc.setFontSize(9);
  doc.setFont(undefined, 'normal');
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
    if (DPWH_LOGO_BASE64) doc.addImage(DPWH_LOGO_BASE64, 'PNG', leftLogoX, logoYPos, logoWidth, logoHeight);
    if (BAGONG_PILIPINAS_LOGO_BASE64)
      doc.addImage(BAGONG_PILIPINAS_LOGO_BASE64, 'PNG', rightLogoX, logoYPos, logoWidth, logoHeight);
  } catch (e) {
    console.warn('Logo loading failed:', e);
  }

  yPos += 8;

  doc.setFontSize(14);
  doc.setFont(undefined, 'bold');
  doc.text("DRIVER'S TRIP TICKET", 105, yPos, { align: 'center' });
  yPos += 10;

  doc.setFontSize(10);
  doc.setFont(undefined, 'bold');
  const dateStr = data.createdAt
    ? data.createdAt.toDate
      ? data.createdAt.toDate().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
      : new Date(data.createdAt).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
    : new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
  doc.text(dateStr, rightColumnX, yPos, { align: 'right' });
  yPos += 4;

  doc.setFont(undefined, 'normal');
  doc.setFontSize(9);
  doc.text('(Date)', rightColumnX, yPos, { align: 'right' });
  yPos += 4;

  doc.setTextColor(0, 128, 0);
  doc.setFont(undefined, 'bold');
  doc.text(`Control No.: ${controlNumber || '_________________'}`, rightColumnX, yPos, { align: 'right' });
  doc.setTextColor(0, 0, 0);
  yPos += 8;

  doc.setFontSize(10);
  doc.setFont(undefined, 'normal');

  const leftMargin = leftLogoX;
  const colonPos = 80;
  const valuePos = 85;
  const underlineWidth = 110;

  const addLabeledLine = (label: string, value: string) => {
    doc.text(label, leftMargin, yPos);
    doc.text(':', colonPos, yPos);
    doc.setFont(undefined, 'bold');
    doc.text(value, valuePos, yPos);
    doc.setFont(undefined, 'normal');
    doc.line(valuePos, yPos + 1, valuePos + underlineWidth, yPos + 1);
    yPos += 6;
  };

  const driverName = data.driverName || '';
  addLabeledLine('1.  Name of Driver', driverName.toUpperCase());

  const vehicle = (data as any).vehicleDpwhNo || (data as any).plateNumber || (data as any).vehicleId || '';
  addLabeledLine("2.  Gov't. Vehicle to be used", vehicle);

  doc.text('3.  Name of authorized passenger/s', leftMargin, yPos);
  doc.text(':', colonPos, yPos);
  const passengersArray =
    (data as any).passengers ||
    (data.authorizedPassengers || []).map((p) => (typeof p === 'string' ? p : p?.name || '')).filter(Boolean);
  const passengersText = passengersArray.length > 0 ? passengersArray.join(', ').toUpperCase() : '';
  const passengerLines = doc.splitTextToSize(passengersText || ' ', underlineWidth);
  doc.setFont(undefined, 'bold');
  doc.text(passengerLines, valuePos, yPos);
  doc.setFont(undefined, 'normal');
  passengerLines.forEach((_, index) => doc.line(valuePos, yPos + 1 + index * 5, valuePos + underlineWidth, yPos + 1 + index * 5));
  yPos += passengerLines.length * 5 + 1;

  addLabeledLine('4.  Places to be visited/inspected', (data.destination || '').toUpperCase());

  const period = formatPeriodDates((data as any).periodCoveredFrom || (data as any).periodFrom, (data as any).periodCoveredTo || (data as any).periodTo);
  addLabeledLine('5.  Period Covered', period);

  doc.text('6.  Purpose', leftMargin, yPos);
  doc.text(':', colonPos, yPos);
  const purposes = data.purposes && data.purposes.length > 0 ? data.purposes.join(', ') : '';
  const purposeLines = doc.splitTextToSize(purposes || ' ', underlineWidth);
  doc.setFont(undefined, 'bold');
  doc.text(purposeLines, valuePos, yPos);
  doc.setFont(undefined, 'normal');
  purposeLines.forEach((_, index) => doc.line(valuePos, yPos + 1 + index * 5, valuePos + underlineWidth, yPos + 1 + index * 5));
  yPos += purposeLines.length * 5 + 5;

  yPos += 3;
  doc.setFont(undefined, 'normal');
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

  doc.setFont(undefined, 'bold');
  const recommendingOfficer = (data as any).recommendingOfficerName || '';
  doc.text(recommendingOfficer.toUpperCase(), leftMargin, leftApprovalY);
  const approvingAuthorityName = (data as any).approvingAuthorityName || '';
  doc.text(approvingAuthorityName.toUpperCase(), 115, rightApprovalY);

  doc.setFont(undefined, 'normal');
  leftApprovalY += approvalLineSpacing;
  rightApprovalY += approvalLineSpacing;
  const recommendingPosition = (data as any).recommendingOfficerPosition || '';
  doc.text(recommendingPosition, leftMargin, leftApprovalY);
  const approvingAuthorityPosition = (data as any).approvingAuthorityPosition || '';
  doc.text(approvingAuthorityPosition, 115, rightApprovalY);

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

  doc.setFont(undefined, 'bold');
  const driverNameForSignature = driverName ? driverName.toUpperCase() : '';
  doc.text(driverNameForSignature, signatureRightX, yPos, { align: 'right' });
  const driverLineWidth = computeSignatureLineWidth(driverNameForSignature);
  yPos += 1;
  doc.setFont(undefined, 'normal');
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

  doc.setFont(undefined, 'bold');
  doc.text(passengerText, signatureRightX, yPos, { align: 'right' });
  const passengerLineWidth = computeSignatureLineWidth(passengerText);
  yPos += 1;
  doc.setFont(undefined, 'normal');
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
