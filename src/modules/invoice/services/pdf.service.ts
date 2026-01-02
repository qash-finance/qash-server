import { Injectable, Logger } from '@nestjs/common';
import { InvoiceModel } from 'src/database/generated/models';
import { InvoiceTypeEnum } from 'src/database/generated/client';
import puppeteer from 'puppeteer';
import { execSync } from 'child_process';
import { existsSync } from 'fs';
import { CurrencySymbols } from 'src/common/constants/currency';

@Injectable()
export class PdfService {
  private readonly logger = new Logger(PdfService.name);

  /**
   * Get Chrome/Chromium executable path
   * Checks environment variable first, then common system paths
   */
  private getChromeExecutablePath(): string | undefined {
    // Check environment variable first
    if (process.env.PUPPETEER_EXECUTABLE_PATH) {
      return process.env.PUPPETEER_EXECUTABLE_PATH;
    }

    // Common Chrome/Chromium paths for different platforms
    const commonPaths = [
      // macOS
      '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
      '/Applications/Chromium.app/Contents/MacOS/Chromium',
      // Linux
      '/usr/bin/google-chrome',
      '/usr/bin/google-chrome-stable',
      '/usr/bin/chromium',
      '/usr/bin/chromium-browser',
      // Windows (if running on Windows)
      'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
      'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
    ];

    // Check if any common path exists
    for (const path of commonPaths) {
      if (existsSync(path)) {
        this.logger.debug(`Found Chrome/Chromium at: ${path}`);
        return path;
      }
    }

    // Try to find Chrome via which command (Unix-like systems)
    try {
      const chromePath = execSync(
        'which google-chrome || which chromium || which chromium-browser',
        {
          encoding: 'utf-8',
        },
      ).trim();
      if (chromePath) {
        this.logger.debug(`Found Chrome/Chromium via which: ${chromePath}`);
        return chromePath;
      }
    } catch (_error) {
      // which command failed, continue
    }

    // If no path found, return undefined to let Puppeteer use its bundled Chrome
    // (requires: npx puppeteer browsers install chrome)
    return undefined;
  }

