import PDFDocument from 'pdfkit';

const GREEN = '#0D5E30';
const GOLD  = '#C8922A';
const GREY  = '#6b7280';
const BLACK = '#111827';

// ─── Ticket Purchase Receipt ──────────────────────────────────────────────────

export interface ReceiptData {
  ticketNumber:   string;
  receiptNumber:  string;
  campaignTitle:  string;
  propertyAddress?: string | null;
  quantity:       number;
  unitPrice:      number;
  totalAmount:    number;
  paymentGateway: string;
  paymentRef:     string;
  purchasedAt:    Date;
  userName:       string;
  userEmail:      string;
  fccpcRef?:      string | null;
}

export function generateReceiptPdf(data: ReceiptData): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: 'A4', margin: 50, info: {
      Title:   `RaffleProp Receipt ${data.receiptNumber}`,
      Author:  'RaffleProp Ltd',
      Subject: 'Ticket Purchase Receipt',
    }});

    const chunks: Buffer[] = [];
    doc.on('data', (c: Buffer) => chunks.push(c));
    doc.on('end',  () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    const L = 50;
    const W = doc.page.width - 100;

    // ── Header band (fixed coordinates, known height = 68) ───────────────────
    doc.rect(L, 50, W, 68).fill(GREEN);
    // Logo text — left side
    doc.fillColor('#fff').fontSize(22).font('Helvetica-Bold').text('RaffleProp', L + 14, 62, { lineBreak: false });
    doc.fillColor('#fff').fontSize(9).font('Helvetica').text('Property. Simplified.', L + 14, 88, { lineBreak: false });
    // Receipt label — right side (same y positions, different x)
    doc.fillColor('#fff').fontSize(11).font('Helvetica-Bold').text('PURCHASE RECEIPT', L, 70, { align: 'right', width: W, lineBreak: false });
    doc.fillColor(GOLD).fontSize(8).font('Helvetica').text('FCCPA §118 Legal Document', L, 86, { align: 'right', width: W, lineBreak: false });

    // ── Numbers bar (fixed coordinates, sits below header) ───────────────────
    const barY = 130;
    doc.rect(L, barY, W, 40).fill('#f0fdf4');
    // Left: receipt number
    doc.fillColor(GREY).fontSize(7.5).font('Helvetica')
      .text('RECEIPT NUMBER', L + 14, barY + 8, { lineBreak: false });
    doc.fillColor(GREEN).fontSize(12).font('Helvetica-Bold')
      .text(data.receiptNumber, L + 14, barY + 20, { width: W / 2 - 20, lineBreak: false });
    // Right: ticket number
    doc.fillColor(GREY).fontSize(7.5).font('Helvetica')
      .text('TICKET NUMBER', L + W / 2, barY + 8, { lineBreak: false });
    doc.fillColor(BLACK).fontSize(12).font('Helvetica-Bold')
      .text(data.ticketNumber, L + W / 2, barY + 20, { width: W / 2 - 10, lineBreak: false });

    // ── Content — strictly flowing, no backward y ────────────────────────────
    // Place PDFKit cursor below the bar
    doc.y = barY + 52;
    doc.x = L;

    // Section heading: bold label + green underline, no filled rect
    function section(title: string) {
      doc.moveDown(0.6);
      const sy = doc.y;
      doc.fillColor(GREEN).fontSize(9).font('Helvetica-Bold')
        .text(title, L, sy, { width: W });
      const lineY = doc.y + 2;
      doc.moveTo(L, lineY).lineTo(L + W, lineY).strokeColor(GREEN).lineWidth(1).stroke();
      doc.moveDown(0.4);
    }

    // Data row: label on one line, value on next line indented slightly
    function dataRow(label: string, value: string) {
      doc.fillColor(GREY).fontSize(7.5).font('Helvetica').text(label, L, doc.y, { width: W });
      doc.fillColor(BLACK).fontSize(9).font('Helvetica').text(value, L + 2, doc.y, { width: W - 2 });
      doc.moveDown(0.3);
    }

    section('CAMPAIGN DETAILS');
    dataRow('Campaign', data.campaignTitle);
    if (data.propertyAddress) dataRow('Property Address', data.propertyAddress);
    if (data.fccpcRef)        dataRow('FCCPC Reference', data.fccpcRef);

    section('PURCHASER DETAILS');
    dataRow('Full Name', data.userName);
    dataRow('Email', data.userEmail);
    dataRow('Purchase Date', new Date(data.purchasedAt).toLocaleString('en-NG', {
      day: 'numeric', month: 'long', year: 'numeric',
      hour: '2-digit', minute: '2-digit', timeZone: 'Africa/Lagos',
    }) + ' WAT');

    section('PAYMENT SUMMARY');

    // Pay row: label left, value right-aligned on SAME line.
    // Render label, save rowY, reset doc.y to rowY, render value.
    function payRow(label: string, value: string, bold = false, accent = false) {
      const rowY = doc.y;
      doc.fillColor(GREY).fontSize(8).font('Helvetica')
        .text(label, L, rowY, { width: W * 0.55, lineBreak: false });
      // Reset cursor to the same row before rendering the right-aligned value
      doc.y = rowY;
      doc.fillColor(accent ? GREEN : BLACK)
        .fontSize(bold ? 11 : 9)
        .font(bold ? 'Helvetica-Bold' : 'Helvetica')
        .text(value, L, rowY, { align: 'right', width: W });
      doc.moveDown(bold ? 0.35 : 0.25);
    }

    payRow('Quantity', `${data.quantity} ticket${data.quantity !== 1 ? 's' : ''}`);
    payRow('Unit Price', `₦${data.unitPrice.toLocaleString('en-NG', { minimumFractionDigits: 2 })}`);
    // Divider
    doc.moveDown(0.1);
    doc.moveTo(L, doc.y).lineTo(L + W, doc.y).strokeColor('#d1d5db').lineWidth(0.5).stroke();
    doc.moveDown(0.2);
    payRow('TOTAL PAID', `₦${data.totalAmount.toLocaleString('en-NG', { minimumFractionDigits: 2 })}`, true, true);
    payRow('Payment Method', data.paymentGateway.replace(/_/g, ' '));
    payRow('Payment Reference', data.paymentRef);

    // ── Legal footer ─────────────────────────────────────────────────────────
    doc.moveDown(0.8);
    const legalY = doc.y;
    const legalText =
      'This receipt is a legal document issued under the Federal Competition and Consumer Protection Act 2018 ' +
      '(FCCPA) §118. This transaction was conducted in compliance with the FCCPC-approved raffle framework. ' +
      'Ticket proceeds are held in a ring-fenced escrow account. This document must be retained permanently ' +
      'in accordance with FCCPA regulations and cannot be deleted.';
    const legalH = doc.heightOfString(legalText, { width: W - 28 }) + 32;
    doc.rect(L, legalY, W, legalH).fill('#fefce8');
    doc.fillColor(GOLD).fontSize(8).font('Helvetica-Bold')
      .text('LEGAL NOTICE', L + 14, legalY + 10, { lineBreak: false });
    doc.fillColor(GREY).fontSize(7.5).font('Helvetica')
      .text(legalText, L + 14, legalY + 24, { width: W - 28, lineGap: 2 });
    doc.moveDown(0.6);
    doc.fillColor(GREY).fontSize(7.5).font('Helvetica')
      .text('RaffleProp Ltd  ·  RC 9484205  ·  FCCPC Registered  ·  SCUML Registered  ·  NDPR Compliant',
        L, doc.y, { align: 'center', width: W });

    doc.end();
  });
}

