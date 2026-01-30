import PDFDocument from 'pdfkit';

// Company Details from environment
const COMPANY_NAME = process.env.COMPANY_NAME || 'ARUNYA CONSUMABLES PRIVATE LIMITED';
const COMPANY_ADDRESS = process.env.COMPANY_ADDRESS || 'No. 14, Barnaby Road, Kilpauk, Chennai - 600 010';
const COMPANY_GST = process.env.COMPANY_GST || '33AAXCA3298E1ZC';
const COMPANY_PHONE = process.env.COMPANY_PHONE || '9444741534 / 9345557451';
const COMPANY_EMAIL = process.env.COMPANY_EMAIL || 'arunyaconsumables@gmail.com';
const COMPANY_STATE_NAME = process.env.COMPANY_STATE_NAME || 'Tamil Nadu';
const COMPANY_STATE_CODE = process.env.COMPANY_STATE_CODE || '33';

// Bank Details from environment
const COMPANY_BANK_NAME = process.env.COMPANY_BANK_NAME || 'HDFC BANK-6060';
const COMPANY_BANK_ACCOUNT = process.env.COMPANY_BANK_ACCOUNT || '50200071686060';
const COMPANY_BANK_IFSC = process.env.COMPANY_BANK_IFSC || 'HDFC0000492';
const COMPANY_BANK_BRANCH = process.env.COMPANY_BANK_BRANCH || 'POONAMALLEE HIGH ROAD, KILPAUK';

