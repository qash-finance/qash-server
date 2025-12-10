import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { ErrorMail } from '../../common/constants/errors';
import { Address } from 'nodemailer/lib/mailer';
import { MailgunMessageData, MailgunService } from 'nestjs-mailgun';
import { AppConfigService } from '../shared/config/config.service';

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  private readonly mailgundefaultFromName: string;

  constructor(
    private mailgunService: MailgunService,
    private readonly appConfigService: AppConfigService,
  ) {
    this.mailgundefaultFromName =
      this.appConfigService.mailConfig.mailgun.from.name;
  }

  async sendEmail({
    to,
    fromEmail,
    ...filledTemplate
  }: MailgunMessageData): Promise<void> {
    try {
      const domain = this.appConfigService.mailConfig.mailgun.domain;
      const data: MailgunMessageData = {
        from: `"${this.mailgundefaultFromName}" ${fromEmail}`,
        to,
        ...filledTemplate,
      };
      await this.mailgunService.createEmail(domain, data);
      this.logger.log('Email sent successfully');
      return;
    } catch (error) {
      this.logger.error(error, MailService.name);
      throw new BadRequestException(ErrorMail.EmailNotSent);
    }
  }

  /**
   * Send invoice notification to employee
   */
  async sendInvoiceNotification(
    employeeEmail: string,
    invoiceNumber: string,
    dueDate: Date,
  ): Promise<void> {
    try {
      const fromEmail =
        'noreply@' + this.appConfigService.mailConfig.mailgun.domain;
      const baseUrl = 'http://localhost:3001'; // TODO: Add baseUrl to server config
      const loginUrl = `${baseUrl}/auth/login`;

      const subject = `Invoice ${invoiceNumber} - Review Required`;
      const html = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #333;">Invoice Review Required</h2>
          
          <p>Hello,</p>
          
          <p>You have received a new invoice that requires your review:</p>
          
          <div style="background-color: #f5f5f5; padding: 20px; border-radius: 5px; margin: 20px 0;">
            <p><strong>Invoice Number:</strong> ${invoiceNumber}</p>
            <p><strong>Due Date:</strong> ${dueDate.toLocaleDateString()}</p>
          </div>
          
          <p>Please log in to review and confirm your invoice details:</p>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${loginUrl}" 
               style="background-color: #007bff; color: white; padding: 12px 24px; 
                      text-decoration: none; border-radius: 5px; display: inline-block;">
              Review Invoice
            </a>
          </div>
          
          <p><strong>Important:</strong> Please review the invoice details carefully, including:</p>
          <ul>
            <li>Your personal information and address</li>
            <li>Payment wallet address and network</li>
            <li>Invoice items and amounts</li>
          </ul>
          
          <p>If any information is incorrect, you can update it before confirming the invoice.</p>
          
          <p>Best regards,<br>
          The Payroll Team</p>
          
          <hr style="margin-top: 30px; border: none; border-top: 1px solid #eee;">
          <p style="font-size: 12px; color: #666;">
            This is an automated message. Please do not reply to this email.
          </p>
        </div>
      `;

      await this.sendEmail({
        to: employeeEmail,
        fromEmail,
        subject,
        html,
      });

      this.logger.log(
        `Invoice notification sent to ${employeeEmail} for invoice ${invoiceNumber}`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to send invoice notification to ${employeeEmail}:`,
        error,
      );
      throw error;
    }
  }

  /**
   * Send invoice confirmation notification to company
   */
  async sendInvoiceConfirmationNotification(
    companyEmail: string,
    invoiceNumber: string,
    employeeName: string,
  ): Promise<void> {
    try {
      const fromEmail =
        'noreply@' + this.appConfigService.mailConfig.mailgun.domain;
      const baseUrl = 'http://localhost:3001'; // TODO: Add baseUrl to server config
      const billsUrl = `${baseUrl}/dashboard/bills`;

      const subject = `Invoice ${invoiceNumber} Confirmed - Added to Bills`;
      const html = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #333;">Invoice Confirmed</h2>
          
          <p>Hello,</p>
          
          <p>An invoice has been confirmed by your employee and added to your bills:</p>
          
          <div style="background-color: #f5f5f5; padding: 20px; border-radius: 5px; margin: 20px 0;">
            <p><strong>Invoice Number:</strong> ${invoiceNumber}</p>
            <p><strong>Employee:</strong> ${employeeName}</p>
            <p><strong>Status:</strong> Ready for Payment</p>
          </div>
          
          <p>The invoice has been added to your bills and is ready for payment processing.</p>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${billsUrl}" 
               style="background-color: #28a745; color: white; padding: 12px 24px; 
                      text-decoration: none; border-radius: 5px; display: inline-block;">
              View Bills
            </a>
          </div>
          
          <p>You can now process payment for this bill along with other pending bills in your dashboard.</p>
          
          <p>Best regards,<br>
          The Payroll System</p>
          
          <hr style="margin-top: 30px; border: none; border-top: 1px solid #eee;">
          <p style="font-size: 12px; color: #666;">
            This is an automated message. Please do not reply to this email.
          </p>
        </div>
      `;

      await this.sendEmail({
        to: companyEmail,
        fromEmail,
        subject,
        html,
      });

      this.logger.log(
        `Invoice confirmation notification sent to ${companyEmail} for invoice ${invoiceNumber}`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to send invoice confirmation notification to ${companyEmail}:`,
        error,
      );
      throw error;
    }
  }

  /**
   * Send payroll reminder notification (1 week before pay date)
   */
  async sendPayrollReminder(
    companyEmail: string,
    payrollCount: number,
    nextPayDate: Date,
  ): Promise<void> {
    try {
      const fromEmail =
        'noreply@' + this.appConfigService.mailConfig.mailgun.domain;
      const baseUrl = 'http://localhost:3001'; // TODO: Add baseUrl to server config
      const payrollUrl = `${baseUrl}/dashboard/payroll`;

      const subject = `Payroll Reminder - ${payrollCount} Payment${payrollCount > 1 ? 's' : ''} Due Soon`;
      const html = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #333;">Payroll Reminder</h2>
          
          <p>Hello,</p>
          
          <p>This is a reminder that you have upcoming payroll payments:</p>
          
          <div style="background-color: #fff3cd; padding: 20px; border-radius: 5px; margin: 20px 0; border-left: 4px solid #ffc107;">
            <p><strong>${payrollCount}</strong> payment${payrollCount > 1 ? 's' : ''} due on <strong>${nextPayDate.toLocaleDateString()}</strong></p>
          </div>
          
          <p>Invoices will be automatically generated and sent to employees 1 week before the payment date for their review.</p>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${payrollUrl}" 
               style="background-color: #007bff; color: white; padding: 12px 24px; 
                      text-decoration: none; border-radius: 5px; display: inline-block;">
              View Payroll
            </a>
          </div>
          
          <p>Please ensure you have sufficient funds and review your payroll settings before the payment date.</p>
          
          <p>Best regards,<br>
          The Payroll System</p>
          
          <hr style="margin-top: 30px; border: none; border-top: 1px solid #eee;">
          <p style="font-size: 12px; color: #666;">
            This is an automated message. Please do not reply to this email.
          </p>
        </div>
      `;

      await this.sendEmail({
        to: companyEmail,
        fromEmail,
        subject,
        html,
      });

      this.logger.log(
        `Payroll reminder sent to ${companyEmail} for ${payrollCount} payments`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to send payroll reminder to ${companyEmail}:`,
        error,
      );
      throw error;
    }
  }

  /**
   * Send overdue bill notification
   */
  async sendOverdueBillNotification(
    companyEmail: string,
    overdueCount: number,
    totalAmount: string,
  ): Promise<void> {
    try {
      const fromEmail =
        'noreply@' + this.appConfigService.mailConfig.mailgun.domain;
      const baseUrl = 'http://localhost:3001'; // TODO: Add baseUrl to server config
      const billsUrl = `${baseUrl}/dashboard/bills?status=OVERDUE`;

      const subject = `Overdue Bills Alert - ${overdueCount} Bill${overdueCount > 1 ? 's' : ''} Past Due`;
      const html = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #dc3545;">Overdue Bills Alert</h2>
          
          <p>Hello,</p>
          
          <p>You have bills that are past their due date:</p>
          
          <div style="background-color: #f8d7da; padding: 20px; border-radius: 5px; margin: 20px 0; border-left: 4px solid #dc3545;">
            <p><strong>${overdueCount}</strong> overdue bill${overdueCount > 1 ? 's' : ''}</p>
            <p><strong>Total Amount:</strong> $${totalAmount}</p>
          </div>
          
          <p>Please review and process payment for these overdue bills as soon as possible.</p>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${billsUrl}" 
               style="background-color: #dc3545; color: white; padding: 12px 24px; 
                      text-decoration: none; border-radius: 5px; display: inline-block;">
              View Overdue Bills
            </a>
          </div>
          
          <p>Delayed payments may affect your employee relationships and company reputation.</p>
          
          <p>Best regards,<br>
          The Payroll System</p>
          
          <hr style="margin-top: 30px; border: none; border-top: 1px solid #eee;">
          <p style="font-size: 12px; color: #666;">
            This is an automated message. Please do not reply to this email.
          </p>
        </div>
      `;

      await this.sendEmail({
        to: companyEmail,
        fromEmail,
        subject,
        html,
      });

      this.logger.log(
        `Overdue bill notification sent to ${companyEmail} for ${overdueCount} bills`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to send overdue bill notification to ${companyEmail}:`,
        error,
      );
      throw error;
    }
  }
}
