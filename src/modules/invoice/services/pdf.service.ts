import { Injectable, Logger } from '@nestjs/common';
import { InvoiceModel } from 'src/database/generated/models';
import puppeteer from 'puppeteer';

@Injectable()
export class PdfService {
  private readonly logger = new Logger(PdfService.name);

  /**
   * Generate PDF buffer from invoice data
   */
  async generateInvoicePdf(invoice: InvoiceModel): Promise<Buffer> {
    try {
      const htmlContent = this.generateInvoiceHtml(invoice);

      const browser = await puppeteer.launch({
        headless: true,
        executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || undefined,
        args: ['--no-sandbox', '--disable-setuid-sandbox'],
      });
      const page = await browser.newPage();
      await page.setContent(htmlContent, { waitUntil: 'networkidle0' });

      const pdfBuffer = await page.pdf({
        format: 'A4',
        margin: { top: '0.5cm', bottom: '0.5cm', left: '0.5cm', right: '0.5cm' },
        printBackground: true,
      });

      await browser.close();

      this.logger.log(`Generated PDF for invoice ${invoice.invoiceNumber}`);

      return Buffer.from(pdfBuffer);
    } catch (error) {
      this.logger.error(
        `Error generating PDF for invoice ${invoice.invoiceNumber}:`,
        error,
      );
      throw error;
    }
  }