export const generateInvoicePDF = async (invoiceData: any): Promise<Buffer> => {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ 
        margin: 25,
        size: 'A4'
      });
      const buffers: Buffer[] = [];

      doc.on('data', buffers.push.bind(buffers));
      doc.on('end', () => {
        const pdfBuffer = Buffer.concat(buffers);
        resolve(pdfBuffer);
      });

      const pageWidth = 595.28;
      const leftMargin = 25;
      const rightMargin = 25;
      const contentWidth = pageWidth - leftMargin - rightMargin;
      const rightColStart = leftMargin + contentWidth * 0.55; // 55% for left, 45% for right

      // Draw outer border
      doc.rect(leftMargin, 25, contentWidth, 790).stroke();

      let yPos = 30;

      // ============ TAX INVOICE TITLE ============
      doc.fontSize(14).font('Helvetica-Bold').text('Tax Invoice', leftMargin, yPos, { width: contentWidth, align: 'center' });
      yPos += 20;
      doc.moveTo(leftMargin, yPos).lineTo(leftMargin + contentWidth, yPos).stroke();

      // ============ HEADER SECTION ============
      const headerTop = yPos;
      yPos += 5;

      // LEFT SIDE - Company Details
      doc.fontSize(10).font('Helvetica-Bold');
      doc.text(COMPANY_NAME, leftMargin + 5, yPos, { width: rightColStart - leftMargin - 10 });
      yPos += 12;
      
      doc.fontSize(8).font('Helvetica');
      doc.text(COMPANY_ADDRESS, leftMargin + 5, yPos, { width: rightColStart - leftMargin - 10 });
      yPos += 18;
      doc.text(`PH ${COMPANY_PHONE}`, leftMargin + 5, yPos);
      yPos += 10;
      doc.text(`GSTIN/UIN: ${COMPANY_GST}`, leftMargin + 5, yPos);
      yPos += 10;
      doc.text(`State Name : ${COMPANY_STATE_NAME}, Code : ${COMPANY_STATE_CODE}`, leftMargin + 5, yPos);
      yPos += 10;
      doc.text(`Contact : ${COMPANY_PHONE}`, leftMargin + 5, yPos);
      yPos += 10;
      doc.text(`E-Mail : ${COMPANY_EMAIL}`, leftMargin + 5, yPos);

      // RIGHT SIDE - Invoice Details Grid
      // Vertical line separating left and right
      doc.moveTo(rightColStart, headerTop).lineTo(rightColStart, headerTop + 110).stroke();
      
      const rightWidth = leftMargin + contentWidth - rightColStart;
      const col1Width = rightWidth * 0.5;
      const col2Width = rightWidth * 0.5;
      
      let rightY = headerTop + 3;
      const rowHeight = 18;

      // Helper function to draw a row with two columns
      const drawHeaderRow = (label1: string, value1: string, label2: string, value2: string) => {
        doc.fontSize(7).font('Helvetica');
        doc.text(label1, rightColStart + 3, rightY, { width: col1Width - 5 });
        doc.text(label2, rightColStart + col1Width + 3, rightY, { width: col2Width - 5 });
        rightY += 8;
        doc.font('Helvetica-Bold').fontSize(8);
        doc.text(value1 || '', rightColStart + 3, rightY, { width: col1Width - 5 });
        doc.text(value2 || '', rightColStart + col1Width + 3, rightY, { width: col2Width - 5 });
        rightY += rowHeight - 8;
        // Horizontal line after row
        doc.moveTo(rightColStart, rightY).lineTo(leftMargin + contentWidth, rightY).stroke();
        // Vertical line between columns
        doc.moveTo(rightColStart + col1Width, rightY - rowHeight).lineTo(rightColStart + col1Width, rightY).stroke();
      };

      // Row 1: Invoice No. | Dated
      drawHeaderRow('Invoice No.', invoiceData.invoice_number, 'Dated', formatDate(invoiceData.created_at));
      
      // Row 2: Delivery Note | Mode/Terms of Payment
      drawHeaderRow('Delivery Note', '', 'Mode/Terms of Payment', '');
      
      // Row 3: Reference No. & Date | Other References
      drawHeaderRow('Reference No. & Date.', '', 'Other References', '');
      
      // Row 4: Buyer's Order No. | Dated
      drawHeaderRow("Buyer's Order No.", '', 'Dated', '');
      
      // Row 5: Dispatch Doc No. | Delivery Note Date
      drawHeaderRow('Dispatch Doc No.', '', 'Delivery Note Date', '');
      
      // Row 6: Dispatched through | Destination
      doc.fontSize(7).font('Helvetica');
      doc.text('Dispatched through', rightColStart + 3, rightY, { width: col1Width - 5 });
      doc.text('Destination', rightColStart + col1Width + 3, rightY, { width: col2Width - 5 });
      rightY += rowHeight;
      doc.moveTo(rightColStart + col1Width, rightY - rowHeight).lineTo(rightColStart + col1Width, rightY).stroke();

      // Row 7: Terms of Delivery (full width)
      doc.moveTo(rightColStart, rightY).lineTo(leftMargin + contentWidth, rightY).stroke();
      doc.text('Terms of Delivery', rightColStart + 3, rightY + 3);
      rightY += rowHeight;

      yPos = headerTop + 110;
      doc.moveTo(leftMargin, yPos).lineTo(leftMargin + contentWidth, yPos).stroke();

      // ============ BUYER DETAILS ============
      yPos += 3;
      doc.fontSize(8).font('Helvetica');
      doc.text('Buyer (Bill to)', leftMargin + 5, yPos);
      yPos += 10;
      
      doc.font('Helvetica-Bold');
      doc.text(invoiceData.store_name, leftMargin + 5, yPos);
      yPos += 10;
      
      doc.font('Helvetica');
      if (invoiceData.store_address) {
        doc.text(invoiceData.store_address, leftMargin + 5, yPos, { width: contentWidth - 10 });
        yPos += 12;
      }
      if (invoiceData.store_city) {
        doc.text(`${invoiceData.store_city}${invoiceData.store_pincode ? '-' + invoiceData.store_pincode : ''}`, leftMargin + 5, yPos);
        yPos += 10;
      }
      if (invoiceData.store_phone) {
        doc.text(`PH.NO.${invoiceData.store_phone}`, leftMargin + 5, yPos);
        yPos += 10;
      }
      if (invoiceData.store_gst) {
        doc.text(`GSTIN/UIN     :     ${invoiceData.store_gst}`, leftMargin + 5, yPos);
        yPos += 10;
      }
      doc.text(`State Name    :     ${invoiceData.store_state || COMPANY_STATE_NAME}, Code : ${COMPANY_STATE_CODE}`, leftMargin + 5, yPos);
      yPos += 12;

      doc.moveTo(leftMargin, yPos).lineTo(leftMargin + contentWidth, yPos).stroke();

      // ============ ITEMS TABLE ============
      const tableTop = yPos;
      yPos += 2;

      // Define columns
      const cols = [
        { header: 'Sl\nNo.', width: 22 },
        { header: 'Description of Goods', width: 145 },
        { header: 'HSN/SAC', width: 50 },
        { header: 'GST\nRate', width: 30 },
        { header: 'MRP/\nMarginal', width: 50 },
        { header: 'Quantity\nShipped', width: 45 },
        { header: 'Quantity\nBilled', width: 45 },
        { header: 'Rate', width: 45 },
        { header: 'per', width: 28 },
        { header: 'Amount', width: 55 }
      ];

      // Draw table header
      doc.fontSize(7).font('Helvetica-Bold');
      let xPos = leftMargin;
      
      cols.forEach((col, i) => {
        doc.text(col.header, xPos + 2, yPos, { width: col.width - 4, align: 'center' });
        xPos += col.width;
      });

      const headerHeight = 22;
      yPos = tableTop + headerHeight;
      doc.moveTo(leftMargin, yPos).lineTo(leftMargin + contentWidth, yPos).stroke();

      // Draw vertical lines for header
      xPos = leftMargin;
      cols.forEach((col) => {
        doc.moveTo(xPos, tableTop).lineTo(xPos, yPos).stroke();
        xPos += col.width;
      });

      // Items
      yPos += 2;
      const itemsStartY = yPos;
      doc.font('Helvetica').fontSize(7);
      
      let totalQtyShipped = 0;
      let totalQtyBilled = 0;

      invoiceData.items.forEach((item: any, index: number) => {
        const qtyShipped = item.quantity_shipped || item.quantity;
        const qtyBilled = item.quantity;
        totalQtyShipped += qtyShipped;
        totalQtyBilled += qtyBilled;

        const weightStr = item.weight ? ` ${item.weight} ${(item.weight_unit || 'GM').toUpperCase()}` : '';
        const productDesc = `${item.product_name.toUpperCase()}${weightStr}`;
        
        const gstRate = item.gst_rate || item.product_gst_rate || 0;
        const mrp = item.mrp || item.cost_price || item.unit_price;

        xPos = leftMargin;
        const rowY = yPos;

        const rowData = [
          (index + 1).toString(),
          productDesc,
          item.hsn_code || '',
          `${gstRate}%`,
          `${mrp.toFixed(2)}/NOS`,
          `${qtyShipped} NOS`,
          `${qtyBilled} NOS`,
          item.unit_price.toFixed(2),
          'NOS',
          item.total.toFixed(2)
        ];

        cols.forEach((col, i) => {
          const align = i === 1 ? 'left' : (i >= 3 ? 'right' : 'center');
          doc.text(rowData[i], xPos + 2, rowY, { width: col.width - 4, align: align as any });
          xPos += col.width;
        });

        yPos += 14;

        if (yPos > 580) {
          doc.addPage();
          yPos = 50;
        }
      });

      const itemsEndY = yPos;

      // Draw vertical lines for items section
      xPos = leftMargin;
      cols.forEach((col) => {
        doc.moveTo(xPos, itemsStartY - 2).lineTo(xPos, itemsEndY).stroke();
        xPos += col.width;
      });

      doc.moveTo(leftMargin, itemsEndY).lineTo(leftMargin + contentWidth, itemsEndY).stroke();

      // ============ SUMMARY ============
      yPos += 3;
      
      // Subtotal
      const amountColX = leftMargin + contentWidth - 55;
      doc.text(invoiceData.subtotal.toFixed(2), amountColX, yPos, { width: 50, align: 'right' });
      yPos += 12;

      // Get unique GST rates
      const gstRates = new Set<number>();
      invoiceData.items.forEach((item: any) => {
        const rate = item.gst_rate || item.product_gst_rate || 0;
        if (rate > 0) gstRates.add(rate);
      });

      // OUTPUT CGST & SGST
      if (invoiceData.cgst > 0 || invoiceData.sgst > 0) {
        const rateStr = gstRates.size > 0 ? `${Array.from(gstRates)[0] / 2}` : '2.5';
        
        doc.text(`OUTPUT CGST ${rateStr}%`, leftMargin + 200, yPos);
        doc.text(`${rateStr} %`, amountColX - 60, yPos, { width: 50, align: 'right' });
        doc.text(invoiceData.cgst.toFixed(2), amountColX, yPos, { width: 50, align: 'right' });
        yPos += 12;

        doc.text(`OUTPUT SGST ${rateStr}%`, leftMargin + 200, yPos);
        doc.text(`${rateStr} %`, amountColX - 60, yPos, { width: 50, align: 'right' });
        doc.text(invoiceData.sgst.toFixed(2), amountColX, yPos, { width: 50, align: 'right' });
        yPos += 12;
      }

      if (invoiceData.igst > 0) {
        const rateStr = gstRates.size > 0 ? `${Array.from(gstRates)[0]}` : '5';
        doc.text(`OUTPUT IGST ${rateStr}%`, leftMargin + 200, yPos);
        doc.text(invoiceData.igst.toFixed(2), amountColX, yPos, { width: 50, align: 'right' });
        yPos += 12;
      }

      doc.moveTo(leftMargin, yPos).lineTo(leftMargin + contentWidth, yPos).stroke();
      yPos += 3;

      // Total row
      doc.font('Helvetica-Bold');
      doc.text('Total', leftMargin + 200, yPos);
      doc.text(`${totalQtyShipped} NOS`, leftMargin + 330, yPos);
      doc.text(`${totalQtyBilled} NOS`, leftMargin + 385, yPos);
      doc.text(`\u20B9 ${invoiceData.total_amount.toFixed(2)}`, amountColX - 10, yPos, { width: 60, align: 'right' });
      yPos += 15;

      // Amount in words
      doc.font('Helvetica');
      doc.text('Amount Chargeable (in words)', leftMargin + 5, yPos);
      yPos += 10;
      doc.font('Helvetica-Bold').fontSize(8);
      doc.text(`INR ${numberToWords(invoiceData.total_amount)} Only`, leftMargin + 5, yPos);
      doc.font('Helvetica').fontSize(7).text('E. & O.E', leftMargin + contentWidth - 40, yPos);
      yPos += 15;

      doc.moveTo(leftMargin, yPos).lineTo(leftMargin + contentWidth, yPos).stroke();

      // ============ HSN BREAKDOWN ============
      yPos += 3;
      
      // HSN table header
      doc.fontSize(7).font('Helvetica-Bold');
      const hsnCols = [
        { label: 'HSN/SAC', width: 65 },
        { label: 'Taxable\nValue', width: 65 },
        { label: 'CGST', width: 85 },
        { label: 'SGST/UTGST', width: 85 },
        { label: 'Total\nTax Amount', width: 65 }
      ];

      xPos = leftMargin;
      const hsnHeaderY = yPos;
      hsnCols.forEach((col) => {
        doc.text(col.label, xPos + 2, yPos, { width: col.width - 4, align: 'center' });
        xPos += col.width;
      });

      yPos += 12;
      
      // Sub-headers for Rate/Amount
      doc.fontSize(6);
      doc.text('Rate', leftMargin + 130 + 10, yPos);
      doc.text('Amount', leftMargin + 130 + 45, yPos);
      doc.text('Rate', leftMargin + 215 + 10, yPos);
      doc.text('Amount', leftMargin + 215 + 45, yPos);
      yPos += 10;
      
      doc.moveTo(leftMargin, yPos).lineTo(leftMargin + 365, yPos).stroke();
      
      // Draw HSN header vertical lines
      xPos = leftMargin;
      hsnCols.forEach((col) => {
        doc.moveTo(xPos, hsnHeaderY - 2).lineTo(xPos, yPos).stroke();
        xPos += col.width;
      });
      doc.moveTo(xPos, hsnHeaderY - 2).lineTo(xPos, yPos).stroke();

      yPos += 3;
      
      // HSN data
      doc.font('Helvetica').fontSize(7);
      let totalTaxableValue = 0;
      let totalCgstAmount = 0;
      let totalSgstAmount = 0;
      let totalTaxAmount = 0;

      if (invoiceData.hsn_breakdown && invoiceData.hsn_breakdown.length > 0) {
        invoiceData.hsn_breakdown.forEach((hsn: any) => {
          doc.text(hsn.hsn_code, leftMargin + 2, yPos, { width: 63, align: 'left' });
          doc.text(hsn.taxable_value.toFixed(2), leftMargin + 67, yPos, { width: 60, align: 'right' });
          doc.text(`${hsn.cgst_rate.toFixed(1)}%`, leftMargin + 132, yPos, { width: 35, align: 'right' });
          doc.text(hsn.cgst_amount.toFixed(2), leftMargin + 172, yPos, { width: 40, align: 'right' });
          doc.text(`${hsn.sgst_rate.toFixed(1)}%`, leftMargin + 217, yPos, { width: 35, align: 'right' });
          doc.text(hsn.sgst_amount.toFixed(2), leftMargin + 257, yPos, { width: 40, align: 'right' });
          doc.text(hsn.total_tax.toFixed(2), leftMargin + 302, yPos, { width: 58, align: 'right' });

          totalTaxableValue += hsn.taxable_value;
          totalCgstAmount += hsn.cgst_amount;
          totalSgstAmount += hsn.sgst_amount;
          totalTaxAmount += hsn.total_tax;

          yPos += 12;
        });
      }

      // HSN Total
      doc.font('Helvetica-Bold');
      doc.text('Total', leftMargin + 2, yPos);
      doc.text(totalTaxableValue.toFixed(2), leftMargin + 67, yPos, { width: 60, align: 'right' });
      doc.text(totalCgstAmount.toFixed(2), leftMargin + 172, yPos, { width: 40, align: 'right' });
      doc.text(totalSgstAmount.toFixed(2), leftMargin + 257, yPos, { width: 40, align: 'right' });
      doc.text(totalTaxAmount.toFixed(2), leftMargin + 302, yPos, { width: 58, align: 'right' });
      yPos += 15;

      // Tax Amount in words
      doc.font('Helvetica').fontSize(7);
      const paise = Math.round((totalTaxAmount % 1) * 100);
      const paiseText = paise > 0 ? ` and ${numberToWords(paise)} paise` : '';
      doc.text(`Tax Amount (in words) :  INR ${numberToWords(Math.floor(totalTaxAmount))}${paiseText} Only`, leftMargin + 5, yPos);
      yPos += 15;

      doc.moveTo(leftMargin, yPos).lineTo(leftMargin + contentWidth, yPos).stroke();

      // ============ FOOTER ============
      yPos += 5;
      const footerMid = leftMargin + contentWidth / 2;
      
      // Declaration (left)
      doc.font('Helvetica-Bold').fontSize(8);
      doc.text('Declaration', leftMargin + 5, yPos);
      yPos += 12;
      doc.font('Helvetica').fontSize(7);
      doc.text('We declare that this invoice shows the actual price of the', leftMargin + 5, yPos, { width: footerMid - leftMargin - 10 });
      yPos += 10;
      doc.text('goods described and that all particulars are true and correct.', leftMargin + 5, yPos, { width: footerMid - leftMargin - 10 });

      // Bank Details (right)
      let bankY = yPos - 22;
      doc.font('Helvetica-Bold').fontSize(8);
      doc.text("Company's Bank Details", footerMid + 10, bankY);
      bankY += 12;
      doc.font('Helvetica').fontSize(7);
      doc.text(`A/c Holder's Name  :  ${COMPANY_NAME}`, footerMid + 10, bankY);
      bankY += 10;
      doc.text(`Bank Name             :  ${COMPANY_BANK_NAME}`, footerMid + 10, bankY);
      bankY += 10;
      doc.text(`A/c No.                    :  ${COMPANY_BANK_ACCOUNT}`, footerMid + 10, bankY);
      bankY += 10;
      doc.text(`Branch & IFS Code :  ${COMPANY_BANK_BRANCH} & ${COMPANY_BANK_IFSC}`, footerMid + 10, bankY);
      bankY += 18;

      // Company signature
      doc.font('Helvetica-Bold').fontSize(8);
      doc.text(`for ${COMPANY_NAME}`, footerMid + 10, bankY, { width: footerMid - 20, align: 'right' });
      bankY += 25;
      doc.font('Helvetica').fontSize(7);
      doc.text('Authorised Signatory', footerMid + 10, bankY, { width: footerMid - 20, align: 'right' });

      yPos = Math.max(yPos + 15, bankY + 10);

      // Vertical line
      doc.moveTo(footerMid, yPos - 85).lineTo(footerMid, yPos).stroke();
      
      doc.moveTo(leftMargin, yPos).lineTo(leftMargin + contentWidth, yPos).stroke();
      yPos += 5;

      // Footer text
      doc.fontSize(8);
      doc.text('This is a Computer Generated Invoice', leftMargin, yPos, { width: contentWidth, align: 'center' });

      doc.end();
    } catch (error) {
      reject(error);
    }
  });
};

