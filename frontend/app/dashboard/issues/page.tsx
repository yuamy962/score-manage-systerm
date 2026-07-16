'use client';

import { useState, useEffect } from 'react';
import { issueApi, configApi, issueScoreApi, userApi } from '@/lib/api';

const categoryMap: Record<string, string> = {
  CONSULTATION: '咨询',
  BUG: '系统BUG',
  DATA_QUERY: '提数',
  TEST_SUPPORT: '测试配合',
  OTHER: '其它',
};

const statusMap: Record<string, string> = {
  PENDING: '待审核',
  APPROVED: '已通过',
  REJECTED: '已拒绝',
};

export default function IssuesPage() {
  const [issues, setIssues] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [showApplyModal, setShowApplyModal] = useState(false);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [editIssue, setEditIssue] = useState<any>(null);
  const [applyIssue, setApplyIssue] = useState<any>(null);
  const [reviewIssueScore, setReviewIssueScore] = useState<any>(null);
  const [systemModules, setSystemModules] = useState<any[]>([]);
  const [pmUsers, setPmUsers] = useState<any[]>([]);
  const [currentUser, setCurrentUser] = useState<any>(null);
  
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    systemModuleId: '',
    occurredAt: '',
    resolvedAt: '',
    hoursSpent: '',
    category: 'CONSULTATION',
    remark: '',
  });

  const [applyData, setApplyData] = useState({
    requestedScore: '',
    reviewerId: '',
  });

  const [reviewData, setReviewData] = useState({
    approvedScore: '',
    status: 'APPROVED',
    remark: '',
  });

  useEffect(() => {
    loadCurrentUser();
    loadIssues();
    loadSystemModules();
    loadPMUsers();
  }, []);

  const loadCurrentUser = async () => {
    const userStr = localStorage.getItem('user');
    if (userStr) {
      setCurrentUser(JSON.parse(userStr));
    }
  };

  const loadIssues = async () => {
    setLoading(true);
    try {
      const res = await issueApi.list();
      const issuesWithScores = await Promise.all(
        res.data.map(async (issue: any) => {
          if (issue.issueScore) {
            return issue;
          }
          try {
            const scoreRes = await issueScoreApi.list();
            const score = scoreRes.data.find((s: any) => s.issueId === issue.id);
            return { ...issue, issueScore: score };
          } catch {
            return issue;
          }
        })
      );
      setIssues(issuesWithScores);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const loadSystemModules = async () => {
    try {
      const res = await configApi.getSystemModules();
      setSystemModules(res.data || []);
    } catch (e) {
      console.error(e);
    }
  };

  const loadPMUsers = async () => {
    try {
      console.log('Loading PM users...');
      const res = await userApi.list();
      console.log('Users API response:', res);
      console.log('Users data:', res.data);
      const pmUsers = (res.data || []).filter((user: any) => 
        user.role === 'PM' || user.role === 'MANAGER'
      );
      console.log('Filtered PM users:', pmUsers);
      setPmUsers(pmUsers);
    } catch (e: any) {
      console.error('Failed to load PM users:', e.response?.data || e.message || e);
    }
  };

  const openModal = (issue?: any) => {
    if (issue) {
      setEditIssue(issue);
      setFormData({
        title: issue.title,
        description: issue.description,
        systemModuleId: issue.systemModuleId || '',
        occurredAt: issue.occurredAt ? new Date(issue.occurredAt).toISOString().split('T')[0] : '',
        resolvedAt: issue.resolvedAt ? new Date(issue.resolvedAt).toISOString().split('T')[0] : '',
        hoursSpent: String(issue.hoursSpent),
        category: issue.category,
        remark: issue.remark || '',
      });
    } else {
      setEditIssue(null);
      setFormData({
        title: '',
        description: '',
        systemModuleId: '',
        occurredAt: new Date().toISOString().split('T')[0],
        resolvedAt: '',
        hoursSpent: '',
        category: 'CONSULTATION',
        remark: '',
      });
    }
    setShowModal(true);
  };

  const openApplyModal = (issue: any) => {
    setApplyIssue(issue);
    setApplyData({
      requestedScore: '',
      reviewerId: pmUsers[0]?.id || '',
    });
    setShowApplyModal(true);
  };

  const openReviewModal = (issueScore: any) => {
    setReviewIssueScore(issueScore);
    setReviewData({
      approvedScore: String(issueScore.requestedScore),
      status: 'APPROVED',
      remark: '',
    });
    setShowReviewModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditIssue(null);
  };

  const closeApplyModal = () => {
    setShowApplyModal(false);
    setApplyIssue(null);
  };

  const closeReviewModal = () => {
    setShowReviewModal(false);
    setReviewIssueScore(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title.trim()) {
      alert('请输入问题标题');
      return;
    }
    if (!formData.description.trim()) {
      alert('请输入内容简述');
      return;
    }
    if (!formData.occurredAt) {
      alert('请选择发生时间');
      return;
    }
    if (!formData.hoursSpent || parseFloat(formData.hoursSpent) <= 0) {
      alert('请输入有效的时间花费');
      return;
    }

    try {
      const submitData = {
        ...formData,
        hoursSpent: parseFloat(formData.hoursSpent),
      };
      if (editIssue) {
        await issueApi.update(editIssue.id, submitData);
      } else {
        await issueApi.create(submitData);
      }
      closeModal();
      loadIssues();
      alert(editIssue ? '修改成功' : '录入成功');
    } catch (err: any) {
      alert(err.response?.data?.message || '操作失败');
    }
  };

  const handleApply = async (e: React.FormEvent) => {
    e.preventDefault();
    const score = parseFloat(applyData.requestedScore);
    if (!applyData.requestedScore || score < 0.5 || score > 5) {
      alert('积分申请额度必须在0.5到5之间');
      return;
    }
    if (!applyData.reviewerId) {
      alert('请选择审核PM');
      return;
    }

    try {
      await issueScoreApi.create({
        issueId: applyIssue.id,
        requestedScore: score,
        reviewerId: applyData.reviewerId,
      });
      closeApplyModal();
      loadIssues();
      alert('申请成功，等待PM审核');
    } catch (err: any) {
      alert(err.response?.data?.message || '申请失败');
    }
  };

  const handleReview = async (e: React.FormEvent) => {
    e.preventDefault();
    const score = parseFloat(reviewData.approvedScore);
    if (!reviewData.approvedScore || score < 0 || score > 5) {
      alert('审核积分必须在0到5之间');
      return;
    }

    try {
      await issueScoreApi.update(reviewIssueScore.id, {
        approvedScore: score,
        status: reviewData.status,
        remark: reviewData.remark,
      });
      closeReviewModal();
      loadIssues();
      alert(reviewData.status === 'APPROVED' ? '审核通过' : '已拒绝');
    } catch (err: any) {
      alert(err.response?.data?.message || '审核失败');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('确定删除该问题记录吗？')) return;
    try {
      await issueApi.delete(id);
      loadIssues();
      alert('删除成功');
    } catch (err: any) {
      alert(err.response?.data?.message || '删除失败');
    }
  };

  const formatDateTime = (dateStr: string) => {
    if (!dateStr) return '-';
    const date = new Date(dateStr);
    return date.toLocaleString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const isPM = currentUser?.role === 'PM';
  const isMember = currentUser?.role === 'MEMBER';
  const isManager = currentUser?.role === 'MANAGER';
  const isReviewer = isPM || isManager;

  const pendingIssues = issues.filter(issue => 
    issue.issueScore && 
    issue.issueScore.status === 'PENDING'
  );

  const pmPendingIssues = pendingIssues.filter(issue => 
    issue.issueScore.reviewerId === currentUser?.id
  );

  const memberIssues = issues.filter(issue => issue.createdBy === currentUser?.id);

  const displayIssues = isPM ? pmPendingIssues : (isMember ? memberIssues : (isManager ? pendingIssues : issues));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">问题管理</h1>
          <p className="mt-1 text-sm text-gray-500">
            {isReviewer ? '审核员工提交的问题积分申请' : '记录运维过程中遇到的问题，可申请积分'}
          </p>
        </div>
        {!isPM && (
          <button
            onClick={() => openModal()}
            className="rounded-md px-4 py-2 text-sm font-medium text-white hover:opacity-90"
            style={{ backgroundColor: 'hsl(var(--telecom-blue))' }}
          >
            + 录入问题
          </button>
        )}
      </div>

      

      <div className="overflow-hidden rounded-lg bg-white shadow">
        <div className="border-b border-gray-200 bg-gray-50 px-6 py-3">
          <h3 className="text-sm font-semibold text-gray-700">
              {isReviewer ? '待审核积分申请' : '问题列表'}
            </h3>
        </div>
        <div className="p-6">
          {loading ? (
            <div className="text-center text-gray-500 py-8">加载中...</div>
          ) : displayIssues.length === 0 ? (
            <div className="text-center text-gray-500 py-8">
              {isPM ? '暂无待审核的积分申请' : '暂无问题记录'}
            </div>
          ) : (
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">标题</th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">所属系统</th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">问题分类</th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">发生时间</th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">录入人</th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">积分</th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">状态</th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">操作</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 bg-white">
                {displayIssues.map((issue) => {
                  const hasApplied = issue.issueScore;
                  const isPending = hasApplied && issue.issueScore.status === 'PENDING';
                  const isApproved = hasApplied && issue.issueScore.status === 'APPROVED';
                  
                  return (
                    <tr key={issue.id}>
                      <td className="whitespace-nowrap px-4 py-4 text-sm text-gray-900 max-w-xs truncate" title={issue.title}>
                        {issue.title}
                      </td>
                      <td className="whitespace-nowrap px-4 py-4 text-sm text-gray-500">
                        {issue.systemModule?.name || '-'}
                      </td>
                      <td className="whitespace-nowrap px-4 py-4">
                        <span className={`inline-flex rounded-full px-2 text-xs font-semibold leading-5 ${
                          issue.category === 'BUG' ? 'bg-red-100 text-red-800' :
                          issue.category === 'DATA_QUERY' ? 'bg-blue-100 text-blue-800' :
                          issue.category === 'TEST_SUPPORT' ? 'bg-green-100 text-green-800' :
                          issue.category === 'CONSULTATION' ? 'bg-yellow-100 text-yellow-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {categoryMap[issue.category]}
                        </span>
                      </td>
                      <td className="whitespace-nowrap px-4 py-4 text-sm text-gray-500">
                        {formatDateTime(issue.occurredAt)}
                      </td>
                      <td className="whitespace-nowrap px-4 py-4 text-sm text-gray-500">
                        {issue.creator?.name}
                      </td>
                      <td className="whitespace-nowrap px-4 py-4 text-sm text-gray-500">
                        {hasApplied ? (
                          isApproved && issue.issueScore.approvedScore !== null ? (
                            <span className="text-green-600 font-medium">{issue.issueScore.approvedScore} 分</span>
                          ) : (
                            <span className="text-gray-500">{issue.issueScore.requestedScore} 分</span>
                          )
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </td>
                      <td className="whitespace-nowrap px-4 py-4">
                        {hasApplied ? (
                          <span className={`inline-flex rounded-full px-2 text-xs font-semibold leading-5 ${
                            isPending ? 'bg-yellow-100 text-yellow-800' :
                            isApproved ? 'bg-green-100 text-green-800' :
                            'bg-red-100 text-red-800'
                          }`}>
                            {statusMap[issue.issueScore.status]}
                          </span>
                        ) : (
                          <span className="text-xs text-gray-400">未申请</span>
                        )}
                      </td>
                      <td className="whitespace-nowrap px-4 py-4 text-sm">
                        {isReviewer && isPending && (
                          <button
                            onClick={() => openReviewModal(issue.issueScore)}
                            className="text-green-600 hover:text-green-900 mr-3"
                          >
                            审核
                          </button>
                        )}
                        {isMember && !hasApplied && (
                          <button
                            onClick={() => openApplyModal(issue)}
                            className="text-blue-600 hover:text-blue-900 mr-3"
                          >
                            申请积分
                          </button>
                        )}
                        {!isReviewer && (
                          <>
                            <button
                              onClick={() => openModal(issue)}
                              className="text-blue-600 hover:text-blue-900 mr-3"
                            >
                              编辑
                            </button>
                            <button
                              onClick={() => handleDelete(issue.id)}
                              className="text-red-600 hover:text-red-900"
                            >
                              删除
                            </button>
                          </>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="w-full max-w-lg rounded-lg bg-white p-6 shadow-xl">
            <h3 className="text-lg font-medium text-gray-900">
              {editIssue ? '编辑问题' : '录入问题'}
            </h3>
            
            <form onSubmit={handleSubmit} className="mt-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">问题标题 *</label>
                <input
                  type="text"
                  required
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                  placeholder="简要描述问题"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">内容简述 *</label>
                <textarea
                  rows={3}
                  required
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                  placeholder="详细描述问题现象、影响范围、已尝试的解决方法等"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">所属系统</label>
                <select
                  value={formData.systemModuleId}
                  onChange={(e) => setFormData({ ...formData, systemModuleId: e.target.value })}
                  className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                >
                  <option value="">请选择所属系统</option>
                  {systemModules.map((module) => (
                    <option key={module.id} value={module.id}>{module.name}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">发生时间 *</label>
                  <input
                    type="date"
                    required
                    value={formData.occurredAt}
                    onChange={(e) => setFormData({ ...formData, occurredAt: e.target.value })}
                    className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">解决时间</label>
                  <input
                    type="date"
                    value={formData.resolvedAt}
                    onChange={(e) => setFormData({ ...formData, resolvedAt: e.target.value })}
                    className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">时间花费（小时）*</label>
                <input
                  type="number"
                  step="0.5"
                  min="0"
                  required
                  value={formData.hoursSpent}
                  onChange={(e) => setFormData({ ...formData, hoursSpent: e.target.value })}
                  className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                  placeholder="处理该问题所花费的时间"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">问题分类 *</label>
                <select
                  required
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                >
                  <option value="CONSULTATION">咨询</option>
                  <option value="BUG">系统BUG</option>
                  <option value="DATA_QUERY">提数</option>
                  <option value="TEST_SUPPORT">测试配合</option>
                  <option value="OTHER">其它</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">备注</label>
                <textarea
                  rows={2}
                  value={formData.remark}
                  onChange={(e) => setFormData({ ...formData, remark: e.target.value })}
                  className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                  placeholder="其他需要说明的信息"
                />
              </div>

              <div className="mt-6 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={closeModal}
                  className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                >
                  取消
                </button>
                <button
                  type="submit"
                  className="rounded-md px-4 py-2 text-sm font-medium text-white hover:opacity-90"
                  style={{ backgroundColor: 'hsl(var(--telecom-blue))' }}
                >
                  {editIssue ? '保存修改' : '录入问题'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showApplyModal && applyIssue && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="w-full max-w-lg rounded-lg bg-white p-6 shadow-xl">
            <h3 className="text-lg font-medium text-gray-900">申请积分</h3>
            <p className="mt-2 text-sm text-gray-500">问题：{applyIssue.title}</p>
            
            <form onSubmit={handleApply} className="mt-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">申请积分额度 *</label>
                <input
                  type="number"
                  step="0.5"
                  min="0.5"
                  max="5"
                  required
                  value={applyData.requestedScore}
                  onChange={(e) => setApplyData({ ...applyData, requestedScore: e.target.value })}
                  className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                  placeholder="请输入0.5-5之间的积分"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">选择审核PM *</label>
                <select
                  required
                  value={applyData.reviewerId}
                  onChange={(e) => setApplyData({ ...applyData, reviewerId: e.target.value })}
                  className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                >
                  <option value="">请选择审核PM</option>
                  {pmUsers.map((pm) => (
                    <option key={pm.id} value={pm.id}>{pm.name}</option>
                  ))}
                </select>
              </div>

              <div className="mt-6 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={closeApplyModal}
                  className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                >
                  取消
                </button>
                <button
                  type="submit"
                  className="rounded-md px-4 py-2 text-sm font-medium text-white hover:opacity-90"
                  style={{ backgroundColor: 'hsl(var(--telecom-blue))' }}
                >
                  确认申请
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showReviewModal && reviewIssueScore && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="w-full max-w-lg rounded-lg bg-white p-6 shadow-xl">
            <h3 className="text-lg font-medium text-gray-900">审核积分申请</h3>
            <div className="mt-2 space-y-1 text-sm text-gray-500">
              <p>问题：{reviewIssueScore.issue?.title}</p>
              <p>申请人：{reviewIssueScore.issue?.creator?.name}</p>
              <p>申请积分：{reviewIssueScore.requestedScore} 分</p>
            </div>
            
            <form onSubmit={handleReview} className="mt-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">审核积分 *</label>
                <input
                  type="number"
                  step="0.5"
                  min="0"
                  max="5"
                  required
                  value={reviewData.approvedScore}
                  onChange={(e) => setReviewData({ ...reviewData, approvedScore: e.target.value })}
                  className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                  placeholder="请输入0-5之间的积分（0表示拒绝）"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">审核状态 *</label>
                <div className="mt-2 flex gap-4">
                  <label className="flex items-center">
                    <input
                      type="radio"
                      name="status"
                      value="APPROVED"
                      checked={reviewData.status === 'APPROVED'}
                      onChange={(e) => setReviewData({ ...reviewData, status: e.target.value })}
                      className="h-4 w-4 text-blue-600"
                    />
                    <span className="ml-2 text-sm text-gray-700">通过</span>
                  </label>
                  <label className="flex items-center">
                    <input
                      type="radio"
                      name="status"
                      value="REJECTED"
                      checked={reviewData.status === 'REJECTED'}
                      onChange={(e) => setReviewData({ ...reviewData, status: e.target.value })}
                      className="h-4 w-4 text-blue-600"
                    />
                    <span className="ml-2 text-sm text-gray-700">拒绝</span>
                  </label>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">备注</label>
                <textarea
                  rows={2}
                  value={reviewData.remark}
                  onChange={(e) => setReviewData({ ...reviewData, remark: e.target.value })}
                  className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                  placeholder="审核备注（可选）"
                />
              </div>

              <div className="rounded-lg bg-amber-50 p-3 border border-amber-200">
                <p className="text-sm text-amber-700">
                  💡 请确认已收到该问题的文档后再审核，重复问题无积分。
                </p>
              </div>

              <div className="mt-6 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={closeReviewModal}
                  className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                >
                  取消
                </button>
                <button
                  type="submit"
                  className="rounded-md px-4 py-2 text-sm font-medium text-white hover:opacity-90"
                  style={{ backgroundColor: 'hsl(var(--telecom-blue))' }}
                >
                  确认审核
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
