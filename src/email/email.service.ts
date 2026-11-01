import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import type { Transporter } from 'nodemailer';

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private transporter: Transporter | null = null;
  private readonly fromAddress: string;

  constructor(private readonly configService: ConfigService) {
    let host = this.configService.get<string>('SMTP_HOST') || 'smtp-relay.brevo.com';
    if (!host || host.startsWith('://') || host.trim() === '') {
      host = 'smtp-relay.brevo.com';
    } else {
      host = host.trim();
    }
    const port = Number(this.configService.get<string>('SMTP_PORT')) || 587;
    const secure =
      this.configService.get<string>('SMTP_SECURE') === 'true' || port === 465;
    const user = this.configService.get<string>('SMTP_USER');
    const pass = this.configService.get<string>('SMTP_PASS');

    this.fromAddress =
      this.configService.get<string>('SMTP_FROM') ||
      '"Business Hub" <no-reply@businesshub.com>';

    if (user && pass) {
      this.transporter = nodemailer.createTransport({
        host,
        port,
        secure,
        auth: {
          user,
          pass,
        },
      });
      this.logger.log(`Nodemailer configured for Brevo SMTP (${host}:${port})`);
    } else {
      this.logger.warn(
        'Brevo SMTP credentials (SMTP_USER / SMTP_PASS) not set in .env. Outgoing emails will be logged to console.',
      );
    }
  }

  /**
   * Send 6-digit verification code for password reset
   */
  async sendVerificationCodeEmail(
    to: string,
    code: string,
    fullName?: string,
  ): Promise<boolean> {
    const recipientName = fullName ? fullName.trim() : 'Valued User';
    const subject = `Your Business Hub Verification Code: ${code}`;

    const textContent = `Hello ${recipientName},

We received a request to reset your Business Hub account password.

Your verification code is: ${code}

This code is valid for 15 minutes. If you did not request this code, please ignore this email or ensure your account is secure.

Best regards,
The Business Hub Team`;

    const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${subject}</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f4f6fa; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #1a1a1a;">
  <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #f4f6fa; padding: 40px 15px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0" style="max-width: 520px; background-color: #ffffff; border-radius: 16px; border: 1px solid #e5e7eb; overflow: hidden; box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);">
          <!-- Header -->
          <tr>
            <td style="padding: 32px 36px 24px 36px; background-color: #0a0d14; text-align: center;">
              <h1 style="margin: 0; color: #ffffff; font-size: 22px; font-weight: 700; letter-spacing: -0.5px;">Business Hub</h1>
              <p style="margin: 6px 0 0 0; color: #9ca3af; font-size: 13px;">Security & Account Verification</p>
            </td>
          </tr>
          <!-- Body -->
          <tr>
            <td style="padding: 36px;">
              <p style="margin: 0 0 16px 0; font-size: 16px; line-height: 24px; color: #374151;">
                Hello <strong>${recipientName}</strong>,
              </p>
              <p style="margin: 0 0 24px 0; font-size: 14px; line-height: 22px; color: #4b5563;">
                We received a request to reset your password for your Business Hub account. Please use the verification code below to complete the reset process:
              </p>

              <!-- Verification Code Box -->
              <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0" style="margin: 24px 0;">
                <tr>
                  <td align="center" style="background-color: #f0f3f8; border: 1px dashed #cbd5e1; border-radius: 12px; padding: 20px;">
                    <span style="font-family: monospace, Courier; font-size: 32px; font-weight: 700; letter-spacing: 8px; color: #0a0d14;">
                      ${code}
                    </span>
                    <p style="margin: 8px 0 0 0; font-size: 12px; color: #6b7280; font-weight: 500;">
                      Expires in 15 minutes
                    </p>
                  </td>
                </tr>
              </table>

              <p style="margin: 0 0 12px 0; font-size: 13px; line-height: 20px; color: #6b7280;">
                If you did not request a password reset, you can safely ignore this email. Your password will remain unchanged.
              </p>
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="padding: 20px 36px; background-color: #f9fafb; border-top: 1px solid #e5e7eb; text-align: center;">
              <p style="margin: 0; font-size: 12px; color: #9ca3af;">
                &copy; ${new Date().getFullYear()} Business Hub. All rights reserved.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

    return this.sendMail(to, subject, textContent, htmlContent);
  }

  /**
   * Send welcome email after signup
   */
  async sendWelcomeEmail(
    to: string,
    fullName: string,
    businessName: string,
  ): Promise<boolean> {
    const recipientName = fullName ? fullName.trim() : 'Valued User';
    const storeName = businessName ? businessName.trim() : 'Your Store';
    const subject = `Welcome to Business Hub - ${storeName}`;

    const textContent = `Hello ${recipientName},

Welcome to Business Hub! Your account and store "${storeName}" have been created successfully.

With Business Hub, you can:
- Track real-time inventory and set low stock alerts
- Record sales transactions and view daily performance
- Manage suppliers, vendors, and product categories
- Configure your business details and settings

Log in to your dashboard to get started:
http://localhost:5173

Best regards,
The Business Hub Team`;

    const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${subject}</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f4f6fa; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #1a1a1a;">
  <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #f4f6fa; padding: 40px 15px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0" style="max-width: 520px; background-color: #ffffff; border-radius: 16px; border: 1px solid #e5e7eb; overflow: hidden; box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);">
          <!-- Header -->
          <tr>
            <td style="padding: 32px 36px 24px 36px; background-color: #0a0d14; text-align: center;">
              <h1 style="margin: 0; color: #ffffff; font-size: 22px; font-weight: 700; letter-spacing: -0.5px;">Business Hub</h1>
              <p style="margin: 6px 0 0 0; color: #9ca3af; font-size: 13px;">Welcome to your all-in-one business platform</p>
            </td>
          </tr>
          <!-- Body -->
          <tr>
            <td style="padding: 36px;">
              <h2 style="margin: 0 0 16px 0; font-size: 18px; font-weight: 700; color: #111827;">
                Welcome, ${recipientName}!
              </h2>
              <p style="margin: 0 0 20px 0; font-size: 14px; line-height: 22px; color: #4b5563;">
                Your account and business <strong>${storeName}</strong> are officially set up and ready to go.
              </p>

              <!-- Highlights Box -->
              <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #f9fafb; border: 1px solid #e5e7eb; border-radius: 12px; margin: 20px 0; padding: 16px 20px;">
                <tr>
                  <td>
                    <p style="margin: 0 0 10px 0; font-size: 13px; font-weight: 600; color: #111827;">Here is what you can do right away:</p>
                    <ul style="margin: 0; padding-left: 20px; font-size: 13px; line-height: 22px; color: #4b5563;">
                      <li>Organize your product <strong>Categories</strong> and <strong>Suppliers</strong></li>
                      <li>Add products to your <strong>Inventory</strong> with low-stock alerts</li>
                      <li>Record <strong>Sales transactions</strong> and track revenue in real time</li>
                      <li>Customize your store profile in <strong>Settings</strong></li>
                    </ul>
                  </td>
                </tr>
              </table>

              <table role="presentation" border="0" cellspacing="0" cellpadding="0" style="margin: 28px 0 10px 0; width: 100%;">
                <tr>
                  <td align="center">
                    <a href="http://localhost:5173" target="_blank" style="display: inline-block; padding: 14px 28px; background-color: #0a0d14; color: #ffffff; font-size: 14px; font-weight: 600; text-decoration: none; border-radius: 10px; box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);">
                      Open Business Hub Dashboard &rarr;
                    </a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="padding: 20px 36px; background-color: #f9fafb; border-top: 1px solid #e5e7eb; text-align: center;">
              <p style="margin: 0; font-size: 12px; color: #9ca3af;">
                &copy; ${new Date().getFullYear()} Business Hub. All rights reserved.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

    return this.sendMail(to, subject, textContent, htmlContent);
  }

  /**
   * Internal sender method
   */
  private async sendMail(
    to: string,
    subject: string,
    text: string,
    html: string,
  ): Promise<boolean> {
    if (!this.transporter) {
      this.logger.log(
        `[EMAIL (Console Mode)] To: ${to} | Subject: "${subject}"\n${text}`,
      );
      return true;
    }

    try {
      const info = await this.transporter.sendMail({
        from: this.fromAddress,
        to,
        subject,
        text,
        html,
      });
      this.logger.log(
        `Email sent successfully to ${to} (MessageId: ${info.messageId})`,
      );
      return true;
    } catch (error: any) {
      this.logger.error(
        `Failed to send email to ${to}: ${error.message}`,
        error.stack,
      );
      return false;
    }
  }
}
