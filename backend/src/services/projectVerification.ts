import { prisma } from '../lib/prisma.js';

export interface ProjectChecklistResult {
  isValid: boolean;
  issues: string[];
}

/**
 * Validates Appendix B Project Review Checklist
 * Ensures project completeness and traceability before marking as COMPLETED or VERIFIED
 */
export const validateProjectChecklist = async (projectId: string): Promise<ProjectChecklistResult> => {
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    include: {
      members: true,
      contributions: true,
      tasks: true,
    },
  });

  if (!project) {
    throw new Error('Project not found');
  }

  const issues: string[] = [];

  // 1. Objectives & problem statement
  if (!project.problemStatement || !project.objectives) {
    issues.push('Project must have clear objectives and a problem statement.');
  }

  // 2. Member allocation
  if (!project.members || project.members.length === 0) {
    issues.push('Project must have assigned team members with clear roles.');
  }

  // 3. Repository/demo link verification
  if (!project.repoUrl && !project.demoUrl) {
    issues.push('Project must have an accessible repository or live demo link.');
  }

  // 4. Evidence of individual contributions
  const hasEvidence = project.contributions.some((c) => c.evidenceUrl && c.evidenceUrl.length > 0);
  if (!hasEvidence) {
    issues.push('Project must have at least one verified individual contribution with evidence.');
  }

  return {
    isValid: issues.length === 0,
    issues,
  };
};
