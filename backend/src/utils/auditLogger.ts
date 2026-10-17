import { prisma } from '../lib/prisma.js';
import { logger } from '../lib/logger.js';

export interface AuditEventParams {
  actorId?: string;
  action: string;
  targetEntity: string;
  targetId: string;
  details?: Record<string, any>;
}

export const logAuditEvent = async ({
  actorId,
  action,
  targetEntity,
  targetId,
  details,
}: AuditEventParams): Promise<void> => {
  try {
    await prisma.auditLog.create({
      data: {
        actorId: actorId || null,
        action,
        targetEntity,
        targetId,
        details: details || {},
        timestamp: new Date(),
      },
    });
  } catch (err) {
    console.error('Failed to write audit log entry:', err);
    logger.error('Failed to record audit log:', err);
  }
};
