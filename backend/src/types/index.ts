import { Request } from 'express';

export type Role =
  | 'SUPER_ADMIN'
  | 'FACULTY_ADMIN'
  | 'MENTOR'
  | 'TEAM_LEAD'
  | 'STUDENT'
  | 'MAGAZINE_EDITOR'
  | 'MANAGEMENT_VIEWER'
  | 'PUBLIC_VISITOR';

export type ApplicationStatus =
  | 'PENDING'
  | 'CLARIFICATION_REQUIRED'
  | 'APPROVED'
  | 'REJECTED'
  | 'SUSPENDED'
  | 'INACTIVE';

export type ProjectStatus =
  | 'PROPOSED'
  | 'APPROVED'
  | 'ACTIVE'
  | 'ON_HOLD'
  | 'COMPLETED'
  | 'ARCHIVED';

export type TaskStatus =
  | 'NOT_STARTED'
  | 'IN_PROGRESS'
  | 'BLOCKED'
  | 'SUBMITTED'
  | 'REVIEWED'
  | 'COMPLETED';

export type WeeklyUpdateStatus =
  | 'DRAFT'
  | 'SUBMITTED'
  | 'UNDER_REVIEW'
  | 'REVISION_REQUIRED'
  | 'VERIFIED';

export type HackathonStatus =
  | 'DRAFT'
  | 'SUBMITTED'
  | 'APPROVED'
  | 'REGISTERED'
  | 'PARTICIPATED'
  | 'RESULT_SUBMITTED'
  | 'VERIFIED'
  | 'PUBLISHED';

export type DocumentStatus =
  | 'UPLOADED'
  | 'UNDER_REVIEW'
  | 'CORRECTION_REQUIRED'
  | 'VERIFIED'
  | 'RESTRICTED';

export type MagazineArticleStatus =
  | 'DRAFT'
  | 'SUBMITTED'
  | 'EDITING'
  | 'REVISION_REQUIRED'
  | 'APPROVED'
  | 'SCHEDULED'
  | 'PUBLISHED'
  | 'ARCHIVED';

export interface AuthenticatedUser {
  id: string;
  email: string;
  role: Role;
}

export interface AuthRequest extends Request {
  user?: AuthenticatedUser;
}

export interface PaginationQuery {
  page?: string;
  limit?: string;
  search?: string;
}

export interface ApiResponse<T = unknown> {
  success: boolean;
  message?: string;
  data?: T;
  error?: string;
  meta?: {
    total?: number;
    page?: number;
    limit?: number;
  };
}
