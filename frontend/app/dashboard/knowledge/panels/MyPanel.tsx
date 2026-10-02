'use client';

import { useState, useEffect } from 'react';
import { knowledgeApi, configApi } from '@/lib/api';

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

// 三类知识模板的字段定义（员工原始录入 + AI 整理结果共用）
const typeFields: Record<string, { key: string; label: string; placeholder: string }[]> = {
  BASIC: [
    { key: 'overview', label: '知识概述', placeholder: '简要介绍这条知识是什么、解决什么问题' },
    { key: 'details', label: '详细内容', placeholder: '详细描述具体内容' },
    { key: 'supplement', label: '补充说明', placeholder: '其它需要补充的信息' },
    { key: 'notes', label: '注意事项', placeholder: '使用时的注意事项' },
  ],
  OPERATION: [
    { key: 'scenario', label: '应用场景', placeholder: '什么情况下需要执行该操作' },
    { key: 'precheck', label: '前置条件', placeholder: '执行前需要准备的条件' },
    { key: 'steps', label: '操作步骤', placeholder: '具体操作步骤，按顺序描述' },
    { key: 'resultVerify', label: '结果校验', placeholder: '如何验证操作结果是否正确' },
    { key: 'notes', label: '注意事项', placeholder: '操作中的注意事项' },
  ],
  PROBLEM: [
    { key: 'phenomenon', label: '问题现象', placeholder: '遇到问题的具体现象' },
    { key: 'cause', label: '原因分析', placeholder: '问题产生的原因' },
    { key: 'process', label: '处理过程', placeholder: '如何定位并解决问题的过程' },
    { key: 'result', label: '处理结果', placeholder: '最终处理结果' },
    { key: 'notes', label: '经验总结', placeholder: '总结的经验与注意事项' },
  ],
};

const emptyFields = (type: string) => {
  const obj: Record<string, string> = {};
  typeFields[type].forEach((f) => (obj[f.key] = ''));
  return obj;
};

