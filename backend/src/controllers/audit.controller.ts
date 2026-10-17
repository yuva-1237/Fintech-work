import { Response } from 'express';
import { prisma } from '../lib/prisma.js';
import { AuthRequest } from '../types/index.js';

export const listAuditLogs = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { action, targetEntity, actorId, limit } = req.query;

    const logs = await prisma.auditLog.findMany({
      where: {
        ...(action && { action: String(action) }),
        ...(targetEntity && { targetEntity: String(targetEntity) }),
        ...(actorId && { actorId: String(actorId) }),
      },
      include: {
        actor: {
          select: {
            id: true,
            email: true,
            role: true,
          },
        },
      },
      orderBy: { timestamp: 'desc' },
      take: limit ? Number(limit) : 100,
    });

    res.json({
      success: true,
      data: logs,
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch audit logs', details: (error as Error).message });
  }
};
