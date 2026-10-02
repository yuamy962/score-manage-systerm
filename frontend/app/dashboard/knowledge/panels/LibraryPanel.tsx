'use client';

import { useState, useEffect } from 'react';
import { knowledgeApi, configApi } from '@/lib/api';

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

export default function LibraryPanel() {
  const [list, setList] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [detail, setDetail] = useState<any>(null);
  const [showDetail, setShowDetail] = useState(false);

  // 模块管理（仅 MANAGER）
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [showModuleModal, setShowModuleModal] = useState(false);
  const [moduleList, setModuleList] = useState<any[]>([]);
  const [systemModules, setSystemModules] = useState<any[]>([]);
  const [newModule, setNewModule] = useState({ systemModuleId: '', name: '' });

  useEffect(() => {
    const userStr = localStorage.getItem('user');
    if (userStr) setCurrentUser(JSON.parse(userStr));
    loadList();
  }, []);

  const isManager = currentUser?.role === 'MANAGER';

  const loadList = async () => {
    setLoading(true);
    try {
      const res = await knowledgeApi.published();
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
      setShowDetail(true);
    } catch (e: any) {
      alert(e.response?.data?.message || '加载失败');
    }
  };

  const openModuleModal = async () => {
    setNewModule({ systemModuleId: '', name: '' });
    setShowModuleModal(true);
    try {
      const [mods, sys] = await Promise.all([
        knowledgeApi.allModules(),
        configApi.getSystemModules(),
      ]);
      setModuleList(mods.data || []);
      setSystemModules(sys.data || []);
    } catch (e: any) {
      alert(e.response?.data?.message || '加载模块失败');
    }
  };

  const addModule = async () => {
    if (!newModule.systemModuleId || !newModule.name.trim()) {
      alert('请选择系统并填写模块名称');
      return;
    }
    try {
      await knowledgeApi.createModule({ systemModuleId: newModule.systemModuleId, name: newModule.name.trim() });
      setNewModule({ systemModuleId: '', name: '' });
      const res = await knowledgeApi.allModules();
      setModuleList(res.data || []);
    } catch (e: any) {
      alert(e.response?.data?.message || '新增失败');
    }
  };

  const toggleModule = async (m: any) => {
    try {
      await knowledgeApi.updateModule(m.id, { status: !m.status });
      const res = await knowledgeApi.allModules();
      setModuleList(res.data || []);
    } catch (e: any) {
      alert(e.response?.data?.message || '操作失败');
    }
  };

  const deleteModule = async (m: any) => {
    if (!confirm(`确定删除模块「${m.name}」吗？`)) return;
    try {
      await knowledgeApi.deleteModule(m.id);
      const res = await knowledgeApi.allModules();
      setModuleList(res.data || []);
    } catch (e: any) {
      alert(e.response?.data?.message || '删除失败');
    }
  };

  const v = detail?.versions?.[0] ?? detail?.currentVersion ?? {};
  const contentObj = v.contentJson || {};
  const keywords: string[] = v.keywords || [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-500">部门正式发布的知识，供全员查阅</p>
        {isManager && (
          <button
            onClick={openModuleModal}
            className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            模块管理
          </button>
        )}
      </div>

      <div className="overflow-hidden rounded-lg bg-white shadow">
        <div className="border-b border-gray-200 bg-gray-50 px-6 py-3">
          <h3 className="text-sm font-semibold text-gray-700">已发布知识</h3>
        </div>
        <div className="p-6">
          {loading ? (
            <div className="py-8 text-center text-gray-500">加载中...</div>
          ) : list.length === 0 ? (
            <div className="py-8 text-center text-gray-500">暂无已发布的知识</div>
          ) : (
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">标题</th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">类型</th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">所属系统</th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">关键词</th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">发布人</th>
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
                    <td className="max-w-xs truncate px-4 py-4 text-sm text-gray-500">
                      {(item.currentVersion?.keywords || []).join('、') || '-'}
                    </td>
                    <td className="whitespace-nowrap px-4 py-4 text-sm text-gray-500">{item.creator?.name || '-'}</td>
                    <td className="whitespace-nowrap px-4 py-4 text-sm">
                      <button onClick={() => openDetail(item)} className="text-blue-600 hover:text-blue-900">
                        查看
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
        <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black bg-opacity-50">
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

            <div className="mt-4 flex justify-end">
              <button
                onClick={() => setShowDetail(false)}
                className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                关闭
              </button>
            </div>
          </div>
        </div>
      )}

      {showModuleModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black bg-opacity-50">
          <div className="my-8 w-full max-w-xl rounded-lg bg-white p-6 shadow-xl">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-medium text-gray-900">模块管理</h3>
              <button onClick={() => setShowModuleModal(false)} className="text-gray-400 hover:text-gray-600">✕</button>
            </div>

            <div className="mt-4 flex items-end gap-3">
              <div className="flex-1">
                <label className="block text-xs font-medium text-gray-600">所属系统</label>
                <select
                  value={newModule.systemModuleId}
                  onChange={(e) => setNewModule({ ...newModule, systemModuleId: e.target.value })}
                  className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                >
                  <option value="">请选择系统</option>
                  {systemModules.map((s) => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
              </div>
              <div className="flex-1">
                <label className="block text-xs font-medium text-gray-600">模块名称</label>
                <input
                  type="text"
                  value={newModule.name}
                  onChange={(e) => setNewModule({ ...newModule, name: e.target.value })}
                  className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                  placeholder="如：资金归集"
                />
              </div>
              <button
                onClick={addModule}
                className="rounded-md px-4 py-2 text-sm font-medium text-white hover:opacity-90"
                style={{ backgroundColor: 'hsl(var(--telecom-blue))' }}
              >
                添加
              </button>
            </div>

            <div className="mt-4 overflow-hidden rounded-lg border border-gray-200">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">模块名称</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">所属系统</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">状态</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">操作</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {moduleList.map((m) => (
                    <tr key={m.id}>
                      <td className="px-4 py-2 text-sm text-gray-900">{m.name}</td>
                      <td className="px-4 py-2 text-sm text-gray-500">{m.systemModule?.name || '-'}</td>
                      <td className="px-4 py-2 text-sm">
                        <span className={`inline-flex rounded-full px-2 text-xs font-semibold ${m.status ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'}`}>
                          {m.status ? '启用' : '停用'}
                        </span>
                      </td>
                      <td className="px-4 py-2 text-sm">
                        <button onClick={() => toggleModule(m)} className="mr-3 text-blue-600 hover:text-blue-900">
                          {m.status ? '停用' : '启用'}
                        </button>
                        <button onClick={() => deleteModule(m)} className="text-red-600 hover:text-red-900">
                          删除
                        </button>
                      </td>
                    </tr>
                  ))}
                  {moduleList.length === 0 && (
                    <tr>
                      <td colSpan={4} className="px-4 py-4 text-center text-sm text-gray-500">暂无模块</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            <div className="mt-4 flex justify-end">
              <button
                onClick={() => setShowModuleModal(false)}
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