export default function MyPanel() {
  const [list, setList] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [systemModules, setSystemModules] = useState<any[]>([]);
  const [modules, setModules] = useState<any[]>([]);

  const [showModal, setShowModal] = useState(false);
  const [editItem, setEditItem] = useState<any>(null);
  const [saving, setSaving] = useState(false);
  const [organizing, setOrganizing] = useState(false);
  const [rejectReason, setRejectReason] = useState('');

  const [formData, setFormData] = useState<any>({
    knowledgeType: 'BASIC',
    systemModuleId: '',
    moduleId: '',
    permissionLevel: 'NORMAL',
    title: '',
    keywordsText: '',
    raw: emptyFields('BASIC'),
    content: emptyFields('BASIC'),
  });

  useEffect(() => {
    loadList();
    loadSystemModules();
  }, []);

  useEffect(() => {
    if (formData.systemModuleId) {
      loadModules(formData.systemModuleId);
    } else {
      setModules([]);
    }
  }, [formData.systemModuleId]);

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

  const loadSystemModules = async () => {
    try {
      const res = await configApi.getSystemModules();
      setSystemModules(res.data || []);
    } catch (e) {
      console.error(e);
    }
  };

  const loadModules = async (systemModuleId: string) => {
    try {
      const res = await knowledgeApi.modules(systemModuleId);
      setModules(res.data || []);
    } catch (e) {
      setModules([]);
    }
  };

  const openCreate = () => {
    setEditItem(null);
    setRejectReason('');
    const raw = emptyFields('BASIC');
    setFormData({
      knowledgeType: 'BASIC',
      systemModuleId: '',
      moduleId: '',
      permissionLevel: 'NORMAL',
      title: '',
      keywordsText: '',
      raw,
      content: { ...raw },
    });
    setShowModal(true);
  };

  const openEdit = async (item: any) => {
    setLoading(true);
    try {
      const res = await knowledgeApi.detail(item.id);
      const detail = res.data;
      const v = detail.versions?.[0] ?? detail.currentVersion ?? {};
      const raw = v.rawContentJson || emptyFields(detail.knowledgeType);
      const content = v.contentJson || emptyFields(detail.knowledgeType);
      setEditItem(detail);
      setRejectReason(v.changeReason || '');
      setFormData({
        knowledgeType: detail.knowledgeType,
        systemModuleId: detail.systemModuleId || '',
        moduleId: detail.moduleId || '',
        permissionLevel: detail.permissionLevel || 'NORMAL',
        title: detail.title || '',
        keywordsText: (v.keywords || []).join(','),
        raw,
        content,
      });
      setShowModal(true);
    } catch (e: any) {
      alert(e.response?.data?.message || '加载失败');
    } finally {
      setLoading(false);
    }
  };

  const closeModal = () => {
    setShowModal(false);
    setEditItem(null);
    setRejectReason('');
  };

  const changeType = (type: string) => {
    const raw = emptyFields(type);
    setFormData({
      ...formData,
      knowledgeType: type,
      raw,
      content: { ...raw },
    });
  };

  const setField = (part: 'raw' | 'content', key: string, value: string) => {
    setFormData({
      ...formData,
      [part]: { ...formData[part], [key]: value },
    });
  };

  const buildPayload = () => {
    const keywords = formData.keywordsText
      .split(/[,，]/)
      .map((s: string) => s.trim())
      .filter(Boolean);
    return {
      title: formData.title,
      knowledgeType: formData.knowledgeType,
      systemModuleId: formData.systemModuleId || undefined,
      moduleId: formData.moduleId || undefined,
      permissionLevel: formData.permissionLevel,
      rawContent: formData.raw,
      content: formData.content,
      keywords,
    };
  };

  const handleOrganize = async () => {
    if (!formData.title.trim()) {
      alert('请先填写知识标题');
      return;
    }
    setOrganizing(true);
    try {
      const res = await knowledgeApi.organize({
        knowledgeType: formData.knowledgeType,
        rawContent: formData.raw,
      });
      const data = res.data || {};
      const content = emptyFields(formData.knowledgeType);
      Object.keys(data.content || {}).forEach((k) => {
        if (k in content) content[k] = data.content[k] ?? '';
      });
      content.notes = data.notes || '';
      setFormData({
        ...formData,
        title: data.title || formData.title,
        keywordsText: (data.keywords || []).join(','),
        content,
      });
      alert('AI 整理完成，请核对并修改后保存');
    } catch (e: any) {
      alert(e.response?.data?.message || 'AI 整理失败');
    } finally {
      setOrganizing(false);
    }
  };

  const saveDraft = async (): Promise<string | null> => {
    if (!formData.title.trim()) {
      alert('请填写知识标题');
      return null;
    }
    const payload = buildPayload();
    if (editItem) {
      await knowledgeApi.update(editItem.id, payload);
      return editItem.id;
    }
    const res = await knowledgeApi.create(payload);
    setEditItem({ id: res.data.id });
    return res.data.id;
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await saveDraft();
      closeModal();
      await loadList();
      alert('草稿已保存');
    } catch (e: any) {
      alert(e.response?.data?.message || '保存失败');
    } finally {
      setSaving(false);
    }
  };

  const handleSubmit = async () => {
    setSaving(true);
    try {
      const id = await saveDraft();
      if (!id) throw new Error('保存失败');
      await knowledgeApi.submit(id);
      closeModal();
      await loadList();
      alert('已提交审核');
    } catch (e: any) {
      alert(e.response?.data?.message || e.message || '提交失败');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-500">记录个人经验，AI 辅助整理，积累部门知识资产</p>
        <button
          onClick={openCreate}
          className="rounded-md px-4 py-2 text-sm font-medium text-white hover:opacity-90"
          style={{ backgroundColor: 'hsl(var(--telecom-blue))' }}
        >
          + 新增知识
        </button>
      </div>

      <div className="overflow-hidden rounded-lg bg-white shadow">
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
                    <td className="whitespace-nowrap px-4 py-4 text-sm text-gray-500">
                      {item.systemModule?.name || '-'}
                    </td>
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
                          <button onClick={() => openEdit(item)} className="mr-3 text-blue-600 hover:text-blue-900">
                            编辑
                          </button>
                          <button onClick={async () => {
                            if (!confirm('确认提交审核吗？')) return;
                            try {
                              await knowledgeApi.submit(item.id);
                              await loadList();
                              alert('已提交审核');
                            } catch (e: any) {
                              alert(e.response?.data?.message || '提交失败');
                            }
                          }} className="text-green-600 hover:text-green-900">
                            提交审核
                          </button>
                        </>
                      )}
                      {(item.status === 'PUBLISHED' || item.status === 'PENDING') && (
                        <button onClick={() => openEdit(item)} className="text-blue-600 hover:text-blue-900">
                          查看
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 overflow-y-auto">
          <div className="my-8 w-full max-w-2xl rounded-lg bg-white p-6 shadow-xl">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-medium text-gray-900">
                {editItem ? (formData.knowledgeType ? '编辑知识' : '查看知识') : '新增知识'}
              </h3>
              <button onClick={closeModal} className="text-gray-400 hover:text-gray-600">✕</button>
            </div>

            {rejectReason && (
              <div className="mt-3 rounded-md bg-red-50 p-3 text-sm text-red-600">
                退回原因：{rejectReason}
              </div>
            )}

            <div className="mt-4 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">知识类型 *</label>
                  <select
                    value={formData.knowledgeType}
                    onChange={(e) => changeType(e.target.value)}
                    className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                  >
                    <option value="BASIC">基础信息</option>
                    <option value="OPERATION">操作流程</option>
                    <option value="PROBLEM">问题经验</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">知识标题 *</label>
                  <input
                    type="text"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                    placeholder="知识标题"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">所属系统</label>
                  <select
                    value={formData.systemModuleId}
                    onChange={(e) => setFormData({ ...formData, systemModuleId: e.target.value, moduleId: '' })}
                    className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                  >
                    <option value="">请选择系统</option>
                    {systemModules.map((m) => (
                      <option key={m.id} value={m.id}>{m.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">所属模块</label>
                  <select
                    value={formData.moduleId}
                    onChange={(e) => setFormData({ ...formData, moduleId: e.target.value })}
                    className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                  >
                    <option value="">请选择模块</option>
                    {modules.map((m: any) => (
                      <option key={m.id} value={m.id}>{m.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">权限级别</label>
                <select
                  value={formData.permissionLevel}
                  onChange={(e) => setFormData({ ...formData, permissionLevel: e.target.value })}
                  className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                >
                  <option value="NORMAL">普通知识</option>
                  <option value="RESTRICTED">内部受限</option>
                </select>
              </div>

              <div className="rounded-lg border border-gray-200 p-4">
                <div className="mb-2 flex items-center justify-between">
                  <h4 className="text-sm font-semibold text-gray-700">原始内容</h4>
                  <button
                    type="button"
                    onClick={handleOrganize}
                    disabled={organizing}
                    className="rounded-md px-3 py-1.5 text-xs font-medium text-white hover:opacity-90 disabled:opacity-50"
                    style={{ backgroundColor: 'hsl(var(--telecom-blue))' }}
                  >
                    {organizing ? 'AI 整理中...' : '✨ AI 智能整理'}
                  </button>
                </div>
                {typeFields[formData.knowledgeType].map((f) => (
                  <div key={f.key} className="mb-2">
                    <label className="block text-xs font-medium text-gray-600">{f.label}</label>
                    <textarea
                      rows={2}
                      value={formData.raw[f.key] || ''}
                      onChange={(e) => setField('raw', f.key, e.target.value)}
                      className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-1.5 text-sm"
                      placeholder={f.placeholder}
                    />
                  </div>
                ))}
              </div>

              <div className="rounded-lg border border-green-200 bg-green-50/40 p-4">
                <h4 className="mb-2 text-sm font-semibold text-gray-700">整理结果（可修改）</h4>
                <div>
                  <label className="block text-xs font-medium text-gray-600">关键词（逗号分隔）</label>
                  <input
                    type="text"
                    value={formData.keywordsText}
                    onChange={(e) => setFormData({ ...formData, keywordsText: e.target.value })}
                    className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                    placeholder="例如：账务系统, 资金归集, 对账"
                  />
                </div>
                {typeFields[formData.knowledgeType].map((f) => (
                  <div key={f.key} className="mt-2">
                    <label className="block text-xs font-medium text-gray-600">{f.label}</label>
                    <textarea
                      rows={2}
                      value={formData.content[f.key] || ''}
                      onChange={(e) => setField('content', f.key, e.target.value)}
                      className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-1.5 text-sm"
                    />
                  </div>
                ))}
              </div>

              <div className="flex justify-end space-x-3 pt-2">
                <button onClick={closeModal} className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">
                  取消
                </button>
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="rounded-md border px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                >
                  保存草稿
                </button>
                <button
                  onClick={handleSubmit}
                  disabled={saving}
                  className="rounded-md px-4 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50"
                  style={{ backgroundColor: 'hsl(var(--telecom-blue))' }}
                >
                  {saving ? '处理中...' : '保存并提交审核'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
