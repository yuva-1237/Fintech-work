import { Response } from 'express';
import { AuthRequest } from '../types/index.js';
import { prisma } from '../lib/prisma.js';

/**
 * Aggregates consolidated institutional KPIs for the Admin & Management Dashboard (Section 11)
 * GET /api/v1/admin/dashboard-metrics
 */
export const getAdminDashboardMetrics = async (_req: AuthRequest, res: Response): Promise<void> => {
  try {
    const [
      totalMembers,
      pendingApplications,
      activeProjects,
      submittedWeeklyUpdates,
      verifiedContributions,
      hackathonEvents,
      verifiedWins,
    ] = await Promise.all([
      prisma.userAccount.count({ where: { role: 'STUDENT', isActive: true } }),
      prisma.membershipApplication.count({ where: { status: 'PENDING' } }),
      prisma.project.count({ where: { status: 'ACTIVE' } }),
      prisma.weeklyUpdate.count({ where: { status: 'SUBMITTED' } }),
      prisma.contributionLog.count({ where: { status: 'VERIFIED' } }),
      prisma.hackathon.count(),
      prisma.hackathon.count({
        where: {
          outcome: { in: ['WINNER', 'Winner', '1st Place', 'Winner — 1st Place National Level'] },
          isVerified: true,
        },
      }),
    ]);

    res.json({
      success: true,
      reportingPeriod: new Date().getFullYear(),
      generatedAt: new Date(),
      metrics: {
        totalMembers,
        pendingApplications,
        activeProjects,
        pendingWeeklyReviews: submittedWeeklyUpdates,
        verifiedContributions,
        totalHackathons: hackathonEvents,
        verifiedAwards: verifiedWins,
      },
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to aggregate dashboard metrics', details: (error as Error).message });
  }
};
