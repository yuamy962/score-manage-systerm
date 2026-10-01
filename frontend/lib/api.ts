import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export default api;

export const authApi = {
  getCaptcha: () => api.get('/auth/captcha'),
  login: (username: string, password: string, captchaId: string, captchaAnswer: string) =>
    api.post('/auth/login', { username, password, captchaId, captchaAnswer }),
  me: () => api.get('/auth/me'),
  changePassword: (oldPassword: string, newPassword: string) =>
    api.post('/auth/change-password', { oldPassword, newPassword }),
};

export const userApi = {
  list: (role?: string) => api.get('/users', { params: { role } }),
  create: (data: any) => api.post('/users', data),
  update: (id: string, data: any) => api.patch(`/users/${id}`, data),
  resetPassword: (id: string, password: string) =>
    api.post(`/users/${id}/reset-password`, { password }),
};

export const taskApi = {
  list: (userId?: string, filters?: { assigneeId?: string; creatorId?: string; status?: string; planFinishStart?: string; planFinishEnd?: string }) => 
    api.get('/tasks', { params: { userId, ...filters } }),
  pool: () => api.get('/tasks/pool'),
  detail: (id: string) => api.get(`/tasks/${id}`),
  create: (data: any) => api.post('/tasks', data),
  update: (id: string, data: any) => api.patch(`/tasks/${id}`, data),
  updateStatus: (id: string, data: any) => api.patch(`/tasks/${id}/status`, data),
  approve: (id: string, data?: any) => api.post(`/tasks/${id}/approve`, data),
  claim: (id: string) => api.post(`/tasks/${id}/claim`),
  approveClaim: (id: string, data?: any) => api.post(`/tasks/${id}/approve-claim`, data),
  rejectClaim: (id: string) => api.post(`/tasks/${id}/reject-claim`),
  cancelClaim: (id: string) => api.post(`/tasks/${id}/cancel-claim`),
  returnToPool: (id: string) => api.post(`/tasks/${id}/return-to-pool`),
  delete: (id: string) => api.delete(`/tasks/${id}`),
};

export const scoreApi = {
  myRecords: (month?: string) => api.get('/scores/my', { params: { month } }),
  allRecords: (month?: string) => api.get('/scores/all', { params: { month } }),
  ranking: (month: string) => api.get('/scores/ranking', { params: { month } }),
  pmRanking: (month: string) => api.get('/scores/ranking/pm', { params: { month } }),
  yearlyRanking: (year: string) => api.get('/scores/ranking/yearly', { params: { year } }),
  yearlyPmRanking: (year: string) => api.get('/scores/ranking/yearly/pm', { params: { year } }),
  userRecords: (userId: string, month?: string) =>
    api.get(`/scores/user/${userId}`, { params: { month } }),
  create: (data: any) => api.post('/scores', data),
  approve: (id: string) => api.post(`/scores/${id}/approve`),
  getConfig: () => api.get('/scores/config'),
  updateConfig: (configs: any) => api.post('/scores/config', { configs }),
  getGrade: (score: number) => api.get('/scores/grade', { params: { score } }),
  myProgress: () => api.get('/scores/my-progress'),
  roleComparison: () => api.get('/scores/role-comparison'),
  myHistory: () => api.get('/scores/my-history'),
  userHistory: (userId: string) => api.get(`/scores/user/${userId}/history`),
  userProgress: (userId: string) => api.get(`/scores/user/${userId}/progress`),
};

export const badgeApi = {
  definitions: () => api.get('/badges/definitions'),
  myBadges: () => api.get('/badges/my'),
  userBadges: (userId: string) => api.get(`/badges/user/${userId}`),
};

export const appealApi = {
  list: () => api.get('/appeals'),
  create: (data: any) => api.post('/appeals', data),
  review: (id: string, data: any) => api.patch(`/appeals/${id}`, data),
};

export const extensionApi = {
  apply: (taskId: string, data: { reason: string; extendDays: number }) =>
    api.post(`/extensions/task/${taskId}`, data),
  review: (id: string, data: { approved: boolean; note?: string }) =>
    api.patch(`/extensions/${id}/review`, data),
  taskExtensions: (taskId: string) => api.get(`/extensions/task/${taskId}`),
  myExtensions: () => api.get('/extensions/my'),
  pending: () => api.get('/extensions/pending'),
  monthlyCount: () => api.get('/extensions/monthly-count'),
  penaltyConfig: () => api.get('/extensions/penalty-config'),
  updatePenaltyConfig: (data: any) => api.patch('/extensions/penalty-config', data),
};