export const generatePayslipPDF = async (paymentData: any): Promise<Buffer> => {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ margin: 50 });
      const buffers: Buffer[] = [];

      doc.on('data', buffers.push.bind(buffers));
      doc.on('end', () => {
        const pdfBuffer = Buffer.concat(buffers);
        resolve(pdfBuffer);
      });

      // Header
      doc.fontSize(20).font('Helvetica-Bold').text(COMPANY_NAME, { align: 'center' });
      doc.fontSize(10).font('Helvetica').text(COMPANY_ADDRESS, { align: 'center' });
      doc.moveDown();
      doc.moveTo(50, doc.y).lineTo(550, doc.y).stroke();
      doc.moveDown();

      // Payslip Title
      const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
      doc.fontSize(16).font('Helvetica-Bold').text(`PAYSLIP - ${monthNames[paymentData.month - 1]} ${paymentData.year}`, { align: 'center' });
      doc.moveDown(2);

      // Employee Details
      doc.fontSize(10).font('Helvetica-Bold').text('Employee Details');
      doc.font('Helvetica');
      doc.text(`Name: ${paymentData.user_name}`);
      doc.text(`Email: ${paymentData.user_email}`);
      doc.moveDown();

      // Earnings and Deductions
      const leftColX = 50;
      const rightColX = 300;
      let currentY = doc.y;

      doc.font('Helvetica-Bold').text('Earnings', leftColX, currentY);
      doc.font('Helvetica');
      currentY += 20;

      const earnings = [
        ['Basic Salary', paymentData.basic_amount],
        ['HRA', paymentData.hra_amount],
        ['DA', paymentData.da_amount],
        ['Other Allowances', paymentData.other_allowances],
        ['Bonus', paymentData.bonus || 0]
      ];

      earnings.forEach(([label, amount]) => {
        if (amount > 0) {
          doc.text(`${label}:`, leftColX, currentY);
          doc.text(`₹${parseFloat(amount as string).toFixed(2)}`, leftColX + 120, currentY);
          currentY += 15;
        }
      });

      let deductionY = doc.y - (earnings.filter(e => (e[1] as number) > 0).length * 15) - 20;
      doc.font('Helvetica-Bold').text('Deductions', rightColX, deductionY);
      doc.font('Helvetica');
      deductionY += 20;

      const deductions = [
        ['PF Deduction', paymentData.pf_deduction],
        ['ESI Deduction', paymentData.esi_deduction],
        ['Other Deductions', paymentData.other_deductions]
      ];

      deductions.forEach(([label, amount]) => {
        if (amount > 0) {
          doc.text(`${label}:`, rightColX, deductionY);
          doc.text(`₹${parseFloat(amount as string).toFixed(2)}`, rightColX + 120, deductionY);
          deductionY += 15;
        }
      });

      currentY = Math.max(currentY, deductionY) + 20;
      doc.moveTo(50, currentY).lineTo(550, currentY).stroke();
      currentY += 10;

      doc.font('Helvetica-Bold');
      doc.text(`Gross Salary: ₹${parseFloat(paymentData.gross_salary).toFixed(2)}`, leftColX, currentY);
      doc.text(`Total Deductions: ₹${parseFloat(paymentData.total_deductions).toFixed(2)}`, rightColX, currentY);
      
      currentY += 25;
      doc.moveTo(50, currentY).lineTo(550, currentY).stroke();
      currentY += 10;

      doc.fontSize(14);
      doc.text(`Net Salary: ₹${parseFloat(paymentData.net_salary).toFixed(2)}`, { align: 'center' });

      currentY = doc.y + 20;
      doc.fontSize(10).font('Helvetica');
      doc.text(`Amount in Words: ${numberToWords(parseFloat(paymentData.net_salary))} Rupees Only`, 50, currentY);

      currentY += 30;
      doc.font('Helvetica-Bold').text('Payment Details', 50, currentY);
      doc.font('Helvetica');
      currentY += 15;
      doc.text(`Payment Date: ${new Date(paymentData.payment_date).toLocaleDateString('en-IN')}`, 50, currentY);
      doc.text(`Payment Method: ${paymentData.payment_method.replace('_', ' ').toUpperCase()}`, 50, currentY + 15);
      doc.text(`Status: ${paymentData.status.toUpperCase()}`, 50, currentY + 30);

      doc.fontSize(8).text('This is a computer generated payslip.', 50, 750, { align: 'center' });

      doc.end();
    } catch (error) {
      reject(error);
    }
  });
};

