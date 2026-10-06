'use client';

import { useState, useEffect } from 'react';
import { knowledgeApi } from '@/lib/api';
import KnowledgeWizard from '../KnowledgeWizard';

const BLUE = 'hsl(var(--telecom-blue))';

const typeMap: Record<string, string> = {
  BASIC: '基础信息',
  OPERATION: '操作流程',
  PROBLEM: '问题经验',
};

const statusMap: Record<string, string> = {
  DRAFT: '草稿',
  PENDING: '待审核',
  PUBLISHED: '已发布',
  OFFLINE: '已下架',
};

const statusColor: Record<string, string> = {
  DRAFT: 'bg-gray-100 text-gray-700',
  PENDING: 'bg-yellow-100 text-yellow-800',
  PUBLISHED: 'bg-green-100 text-green-800',
  OFFLINE: 'bg-red-100 text-red-700',
};

// AI 整理后的结构化字段（只读详情展示用，与向导保持一致）
const contentFields: Record<string, { key: string; label: string }[]> = {
  BASIC: [
    { key: 'overview', label: '知识概述' },
    { key: 'details', label: '详细信息' },
    { key: 'supplement', label: '补充说明' },
    { key: 'notes', label: '注意事项' },
  ],
  OPERATION: [
    { key: 'scenario', label: '适用场景' },
    { key: 'precheck', label: '操作前确认' },
    { key: 'steps', label: '操作步骤' },
    { key: 'resultVerify', label: '结果验证' },
    { key: 'notes', label: '注意事项' },
  ],
  PROBLEM: [
    { key: 'phenomenon', label: '问题现象' },
    { key: 'cause', label: '问题原因' },
    { key: 'process', label: '排查及处理过程' },
    { key: 'result', label: '处理结果' },
    { key: 'notes', label: '注意事项' },
  ],
};

// 旧版草稿的 rawContent 是结构化字段，这里转换为新的极简字段，保证编辑兼容
const migrateRaw = (type: string, raw: any): Record<string, string> => {
  if (!raw || typeof raw !== 'object') return {};
  // 已是新结构
  if (type === 'BASIC' && ('content' in raw)) return raw;
  if (type === 'OPERATION' && ('how' in raw)) return raw;
  if (type === 'PROBLEM' && ('solution' in raw)) return raw;
  if (type === 'BASIC') {
    return { content: [raw.overview, raw.details].filter(Boolean).join('\n'), supplement: raw.supplement || '' };
  }
  if (type === 'OPERATION') {
    return { how: raw.steps || raw.scenario || '', notes: raw.notes || '' };
  }
  return { cause: raw.cause || '', solution: raw.process || '', notes: raw.notes || '' };
};

interface MyPanelProps {
  prefill?: { question: string; gapId: string } | null; // 缺口转知识：预填问题并自动打开向导
  onPrefillConsumed?: () => void;
}