export const configApi = {
  getTaskConfig: () => api.get('/config/task'),
  updateTaskConfig: (data: { pmBonusRatio: number }) => api.post('/config/task', data),
  getSystemModules: () => api.get('/config/system-modules'),
  getAllSystemModules: () => api.get('/config/system-modules/all'),
  createSystemModule: (data: { name: string; code?: string; description?: string }) => 
    api.post('/config/system-modules', data),
  updateSystemModule: (id: string, data: { name?: string; code?: string; description?: string; status?: boolean }) => 
    api.put(`/config/system-modules/${id}`, data),
  deleteSystemModule: (id: string) => api.delete(`/config/system-modules/${id}`),
};

export const reviewApi = {
  generate: (data: { userId: string; month: string; style?: string }) =>
    api.post('/reviews/generate', data),
  batchGenerate: (data: { month: string; style?: string }) =>
    api.post('/reviews/batch-generate', data),
  update: (id: string, data: { content: string }) =>
    api.patch(`/reviews/${id}`, data),
  publish: (id: string) => api.post(`/reviews/${id}/publish`),
  batchPublish: (data: { month: string }) => api.post('/reviews/batch-publish', data),
  allReviews: (month: string) => api.get('/reviews/all', { params: { month } }),
  userReviews: (userId: string, month?: string) =>
    api.get(`/reviews/user/${userId}`, { params: { month } }),
  myReviews: (month?: string) => api.get('/reviews/my', { params: { month } }),
  myDrafts: (month?: string) => api.get('/reviews/my-drafts', { params: { month } }),
  getReview: (userId: string, month: string, style: string) =>
    api.get(`/reviews/${userId}/${month}/${style}`),
};

export const issueApi = {
  list: (userId?: string) => api.get('/issues', { params: { userId } }),
  detail: (id: string) => api.get(`/issues/${id}`),
  create: (data: any) => api.post('/issues', data),
  update: (id: string, data: any) => api.put(`/issues/${id}`, data),
  delete: (id: string) => api.delete(`/issues/${id}`),
};

export const issueScoreApi = {
  list: (status?: string) => api.get('/issue-scores', { params: { status } }),
  detail: (id: string) => api.get(`/issue-scores/${id}`),
  create: (data: { issueId: string; requestedScore: number; reviewerId: string }) => 
    api.post('/issue-scores', data),
  update: (id: string, data: { approvedScore?: number; status: string; remark?: string }) => 
    api.put(`/issue-scores/${id}`, data),
  delete: (id: string) => api.delete(`/issue-scores/${id}`),
};

export const knowledgeApi = {
  // 知识模块（二级模块）
  modules: (systemModuleId?: string) =>
    api.get('/knowledge/modules', { params: { systemModuleId } }),
  allModules: () => api.get('/knowledge/modules/all'),
  createModule: (data: { systemModuleId: string; name: string; sortOrder?: number }) =>
    api.post('/knowledge/modules', data),
  updateModule: (id: string, data: { name?: string; sortOrder?: number; status?: boolean }) =>
    api.put(`/knowledge/modules/${id}`, data),
  deleteModule: (id: string) => api.delete(`/knowledge/modules/${id}`),

  // 知识
  create: (data: any) => api.post('/knowledge', data),
  update: (id: string, data: any) => api.patch(`/knowledge/${id}`, data),
  organize: (data: { knowledgeType: string; rawContent?: any }) =>
    api.post('/knowledge/organize', data),
  submit: (id: string) => api.post(`/knowledge/${id}/submit`),
  review: (id: string, data: { approved: boolean; reason?: string }) =>
    api.post(`/knowledge/${id}/review`, data),
  my: () => api.get('/knowledge/my'),
  pending: () => api.get('/knowledge/pending'),
  published: () => api.get('/knowledge/published'),
  detail: (id: string) => api.get(`/knowledge/${id}`),
};
