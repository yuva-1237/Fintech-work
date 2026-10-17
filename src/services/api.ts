/**
 * Fintech Innovation Team Portal - API Client
 * Built to communicate with the Node.js + Express + Prisma backend
 */

const API_BASE_URL =
  (import.meta.env && import.meta.env.VITE_API_URL) ||
  'http://localhost:5000/api/v1';

export interface ApiResponse<T = any> {
  success: boolean;
  message?: string;
  data?: T;
  error?: string;
  [key: string]: any;
}

class ApiClient {
  private baseUrl: string;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl.replace(/\/$/, '');
  }

  private getToken(): string | null {
    return localStorage.getItem('token') || sessionStorage.getItem('token');
  }

  public setToken(token: string): void {
    localStorage.setItem('token', token);
  }

  public clearToken(): void {
    localStorage.removeItem('token');
    sessionStorage.removeItem('token');
  }

  private async request<T = any>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<ApiResponse<T>> {
    const token = this.getToken();
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(options.headers as Record<string, string>),
    };

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    try {
      const response = await fetch(`${this.baseUrl}${endpoint}`, {
        ...options,
        headers,
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        return {
          success: false,
          error: data.error || data.message || `Request failed with status ${response.status}`,
          data: data,
        };
      }

      return data;
    } catch (err) {
      return {
        success: false,
        error: (err as Error).message || 'Network error occurred',
      };
    }
  }

  // Auth Endpoints
  public async login(email: string, password: string) {
    const res = await this.request<{ token: string; user: any }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
    if (res.success && res.token) {
      this.setToken(res.token);
    }
    return res;
  }

  public async getProfile() {
    return this.request('/profile/me');
  }

  public async updateProfile(profileData: any) {
    return this.request('/profile/me', {
      method: 'PUT',
      body: JSON.stringify(profileData),
    });
  }

  public async updateProfileVisibility(isPublicVisible: boolean) {
    return this.request('/profile/visibility', {
      method: 'PATCH',
      body: JSON.stringify({ isPublicVisible }),
    });
  }

  public async requestDataRectification(reason: string, fieldsToRectify?: any) {
    return this.request('/profile/rectification-request', {
      method: 'POST',
      body: JSON.stringify({ reason, fieldsToRectify }),
    });
  }

  // Public Showcase & Landing Page
  public async getShowcaseData() {
    return this.request('/public/showcase');
  }

  public async getPublicProjects() {
    return this.request('/public/projects');
  }

  public async getPublicInnovators() {
    return this.request('/public/innovators');
  }

  public async getPublicAchievements() {
    return this.request('/public/achievements');
  }

  public async getPublishedMagazine() {
    return this.request('/public/magazine');
  }

  // Membership Applications
  public async submitApplication(formData: any) {
    return this.request('/public/apply', {
      method: 'POST',
      body: JSON.stringify(formData),
    });
  }

  public async checkApplicationStatus(emailOrId: { email?: string; id?: string }) {
    const query = new URLSearchParams(emailOrId as Record<string, string>).toString();
    return this.request(`/public/application-status?${query}`);
  }

  public async respondClarification(id: string, notes: any) {
    return this.request(`/public/application-clarify/${id}`, {
      method: 'POST',
      body: JSON.stringify(notes),
    });
  }

  // Projects & Tasks
  public async listProjects() {
    return this.request('/projects');
  }

  public async getProjectById(id: string) {
    return this.request(`/projects/${id}`);
  }

  public async createProject(project: any) {
    return this.request('/projects', {
      method: 'POST',
      body: JSON.stringify(project),
    });
  }

  public async logContribution(contribution: any) {
    return this.request('/contributions', {
      method: 'POST',
      body: JSON.stringify(contribution),
    });
  }

  // Weekly Updates
  public async submitWeeklyUpdate(update: any) {
    return this.request('/weekly-updates', {
      method: 'POST',
      body: JSON.stringify(update),
    });
  }

  public async getMyWeeklyUpdates() {
    return this.request('/weekly-updates/my');
  }

  public async reviewWeeklyUpdate(id: string, review: { comments: string; decision: string }) {
    return this.request(`/weekly-updates/${id}/review`, {
      method: 'POST',
      body: JSON.stringify(review),
    });
  }

  // Hackathons & Certificates
  public async listHackathons() {
    return this.request('/hackathons');
  }

  public async createHackathon(data: any) {
    return this.request('/hackathons', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  public async updateHackathonOutcome(id: string, data: any) {
    return this.request(`/hackathons/${id}/outcomes`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  public async uploadCertificate(hackathonId: string, cert: any) {
    return this.request(`/hackathons/${hackathonId}/certificates`, {
      method: 'POST',
      body: JSON.stringify(cert),
    });
  }

  // Magazine Articles & Editorial
  public async submitArticle(article: any) {
    return this.request('/magazine/articles', {
      method: 'POST',
      body: JSON.stringify(article),
    });
  }

  public async getMyArticles() {
    return this.request('/magazine/articles/my');
  }

  // Admin Controls
  public async getAdminDashboardMetrics() {
    return this.request('/admin/dashboard-metrics');
  }

  public async listApplications(status?: string) {
    const q = status ? `?status=${status}` : '';
    return this.request(`/admin/applications${q}`);
  }

  public async reviewApplication(id: string, decision: string, note?: string) {
    return this.request(`/admin/applications/${id}/review`, {
      method: 'POST',
      body: JSON.stringify({ decision, note }),
    });
  }

  public async listAuditLogs(params?: Record<string, string>) {
    const q = params ? `?${new URLSearchParams(params).toString()}` : '';
    return this.request(`/audit-logs${q}`);
  }

  // Reports
  public getContributionsExportUrl(department?: string, status?: string): string {
    const params = new URLSearchParams();
    if (department) params.set('department', department);
    if (status) params.set('status', status);
    return `${this.baseUrl}/reports/contributions/export?${params.toString()}`;
  }

  public getPdfSummaryUrl(): string {
    return `${this.baseUrl}/reports/summary/pdf`;
  }

  // Documents & Secure File Storage Layer
  public async uploadDocument(file: File, metadata: { hackathonId?: string; fileType?: string; remarks?: string } = {}) {
    const token = this.getToken();
    const formData = new FormData();
    formData.append('file', file);
    if (metadata.hackathonId) formData.append('hackathonId', metadata.hackathonId);
    if (metadata.fileType) formData.append('fileType', metadata.fileType);
    if (metadata.remarks) formData.append('remarks', metadata.remarks);

    const headers: Record<string, string> = {};
    if (token) headers['Authorization'] = `Bearer ${token}`;

    try {
      const response = await fetch(`${this.baseUrl}/documents/upload`, {
        method: 'POST',
        headers,
        body: formData,
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        return { success: false, error: data.error || data.message || 'Upload failed', data };
      }
      return data;
    } catch (err) {
      return { success: false, error: (err as Error).message || 'Network error during upload' };
    }
  }

  public getDocumentDownloadUrl(id: string): string {
    return `${this.baseUrl}/documents/${id}/download`;
  }

  public async listDocuments() {
    return this.request('/documents');
  }

  // Notifications
  public async getNotifications() {
    return this.request('/notifications');
  }

  public async markNotificationRead(id: string) {
    return this.request(`/notifications/${id}/read`, { method: 'PUT' });
  }
}

export const api = new ApiClient(API_BASE_URL);
export default api;