  /**
   * Generate PDF buffer from invoice data
   */
  async generateInvoicePdf(invoice: InvoiceModel): Promise<Buffer> {
    try {
      const htmlContent = this.generateInvoiceHtml(invoice);

      const executablePath = this.getChromeExecutablePath();
      const launchOptions: any = {
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox'],
      };

      if (executablePath) {
        launchOptions.executablePath = executablePath;
      }

      const browser = await puppeteer.launch(launchOptions);
      const page = await browser.newPage();
      await page.setContent(htmlContent, { waitUntil: 'networkidle0' });

      const pdfBuffer = await page.pdf({
        format: 'A4',
        margin: {
          top: '0.5cm',
          bottom: '0.5cm',
          left: '0.5cm',
          right: '0.5cm',
        },
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
    const isB2B = invoice.invoiceType === InvoiceTypeEnum.B2B;

    // Use payment details from the invoice model if available, otherwise fallback to fromDetails
    const paymentNetwork = (invoice as any).paymentNetwork || {};
    const paymentToken = (invoice as any).paymentToken || {};
    const walletAddress =
      invoice.paymentWalletAddress || fromDetails.walletAddress || 'N/A';

    // Get currency symbol
    const currencySymbol = CurrencySymbols[invoice.currency] || invoice.currency;

    // Prepare FROM section based on invoice type
    const fromCompanyName = isB2B
      ? (invoice as any).fromCompany?.companyName || fromDetails.companyName || 'N/A'
      : fromDetails.companyName || fromDetails.name || 'N/A';
    const fromName = isB2B
      ? fromDetails.contactName || ''
      : fromDetails.name || '';
    const fromEmail = fromDetails.email || (invoice as any).fromCompany?.notificationEmail || 'N/A';
    const fromTaxId = isB2B
      ? fromDetails.taxId || (invoice as any).fromCompany?.taxId || ''
      : '';

    // Prepare TO section
    const toCompanyName = toDetails.companyName || invoice.toCompanyName || 'N/A';
    const toContactName = toDetails.contactName || invoice.toCompanyContactName || '';
    const toEmail = toDetails.email || invoice.toCompanyEmail || '';
    const toAddress = toDetails.address || toDetails.address1 || invoice.toCompanyAddress || '';
    const toTaxId = toDetails.taxId || invoice.toCompanyTaxId || '';

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
            .invoice-type {
                font-size: 12px;
                color: #666;
                background-color: ${isB2B ? '#e3f2fd' : '#f3e5f5'};
                padding: 2px 8px;
                border-radius: 4px;
                margin-left: 10px;
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
            .tax-id {
                font-size: 12px;
                color: #666;
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
            .terms-section {
                margin-top: 30px;
                padding: 15px;
                background-color: #f8f9fa;
                border-radius: 5px;
                font-size: 12px;
            }
        </style>
    </head>
    <body>
        <div class="invoice-header">
            <div>
                <div class="invoice-title">
                    INVOICE
                    <span class="invoice-type">${isB2B ? 'B2B' : 'Payroll'}</span>
                </div>
                <div class="invoice-number">#${invoice.invoiceNumber}</div>
            </div>
            <div>
                <div><strong>Issue Date:</strong> ${invoice.issueDate.toLocaleDateString()}</div>
                <div><strong>Due Date:</strong> ${invoice.dueDate.toLocaleDateString()}</div>
                <div><strong>Currency:</strong> ${invoice.currency}</div>
            </div>
        </div>

        <div class="invoice-details">
            <div class="from-section">
                <div class="section-title">FROM</div>
                <div class="address-block">
                    <div><strong>${fromCompanyName}</strong></div>
                    ${fromName && fromName !== fromCompanyName ? `<div>${fromName}</div>` : ''}
                    <div>${fromEmail}</div>
                    ${fromDetails.address1 ? `<div>${fromDetails.address1}</div>` : ''}
                    ${fromDetails.address2 ? `<div>${fromDetails.address2}</div>` : ''}
                    ${fromDetails.city || fromDetails.country ? `<div>${[fromDetails.city, fromDetails.state, fromDetails.country, fromDetails.postalCode].filter(Boolean).join(', ')}</div>` : ''}
                    ${fromTaxId ? `<div class="tax-id">Tax ID: ${fromTaxId}</div>` : ''}
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
                    <div><strong>${toCompanyName}</strong></div>
                    ${toContactName ? `<div>Attn: ${toContactName}</div>` : ''}
                    ${toEmail ? `<div>${toEmail}</div>` : ''}
                    ${toAddress ? `<div>${toAddress}</div>` : ''}
                    ${toDetails.address2 ? `<div>${toDetails.address2}</div>` : ''}
                    ${toDetails.city || toDetails.country ? `<div>${[toDetails.city, toDetails.state, toDetails.country, toDetails.postalCode].filter(Boolean).join(', ')}</div>` : ''}
                    ${toTaxId ? `<div class="tax-id">Tax ID: ${toTaxId}</div>` : ''}
                </div>
            </div>
        </div>

        <table class="items-table">
            <thead>
                <tr>
                    <th>Description</th>
                    <th>Quantity</th>
                    <th>Unit</th>
                    <th class="amount-column">Rate</th>
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
                        <td>${item.unit || '-'}</td>
                        <td class="amount-column">${currencySymbol}${item.unitPrice || item.pricePerUnit || '0.00'}</td>
                        <td class="amount-column">${currencySymbol}${item.total}</td>
                    </tr>
                `,
                  )
                  .join('')}
            </tbody>
        </table>

        <div class="totals-section">
            <div class="total-row">
                <span>Subtotal:</span>
                <span>${currencySymbol}${invoice.subtotal}</span>
            </div>
            ${parseFloat(invoice.discount) > 0 ? `
            <div class="total-row">
                <span>Discount:</span>
                <span>-${currencySymbol}${invoice.discount}</span>
            </div>
            ` : ''}
            <div class="total-row">
                <span>Tax (${invoice.taxRate}%):</span>
                <span>${currencySymbol}${invoice.taxAmount}</span>
            </div>
            <div class="total-row">
                <span>Total (${invoice.currency}):</span>
                <span>${currencySymbol}${invoice.total}</span>
            </div>
        </div>

        ${(invoice as any).terms ? `
        <div class="terms-section">
            <strong>Terms & Conditions</strong>
            <p>${typeof (invoice as any).terms === 'object' ? JSON.stringify((invoice as any).terms) : (invoice as any).terms}</p>
        </div>
        ` : ''}

        <div class="footer">
            <p>Thank you for your business!</p>
            <p>${isB2B ? 'This is a business-to-business invoice.' : 'This invoice was generated automatically by the payroll system.'}</p>
        </div>
    </body>
    </html>
    `;
  }

  /**
   * Get PDF filename for invoice
   */
  getInvoiceFilename(invoice: InvoiceModel): string {
    const prefix = invoice.invoiceType === InvoiceTypeEnum.B2B ? 'b2b-invoice' : 'invoice';
    return `${prefix}-${invoice.invoiceNumber}.pdf`;
  }
}
