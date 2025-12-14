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
   * Send OTP email
   */
  async sendOtpEmail(email: string, otpCode: string): Promise<void> {
    try {
      const fromEmail = 'noreply@qash.finance';

      const subject = `Your OTP Code`;
      const html = `
       <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Login OTP code</title>
        <style>
          body {
            margin: 0;
            padding: 0;
            background: #0e3ee0;
            font-family: 'Inter', Arial, sans-serif;
            color: #0f172a;
          }
          .wrapper {
            width: 100%;
            background: #0e3ee0;
            padding: 32px 12px;
            box-sizing: border-box;
          }
          .card {
            max-width: 720px;
            margin: 0 auto;
            background: #f5f7fb;
            box-shadow: 0 12px 35px rgba(0, 33, 117, 0.25);
            overflow: hidden;
          }
          .card-header {
            padding: 28px 36px 0 36px;
            text-align: left;
          }
          .logo {
            height: 40px;
            margin-bottom: 8px;
          }
          .title {
            font-size: 26px;
            font-weight: 700;
            margin: 0 0 12px 0;
            color: #0f172a;
          }
          .greeting {
            font-size: 16px;
            margin: 0;
            color: #1f2937;
          }
          .content {
            padding: 0 36px 32px 36px;
            font-size: 15px;
            line-height: 1.6;
            color: #1f2937;
          }
          .highlight {
            font-weight: 600;
            color: #0e3ee0;
          }
          .otp-box {
            margin: 24px 0 12px 0;
            padding: 22px;
            text-align: center;
          }
          .otp-code {
            font-size: 40px;
            font-weight: 500;
            letter-spacing: 3px;
            margin: 0;
          }
          .meta {
            margin-top: 16px;
            font-size: 14px;
          }
          .footer {
            padding: 0 36px 28px 36px;
            font-size: 13px;
            color: #6b7280;
            line-height: 1.5;
          }
          .warning {
            font-size: 14px;
          }
          .top {
            height: 50px;
            width: 100%;
          }
          .logo {
            width: 60px;
            height: 60px;
          }
          .title {
            font-size: 30px;
          }
          .separator {
            height: 1px;
            width: 100%;
            background-color: oklch(87.2% 0.01 258.338);
            margin-bottom: 20px;
          }
          .underline {
            text-decoration-line: underline;
          }
        </style>
      </head>
      <body>
        <img class="top" src="https://raw.githubusercontent.com/qash-finance/qash-server/refs/heads/feat/v2/images/top.png"/>
        <div class="wrapper">
          <div class="card">
            <div class="card-header">
              <img class="logo" src="https://raw.githubusercontent.com/qash-finance/qash-server/refs/heads/feat/v2/images/qash-logo.png" alt="Qash logo" />
              <p class="title">Login OTP code</p>
              <div class="separator">
                
              </div>
              <p class="greeting">Hello, ${email.split('@')[0]}</p> 
            </div>
            <div class="content">
              <p>
                Your 6-digit login OTP code associated with
                <span class="highlight underline">${email}</span> is:
              </p>
              <div class="otp-box">
                <p class="otp-code">${otpCode.split('').join(' ')}</p>
              </div>
              <div class="separator "></div>
              <p class="meta">This OTP code expires in 10 minutes. If you didn't request this, just ignore and delete this message.</p>
              <div class="warning">
                To keep your account secure, please don't forward this email to anyone.
              </div>
            </div>
            <div class="footer">
              <p>This is an automated message, please do not reply to this email.</p>
            </div>
          </div>
        </div>
      </body>
      </html>
      `;

      await this.sendEmail({
        to: email,
        fromEmail,
        subject,
        html,
      });
    } catch (error) {
      this.logger.error(`Failed to send OTP email to ${email}:`, error);
      throw new BadRequestException(ErrorMail.EmailNotSent);
    }
  }

  /**
   * Send invoice notification to employee
   */
  async sendInvoiceNotification(
    employeeEmail: string,
    invoiceNumber: string,
    invoiceUUID: string,
    dueDate: Date,
    companyName: string,
    employeeName: string,
    amount: string,
    month: string,
  ): Promise<void> {
    try {
      const fromEmail =
        'noreply@' + this.appConfigService.mailConfig.mailgun.domain;
      const baseUrl = 'http://localhost:3000';
      const invoiceReviewUrl = `${baseUrl}/invoice-review?id=${invoiceUUID}`;

      const subject = `Invoice ${invoiceNumber} - Review Required`;
      const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Login OTP code</title>
        <style>
          body {
            margin: 0;
            padding: 0;
            background: #0e3ee0;
            font-family: 'Inter', Arial, sans-serif;
            color: #0f172a;
          }
          .wrapper {
            width: 100%;
            background: #0e3ee0;
            padding: 32px 12px;
            box-sizing: border-box;
          }
          .card {
            max-width: 720px;
            margin: 0 auto;
            background: #f5f7fb;
            box-shadow: 0 12px 35px rgba(0, 33, 117, 0.25);
            overflow: hidden;
          }
          .card-header {
            padding: 28px 36px 0 36px;
            text-align: left;
          }
          .logo {
            height: 40px;
            margin-bottom: 8px;
          }
          .title {
            font-size: 26px;
            font-weight: 700;
            margin: 0 0 12px 0;
            color: #0f172a;
          }
          .greeting {
            font-size: 16px;
            margin: 0;
            margin-top: 40px;
            color: #1f2937;
            font-weight: bold;
          }
          .content {
            padding: 0 36px 32px 36px;
            font-size: 15px;
            line-height: 1.6;
            color: #1f2937;
          }
          .highlight {
            font-weight: 600;
            color: #0e3ee0;
          }
          .footer {
            padding: 0 36px 28px 36px;
            font-size: 13px;
            color: #6b7280;
            line-height: 1.5;
          }
          .top {
            height: 50px;
            width: 100%;
          }
          .logo {
            width: 60px;
            height: 60px;
          }
          .title {
            font-size: 30px;
          }
          .separator {
            height: 1px;
            width: 100%;
            background-color: oklch(87.2% 0.01 258.338);
          }
          .underline {
            text-decoration-line: underline;
          }
          .text-color-gray {
            color: #848484;
          }
          .description {
            margin-bottom: 40px;
          }
          .primary-button {
            background: linear-gradient(0deg, #002c69 0%, #0061e7 100%);
            padding: 1px;
            border-radius: 10px;
          }
          .primary-button button {
            width: 100%;
            border-radius: 0.5rem;
            display: flex;
            justify-content: center;
            align-items: center;
            padding: 8px;
            border-top-width: 2px;
            background: #0059ff;
            border-top-color: #4888ff;
            color: white;
            font-size: 15;
          }
          .margin-top-30px {
            margin-top: 40px;
          }
        </style>
      </head>
      <body>
        <img class="top" src="https://raw.githubusercontent.com/qash-finance/qash-server/refs/heads/feat/v2/images/top.png"/>
        <div class="wrapper">
          <div class="card">
            <div class="card-header">
              <p class="title">Your invoice for ${companyName} is ready!</p>
              <p class="text-color-gray">Due date: ${new Date(dueDate).toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' })}</p>
              <div class="separator">
              </div>
              <p class="greeting">Hello, ${employeeName}</p>
            </div>
            <div>
              <div class="content">
              <p class="description">
                 Your monthly invoice for the ${month} salary of $${amount} for ${companyName} is ready. Please review the details and confirm so that ${companyName} can proceed with the payment
              </p>
              <div style="margin: 20px 0;">
                <a href="${invoiceReviewUrl}" style="display: block; width: 100%; background: linear-gradient(0deg, #002c69 0%, #0061e7 100%); padding: 2px; border-radius: 10px; text-decoration: none;">
                  <div style="width: 98%; margin: auto; border-radius: 0.5rem; display: flex; justify-content: center; align-items: center; padding: 6px; background: #0059ff; border-top: 2px solid #4888ff; color: white; font-size: 15px; text-align: center;">
                    View Invoice
                  </div>
                </a>
              </div>
               <div class="margin-top-30px separator"></div>
              </div>
            </div>
            <div class="footer">
              <p>This is an automated message, please do not reply to this email.</p>
            </div>
          </div>
        </div>
      </body>
      </html>
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
    companyName: string,
    employeeName: string,
    employeeEmail: string,
    fromMonthYear: string,
    toMonthYear: string,
  ): Promise<void> {
    try {
      const fromEmail =
        'noreply@' + this.appConfigService.mailConfig.mailgun.domain;
      const baseUrl = 'http://localhost:3001'; // TODO: Add baseUrl to server config
      const billsUrl = `${baseUrl}/dashboard/bills`;
      const frontEndURL = `${baseUrl}`;

      const subject = `Invoice ${invoiceNumber} from ${employeeName} Confirmed`;
      const html = `
       <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Login OTP code</title>
        <style>
          body {
            margin: 0;
            padding: 0;
            background: #0e3ee0;
            font-family: 'Inter', Arial, sans-serif;
            color: #0f172a;
          }
          .wrapper {
            width: 100%;
            background: #0e3ee0;
            padding: 32px 12px;
            box-sizing: border-box;
          }
          .card {
            max-width: 720px;
            margin: 0 auto;
            background: #f5f7fb;
            box-shadow: 0 12px 35px rgba(0, 33, 117, 0.25);
            overflow: hidden;
          }
          .card-header {
            padding: 28px 36px 0 36px;
            text-align: left;
          }
          .logo {
            height: 40px;
            margin-bottom: 8px;
          }
          .title {
            font-size: 26px;
            font-weight: 700;
            margin: 0 0 12px 0;
            color: #0f172a;
          }
          .greeting {
            font-size: 16px;
            margin: 0;
            margin-top: 40px;
            color: #1f2937;
            font-weight: bold;
          }
          .content {
            padding: 0 36px 32px 36px;
            font-size: 15px;
            line-height: 1.6;
            color: #1f2937;
          }
          .highlight {
            font-weight: 600;
            color: #0e3ee0;
          }
          .footer {
            padding: 0 36px 28px 36px;
            font-size: 13px;
            color: #6b7280;
            line-height: 1.5;
          }
          .top {
            height: 50px;
            width: 100%;
          }
          .logo {
            width: 60px;
            height: 60px;
          }
          .title {
            font-size: 30px;
          }
          .separator {
            height: 1px;
            width: 100%;
            background-color: oklch(87.2% 0.01 258.338);
          }
          .underline {
            text-decoration-line: underline;
          }
          .text-color-gray {
            color: #848484;
          }
          .description {
            margin-bottom: 40px;
          }
          .primary-button {
            background: linear-gradient(0deg, #002c69 0%, #0061e7 100%);
            padding: 1px;
            border-radius: 10px;
          }
          .primary-button button {
            width: 100%;
            border-radius: 0.5rem;
            display: flex;
            justify-content: center;
            align-items: center;
            padding: 8px;
            border-top-width: 2px;
            background: #0059ff;
            border-top-color: #4888ff;
            color: white;
            font-size: 15;
          }
          .margin-top-30px {
            margin-top: 40px;
          }
        </style>
      </head>
      <body>
        <img class="top" src="https://raw.githubusercontent.com/qash-finance/qash-server/refs/heads/feat/v2/images/top.png"/>
        <div class="wrapper">
          <div class="card">
            <div class="card-header">
               <img class="logo" src="https://raw.githubusercontent.com/qash-finance/qash-server/refs/heads/feat/v2/images/qash-logo.png" alt="Qash logo" />
              <p class="title">Invoice confirmed</p>
              <div class="separator">
              </div>
              <p class="greeting">Dear ${companyName}</p>
            </div>
            <div>
              <div class="content">
              <p class="description">
                 ${employeeName} (${employeeEmail}) has confirmed the invoice for ${fromMonthYear} to ${toMonthYear}. It is now available in the <b>Bill</b> section.
              </p>
              <div style="margin: 20px 0;">
                <a href="${frontEndURL}" style="display: block; width: 100%; background: linear-gradient(0deg, #002c69 0%, #0061e7 100%); padding: 2px; border-radius: 10px; text-decoration: none;">
                  <div style="width: 98%; margin: auto; border-radius: 0.5rem; display: flex; justify-content: center; align-items: center; padding: 6px; background: #0059ff; border-top: 2px solid #4888ff; color: white; font-size: 15px; text-align: center;">
                    Open App
                  </div>
                </a>
              </div>
               <div class="margin-top-30px separator"></div>
              </div>
            </div>
            <div class="footer">
              <p>This is an automated message, please do not reply to this email.</p>
            </div>
          </div>
        </div>
      </body>
      </html>
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
