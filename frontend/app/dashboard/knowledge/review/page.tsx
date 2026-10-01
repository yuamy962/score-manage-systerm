'use client';

import { useState, useEffect } from 'react';
import { knowledgeApi } from '@/lib/api';

const typeMap: Record<string, string> = {
  BASIC: '基础信息',
  OPERATION: '操作流程',
  PROBLEM: '问题经验',
};

const fieldLabels: Record<string, string[]> = {
  BASIC: ['overview', 'details', 'supplement', 'notes'],
  OPERATION: ['scenario', 'precheck', 'steps', 'resultVerify', 'notes'],
  PROBLEM: ['phenomenon', 'cause', 'process', 'result', 'notes'],
};

const fieldLabelText: Record<string, string> = {
  overview: '知识概述',
  details: '详细内容',
  supplement: '补充说明',
  scenario: '应用场景',
  precheck: '前置条件',
  steps: '操作步骤',
  resultVerify: '结果校验',
  phenomenon: '问题现象',
  cause: '原因分析',
  process: '处理过程',
  result: '处理结果',
  notes: '注意事项 / 经验总结',
};

export default function KnowledgeReviewPage() {
  const [list, setList] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [detail, setDetail] = useState<any>(null);
  const [showDetail, setShowDetail] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    loadList();
  }, []);

  const loadList = async () => {
    setLoading(true);
    try {
      const res = await knowledgeApi.pending();
      setList(res.data || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const openDetail = async (item: any) => {
    try {
      const res = await knowledgeApi.detail(item.id);
      setDetail(res.data);
      setRejectReason('');
      setShowDetail(true);
    } catch (e: any) {
      alert(e.response?.data?.message || '加载失败');
    }
  };

  const handleReview = async (approved: boolean) => {
    if (!approved && !rejectReason.trim()) {
      alert('退回时请填写审核意见');
      return;
    }
    setProcessing(true);
    try {
      await knowledgeApi.review(detail.id, { approved, reason: rejectReason });
      setShowDetail(false);
      setDetail(null);
      await loadList();
      alert(approved ? '已通过并发布' : '已退回');
    } catch (e: any) {
      alert(e.response?.data?.message || '审核失败');
    } finally {
      setProcessing(false);
    }
  };

  const v = detail?.versions?.[0] ?? detail?.currentVersion ?? {};
  const contentObj = v.contentJson || {};
  const rawObj = v.rawContentJson || {};
  const keywords: string[] = v.keywords || [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">知识审核</h1>
        <p className="mt-1 text-sm text-gray-500">审核员工提交的知识，通过后正式发布</p>
      </div>

      <div className="overflow-hidden rounded-lg bg-white shadow">
        <div className="border-b border-gray-200 bg-gray-50 px-6 py-3">
          <h3 className="text-sm font-semibold text-gray-700">待审核知识</h3>
        </div>
        <div className="p-6">
          {loading ? (
            <div className="py-8 text-center text-gray-500">加载中...</div>
          ) : list.length === 0 ? (
            <div className="py-8 text-center text-gray-500">暂无待审核的知识</div>
          ) : (
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">标题</th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">类型</th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">所属系统</th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">提交人</th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">提交时间</th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">操作</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 bg-white">
                {list.map((item) => (
                  <tr key={item.id}>
                    <td className="max-w-xs truncate px-4 py-4 text-sm text-gray-900" title={item.title}>
                      {item.title}
                    </td>
                    <td className="whitespace-nowrap px-4 py-4 text-sm text-gray-500">{typeMap[item.knowledgeType]}</td>
                    <td className="whitespace-nowrap px-4 py-4 text-sm text-gray-500">{item.systemModule?.name || '-'}</td>
                    <td className="whitespace-nowrap px-4 py-4 text-sm text-gray-500">{item.creator?.name || '-'}</td>
                    <td className="whitespace-nowrap px-4 py-4 text-sm text-gray-500">
                      {new Date(item.updatedAt).toLocaleString('zh-CN')}
                    </td>
                    <td className="whitespace-nowrap px-4 py-4 text-sm">
                      <button onClick={() => openDetail(item)} className="text-blue-600 hover:text-blue-900">
                        审核
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {showDetail && detail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 overflow-y-auto">
          <div className="my-8 w-full max-w-2xl rounded-lg bg-white p-6 shadow-xl">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-medium text-gray-900">{detail.title}</h3>
              <button onClick={() => setShowDetail(false)} className="text-gray-400 hover:text-gray-600">✕</button>
            </div>

            <div className="mt-3 flex flex-wrap items-center gap-2 text-sm">
              <span className="rounded-full bg-blue-100 px-2 py-1 text-xs font-semibold text-blue-800">
                {typeMap[detail.knowledgeType]}
              </span>
              {keywords.map((kw: string) => (
                <span key={kw} className="rounded-full bg-gray-100 px-2 py-1 text-xs text-gray-600">
                  {kw}
                </span>
              ))}
            </div>

            <div className="mt-4 space-y-3">
              {fieldLabels[detail.knowledgeType].map((key) => (
                <div key={key}>
                  <h4 className="text-sm font-semibold text-gray-700">{fieldLabelText[key]}</h4>
                  <p className="mt-1 whitespace-pre-wrap text-sm text-gray-600">{contentObj[key] || '-'}</p>
                </div>
              ))}
            </div>

            <div className="mt-4 rounded-md border border-gray-200 bg-gray-50 p-3">
              <h4 className="text-xs font-semibold text-gray-500">员工原始记录</h4>
              {fieldLabels[detail.knowledgeType].map((key) => (
                rawObj[key] ? (
                  <p key={key} className="mt-1 text-xs text-gray-500">
                    <span className="font-medium">{fieldLabelText[key]}：</span>
                    {rawObj[key]}
                  </p>
                ) : null
              ))}
            </div>

            <div className="mt-4">
              <label className="block text-sm font-medium text-gray-700">审核意见（退回时必填）</label>
              <textarea
                rows={2}
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                placeholder="填写退回原因或修改建议"
              />
            </div>

            <div className="mt-4 flex justify-end space-x-3">
              <button
                onClick={() => setShowDetail(false)}
                className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                取消
              </button>
              <button
                onClick={() => handleReview(false)}
                disabled={processing}
                className="rounded-md bg-red-500 px-4 py-2 text-sm font-medium text-white hover:bg-red-600 disabled:opacity-50"
              >
                退回
              </button>
              <button
                onClick={() => handleReview(true)}
                disabled={processing}
                className="rounded-md px-4 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50"
                style={{ backgroundColor: 'hsl(var(--telecom-blue))' }}
              >
                {processing ? '处理中...' : '通过并发布'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}