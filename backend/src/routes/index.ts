import { Router } from 'express';
import { authenticateJWT, requireRoles } from '../middleware/auth.js';
import * as Auth from '../controllers/auth.controller.js';
import * as Membership from '../controllers/membership.controller.js';
import * as WeeklyUpdate from '../controllers/weeklyUpdate.controller.js';
import * as Hackathon from '../controllers/hackathon.controller.js';
import * as Magazine from '../controllers/magazine.controller.js';
import * as Reports from '../controllers/reports.controller.js';
import * as Showcase from '../controllers/showcase.controller.js';
import * as Project from '../controllers/project.controller.js';
import * as Notification from '../controllers/notification.controller.js';
import * as Audit from '../controllers/audit.controller.js';
import * as Document from '../controllers/document.controller.js';
import * as AdminStats from '../controllers/adminStats.controller.js';
import { uploadMiddleware } from '../utils/fileStorage.js';
import {
  validateBody,
  applicationSchema,
  weeklyUpdateSchema,
  contributionLogSchema,
  loginSchema,
} from '../validators/index.js';

const router = Router();

// --- PUBLIC ROUTES (Landing Page Showcase & Application) ---
router.get('/public/showcase', Showcase.getPublicData);
router.get('/public/projects', Showcase.getPublicProjects);
router.get('/public/innovators', Showcase.getPublicInnovators);
router.get('/public/achievements', Showcase.getPublicAchievements);
router.get('/public/magazine', Magazine.getPublishedIssues);
router.post('/public/apply', validateBody(applicationSchema), Membership.submitApplication);
router.get('/public/application-status', Membership.getApplicationStatus);
router.post('/public/application-clarify/:id', Membership.respondClarification);
router.post('/auth/login', validateBody(loginSchema), Auth.login);

// --- AUTHENTICATED ROUTES ---
router.use(authenticateJWT);

// Profiles (Identity Isolation: strictly uses req.user.id)
router.get('/profile/me', Auth.getCurrentUserProfile);
router.put('/profile/me', Auth.updateUserProfile);
router.patch('/profile/visibility', Auth.updateProfileVisibility);
router.post('/profile/rectification-request', Auth.requestDataRectification);
router.post('/profile/change-password', Auth.changePassword);
router.get('/admin/users', requireRoles(['SUPER_ADMIN', 'FACULTY_ADMIN']), Auth.listUsers);

// Management & Admin KPI Dashboard Metrics (Section 11)
router.get(
  '/admin/dashboard-metrics',
  requireRoles(['SUPER_ADMIN', 'FACULTY_ADMIN', 'MANAGEMENT_VIEWER']),
  AdminStats.getAdminDashboardMetrics
);
router.get(
  '/admin/kpis',
  requireRoles(['SUPER_ADMIN', 'FACULTY_ADMIN', 'MANAGEMENT_VIEWER']),
  AdminStats.getAdminDashboardMetrics
);

// Projects & Tasks & Contributions
router.get('/projects', Project.listProjects);
router.post('/projects', requireRoles(['SUPER_ADMIN', 'FACULTY_ADMIN', 'TEAM_LEAD']), Project.createProject);
router.get('/projects/:id', Project.getProjectById);
router.get('/projects/:id/verification-checklist', Project.getProjectVerificationChecklist);
router.put('/projects/:id', requireRoles(['SUPER_ADMIN', 'FACULTY_ADMIN', 'TEAM_LEAD']), Project.updateProject);
router.post('/projects/:id/members', requireRoles(['SUPER_ADMIN', 'FACULTY_ADMIN', 'TEAM_LEAD']), Project.addMember);
router.post('/projects/:id/tasks', requireRoles(['SUPER_ADMIN', 'FACULTY_ADMIN', 'TEAM_LEAD']), Project.addTask);
router.put('/tasks/:taskId', Project.updateTaskStatus);
router.post('/contributions', validateBody(contributionLogSchema), Project.logContribution);
router.put('/contributions/:id/review', requireRoles(['SUPER_ADMIN', 'FACULTY_ADMIN', 'MENTOR']), Project.reviewContribution);

