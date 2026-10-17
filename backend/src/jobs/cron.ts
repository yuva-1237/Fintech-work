import cron from 'node-cron';
import { prisma } from '../lib/prisma.js';
import { logger } from '../lib/logger.js';
import { sendNotification } from '../services/notificationService.js';

export const initCronJobs = (): void => {
  logger.info('Initializing automated background cron tasks (deadlines & reminders)...');

  // 1. Every Friday at 5:00 PM (17:00): Reminder to draft and submit weekly updates
  cron.schedule('0 17 * * 5', async () => {
    try {
      logger.info('[CRON] Running Friday weekly update reminders for students...');
      const activeStudents = await prisma.userAccount.findMany({
        where: { role: 'STUDENT', isActive: true },
      });

      for (const student of activeStudents) {
        await sendNotification({
          userId: student.id,
          userEmail: student.email,
          title: 'Weekly Update Reminder',
          message: 'Please draft and submit your weekly progress and plans by Sunday evening.',
          type: 'WEEKLY_UPDATE',
          sendEmail: true,
        });
      }
      logger.info(`[CRON] Sent weekly update reminders to ${activeStudents.length} students.`);
    } catch (error) {
      logger.error('[CRON] Failed to send Friday weekly update reminders:', error);
    }
  });

  // 2. Every Sunday at 11:59 PM (23:59): Sunday Deadline Check & Warning
  cron.schedule('59 23 * * 0', async () => {
    try {
      logger.info('[CRON] Checking Sunday deadline submissions...');
      const now = new Date();
      const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

      const activeStudents = await prisma.userAccount.findMany({
        where: { role: 'STUDENT', isActive: true },
        include: {
          weeklyUpdates: {
            where: {
              createdAt: { gte: oneWeekAgo },
              status: { in: ['SUBMITTED', 'VERIFIED', 'UNDER_REVIEW'] },
            },
          },
        },
      });

      const unsubmittedStudents = activeStudents.filter((s) => s.weeklyUpdates.length === 0);

      for (const student of unsubmittedStudents) {
        await prisma.notification.create({
          data: {
            userId: student.id,
            title: 'Weekly Update Submission Overdue',
            message: 'Your weekly progress submission for this period is overdue. Please submit your draft immediately.',
            type: 'WEEKLY_UPDATE',
          },
        });
      }
      logger.info(`[CRON] Notified ${unsubmittedStudents.length} students with overdue updates.`);
    } catch (error) {
      logger.error('[CRON] Failed in Sunday deadline check:', error);
    }
  });

  // 3. Every Monday at 9:00 AM: Notify Mentors about pending weekly review queue
  cron.schedule('0 9 * * 1', async () => {
    try {
      logger.info('[CRON] Checking pending reviews for mentors...');
      const pendingUpdatesCount = await prisma.weeklyUpdate.count({
        where: { status: 'SUBMITTED' },
      });

      if (pendingUpdatesCount > 0) {
        const mentorsAndAdmins = await prisma.userAccount.findMany({
          where: {
            role: { in: ['MENTOR', 'FACULTY_ADMIN'] },
            isActive: true,
          },
        });

        for (const user of mentorsAndAdmins) {
          await prisma.notification.create({
            data: {
              userId: user.id,
              title: 'Weekly Reviews Awaiting Evaluation',
              message: `There are ${pendingUpdatesCount} student weekly updates submitted over the weekend awaiting your review.`,
              type: 'WEEKLY_UPDATE',
            },
          });
        }
        logger.info(`[CRON] Alerted ${mentorsAndAdmins.length} mentors/coordinators of ${pendingUpdatesCount} pending updates.`);
      }
    } catch (error) {
      logger.error('[CRON] Failed to send Monday mentor review notifications:', error);
    }
  });

  logger.info('Scheduled jobs configured: Friday Reminders (17:00), Sunday Deadlines (23:59), Monday Reviews (09:00)');
};
