import { z } from 'zod';
import { Request, Response, NextFunction } from 'express';

// Application Form Validation (Section 6.1)
export const applicationSchema = z.object({
  fullName: z.string().min(2, 'Full name must be at least 2 characters'),
  displayName: z.string().min(2, 'Display name must be at least 2 characters'),
  email: z.string().email('Valid institutional email required'),
  registerNumber: z.string().min(3, 'Register number is required'),
  department: z.string().min(2, 'Department is required'),
  program: z.string().min(2, 'Program is required'),
  academicYear: z.string().regex(/^\d{4}-\d{4}$/, 'Academic year must be formatted as YYYY-YYYY'),
  yearOfStudy: z.coerce.number().int().min(1).max(5),
  skills: z
    .union([z.array(z.string()), z.string()])
    .transform((val) => {
      if (Array.isArray(val)) return val;
      return typeof val === 'string' ? val.split(',').map((s) => s.trim()).filter(Boolean) : [];
    })
    .refine((arr) => arr.length >= 1, { message: 'At least one skill must be provided' }),
  fintechInterests: z
    .union([z.array(z.string()), z.string()])
    .transform((val) => {
      if (Array.isArray(val)) return val;
      return typeof val === 'string' ? val.split(',').map((s) => s.trim()).filter(Boolean) : [];
    })
    .refine((arr) => arr.length >= 1, { message: 'Select at least one fintech interest' }),
  priorExperience: z.string().optional().nullable(),
  portfolioLinks: z.record(z.any()).optional().nullable(),
  motivation: z.string().min(10, 'Motivation statement must be provided'),
  hasConsent: z.boolean().refine((val) => val === true, {
    message: 'Consent for record keeping and publication is required',
  }),
});

// Weekly Plan & Progress Submission Validation (Section 9.1 & Appendix A)
export const weeklyUpdateSchema = z.object({
  projectId: z.string().uuid('Invalid project ID'),
  weekStartDate: z.string().refine((val) => !isNaN(new Date(val).getTime()), {
    message: 'Valid ISO datetime required for weekStartDate',
  }),
  weekEndDate: z.string().refine((val) => !isNaN(new Date(val).getTime()), {
    message: 'Valid ISO datetime required for weekEndDate',
  }),
  plannedTasks: z.string().min(5, 'Planned tasks required'),
  completedTasks: z.string().min(5, 'Completed tasks required'),
  progressStatus: z.string().min(3, 'Progress status required'),
  evidenceLinks: z
    .union([z.array(z.string()), z.string()])
    .optional()
    .transform((val) => {
      if (!val) return [];
      if (Array.isArray(val)) return val;
      return val.split(',').map((s) => s.trim()).filter(Boolean);
    })
    .default([]),
  challenges: z.string().optional().nullable(),
  nextWeekPlan: z.string().min(5, 'Next week plan required'),
  isDraft: z.boolean().default(false),
});

// Contribution Log Validation (Section 8.2)
export const contributionLogSchema = z.object({
  projectId: z.string().uuid('Invalid project ID'),
  taskArea: z.enum([
    'Design',
    'Coding',
    'Testing',
    'Research',
    'Documentation',
    'Presentation',
    'Coordination',
    'Other',
  ]),
  description: z.string().min(10, 'Detailed description of work required'),
  evidenceUrl: z.string().url('Valid evidence repository/demo link required'),
  periodDate: z.string().refine((val) => !isNaN(new Date(val).getTime()), {
    message: 'Valid ISO datetime required for periodDate',
  }),
});

// Login Form Validation
export const loginSchema = z.object({
  email: z.string().email('Valid institutional email required'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

// Generic Validation Middleware
export const validateBody = (schema: z.ZodSchema) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      res.status(400).json({
        error: 'Validation failed',
        details: result.error.flatten().fieldErrors,
      });
      return;
    }
    req.body = result.data;
    next();
  };
};
