'use client';

import { useEffect, useState } from 'react';
import { scoreApi, userApi } from '@/lib/api';

const typeMap: Record<string, string> = {
  REQUIREMENT: '需求开发',
  TESTING: '测试联调',
  OPS: '运维支撑',
  TEAM: '团队贡献',
  CLIENT_POS: '客户表扬',
  CLIENT_NEG: '客户投诉',
  RISK: '风险扣减',
};

const sourceTypeMap: Record<string, string> = {
  REQUIREMENT: '需求',
  PROJECT: '项目',
};

export default function ScoresPage() {
  const [records, setRecords] = useState<any[]>([]);
  const [allRecords, setAllRecords] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [month, setMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });
  const [activeTab, setActiveTab] = useState<'my' | 'history'>('my');
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [newScore, setNewScore] = useState({
    targetUserId: '',
    type: 'OPS' as string,
    score: 1,
    reason: '',
    evidence: '',
    sourceType: '',
    sourceNo: '',
    sourceName: '',
  });
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const isManager = user.role === 'MANAGER' || user.role === 'PM';
  const canCreate = user.role !== 'MEMBER';

  useEffect(() => {
    loadRecords();
    loadUsers();
    if (user.role === 'MANAGER' || user.role === 'PM') {
      loadAllRecords();
    }
  }, [month]);

  const loadRecords = async () => {
    setLoading(true);
    try {
      const res = await scoreApi.myRecords(month);
      setRecords(res.data || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const loadAllRecords = async () => {
    try {
      const res = await scoreApi.allRecords(month);
      setAllRecords(res.data || []);
    } catch (e) {
      console.error(e);
    }
  };

  const loadUsers = async () => {
    try {
      const res = await userApi.list();
      setUsers(res.data || []);
    } catch (e) {
      console.error(e);
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload: any = { ...newScore };
      if (!payload.sourceType) {
        delete payload.sourceType;
        delete payload.sourceNo;
        delete payload.sourceName;
      }
      await scoreApi.create(payload);
      setShowModal(false);
      setNewScore({
        targetUserId: '',
        type: 'OPS',
        score: 1,
        reason: '',
        evidence: '',
        sourceType: '',
        sourceNo: '',
        sourceName: '',
      });
      loadRecords();
      if (isManager) {
        loadAllRecords();
      }
    } catch (e: any) {
      alert(e.response?.data?.message || '创建失败');
    }
  };

  const totalScore = records.reduce((sum, r) => sum + (r.score || 0), 0);
  const allTotalScore = allRecords.reduce((sum, r) => sum + (r.score || 0), 0);

  const availableTypes = isManager
    ? ['REQUIREMENT', 'OPS', 'TEAM', 'CLIENT_POS', 'CLIENT_NEG', 'RISK']
    : ['OPS', 'TEAM'];

  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">积分管理</h1>
        {canCreate && (
          <button
            onClick={() => setShowModal(true)}
            className="rounded-md px-4 py-2 text-sm font-medium text-white hover:opacity-90"
            style={{ backgroundColor: 'hsl(var(--telecom-blue))' }}
          >
            + 录入积分
          </button>
        )}
      </div>

      {isManager && (
        <div className="mt-4 flex border-b border-gray-200">
          <button
            onClick={() => setActiveTab('my')}
            className={`px-4 py-2 text-sm font-medium ${activeTab === 'my' ? 'border-b-2 text-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
            style={activeTab === 'my' ? { borderColor: 'hsl(var(--telecom-blue))', color: 'hsl(var(--telecom-blue))' } : {}}
          >
            我的积分
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={`px-4 py-2 text-sm font-medium ${activeTab === 'history' ? 'border-b-2 text-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
            style={activeTab === 'history' ? { borderColor: 'hsl(var(--telecom-blue))', color: 'hsl(var(--telecom-blue))' } : {}}
          >
            历史积分录入
          </button>
        </div>
      )}

      <div className="mt-6 flex items-center gap-4">
        <label className="text-sm font-medium text-gray-700">月份：</label>
        <input
          type="month"
          value={month}
          onChange={(e) => setMonth(e.target.value)}
          className="rounded-md border border-gray-300 px-3 py-2 text-sm"
        />
        <div className="ml-auto rounded-lg px-4 py-2" style={{ backgroundColor: 'hsl(var(--secondary))' }}>
          <span className="text-sm" style={{ color: 'hsl(var(--telecom-dark))' }}>
            {activeTab === 'history' ? '全部合计：' : '当月合计：'}
          </span>
          <span className="text-lg font-bold" style={{ color: 'hsl(var(--telecom-blue))' }}>
            {Math.round((activeTab === 'history' ? allTotalScore : totalScore) * 10) / 10}
          </span>
        </div>
      </div>

      {loading ? (
        <div className="mt-8 text-center text-gray-500">加载中...</div>
      ) : activeTab === 'history' && isManager ? (
        <div className="mt-6 overflow-hidden rounded-lg bg-white shadow">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">日期</th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">成员</th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">类型</th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">积分</th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">来源</th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">原因</th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">审核状态</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 bg-white">
              {allRecords.map((r) => (
                <tr key={r.id}>
                  <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500">
                    {new Date(r.createdAt).toLocaleDateString('zh-CN')}
                  </td>
                  <td className="whitespace-nowrap px-6 py-4 text-sm font-medium text-gray-700">
                    {r.user?.name || '-'}
                  </td>
                  <td className="whitespace-nowrap px-6 py-4 text-sm font-medium text-gray-700">
                    {typeMap[r.type]}
                  </td>
                  <td className={`whitespace-nowrap px-6 py-4 text-sm font-bold ${r.score >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {r.score > 0 ? `+${r.score}` : r.score}
                  </td>
                  <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500">
                    {r.sourceType && sourceTypeMap[r.sourceType] ? `${sourceTypeMap[r.sourceType]}: ${r.sourceType === 'REQUIREMENT' ? (r.sourceNo || '-') : (r.sourceName || '-')}` : '-'}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500 max-w-xs truncate" title={r.reason}>{r.reason}</td>
                  <td className="whitespace-nowrap px-6 py-4 text-sm">
                    {r.approvedAt ? (
                      <span className="inline-flex rounded-full bg-green-100 px-2 text-xs font-semibold leading-5 text-green-800">已审核</span>
                    ) : (
                      <span className="inline-flex rounded-full bg-yellow-100 px-2 text-xs font-semibold leading-5 text-yellow-800">待审核</span>
                    )}
                  </td>
                </tr>
              ))}
              {allRecords.length === 0 && (
                <tr><td colSpan={7} className="px-6 py-8 text-center text-sm text-gray-500">暂无积分记录</td></tr>
              )}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="mt-6 overflow-hidden rounded-lg bg-white shadow">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">日期</th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">类型</th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">积分</th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">来源</th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">原因</th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">审核状态</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 bg-white">
              {records.map((r) => (
                <tr key={r.id}>
                  <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500">
                    {new Date(r.createdAt).toLocaleDateString('zh-CN')}
                  </td>
                  <td className="whitespace-nowrap px-6 py-4 text-sm font-medium text-gray-700">
                    {typeMap[r.type]}
                  </td>
                  <td className={`whitespace-nowrap px-6 py-4 text-sm font-bold ${r.score >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {r.score > 0 ? `+${r.score}` : r.score}
                  </td>
                  <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500">
                    {r.sourceType && sourceTypeMap[r.sourceType] ? `${sourceTypeMap[r.sourceType]}: ${r.sourceType === 'REQUIREMENT' ? (r.sourceNo || '-') : (r.sourceName || '-')}` : '-'}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500 max-w-xs truncate" title={r.reason}>{r.reason}</td>
                  <td className="whitespace-nowrap px-6 py-4 text-sm">
                    {r.approvedAt ? (
                      <span className="inline-flex rounded-full bg-green-100 px-2 text-xs font-semibold leading-5 text-green-800">已审核</span>
                    ) : (
                      <span className="inline-flex rounded-full bg-yellow-100 px-2 text-xs font-semibold leading-5 text-yellow-800">待审核</span>
                    )}
                  </td>
                </tr>
              ))}
              {records.length === 0 && (
                <tr><td colSpan={6} className="px-6 py-8 text-center text-sm text-gray-500">暂无积分记录</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* 录入积分弹窗 */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="w-full max-w-2xl rounded-lg bg-white p-6 shadow-xl max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-medium text-gray-900">录入积分</h3>
            <form onSubmit={handleCreate} className="mt-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">成员</label>
                <select required value={newScore.targetUserId} onChange={e => setNewScore({...newScore, targetUserId: e.target.value})}
                  className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm">
                  <option value="">请选择成员</option>
                  {users.filter((u: any) => u.role !== 'MANAGER').map((u: any) => (
                    <option key={u.id} value={u.id}>{u.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">积分类型</label>
                <select required value={newScore.type} onChange={e => setNewScore({...newScore, type: e.target.value})}
                  className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm">
                  {availableTypes.map((t) => (
                    <option key={t} value={t}>{typeMap[t]}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">积分数值</label>
                <input type="number" step="0.5" required value={newScore.score} onChange={e => setNewScore({...newScore, score: Number(e.target.value)})}
                  className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">来源类型（可选）</label>
                <select value={newScore.sourceType} onChange={e => setNewScore({...newScore, sourceType: e.target.value, sourceNo: '', sourceName: ''})}
                  className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm">
                  <option value="">无</option>
                  <option value="REQUIREMENT">需求</option>
                  <option value="PROJECT">项目</option>
                </select>
              </div>
              {newScore.sourceType === 'REQUIREMENT' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700">需求单号</label>
                  <input required value={newScore.sourceNo} onChange={e => setNewScore({...newScore, sourceNo: e.target.value})}
                    className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm" />
                </div>
              )}
              {newScore.sourceType === 'PROJECT' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700">项目名称</label>
                  <input required value={newScore.sourceName} onChange={e => setNewScore({...newScore, sourceName: e.target.value})}
                    className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm" />
                </div>
              )}
              <div>
                <label className="block text-sm font-medium text-gray-700">原因</label>
                <textarea required value={newScore.reason} onChange={e => setNewScore({...newScore, reason: e.target.value})}
                  className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm" rows={3} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">凭证（可选，文件路径）</label>
                <input value={newScore.evidence} onChange={e => setNewScore({...newScore, evidence: e.target.value})}
                  className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm" />
              </div>
              <div className="mt-6 flex justify-end gap-3">
                <button type="button" onClick={() => setShowModal(false)} className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">取消</button>
                <button type="submit" className="rounded-md px-4 py-2 text-sm font-medium text-white hover:opacity-90" style={{ backgroundColor: 'hsl(var(--telecom-blue))' }}>提交</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
