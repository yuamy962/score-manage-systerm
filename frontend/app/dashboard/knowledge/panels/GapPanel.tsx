'use client';

import { useState, useEffect } from 'react';
import { knowledgeApi } from '@/lib/api';

const BLUE = 'hsl(var(--telecom-blue))';

const statusMap: Record<string, string> = {
  PENDING: '待处理',
  PROCESSING: '处理中',
  RESOLVED: '已解决',
  CONVERTED: '已转知识',
};

const statusColor: Record<string, string> = {
  PENDING: 'bg-yellow-100 text-yellow-800',
  PROCESSING: 'bg-blue-100 text-blue-800',
  RESOLVED: 'bg-gray-100 text-gray-600',
  CONVERTED: 'bg-green-100 text-green-800',
};

const STATUS_TABS = [
  { key: '', label: '全部' },
  { key: 'PENDING', label: '待处理' },
  { key: 'PROCESSING', label: '处理中' },
  { key: 'RESOLVED', label: '已解决' },
  { key: 'CONVERTED', label: '已转知识' },
];

interface Props {
  role?: string; // 当前用户角色
  onConvert?: (gapId: string, question: string) => void; // 转为知识：跳到新增向导并预填问题
}

export default function GapPanel({ role, onConvert }: Props) {
  const [list, setList] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState('');
  const [detail, setDetail] = useState<any>(null); // 查看处理说明弹窗

  const canHandle = role === 'PM' || role === 'MANAGER';

  useEffect(() => {
    loadList();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status]);

  const loadList = async () => {
    setLoading(true);
    try {
      const res = await knowledgeApi.gaps(status || undefined);
      setList(res.data || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const markProcessing = async (gap: any) => {
    try {
      await knowledgeApi.updateGap(gap.id, { status: 'PROCESSING' });
      await loadList();
    } catch (e: any) {
      alert(e.response?.data?.message || '操作失败');
    }
  };

  const markResolved = async (gap: any) => {
    const note = prompt('处理说明（选填）：例如问题答案、处理结论等', gap.handleNote || '');
    if (note === null) return;
    try {
      await knowledgeApi.updateGap(gap.id, { status: 'RESOLVED', handleNote: note });
      await loadList();
    } catch (e: any) {
      alert(e.response?.data?.message || '操作失败');
    }
  };

  const convert = (gap: any) => {
    if (!onConvert) return;
    if (!confirm('将把该问题带入「新增知识」流程，创建并保存后此缺口将自动标记为「已转知识」。继续吗？')) return;
    onConvert(gap.id, gap.question);
  };

  return (
    <div className="space-y-4">
      <p className="text-sm text-gray-500">
        AI 无法回答的问题会沉淀为知识缺口，负责人处理后可转为正式知识，持续补齐部门知识库
      </p>

      {/* 状态筛选 */}
      <div className="flex flex-wrap gap-2">
        {STATUS_TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setStatus(t.key)}
            className={`rounded-full px-3.5 py-1.5 text-xs font-medium transition-colors ${
              status === t.key
                ? 'text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
            style={status === t.key ? { backgroundColor: BLUE } : {}}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="overflow-hidden rounded-lg bg-white shadow-sm">
        <div className="border-b border-gray-200 bg-gray-50 px-6 py-3">
          <h3 className="text-sm font-semibold text-gray-700">
            缺口列表{!canHandle && <span className="ml-2 text-xs font-normal text-gray-400">（仅显示我提交的）</span>}
          </h3>
        </div>
        <div className="p-6">
          {loading ? (
            <div className="py-8 text-center text-gray-500">加载中...</div>
          ) : list.length === 0 ? (
            <div className="py-8 text-center text-gray-500">暂无知识缺口</div>
          ) : (
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">问题</th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">所属系统</th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">提问人</th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">处理人</th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">状态</th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">提问时间</th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">操作</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 bg-white">
                {list.map((gap) => (
                  <tr key={gap.id}>
                    <td className="max-w-xs px-4 py-4 text-sm text-gray-900">
                      <span className="block truncate" title={gap.question}>{gap.question}</span>
                      {gap.knowledge && (
                        <span className="mt-0.5 block truncate text-xs text-green-600" title={gap.knowledge.title}>
                          → 已转知识：《{gap.knowledge.title}》
                        </span>
                      )}
                    </td>
                    <td className="whitespace-nowrap px-4 py-4 text-sm text-gray-500">
                      {gap.systemModule?.name || '-'}{gap.module ? ` / ${gap.module.name}` : ''}
                    </td>
                    <td className="whitespace-nowrap px-4 py-4 text-sm text-gray-500">{gap.submitter?.name || '-'}</td>
                    <td className="whitespace-nowrap px-4 py-4 text-sm text-gray-500">{gap.handler?.name || '-'}</td>
                    <td className="whitespace-nowrap px-4 py-4">
                      <span className={`inline-flex rounded-full px-2 text-xs font-semibold leading-5 ${statusColor[gap.status]}`}>
                        {statusMap[gap.status]}
                      </span>
                    </td>
                    <td className="whitespace-nowrap px-4 py-4 text-sm text-gray-500">
                      {new Date(gap.createdAt).toLocaleString('zh-CN')}
                    </td>
                    <td className="whitespace-nowrap px-4 py-4 text-sm">
                      {gap.handleNote && (
                        <button onClick={() => setDetail(gap)} className="mr-3 text-gray-500 hover:text-gray-800" title="查看处理说明">
                          说明
                        </button>
                      )}
                      {canHandle && gap.status === 'PENDING' && (
                        <>
                          <button onClick={() => markProcessing(gap)} className="mr-3 text-blue-600 hover:text-blue-900">开始处理</button>
                          <button onClick={() => convert(gap)} className="text-blue-600 hover:text-blue-900">转为知识</button>
                        </>
                      )}
                      {canHandle && gap.status === 'PROCESSING' && (
                        <>
                          <button onClick={() => markResolved(gap)} className="mr-3 text-green-600 hover:text-green-900">标记解决</button>
                          <button onClick={() => convert(gap)} className="text-blue-600 hover:text-blue-900">转为知识</button>
                        </>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* 处理说明弹窗 */}
      {detail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50" onClick={() => setDetail(null)}>
          <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-sm font-semibold text-gray-900">处理说明</h3>
            <p className="mt-2 whitespace-pre-wrap rounded-md bg-gray-50 p-3 text-sm text-gray-700">
              {detail.handleNote || '（无）'}
            </p>
            <div className="mt-4 flex justify-end">
              <button
                onClick={() => setDetail(null)}
                className="rounded-md border border-gray-300 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
              >
                关闭
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
