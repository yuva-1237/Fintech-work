import nodemailer from 'nodemailer';
import { prisma } from '../lib/prisma.js';
import { logger } from '../lib/logger.js';

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.college.edu',
  port: Number(process.env.SMTP_PORT) || 587,
  secure: process.env.SMTP_SECURE === 'true',
  auth:
    process.env.SMTP_USER && process.env.SMTP_PASS
      ? {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS,
        }
      : undefined,
});

export interface NotificationParams {
  userId: string;
  userEmail?: string;
  title: string;
  message: string;
  type: string; // APPLICATION, WEEKLY_UPDATE, HACKATHON, MAGAZINE
  sendEmail?: boolean;
}

export const sendNotification = async ({
  userId,
  userEmail,
  title,
  message,
  type,
  sendEmail = false,
}: NotificationParams) => {
  // 1. Always create in-portal notification record
  const notification = await prisma.notification.create({
    data: {
      userId,
      title,
      message,
      type,
    },
  });

  // 2. Dispatch email if enabled and recipient email address is available
  if (sendEmail && userEmail && process.env.ENABLE_EMAIL === 'true') {
    try {
      const from = process.env.SMTP_FROM || '"Fintech Innovation Team" <noreply@fintech.college.edu>';
      await transporter.sendMail({
        from,
        to: userEmail,
        subject: `[Fintech Portal] ${title}`,
        text: message,
        html: `
          <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #1f2937; max-width: 600px; margin: 0 auto; border: 1px solid #e5e7eb; border-radius: 8px; padding: 24px;">
            <div style="border-bottom: 2px solid #2563eb; padding-bottom: 12px; margin-bottom: 16px;">
              <h2 style="color: #1e3a8a; margin: 0;">FinTech Innovation Team</h2>
              <small style="color: #6b7280;">Prathyusha Engineering College</small>
            </div>
            <h3 style="color: #111827; margin-top: 0;">${title}</h3>
            <p style="font-size: 15px;">${message}</p>
            <div style="margin-top: 24px; padding-top: 16px; border-top: 1px solid #f3f4f6; font-size: 12px; color: #9ca3af;">
              This is an automated institutional notification from the Fintech Innovation Team Portal. Please do not reply directly to this email.
            </div>
          </div>
        `,
      });
      logger.info(`[Email] Notification sent to ${userEmail}: "${title}"`);
    } catch (err) {
      console.error('Email dispatch failed:', err);
      logger.error('Email dispatch failed:', err);
    }
  }

  return notification;
};