function formatDate(dateString: string): string {
  const date = new Date(dateString);
  const day = date.getDate().toString().padStart(2, '0');
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const month = months[date.getMonth()];
  const year = date.getFullYear().toString().slice(-2);
  return `${day}-${month}-${year}`;
}

function numberToWords(num: number): string {
  const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten',
    'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
  const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

  if (num === 0) return 'Zero';

  const numStr = Math.floor(num).toString();
  if (numStr.length > 9) return 'Number too large';

  const padded = numStr.padStart(9, '0');
  let words = '';

  const crores = parseInt(padded.substring(0, 2));
  if (crores > 0) words += convertTwoDigit(crores, ones, tens) + ' Crore ';

  const lakhs = parseInt(padded.substring(2, 4));
  if (lakhs > 0) words += convertTwoDigit(lakhs, ones, tens) + ' Lakh ';

  const thousands = parseInt(padded.substring(4, 6));
  if (thousands > 0) words += convertTwoDigit(thousands, ones, tens) + ' Thousand ';

  const hundreds = parseInt(padded.substring(6, 7));
  if (hundreds > 0) words += ones[hundreds] + ' Hundred ';

  const tensOnes = parseInt(padded.substring(7, 9));
  if (tensOnes > 0) words += convertTwoDigit(tensOnes, ones, tens);

  return words.trim();
}

function convertTwoDigit(num: number, ones: string[], tens: string[]): string {
  if (num < 20) return ones[num];
  return tens[Math.floor(num / 10)] + (num % 10 !== 0 ? ' ' + ones[num % 10] : '');
}
