'use client';

import { useEffect, useState } from 'react';
import { extensionApi } from '@/lib/api';

const statusMap: Record<string, { label: string; color: string }> = {
  PENDING: { label: '待审批', color: 'bg-yellow-100 text-yellow-800' },
  APPROVED: { label: '已通过', color: 'bg-green-100 text-green-800' },
  REJECTED: { label: '已驳回', color: 'bg-red-100 text-red-800' },
};

export default function ExtensionsPage() {
  const [myExtensions, setMyExtensions] = useState<any[]>([]);
  const [pendingExtensions, setPendingExtensions] = useState<any[]>([]);
  const [monthlyCount, setMonthlyCount] = useState({ used: 0, limit: 3 });
  const [penaltyConfig, setPenaltyConfig] = useState<any>(null);
  const [user, setUser] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<'my' | 'pending'>('my');
  const [showApplyModal, setShowApplyModal] = useState(false);
  const [applyForm, setApplyForm] = useState({ taskId: '', reason: '', extendDays: 1 });
  const [reviewNote, setReviewNote] = useState('');

  useEffect(() => {
    const userStr = localStorage.getItem('user');
    if (userStr) setUser(JSON.parse(userStr));
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [myRes, countRes, configRes] = await Promise.all([
        extensionApi.myExtensions(),
        extensionApi.monthlyCount(),
        extensionApi.penaltyConfig(),
      ]);
      setMyExtensions(myRes.data);
      setMonthlyCount(countRes.data);
      setPenaltyConfig(configRes.data);

      const userStr = localStorage.getItem('user');
      if (userStr) {
        const u = JSON.parse(userStr);
        if (u.role === 'PM' || u.role === 'MANAGER') {
          const pendingRes = await extensionApi.pending();
          setPendingExtensions(pendingRes.data);
        }
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleApply = async () => {
    try {
      await extensionApi.apply(applyForm.taskId, {
        reason: applyForm.reason,
        extendDays: applyForm.extendDays,
      });
      setShowApplyModal(false);
      setApplyForm({ taskId: '', reason: '', extendDays: 1 });
      loadData();
    } catch (e: any) {
      alert(e.response?.data?.message || '申请失败');
    }
  };

  const handleReview = async (id: string, approved: boolean) => {
    try {
      await extensionApi.review(id, { approved, note: reviewNote });
      setReviewNote('');
      loadData();
    } catch (e: any) {
      alert(e.response?.data?.message || '操作失败');
    }
  };

  const isPM = user?.role === 'PM' || user?.role === 'MANAGER';

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">延期申请</h1>
        <div className="flex items-center gap-4">
          <div className="rounded-lg bg-blue-50 px-4 py-2 text-sm">
            本月已申请 <span className="font-bold text-blue-600">{monthlyCount.used}</span> / {monthlyCount.limit} 次
          </div>
          {penaltyConfig && (
            <div className="rounded-lg bg-orange-50 px-4 py-2 text-sm">
              延期扣罚：每天 ×{penaltyConfig.dailyDecayRate}（最低保留{Math.round(penaltyConfig.minScoreRatio * 100)}%）
            </div>
          )}
        </div>
      </div>

      {penaltyConfig && (
        <div className="rounded-lg border border-orange-200 bg-orange-50 p-4">
          <h3 className="font-medium text-orange-800">延期扣罚规则</h3>
          <p className="mt-1 text-sm text-orange-700">
            每延期1天，积分乘以 {penaltyConfig.dailyDecayRate}（累计计算）。
            例如延期2天 = 基础积分 × {penaltyConfig.dailyDecayRate} × {penaltyConfig.dailyDecayRate} = 基础积分 × {(penaltyConfig.dailyDecayRate ** 2).toFixed(2)}
          </p>
          <p className="mt-1 text-sm text-orange-700">
            最低保留基础积分的 {Math.round(penaltyConfig.minScoreRatio * 100)}%，不会扣成0分。
            审批通过的延期不扣罚。
          </p>
        </div>
      )}

      {isPM && (
        <div className="flex gap-2">
          <button
            onClick={() => setActiveTab('my')}
            className={`rounded-lg px-4 py-2 text-sm font-medium ${
              activeTab === 'my' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700'
            }`}
          >
            我的申请
          </button>
          <button
            onClick={() => setActiveTab('pending')}
            className={`rounded-lg px-4 py-2 text-sm font-medium ${
              activeTab === 'pending' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700'
            }`}
          >
            待我审批 {pendingExtensions.length > 0 && `(${pendingExtensions.length})`}
          </button>
        </div>
      )}

      {activeTab === 'my' && (
        <div className="rounded-lg bg-white shadow">
          <div className="border-b border-gray-200 px-6 py-4">
            <h2 className="font-medium text-gray-900">我的延期申请</h2>
          </div>
          {myExtensions.length === 0 ? (
            <div className="px-6 py-12 text-center text-gray-500">暂无延期申请记录</div>
          ) : (
            <div className="divide-y divide-gray-200">
              {myExtensions.map((ext) => (
                <div key={ext.id} className="px-6 py-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="font-medium text-gray-900">
                        {ext.task?.title || `任务 ${ext.taskId}`}
                      </span>
                      <span className="ml-2 text-sm text-gray-500">
                        申请延期 {ext.extendDays} 天
                      </span>
                    </div>
                    <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${statusMap[ext.status]?.color}`}>
                      {statusMap[ext.status]?.label}
                    </span>
                  </div>
                  <p className="mt-1 text-sm text-gray-600">原因：{ext.reason}</p>
                  <p className="mt-1 text-xs text-gray-400">
                    新截止日期：{new Date(ext.newDeadline).toLocaleDateString('zh-CN')}
                    {ext.reviewNote && ` | 审批意见：${ext.reviewNote}`}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {activeTab === 'pending' && isPM && (
        <div className="rounded-lg bg-white shadow">
          <div className="border-b border-gray-200 px-6 py-4">
            <h2 className="font-medium text-gray-900">待审批</h2>
          </div>
          {pendingExtensions.length === 0 ? (
            <div className="px-6 py-12 text-center text-gray-500">暂无待审批的延期申请</div>
          ) : (
            <div className="divide-y divide-gray-200">
              {pendingExtensions.map((ext) => (
                <div key={ext.id} className="px-6 py-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="font-medium text-gray-900">
                        {ext.task?.title || `任务 ${ext.taskId}`}
                      </span>
                      <span className="ml-2 text-sm text-gray-500">
                        申请人：{ext.user?.name} | 延期 {ext.extendDays} 天
                      </span>
                    </div>
                  </div>
                  <p className="mt-1 text-sm text-gray-600">原因：{ext.reason}</p>
                  <p className="mt-1 text-xs text-gray-400">
                    新截止日期：{new Date(ext.newDeadline).toLocaleDateString('zh-CN')}
                  </p>
                  <div className="mt-3 flex items-center gap-2">
                    <input
                      type="text"
                      placeholder="审批意见（可选）"
                      value={reviewNote}
                      onChange={(e) => setReviewNote(e.target.value)}
                      className="flex-1 rounded-lg border border-gray-300 px-3 py-1.5 text-sm"
                    />
                    <button
                      onClick={() => handleReview(ext.id, true)}
                      className="rounded-lg bg-green-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-green-700"
                    >
                      通过
                    </button>
                    <button
                      onClick={() => handleReview(ext.id, false)}
                      className="rounded-lg bg-red-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-red-700"
                    >
                      驳回
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