// Weekly Progress Tracking
router.post('/weekly-updates', validateBody(weeklyUpdateSchema), WeeklyUpdate.submitWeeklyUpdate);
router.get('/weekly-updates/my', WeeklyUpdate.getMyUpdates);
router.get('/weekly-updates/project/:projectId', WeeklyUpdate.getUpdatesByProject);
router.get('/weekly-updates/review-queue', requireRoles(['SUPER_ADMIN', 'FACULTY_ADMIN', 'MENTOR']), WeeklyUpdate.getReviewQueue);
router.post('/weekly-updates/:id/review', requireRoles(['FACULTY_ADMIN', 'MENTOR']), WeeklyUpdate.reviewWeeklyUpdate);

// Hackathon Module
router.get('/hackathons', Hackathon.listHackathons);
router.post('/hackathons', requireRoles(['SUPER_ADMIN', 'FACULTY_ADMIN', 'TEAM_LEAD']), Hackathon.createHackathon);
router.get('/hackathons/:id', Hackathon.getHackathonById);
router.put('/hackathons/:id/outcomes', requireRoles(['SUPER_ADMIN', 'FACULTY_ADMIN', 'TEAM_LEAD']), Hackathon.updateOutcome);
router.post('/hackathons/:id/certificates', Hackathon.uploadCertificate);
router.post('/hackathons/:id/verify', requireRoles(['SUPER_ADMIN', 'FACULTY_ADMIN']), Hackathon.verifyHackathon);
router.put('/certificates/:certId/verify', requireRoles(['SUPER_ADMIN', 'FACULTY_ADMIN']), Hackathon.verifyCertificate);

// Magazine Editorial
router.post('/magazine/articles', Magazine.submitArticle);
router.get('/magazine/articles/my', Magazine.getMyArticles);
router.get('/magazine/articles', requireRoles(['SUPER_ADMIN', 'FACULTY_ADMIN', 'MAGAZINE_EDITOR']), Magazine.listArticles);
router.get('/magazine/articles/:id', Magazine.getArticleById);
router.put('/magazine/articles/:id/edit', requireRoles(['MAGAZINE_EDITOR', 'FACULTY_ADMIN', 'SUPER_ADMIN']), Magazine.editArticle);
router.post('/magazine/issues', requireRoles(['MAGAZINE_EDITOR', 'FACULTY_ADMIN', 'SUPER_ADMIN']), Magazine.createIssue);
router.get('/magazine/issues', Magazine.listIssues);
router.post('/magazine/issues/:id/publish', requireRoles(['FACULTY_ADMIN', 'SUPER_ADMIN']), Magazine.publishIssue);

// Admin Application Review & User Management
router.get('/admin/applications', requireRoles(['SUPER_ADMIN', 'FACULTY_ADMIN']), Membership.listApplications);
router.get('/admin/applications/:id', requireRoles(['SUPER_ADMIN', 'FACULTY_ADMIN']), Membership.getApplicationById);
router.post('/admin/applications/:id/review', requireRoles(['SUPER_ADMIN', 'FACULTY_ADMIN']), Membership.reviewApplication);

// Reports & Exports
router.get('/reports/contributions/export', requireRoles(['SUPER_ADMIN', 'FACULTY_ADMIN', 'MANAGEMENT_VIEWER']), Reports.exportContributionsReport);
router.get('/reports/hackathons/export', requireRoles(['SUPER_ADMIN', 'FACULTY_ADMIN', 'MANAGEMENT_VIEWER']), Reports.exportHackathonsReport);
router.get('/reports/summary/pdf', requireRoles(['SUPER_ADMIN', 'FACULTY_ADMIN', 'MANAGEMENT_VIEWER']), Reports.generatePdfSummary);

// Notifications
router.get('/notifications', Notification.getMyNotifications);
router.put('/notifications/:id/read', Notification.markAsRead);
router.put('/notifications/read-all', Notification.markAllAsRead);

// Protected File & Document Storage Layer (Section 1)
router.get('/documents', Document.listDocuments);
router.post('/documents/upload', uploadMiddleware.single('file'), Document.uploadDocument);
router.get('/documents/:id/download', Document.downloadDocument);

// Audit Logs
router.get('/audit-logs', requireRoles(['SUPER_ADMIN', 'FACULTY_ADMIN']), Audit.listAuditLogs);

export default router;
