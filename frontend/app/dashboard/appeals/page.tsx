'use client';

import { useEffect, useState } from 'react';
import { appealApi, scoreApi } from '@/lib/api';

const statusMap: Record<string, string> = {
  PENDING: '待处理',
  REVIEWING: '复核中',
  RESOLVED: '已裁定',
};

const statusColor: Record<string, string> = {
  PENDING: 'bg-yellow-100 text-yellow-700',
  REVIEWING: 'bg-blue-100 text-blue-700',
  RESOLVED: 'bg-green-100 text-green-700',
};

export default function AppealsPage() {
  const [appeals, setAppeals] = useState<any[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [newAppeal, setNewAppeal] = useState({ scoreRecordId: '', reason: '' });
  const [myRecords, setMyRecords] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const user = JSON.parse(localStorage.getItem('user') || '{}');

  useEffect(() => {
    loadAppeals();
  }, []);

  const loadAppeals = async () => {
    setLoading(true);
    try {
      const res = await appealApi.list();
      setAppeals(res.data || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const openCreate = async () => {
    try {
      const res = await scoreApi.myRecords();
      setMyRecords(res.data || []);
      setShowModal(true);
    } catch (e) {
      alert('加载积分记录失败');
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await appealApi.create({
        scoreRecordId: newAppeal.scoreRecordId,
        reason: newAppeal.reason,
      });
      setShowModal(false);
      setNewAppeal({ scoreRecordId: '', reason: '' });
      loadAppeals();
    } catch (e: any) {
      alert(e.response?.data?.message || '提交失败');
    }
  };

  const handleReview = async (id: string, status: string, data?: any) => {
    try {
      await appealApi.review(id, { status, ...data });
      loadAppeals();
    } catch (e: any) {
      alert(e.response?.data?.message || '处理失败');
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">申诉管理</h1>
        <button
          onClick={openCreate}
          className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-500"
        >
          + 发起申诉
        </button>
      </div>

      {loading ? (
        <div className="mt-8 text-center text-gray-500">加载中...</div>
      ) : (
        <div className="mt-6 overflow-hidden rounded-lg bg-white shadow">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">申诉人</th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">关联积分</th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">理由</th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">状态</th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 bg-white">
              {appeals.map((a) => (
                <tr key={a.id}>
                  <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-900">{a.submitter?.name}</td>
                  <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500">
                    {a.scoreRecord?.score}分（{a.scoreRecord?.reason?.slice(0, 20)}...）
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500 max-w-xs">{a.reason}</td>
                  <td className="whitespace-nowrap px-6 py-4">
                    <span className={`inline-flex rounded-full px-2 text-xs font-semibold leading-5 ${statusColor[a.status]}`}>
                      {statusMap[a.status]}
                    </span>
                  </td>
                  <td className="whitespace-nowrap px-6 py-4 text-sm">
                    <div className="flex gap-2">
                      {a.status === 'PENDING' && user.role === 'PM' && (
                        <button onClick={() => handleReview(a.id, 'REVIEWING', { pmOpinion: '已复核' })}
                          className="text-blue-600 hover:text-blue-900">初审通过</button>
                      )}
                      {a.status === 'REVIEWING' && user.role === 'MANAGER' && (
                        <>
                          <button onClick={() => handleReview(a.id, 'RESOLVED', { result: '申诉成立' })}
                            className="text-green-600 hover:text-green-900">支持</button>
                          <button onClick={() => handleReview(a.id, 'RESOLVED', { result: '申诉驳回' })}
                            className="text-red-600 hover:text-red-900">驳回</button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {appeals.length === 0 && (
                <tr><td colSpan={5} className="px-6 py-8 text-center text-sm text-gray-500">暂无申诉</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* 发起申诉弹窗 */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="w-full max-w-lg rounded-lg bg-white p-6 shadow-xl">
            <h3 className="text-lg font-medium text-gray-900">发起申诉</h3>
            <form onSubmit={handleCreate} className="mt-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">选择积分记录</label>
                <select required value={newAppeal.scoreRecordId} onChange={e => setNewAppeal({...newAppeal, scoreRecordId: e.target.value})}
                  className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm">
                  <option value="">请选择</option>
                  {myRecords.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.score}分 - {r.reason?.slice(0, 30)}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">申诉理由</label>
                <textarea required value={newAppeal.reason} onChange={e => setNewAppeal({...newAppeal, reason: e.target.value})}
                  className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm" rows={3} />
              </div>
              <div className="mt-6 flex justify-end gap-3">
                <button type="button" onClick={() => setShowModal(false)} className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">取消</button>
                <button type="submit" className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-500">提交</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