export default function MyPanel({ prefill, onPrefillConsumed }: MyPanelProps) {
  const [list, setList] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [wizard, setWizard] = useState<{ open: boolean; initial: any }>({ open: false, initial: null });
  const [viewDetail, setViewDetail] = useState<any>(null);

  useEffect(() => {
    if (!wizard.open) loadList();
  }, [wizard.open]);

  // 缺口转知识：自动进入新增向导并预填问题
  useEffect(() => {
    if (prefill) {
      setWizard({
        open: true,
        initial: { question: prefill.question, gapId: prefill.gapId },
      });
      onPrefillConsumed?.();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [prefill]);

  const loadList = async () => {
    setLoading(true);
    try {
      const res = await knowledgeApi.my();
      setList(res.data || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  // 编辑草稿：加载详情后进入向导第 2 步
  const openEdit = async (item: any) => {
    setLoading(true);
    try {
      const res = await knowledgeApi.detail(item.id);
      const d = res.data;
      const v = d.versions?.[0] ?? d.currentVersion ?? {};
      setWizard({
        open: true,
        initial: {
          id: d.id,
          knowledgeType: d.knowledgeType,
          systemModuleId: d.systemModuleId || '',
          moduleId: d.moduleId || '',
          title: d.title || '',
          raw: migrateRaw(d.knowledgeType, v.rawContentJson),
          content: (v.contentJson as any) || {},
          keywords: v.keywords || [],
          permissionLevel: d.permissionLevel || 'NORMAL',
          rejectReason: d.status === 'DRAFT' ? v.changeReason || '' : '',
        },
      });
    } catch (e: any) {
      alert(e.response?.data?.message || '加载失败');
    } finally {
      setLoading(false);
    }
  };

  const openView = async (item: any) => {
    try {
      const res = await knowledgeApi.detail(item.id);
      setViewDetail(res.data);
    } catch (e: any) {
      alert(e.response?.data?.message || '加载失败');
    }
  };

  const submitItem = async (item: any) => {
    if (!confirm('确认提交审核吗？')) return;
    try {
      await knowledgeApi.submit(item.id);
      await loadList();
      alert('已提交审核');
    } catch (e: any) {
      alert(e.response?.data?.message || '提交失败');
    }
  };

  // ===== 向导视图 =====
  if (wizard.open) {
    return (
      <KnowledgeWizard
        initial={wizard.initial}
        onClose={() => setWizard({ open: false, initial: null })}
      />
    );
  }

  const vd = viewDetail;
  const vv = vd?.versions?.[0] ?? vd?.currentVersion ?? {};
  const vContent = (vv.contentJson as any) || {};
  const vKeywords: string[] = vv.keywords || [];

  // ===== 列表视图 =====
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-500">记录个人经验，AI 辅助整理，积累部门知识资产</p>
        <button
          onClick={() => setWizard({ open: true, initial: null })}
          className="rounded-md px-4 py-2 text-sm font-medium text-white hover:opacity-90"
          style={{ backgroundColor: BLUE }}
        >
          + 新增知识
        </button>
      </div>

      <div className="overflow-hidden rounded-lg bg-white shadow-sm">
        <div className="border-b border-gray-200 bg-gray-50 px-6 py-3">
          <h3 className="text-sm font-semibold text-gray-700">我的知识列表</h3>
        </div>
        <div className="p-6">
          {loading ? (
            <div className="py-8 text-center text-gray-500">加载中...</div>
          ) : list.length === 0 ? (
            <div className="py-8 text-center text-gray-500">暂无知识，点击右上角「新增知识」开始记录</div>
          ) : (
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">标题</th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">类型</th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">所属系统</th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">状态</th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">更新时间</th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">操作</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 bg-white">
                {list.map((item) => (
                  <tr key={item.id}>
                    <td className="max-w-xs truncate px-4 py-4 text-sm text-gray-900" title={item.title}>
                      {item.title}
                      {item.status === 'DRAFT' && item.currentVersion?.changeReason && (
                        <span className="ml-1 text-xs text-red-500" title="存在退回原因">⚠</span>
                      )}
                    </td>
                    <td className="whitespace-nowrap px-4 py-4 text-sm text-gray-500">{typeMap[item.knowledgeType]}</td>
                    <td className="whitespace-nowrap px-4 py-4 text-sm text-gray-500">{item.systemModule?.name || '-'}</td>
                    <td className="whitespace-nowrap px-4 py-4">
                      <span className={`inline-flex rounded-full px-2 text-xs font-semibold leading-5 ${statusColor[item.status]}`}>
                        {statusMap[item.status]}
                      </span>
                    </td>
                    <td className="whitespace-nowrap px-4 py-4 text-sm text-gray-500">
                      {new Date(item.updatedAt).toLocaleString('zh-CN')}
                    </td>
                    <td className="whitespace-nowrap px-4 py-4 text-sm">
                      {item.status === 'DRAFT' && (
                        <>
                          <button onClick={() => openEdit(item)} className="mr-3 text-blue-600 hover:text-blue-900">编辑</button>
                          <button onClick={() => submitItem(item)} className="text-green-600 hover:text-green-900">提交审核</button>
                        </>
                      )}
                      {(item.status === 'PENDING' || item.status === 'PUBLISHED') && (
                        <button onClick={() => openView(item)} className="text-blue-600 hover:text-blue-900">查看</button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* 只读详情弹窗 */}
      {viewDetail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black bg-opacity-50">
          <div className="my-8 w-full max-w-2xl rounded-lg bg-white p-6 shadow-xl">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-medium text-gray-900">{vd.title}</h3>
              <button onClick={() => setViewDetail(null)} className="text-gray-400 hover:text-gray-600">✕</button>
            </div>

            <div className="mt-3 flex flex-wrap items-center gap-2">
              <span className="rounded-full bg-blue-100 px-2 py-1 text-xs font-semibold text-blue-800">
                {typeMap[vd.knowledgeType]}
              </span>
              {vKeywords.map((kw) => (
                <span key={kw} className="rounded-full bg-gray-100 px-2 py-1 text-xs text-gray-600">{kw}</span>
              ))}
            </div>

            <div className="mt-4 space-y-3">
              {(contentFields[vd.knowledgeType] || []).map((f) => (
                <div key={f.key}>
                  <h4 className="text-sm font-semibold text-gray-700">{f.label}</h4>
                  <p className="mt-1 whitespace-pre-wrap text-sm text-gray-600">{vContent[f.key] || '-'}</p>
                </div>
              ))}
            </div>

            {vv.changeReason && (
              <div className="mt-4 rounded-md bg-red-50 p-3 text-sm text-red-600">退回原因：{vv.changeReason}</div>
            )}

            <div className="mt-4 flex justify-end">
              <button
                onClick={() => setViewDetail(null)}
                className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
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