// ─── Form CPC B — End of Promotion Report ────────────────────────────────────

export interface CpcbData {
  campaignTitle:        string;
  campaignDescription?: string | null;
  fccpcRef?:            string | null;
  propertyAddress?:     string | null;
  propertyState?:       string | null;
  cacNumber?:           string | null;
  drawDate?:            Date | null;
  drawVenue?:           string | null;
  drawMethod:           string;
  drawSeed?:            string | null;
  seedCommitment?:      string | null;
  witnessName?:         string | null;
  witnessTitle?:        string | null;
  ticketCount:          number;
  totalRevenue:         number;
  ticketPrice:          number;
  winnerName:           string;
  winnerPhone:          string;
  winnerTicketNumber:   string;
  promoterName:         string;
  promoterAddress:      string;
  filedAt:              Date;
}

export function generateCpcbPdf(data: CpcbData): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: 'A4', margin: 50, autoFirstPage: true, info: {
      Title:   'Form CPC B — End of Promotion Report',
      Author:  'RaffleProp Ltd',
      Subject: 'FCCPC End of Promotion Report',
    }});

    const chunks: Buffer[] = [];
    doc.on('data', (c: Buffer) => chunks.push(c));
    doc.on('end',  () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    const L = 50;
    const W = doc.page.width - 100;
    const PAD = 8;

    // ── Header ───────────────────────────────────────────────────────────────
    doc.rect(L, 50, W, 68).fill(GREEN);
    doc.fillColor('#fff').fontSize(11).font('Helvetica-Bold')
      .text('FEDERAL COMPETITION AND CONSUMER PROTECTION COMMISSION', L + 14, 58, { width: W - 28 });
    doc.fillColor(GOLD).fontSize(9).font('Helvetica-Bold')
      .text('FORM CPC B — END OF PROMOTION REPORT', L + 14, 78);
    doc.fillColor('#fff').fontSize(7.5).font('Helvetica')
      .text('Pursuant to FCCPA 2018 §124 | Must be filed within 21 days of promotion close', L + 14, 94);

    // ── Filing info bar ──────────────────────────────────────────────────────
    let y = 132;
    doc.rect(L, y, W, 34).fill('#eff6ff');
    const filedStr = new Date(data.filedAt).toLocaleDateString('en-NG', { day: 'numeric', month: 'long', year: 'numeric' });
    doc.fillColor('#1d4ed8').fontSize(7.5).font('Helvetica-Bold').text('FILING DATE', L + 14, y + 7);
    doc.fillColor('#1e40af').fontSize(9).font('Helvetica').text(filedStr, L + 14, y + 18);
    doc.fillColor('#1d4ed8').fontSize(7.5).font('Helvetica-Bold').text('FCCPC REFERENCE', L + W / 2, y + 7);
    doc.fillColor('#1e40af').fontSize(9).font('Helvetica').text(data.fccpcRef ?? 'See campaign record', L + W / 2, y + 18);

    y = 180;

    // ── Section heading ───────────────────────────────────────────────────────
    function sectionTitle(label: string) {
      // Add a new page if less than 120px remain
      if (y > doc.page.height - 120) {
        doc.addPage();
        y = 50;
      }
      doc.fillColor(GREEN).fontSize(9).font('Helvetica-Bold').text(label, L, y);
      y += 14;
      doc.moveTo(L, y).lineTo(L + W, y).strokeColor('#d1fae5').lineWidth(1).stroke();
      y += 8;
    }

    // ── Field box — dynamic height ─────────────────────────────────────────
    function field(label: string, value: string | null | undefined) {
      const displayVal = value?.trim() || '_______________________________________________';
      const hasVal = !!(value?.trim());
      const LABEL_H = 14;
      const textH = doc.heightOfString(displayVal, { width: W - PAD * 2 - 4 });
      const boxH = PAD + LABEL_H + textH + PAD;

      if (y + boxH > doc.page.height - 60) { doc.addPage(); y = 50; }

      doc.roundedRect(L, y, W, boxH, 3).strokeColor('#d1d5db').lineWidth(0.5).stroke();
      doc.fillColor(GREY).fontSize(7.5).font('Helvetica').text(label, L + PAD, y + PAD, { width: W - PAD * 2 });
      doc.fillColor(hasVal ? BLACK : GREY)
        .fontSize(9).font(hasVal ? 'Helvetica-Bold' : 'Helvetica')
        .text(displayVal, L + PAD, y + PAD + LABEL_H, { width: W - PAD * 2 - 4, lineGap: 2 });
      y += boxH + 6;
    }

    // ── Two-column field boxes — dynamic height ────────────────────────────
    function twoCol(label1: string, val1: string | null | undefined, label2: string, val2: string | null | undefined) {
      const half = (W - 10) / 2;
      const display1 = val1?.trim() || '___________________';
      const display2 = val2?.trim() || '___________________';
      const LABEL_H = 14;
      const h1 = doc.heightOfString(display1, { width: half - PAD * 2 });
      const h2 = doc.heightOfString(display2, { width: half - PAD * 2 });
      const boxH = PAD + LABEL_H + Math.max(h1, h2) + PAD;

      if (y + boxH > doc.page.height - 60) { doc.addPage(); y = 50; }

      // Left box
      doc.roundedRect(L, y, half, boxH, 3).strokeColor('#d1d5db').lineWidth(0.5).stroke();
      doc.fillColor(GREY).fontSize(7.5).font('Helvetica').text(label1, L + PAD, y + PAD, { width: half - PAD * 2 });
      doc.fillColor(val1?.trim() ? BLACK : GREY).fontSize(9)
        .font(val1?.trim() ? 'Helvetica-Bold' : 'Helvetica')
        .text(display1, L + PAD, y + PAD + LABEL_H, { width: half - PAD * 2 });

      // Right box
      const rx = L + half + 10;
      doc.roundedRect(rx, y, half, boxH, 3).strokeColor('#d1d5db').lineWidth(0.5).stroke();
      doc.fillColor(GREY).fontSize(7.5).font('Helvetica').text(label2, rx + PAD, y + PAD, { width: half - PAD * 2 });
      doc.fillColor(val2?.trim() ? BLACK : GREY).fontSize(9)
        .font(val2?.trim() ? 'Helvetica-Bold' : 'Helvetica')
        .text(display2, rx + PAD, y + PAD + LABEL_H, { width: half - PAD * 2 });

      y += boxH + 6;
    }

    // ── Section 1: Promoter ───────────────────────────────────────────────────
    sectionTitle('1. PROMOTER DETAILS');
    const promoterFull = [data.promoterName, data.promoterAddress].filter(Boolean).join('\n');
    field('1.1  Promoter Name & Registered Address', promoterFull || null);
    twoCol('1.2  FCCPC Approval Reference No.', data.fccpcRef, '1.3  Date of Filing', filedStr);
    y += 4;

    // ── Section 2: Promotion Details ─────────────────────────────────────────
    sectionTitle('2. PROMOTION DETAILS');
    const titleDesc = data.campaignDescription
      ? `${data.campaignTitle} — ${data.campaignDescription}`
      : data.campaignTitle;
    field('2.1  Campaign Title & Description', titleDesc);
    const addrVal = [data.propertyAddress, data.propertyState].filter(Boolean).join(', ');
    field('2.2  Property Address / Prize Description', addrVal || null);
    y += 4;

    // ── Section 3: Draw Details ───────────────────────────────────────────────
    sectionTitle('3. DRAW DETAILS');
    const drawDateStr = data.drawDate
      ? new Date(data.drawDate).toLocaleDateString('en-NG', { day: 'numeric', month: 'long', year: 'numeric' })
      : null;
    twoCol('3.1  Draw Date', drawDateStr, '3.2  Draw Venue', data.drawVenue ?? 'Virtual (online)');

    const seedLines = [
      `Method: ${data.drawMethod}`,
      data.seedCommitment ? `Seed commitment (SHA-256): ${data.seedCommitment}` : null,
      data.drawSeed        ? `Revealed seed: ${data.drawSeed}` : null,
    ].filter(Boolean).join('\n');
    field('3.3  Draw Method & RNG Seed Hash', seedLines);
    twoCol('3.4  Independent Witness Name', data.witnessName, '3.5  Witness Title / Organisation', data.witnessTitle);
    y += 4;

    // ── Section 4: Ticket & Revenue ───────────────────────────────────────────
    sectionTitle('4. TICKET SALES & REVENUE');
    twoCol(
      '4.1  Total Tickets Sold', data.ticketCount.toLocaleString('en-NG'),
      '4.2  Ticket Price (₦)',   `₦${data.ticketPrice.toLocaleString('en-NG', { minimumFractionDigits: 2 })}`,
    );
    field('4.3  Gross Revenue Collected (₦)',
      `₦${data.totalRevenue.toLocaleString('en-NG', { minimumFractionDigits: 2 })}`);
    y += 4;

    // ── Section 5: Winner ─────────────────────────────────────────────────────
    sectionTitle('5. WINNER DETAILS');
    field('5.1  Winner Full Name', data.winnerName || null);
    twoCol('5.2  Winner Phone Number', data.winnerPhone || null, '5.3  Winning Ticket Number', data.winnerTicketNumber || null);
    field('5.4  Winner Residential Address', null);
    field('5.5  Prize Description & NIESV Certified Value', null);
    y += 4;

    // ── Section 6: Post-Draw Compliance ─────────────────────────────────────
    sectionTitle('6. POST-DRAW COMPLIANCE');
    field('6.1  FCCPC Monitor Name & Signature Confirmation', null);
    field('6.2  Escrow Release Confirmation (Bank name, reference, date)', null);
    twoCol('6.3  Promotional Status', 'Completed', '6.4  FCCPC Monitor Present at Draw?', data.witnessName ? 'Yes' : null);
    y += 10;

    // ── Certification block ───────────────────────────────────────────────────
    const certText =
      'I hereby certify that the information contained in this Form CPC B is true and correct to the best of my knowledge. ' +
      'This promotion was conducted in full compliance with the Federal Competition and Consumer Protection Act 2018 ' +
      'and all conditions of the FCCPC approval referenced above.';
    const certH = doc.heightOfString(certText, { width: W - PAD * 2 - 4 }) + 32;

    if (y + certH + 80 > doc.page.height - 50) { doc.addPage(); y = 50; }

    doc.rect(L, y, W, certH).fill('#fefce8');
    doc.fillColor(GOLD).fontSize(8).font('Helvetica-Bold').text('CERTIFICATION', L + PAD, y + PAD);
    doc.fillColor('#374151').fontSize(7.5).font('Helvetica')
      .text(certText, L + PAD, y + PAD + 16, { width: W - PAD * 2 - 4, lineGap: 2 });
    y += certH + 16;

    // ── Signature lines ───────────────────────────────────────────────────────
    doc.fillColor(GREY).fontSize(8).font('Helvetica');
    doc.text('Authorised Signatory: ________________________________', L, y);
    y += 16;
    doc.text('Designation: ________________________________', L, y);
    doc.text('Date: ________________________________', L + W / 2, y);
    y += 16;
    doc.text('Company Seal / Stamp:', L, y);
    y += 40;

    // ── Footer ───────────────────────────────────────────────────────────────
    const cacStr = data.cacNumber ? `RC ${data.cacNumber}  ·  ` : '';
    doc.fillColor(GREY).fontSize(7).font('Helvetica')
      .text(
        `${data.promoterName}  ·  ${cacStr}FCCPC Registered  ·  Generated ${new Date().toLocaleDateString('en-NG')}`,
        L, y, { align: 'center', width: W },
      );

    doc.end();
  });
}
