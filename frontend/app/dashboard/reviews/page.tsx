'use client';

import { useEffect, useState } from 'react';
import { reviewApi, userApi } from '@/lib/api';

const styleOptions = [
  { value: 'GENERAL', label: '通用型', desc: '专业客观，不偏不倚', icon: '📋' },
  { value: 'ENCOURAGING', label: '新人鼓励型', desc: '温暖鼓励，肯定进步', icon: '🌱' },
  { value: 'STRICT', label: '老油子敲打型', desc: '严肃直接，一针见血', icon: '⚡' },
  { value: 'MOTIVATING', label: '骨干激励型', desc: '激情振奋，激发潜力', icon: '🔥' },
];

const statusMap: Record<string, { label: string; color: string }> = {
  DRAFT: { label: '草稿', color: 'bg-yellow-100 text-yellow-800' },
  PUBLISHED: { label: '已下发', color: 'bg-green-100 text-green-800' },
};

export default function ReviewsPage() {
  const [user, setUser] = useState<any>(null);
  const [users, setUsers] = useState<any[]>([]);
  const [selectedUserId, setSelectedUserId] = useState('');
  const [month, setMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });
  const [style, setStyle] = useState('GENERAL');
  const [reviews, setReviews] = useState<any[]>([]);
  const [myReviews, setMyReviews] = useState<any[]>([]);
  const [allReviews, setAllReviews] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'my' | 'generate' | 'manage'>('my');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState('');

  useEffect(() => {
    const userStr = localStorage.getItem('user');
    if (userStr) {
      const u = JSON.parse(userStr);
      setUser(u);
      if (u.role === 'PM' || u.role === 'MANAGER') {
        loadUsers();
      }
    }
    loadMyReviews();
  }, []);

  useEffect(() => {
    if (selectedUserId) {
      loadUserReviews(selectedUserId);
    }
  }, [selectedUserId, month]);

  useEffect(() => {
    if (activeTab === 'manage') {
      loadAllReviews();
    }
  }, [activeTab, month]);

  const loadUsers = async () => {
    try {
      const res = await userApi.list('MEMBER');
      setUsers(res.data);
    } catch (e) {
      console.error(e);
    }
  };

  const loadMyReviews = async () => {
    try {
      const res = await reviewApi.myReviews(month);
      setMyReviews(res.data);
    } catch (e) {
      console.error(e);
    }
  };

  const loadUserReviews = async (userId: string) => {
    try {
      const res = await reviewApi.userReviews(userId, month);
      setReviews(res.data);
    } catch (e) {
      console.error(e);
    }
  };

  const loadAllReviews = async () => {
    try {
      const res = await reviewApi.allReviews(month);
      setAllReviews(res.data);
    } catch (e) {
      console.error(e);
    }
  };

  const handleGenerate = async () => {
    if (!selectedUserId) {
      alert('请选择员工');
      return;
    }
    setLoading(true);
    try {
      await reviewApi.generate({ userId: selectedUserId, month, style });
      alert('评语生成成功！');
      loadUserReviews(selectedUserId);
    } catch (e: any) {
      alert(e.response?.data?.message || '生成失败');
    } finally {
      setLoading(false);
    }
  };

  const handleBatchGenerate = async () => {
    if (!confirm(`确认为所有成员生成 ${month} 月的绩效评语？`)) return;
    setLoading(true);
    try {
      const res = await reviewApi.batchGenerate({ month, style });
      const success = res.data.filter((r: any) => r.success).length;
      const fail = res.data.filter((r: any) => !r.success).length;
      alert(`批量生成完成！成功 ${success} 人${fail > 0 ? `，失败 ${fail} 人` : ''}`);
    } catch (e: any) {
      alert(e.response?.data?.message || '批量生成失败');
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (review: any) => {
    setEditingId(review.id);
    setEditContent(review.content);
  };

  const handleSaveEdit = async () => {
    if (!editingId) return;
    try {
      await reviewApi.update(editingId, { content: editContent });
      alert('保存成功！');
      setEditingId(null);
      if (activeTab === 'manage') {
        loadAllReviews();
      } else {
        loadUserReviews(selectedUserId);
      }
    } catch (e: any) {
      alert(e.response?.data?.message || '保存失败');
    }
  };

  const handlePublish = async (id: string) => {
    if (!confirm('确认下发该评语？下发后不可再编辑')) return;
    try {
      await reviewApi.publish(id);
      alert('下发成功！');
      if (activeTab === 'manage') {
        loadAllReviews();
      } else {
        loadUserReviews(selectedUserId);
      }
    } catch (e: any) {
      alert(e.response?.data?.message || '下发失败');
    }
  };

  const handleBatchPublish = async () => {
    if (!confirm(`确认批量下发 ${month} 月所有草稿评语？`)) return;
    try {
      const res = await reviewApi.batchPublish({ month });
      const success = res.data.filter((r: any) => r.success).length;
      alert(`批量下发完成！成功 ${success} 条`);
      loadAllReviews();
    } catch (e: any) {
      alert(e.response?.data?.message || '批量下发失败');
    }
  };

  const isManager = user?.role === 'PM' || user?.role === 'MANAGER';

  const renderReviewCard = (review: any, showActions = false) => {
    const status = statusMap[review.status] || statusMap.DRAFT;
    const isEditing = editingId === review.id;

    return (
      <div key={review.id} className="rounded-lg bg-white p-6 shadow">
        <div className="mb-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-500">{review.month}</span>
            <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${status.color}`}>
              {status.label}
            </span>
          </div>
          <span className="text-xs text-gray-400">
            {new Date(review.createdAt).toLocaleString('zh-CN')}
          </span>
        </div>

        {isEditing ? (
          <div className="space-y-3">
            <textarea
              value={editContent}
              onChange={(e) => setEditContent(e.target.value)}
              rows={6}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm leading-relaxed"
            />
            <div className="flex gap-2">
              <button
                onClick={handleSaveEdit}
                className="rounded-md bg-blue-600 px-4 py-1.5 text-sm text-white hover:bg-blue-700"
              >
                保存
              </button>
              <button
                onClick={() => setEditingId(null)}
                className="rounded-md border border-gray-300 px-4 py-1.5 text-sm text-gray-700 hover:bg-gray-50"
              >
                取消
              </button>
            </div>
          </div>
        ) : (
          <>
            <p className="whitespace-pre-wrap text-gray-700 leading-relaxed">{review.content}</p>
            {showActions && review.status === 'DRAFT' && (
              <div className="mt-4 flex gap-2">
                <button
                  onClick={() => handleEdit(review)}
                  className="rounded-md bg-gray-100 px-4 py-1.5 text-sm text-gray-700 hover:bg-gray-200"
                >
                  编辑
                </button>
                <button
                  onClick={() => handlePublish(review.id)}
                  className="rounded-md bg-green-600 px-4 py-1.5 text-sm text-white hover:bg-green-700"
                >
                  下发
                </button>
              </div>
            )}
          </>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">AI 绩效评语</h1>
        <div className="flex items-center gap-2">
          <input
            type="month"
            value={month}
            onChange={(e) => setMonth(e.target.value)}
            className="rounded-lg border border-gray-300 px-3 py-2 text-sm"
          />
        </div>
      </div>

      <div className="flex gap-2">
        <button
          onClick={() => setActiveTab('my')}
          className={`rounded-lg px-4 py-2 text-sm font-medium ${
            activeTab === 'my' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700'
          }`}
        >
          我的评语
        </button>
        {isManager && (
          <>
            <button
              onClick={() => setActiveTab('generate')}
              className={`rounded-lg px-4 py-2 text-sm font-medium ${
                activeTab === 'generate' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700'
              }`}
            >
              生成评语
            </button>
            <button
              onClick={() => setActiveTab('manage')}
              className={`rounded-lg px-4 py-2 text-sm font-medium ${
                activeTab === 'manage' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700'
              }`}
            >
              评语管理
            </button>
          </>
        )}
      </div>

      {activeTab === 'my' && (
        <div className="space-y-4">
          {myReviews.length === 0 ? (
            <div className="rounded-lg bg-white p-12 text-center shadow">
              <p className="text-4xl">🤖</p>
              <p className="mt-2 text-gray-500">暂无绩效评语，请联系项目经理或部门经理生成</p>
            </div>
          ) : (
            myReviews.map((review) => renderReviewCard(review))
          )}
        </div>
      )}

      {activeTab === 'generate' && isManager && (
        <div className="space-y-6">
          <div className="rounded-lg bg-white p-6 shadow">
            <h2 className="mb-4 font-medium text-gray-900">生成评语</h2>

            <div className="space-y-4">
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">选择员工</label>
                <select
                  value={selectedUserId}
                  onChange={(e) => setSelectedUserId(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                >
                  <option value="">请选择</option>
                  {users.map((u) => (
                    <option key={u.id} value={u.id}>{u.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700">评语风格</label>
                <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
                  {styleOptions.map((opt) => (
                    <button
                      key={opt.value}
                      onClick={() => setStyle(opt.value)}
                      className={`rounded-lg border-2 p-3 text-left transition-colors ${
                        style === opt.value
                          ? 'border-blue-500 bg-blue-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <span className="text-2xl">{opt.icon}</span>
                      <p className="mt-1 font-medium text-gray-900">{opt.label}</p>
                      <p className="text-xs text-gray-500">{opt.desc}</p>
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={handleGenerate}
                  disabled={loading || !selectedUserId}
                  className="rounded-lg bg-blue-600 px-6 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
                >
                  {loading ? '生成中...' : '生成评语'}
                </button>
                {user?.role === 'MANAGER' && (
                  <button
                    onClick={handleBatchGenerate}
                    disabled={loading}
                    className="rounded-lg bg-purple-600 px-6 py-2 text-sm font-medium text-white hover:bg-purple-700 disabled:opacity-50"
                  >
                    {loading ? '生成中...' : '批量生成全部成员'}
                  </button>
                )}
              </div>
            </div>
          </div>

          {reviews.length > 0 && (
            <div className="space-y-4">
              <h2 className="font-medium text-gray-900">已生成的评语</h2>
              {reviews.map((review) => renderReviewCard(review, true))}
            </div>
          )}
        </div>
      )}

      {activeTab === 'manage' && isManager && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-medium text-gray-900">
              {month} 月绩效评语 ({allReviews.length} 条)
            </h2>
            {allReviews.some((r) => r.status === 'DRAFT') && (
              <button
                onClick={handleBatchPublish}
                className="rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700"
              >
                批量下发草稿
              </button>
            )}
          </div>

          {allReviews.length === 0 ? (
            <div className="rounded-lg bg-white p-12 text-center shadow">
              <p className="text-gray-500">暂无评语数据</p>
            </div>
          ) : (
            <div className="space-y-4">
              {allReviews.map((review) => (
                <div key={review.id}>
                  <div className="mb-1 text-sm font-medium text-gray-700">
                    {review.user?.name || '未知员工'}
                  </div>
                  {renderReviewCard(review, true)}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