  /**
   * Generate HTML template for invoice
   */
  private generateInvoiceHtml(invoice: InvoiceModel): string {
    const fromDetails = (invoice as any).fromDetails || {};
    const toDetails = (invoice as any).toDetails || {};
    const items = (invoice as any).items || [];

    // Use payment details from the invoice model if available, otherwise fallback to fromDetails
    const paymentNetwork = (invoice as any).paymentNetwork || {};
    const paymentToken = (invoice as any).paymentToken || {};
    const walletAddress =
      invoice.paymentWalletAddress || fromDetails.walletAddress || 'N/A';

    return `
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="UTF-8">
        <title>Invoice ${invoice.invoiceNumber}</title>
        <style>
            body {
                font-family: Arial, sans-serif;
                margin: 0;
                padding: 20px;
                color: #333;
            }
            .invoice-header {
                display: flex;
                justify-content: space-between;
                margin-bottom: 30px;
                border-bottom: 2px solid #007bff;
                padding-bottom: 20px;
            }
            .invoice-title {
                font-size: 28px;
                font-weight: bold;
                color: #007bff;
            }
            .invoice-number {
                font-size: 18px;
                color: #666;
            }
            .invoice-details {
                display: flex;
                justify-content: space-between;
                margin-bottom: 30px;
            }
            .from-section, .bill-to-section {
                width: 45%;
            }
            .section-title {
                font-weight: bold;
                font-size: 16px;
                margin-bottom: 10px;
                color: #007bff;
            }
            .address-block {
                line-height: 1.6;
            }
            .invoice-meta {
                margin-bottom: 30px;
                background-color: #f8f9fa;
                padding: 15px;
                border-radius: 5px;
            }
            .meta-row {
                display: flex;
                justify-content: space-between;
                margin-bottom: 5px;
            }
            .items-table {
                width: 100%;
                border-collapse: collapse;
                margin-bottom: 30px;
            }
            .items-table th,
            .items-table td {
                border: 1px solid #ddd;
                padding: 12px;
                text-align: left;
            }
            .items-table th {
                background-color: #007bff;
                color: white;
                font-weight: bold;
            }
            .items-table tr:nth-child(even) {
                background-color: #f8f9fa;
            }
            .amount-column {
                text-align: right;
            }
            .totals-section {
                width: 300px;
                margin-left: auto;
                border: 1px solid #ddd;
                border-radius: 5px;
            }
            .total-row {
                display: flex;
                justify-content: space-between;
                padding: 10px 15px;
                border-bottom: 1px solid #eee;
            }
            .total-row:last-child {
                border-bottom: none;
                background-color: #007bff;
                color: white;
                font-weight: bold;
            }
            .footer {
                margin-top: 50px;
                padding-top: 20px;
                border-top: 1px solid #eee;
                font-size: 12px;
                color: #666;
                text-align: center;
            }
            .network-info {
                background-color: #e3f2fd;
                padding: 10px;
                border-radius: 5px;
                margin-top: 10px;
                font-size: 12px;
            }
        </style>
    </head>
    <body>
        <div class="invoice-header">
            <div>
                <div class="invoice-title">INVOICE</div>
                <div class="invoice-number">#${invoice.invoiceNumber}</div>
            </div>
            <div>
                <div><strong>Issue Date:</strong> ${invoice.issueDate.toLocaleDateString()}</div>
                <div><strong>Due Date:</strong> ${invoice.dueDate.toLocaleDateString()}</div>
            </div>
        </div>

        <div class="invoice-details">
            <div class="from-section">
                <div class="section-title">FROM</div>
                <div class="address-block">
                    <div><strong>${fromDetails.name || 'N/A'}</strong></div>
                    ${fromDetails.companyName ? `<div>${fromDetails.companyName}</div>` : ''}
                    <div>${fromDetails.email || 'N/A'}</div>
                    ${fromDetails.address1 ? `<div>${fromDetails.address1}</div>` : ''}
                    ${fromDetails.address2 ? `<div>${fromDetails.address2}</div>` : ''}
                    ${fromDetails.city && fromDetails.country ? `<div>${fromDetails.city}, ${fromDetails.country} ${fromDetails.postalCode || ''}</div>` : ''}
                </div>
                <div class="network-info">
                    <div><strong>Payment Details:</strong></div>
                    <div>Network: ${paymentNetwork.name || fromDetails.network?.name || 'N/A'}</div>
                    <div>Token: ${paymentToken.symbol || fromDetails.token?.symbol || 'N/A'}</div>
                    <div>Address: ${walletAddress}</div>
                </div>
            </div>

            <div class="bill-to-section">
                <div class="section-title">BILL TO</div>
                <div class="address-block">
                    <div><strong>${toDetails.companyName || invoice.toCompanyName || 'N/A'}</strong></div>
                    <div>${toDetails.contactName ? `Attn: ${toDetails.contactName}` : invoice.toCompanyContactName ? `Attn: ${invoice.toCompanyContactName}` : ''}</div>
                    <div>${toDetails.email || invoice.toCompanyEmail || ''}</div>
                    <div>${toDetails.address1 || invoice.toCompanyAddress || ''}</div>
                    ${toDetails.address2 ? `<div>${toDetails.address2}</div>` : ''}
                    <div>${[toDetails.city, toDetails.country, toDetails.postalCode].filter(Boolean).join(' ') || ''}</div>
                </div>
            </div>
        </div>

        <table class="items-table">
            <thead>
                <tr>
                    <th>Description</th>
                    <th>Quantity</th>
                    <th>Rate</th>
                    <th class="amount-column">Amount</th>
                </tr>
            </thead>
            <tbody>
                ${items
                  .map(
                    (item) => `
                    <tr>
                        <td>${item.description}</td>
                        <td>${item.quantity}</td>
                        <td class="amount-column">$${item.unitPrice || item.pricePerUnit || '0.00'}</td>
                        <td class="amount-column">$${item.total}</td>
                    </tr>
                `,
                  )
                  .join('')}
            </tbody>
        </table>

        <div class="totals-section">
            <div class="total-row">
                <span>Subtotal:</span>
                <span>$${invoice.subtotal}</span>
            </div>
            <div class="total-row">
                <span>Tax (${invoice.taxRate}%):</span>
                <span>$${invoice.taxAmount}</span>
            </div>
            <div class="total-row">
                <span>Total:</span>
                <span>$${invoice.total}</span>
            </div>
        </div>

        <div class="footer">
            <p>Thank you for your business!</p>
            <p>This invoice was generated automatically by the payroll system.</p>
        </div>
    </body>
    </html>
    `;
  }

  /**
   * Get PDF filename for invoice
   */
  getInvoiceFilename(invoice: InvoiceModel): string {
    return `invoice-${invoice.invoiceNumber}.pdf`;
  }
}
