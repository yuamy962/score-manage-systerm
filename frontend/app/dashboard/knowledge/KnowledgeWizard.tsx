'use client';

import { useState, useEffect } from 'react';
import { knowledgeApi, configApi } from '@/lib/api';

type WizardStep = 1 | 2 | 3 | 4;

const BLUE = 'hsl(var(--telecom-blue))';

const STEP_LABELS = ['选择类型', '填写内容', 'AI 整理', '确认提交'];

// 第一步：三张类型卡片
const typeCards = [
  {
    key: 'BASIC',
    icon: 'ℹ️',
    title: '基础信息类',
    question: '是什么？在哪里？有哪些？',
    scope: '适用于：主机、数据库、接口、日志位置、系统信息等。',
  },
  {
    key: 'OPERATION',
    icon: '🛠️',
    title: '操作流程类',
    question: '怎么做？',
    scope: '适用于：资料上传、系统启停、版本发布、数据核对等。',
  },
  {
    key: 'PROBLEM',
    icon: '🚨',
    title: '问题经验类',
    question: '出问题以后怎么办？',
    scope: '适用于：故障、异常、接口失败、账单异常等。',
  },
] as const;

// 第二步：员工极简录入字段（按类型变化，title 为公共字段单独处理）
const titleLabels: Record<string, string> = {
  BASIC: '知识名称 *',
  OPERATION: '要做什么 *',
  PROBLEM: '遇到了什么问题 *',
};

const titlePlaceholders: Record<string, string> = {
  BASIC: '例如：账务系统主机信息',
  OPERATION: '例如：上传月结账务资料',
  PROBLEM: '例如：销账接口出现大量消息积压',
};

const rawFields: Record<string, { key: string; label: string; ph: string; rows?: number }[]> = {
  BASIC: [
    { key: 'content', label: '知识内容 *', ph: '直接把你知道的信息写下来即可，不要求格式，AI 会帮你整理。', rows: 7 },
    { key: 'supplement', label: '补充说明（选填）', ph: '有特殊情况、使用范围等可以补充', rows: 3 },
  ],
  OPERATION: [
    { key: 'how', label: '怎么操作 *', ph: '按照你平时真实的操作过程写下来即可，一步一步说。', rows: 7 },
    { key: 'notes', label: '有什么需要特别注意（选填）', ph: '操作前后的注意点、易错点', rows: 3 },
  ],
  PROBLEM: [
    { key: 'cause', label: '最后发现是什么原因（选填）', ph: '定位到的根本原因', rows: 3 },
    { key: 'solution', label: '怎么解决的 *', ph: '按真实处理过程描述即可，怎么查的、怎么处理的。', rows: 7 },
    { key: 'notes', label: '有什么需要特别注意（选填）', ph: '处理这类问题的注意事项', rows: 3 },
  ],
};

// 第三/四步：AI 整理后的结构化字段
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

const emptyRaw = (type: string) => {
  const obj: Record<string, string> = {};
  (rawFields[type] || []).forEach((f) => (obj[f.key] = ''));
  return obj;
};

interface WizardInitial {
  id?: string; // 有 id = 编辑草稿（直接进第 2 步）；无 id = 新增（如缺口转知识，从第 1 步开始）
  knowledgeType?: string;
  systemModuleId?: string;
  moduleId?: string;
  title?: string;
  question?: string; // 缺口转知识：预填的问题
  gapId?: string; // 缺口转知识：创建成功后关联缺口
  raw?: Record<string, string>;
  content?: Record<string, string>;
  keywords?: string[];
  permissionLevel?: string;
  rejectReason?: string;
}

interface Props {
  initial?: WizardInitial | null;
  onClose: () => void;
}

export default function KnowledgeWizard({ initial, onClose }: Props) {
  const [step, setStep] = useState<WizardStep>(initial?.id ? 2 : 1);
  const [knowledgeType, setKnowledgeType] = useState(initial?.knowledgeType || 'BASIC');
  const [systemModuleId, setSystemModuleId] = useState(initial?.systemModuleId || '');
  const [moduleId, setModuleId] = useState(initial?.moduleId || '');
  const [permissionLevel, setPermissionLevel] = useState(initial?.permissionLevel || 'NORMAL');
  const [title, setTitle] = useState(initial?.title || initial?.question || '');
  const [raw, setRaw] = useState<Record<string, string>>(initial?.raw || emptyRaw(initial?.knowledgeType || 'BASIC'));
  const [content, setContent] = useState<Record<string, string>>(initial?.content || {});
  const [keywordsText, setKeywordsText] = useState((initial?.keywords || []).join(','));

  const [savedId, setSavedId] = useState(initial?.id || null);
  const [organizing, setOrganizing] = useState(false);
  const [editable, setEditable] = useState(false);
  const [saving, setSaving] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const [systemModules, setSystemModules] = useState<any[]>([]);
  const [modules, setModules] = useState<any[]>([]);
  const rejectReason = initial?.rejectReason || '';

  useEffect(() => {
    configApi.getSystemModules().then((res) => setSystemModules(res.data || [])).catch(() => {});
  }, []);

  useEffect(() => {
    if (systemModuleId) {
      knowledgeApi.modules(systemModuleId).then((res) => setModules(res.data || [])).catch(() => setModules([]));
    } else {
      setModules([]);
    }
  }, [systemModuleId]);

  // ===== 步骤条 =====
  const Stepper = () => (
    <div className="mb-8">
      <div className="flex items-center">
        {STEP_LABELS.map((label, i) => {
          const n = i + 1;
          const done = step > n;
          const current = step === n;
          return (
            <div key={label} className="flex flex-1 items-center last:flex-none">
              <div className="flex items-center">
                <div
                  className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-medium transition-colors ${
                    done
                      ? 'bg-blue-600 text-white'
                      : current
                        ? 'bg-blue-600 text-white ring-4 ring-blue-100'
                        : 'bg-gray-200 text-gray-500'
                  }`}
                >
                  {done ? '✓' : n}
                </div>
                <span
                  className={`ml-2 hidden whitespace-nowrap text-sm sm:block ${
                    current ? 'font-medium text-gray-900' : done ? 'text-gray-500' : 'text-gray-400'
                  }`}
                >
                  {label}
                </span>
              </div>
              {i < STEP_LABELS.length - 1 && (
                <div className={`mx-3 h-0.5 flex-1 ${step > n ? 'bg-blue-600' : 'bg-gray-200'}`} />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );

  // ===== 数据保存 =====
  const buildPayload = () => ({
    title,
    knowledgeType,
    systemModuleId: systemModuleId || undefined,
    moduleId: moduleId || undefined,
    permissionLevel,
    rawContent: raw,
    content,
    keywords: keywordsText.split(/[,，]/).map((s) => s.trim()).filter(Boolean),
  });

  const persist = async (showTip = true): Promise<string | null> => {
    if (!title.trim()) {
      alert(`请先填写「${titleLabels[knowledgeType].replace(' *', '')}」`);
      return null;
    }
    setSaving(true);
    try {
      const payload = buildPayload();
      if (savedId) {
        await knowledgeApi.update(savedId, payload);
        if (showTip) alert('草稿已保存');
        return savedId;
      }
      const res = await knowledgeApi.create(payload);
      setSavedId(res.data.id);
      // 缺口转知识：创建成功后关联缺口，标记已转知识
      if (initial?.gapId) {
        try {
          await knowledgeApi.convertGap(initial.gapId, res.data.id);
        } catch {
          /* 关联失败不阻断录入流程 */
        }
      }
      if (showTip) alert('草稿已保存');
      return res.data.id;
    } catch (e: any) {
      alert(e.response?.data?.message || '保存失败');
      return null;
    } finally {
      setSaving(false);
    }
  };

  // ===== AI 整理 =====
  const runOrganize = async () => {
    if (!title.trim()) {
      alert(`请先填写「${titleLabels[knowledgeType].replace(' *', '')}」`);
      return;
    }
    setOrganizing(true);
    setStep(3);
    setEditable(false);
    try {
      // 先自动保存草稿，避免整理耗时导致数据丢失
      await persist(false);
      const res = await knowledgeApi.organize({
        knowledgeType,
        rawContent: { ...raw, name: title },
      });
      const d = res.data || {};
      const merged: Record<string, string> = {};
      contentFields[knowledgeType].forEach((f) => {
        merged[f.key] = d.content?.[f.key] ?? '';
      });
      if ('notes' in merged) merged.notes = d.notes || '';
      setContent(merged);
      if (d.title) setTitle(d.title);
      setKeywordsText((d.keywords || []).join(','));
      setOrganizing(false);
    } catch (e: any) {
      setOrganizing(false);
      setStep(2);
      alert(e.response?.data?.message || 'AI 整理失败，请稍后重试');
    }
  };

  // ===== 提交审核 =====
  const submitReview = async () => {
    setSubmitting(true);
    try {
      const id = await persist(false);
      if (!id) return;
      await knowledgeApi.submit(id);
      setSubmitted(true);
    } catch (e: any) {
      alert(e.response?.data?.message || '提交失败');
    } finally {
      setSubmitting(false);
    }
  };

  const resetAll = () => {
    setStep(1);
    setKnowledgeType('BASIC');
    setSystemModuleId('');
    setModuleId('');
    setPermissionLevel('NORMAL');
    setTitle('');
    setRaw(emptyRaw('BASIC'));
    setContent({});
    setKeywordsText('');
    setSavedId(null);
    setEditable(false);
    setSubmitted(false);
  };

  const systemModuleName = systemModules.find((s) => s.id === systemModuleId)?.name || '未选择';
  const moduleName = modules.find((m) => m.id === moduleId)?.name || '未选择';

  // ==================== 提交成功页 ====================
  if (submitted) {
    return (
      <div className="mx-auto max-w-md rounded-lg bg-white p-10 text-center shadow-sm">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
          <span className="text-3xl text-green-600">✓</span>
        </div>
        <h2 className="mt-6 text-xl font-semibold text-gray-900">提交成功</h2>
        <p className="mt-2 text-sm leading-6 text-gray-500">
          知识已提交审核。
          <br />
          审核通过后将自动进入正式知识库。
        </p>
        <div className="mt-8 flex justify-center space-x-3">
          <button
            onClick={onClose}
            className="rounded-md border border-gray-300 px-5 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            查看我的知识
          </button>
          <button
            onClick={resetAll}
            className="rounded-md px-5 py-2 text-sm font-medium text-white hover:opacity-90"
            style={{ backgroundColor: BLUE }}
          >
            继续新增知识
          </button>
        </div>
      </div>
    );
  }

  return (
    <div>
      {/* 顶部：标题 + 返回 */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">新增知识</h2>
          <p className="mt-1 text-sm text-gray-500">你只负责把知道的写下来，格式化的事情交给 AI。</p>
        </div>
        <button onClick={onClose} className="text-sm text-gray-500 hover:text-gray-700">
          ← 返回列表
        </button>
      </div>

      <Stepper />

      {/* ==================== 第一步：选择类型 ==================== */}
      {step === 1 && (
        <div>
          <p className="mb-6 text-sm text-gray-500">选择要沉淀的知识类型，系统将根据不同类型提供对应的录入模板。</p>
          <div className="grid gap-4 md:grid-cols-3">
            {typeCards.map((card) => {
              const selected = knowledgeType === card.key;
              return (
                <button
                  key={card.key}
                  onClick={() => {
                    setKnowledgeType(card.key);
                    setRaw(emptyRaw(card.key));
                    setContent({});
                    setKeywordsText('');
                  }}
                  className={`relative rounded-lg border-2 bg-white p-6 text-left transition-all ${
                    selected ? 'border-blue-600 bg-blue-50/50 shadow-sm' : 'border-gray-200 hover:border-blue-300'
                  }`}
                >
                  {selected && (
                    <span className="absolute right-3 top-3 flex h-6 w-6 items-center justify-center rounded-full bg-blue-600 text-xs text-white">
                      ✓
                    </span>
                  )}
                  <span className="text-2xl">{card.icon}</span>
                  <h3 className={`mt-3 text-base font-semibold ${selected ? 'text-blue-700' : 'text-gray-900'}`}>
                    {card.title}
                  </h3>
                  <p className="mt-2 text-sm font-medium text-gray-700">{card.question}</p>
                  <p className="mt-2 text-xs leading-5 text-gray-500">{card.scope}</p>
                </button>
              );
            })}
          </div>
          <div className="mt-8 flex justify-end">
            <button
              onClick={() => setStep(2)}
              className="rounded-md px-6 py-2.5 text-sm font-medium text-white hover:opacity-90"
              style={{ backgroundColor: BLUE }}
            >
              下一步：填写内容 →
            </button>
          </div>
        </div>
      )}

      {/* ==================== 第二步：填写原始内容 ==================== */}
      {step === 2 && (
        <div className="mx-auto max-w-2xl">
          {rejectReason && (
            <div className="mb-4 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-600">
              审核退回原因：{rejectReason}（修改后请重新提交）
            </div>
          )}

          <div className="rounded-lg bg-white p-8 shadow-sm">
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">所属系统 *</label>
                <select
                  value={systemModuleId}
                  onChange={(e) => {
                    setSystemModuleId(e.target.value);
                    setModuleId('');
                  }}
                  className="mt-1.5 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                >
                  <option value="">请选择</option>
                  {systemModules.map((s) => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">所属模块</label>
                <select
                  value={moduleId}
                  onChange={(e) => setModuleId(e.target.value)}
                  className="mt-1.5 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                >
                  <option value="">请选择</option>
                  {modules.map((m) => (
                    <option key={m.id} value={m.id}>{m.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">权限级别</label>
                <select
                  value={permissionLevel}
                  onChange={(e) => setPermissionLevel(e.target.value)}
                  className="mt-1.5 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                >
                  <option value="NORMAL">普通知识</option>
                  <option value="RESTRICTED">内部受限</option>
                </select>
              </div>
            </div>

            <div className="mt-5 border-t border-gray-100 pt-5">
              <div>
                <label className="block text-sm font-medium text-gray-700">{titleLabels[knowledgeType]}</label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder={titlePlaceholders[knowledgeType]}
                  className="mt-1.5 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                />
              </div>

              {rawFields[knowledgeType].map((f) => (
                <div key={f.key} className="mt-4">
                  <label className="block text-sm font-medium text-gray-700">{f.label}</label>
                  <textarea
                    rows={f.rows || 3}
                    value={raw[f.key] || ''}
                    onChange={(e) => setRaw({ ...raw, [f.key]: e.target.value })}
                    placeholder={f.ph}
                    className="mt-1.5 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm leading-6 focus:border-blue-500 focus:outline-none"
                  />
                </div>
              ))}

              <div className="mt-4">
                <label className="block text-sm font-medium text-gray-500">相关资料（选填）</label>
                <button
                  type="button"
                  disabled
                  title="附件功能即将上线"
                  className="mt-1.5 rounded-md border border-dashed border-gray-300 px-4 py-2 text-sm text-gray-400"
                >
                  + 上传附件
                </button>
                <p className="mt-1 text-xs text-gray-400">支持 Word / Excel / PDF / PPT / 图片（即将上线）</p>
              </div>
            </div>
          </div>

          <div className="mt-6 flex items-center justify-between">
            <button onClick={() => setStep(1)} className="rounded-md border border-gray-300 px-5 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">
              ← 上一步
            </button>
            <div className="flex space-x-3">
              <button
                onClick={() => persist(true)}
                disabled={saving}
                className="rounded-md border border-gray-300 px-5 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
              >
                保存草稿
              </button>
              <button
                onClick={runOrganize}
                disabled={saving}
                className="rounded-md px-5 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50"
                style={{ backgroundColor: BLUE }}
              >
                {saving ? '保存中...' : '✨ AI 整理 →'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ==================== 第三步：AI 整理 ==================== */}
      {step === 3 && organizing && (
        <div className="mx-auto max-w-md rounded-lg bg-white p-12 text-center shadow-sm">
          <div className="mx-auto h-10 w-10 animate-spin rounded-full border-4 border-blue-100 border-t-blue-600" />
          <h3 className="mt-6 text-base font-semibold text-gray-900">AI 正在整理知识……</h3>
          <p className="mt-2 text-sm text-gray-500">正在整理结构、优化表达并提取关键词，请稍候。</p>
        </div>
      )}

      {step === 3 && !organizing && (
        <div>
          <div className="grid grid-cols-5 gap-6">
            {/* 左：原始内容 */}
            <div className="col-span-2 rounded-lg bg-white p-6 shadow-sm">
              <h3 className="text-sm font-semibold text-gray-500">原始内容</h3>
              <div className="mt-4 space-y-4">
                <div>
                  <h4 className="text-xs font-medium text-gray-400">{titleLabels[knowledgeType].replace(' *', '')}</h4>
                  <p className="mt-1 whitespace-pre-wrap text-sm text-gray-700">{title || '-'}</p>
                </div>
                {rawFields[knowledgeType].map((f) => (
                  <div key={f.key}>
                    <h4 className="text-xs font-medium text-gray-400">{f.label.replace('（选填）', '').replace(' *', '')}</h4>
                    <p className="mt-1 whitespace-pre-wrap text-sm text-gray-700">{raw[f.key] || '-'}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* 右：AI 整理结果 */}
            <div className="col-span-3 rounded-lg bg-white p-6 shadow-sm">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-blue-700">AI 整理后的知识</h3>
                {!editable && (
                  <span className="rounded-full bg-blue-50 px-2 py-0.5 text-xs text-blue-600">待确认</span>
                )}
              </div>

              <div className="mt-4">
                <label className="block text-xs font-medium text-gray-500">知识标题</label>
                {editable ? (
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm font-medium focus:border-blue-500 focus:outline-none"
                  />
                ) : (
                  <p className="mt-1 text-base font-semibold text-gray-900">{title || '-'}</p>
                )}
              </div>

              <div className="mt-4">
                <label className="block text-xs font-medium text-gray-500">关键词</label>
                {editable ? (
                  <input
                    type="text"
                    value={keywordsText}
                    onChange={(e) => setKeywordsText(e.target.value)}
                    placeholder="多个关键词用逗号分隔"
                    className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                  />
                ) : (
                  <div className="mt-1.5 flex flex-wrap gap-1.5">
                    {(keywordsText.split(/[,，]/).map((s) => s.trim()).filter(Boolean)).map((kw) => (
                      <span key={kw} className="rounded-full bg-blue-50 px-2.5 py-0.5 text-xs text-blue-700">{kw}</span>
                    ))}
                  </div>
                )}
              </div>

              <div className="mt-4 space-y-4">
                {contentFields[knowledgeType].map((f) => (
                  <div key={f.key}>
                    <label className="block text-xs font-medium text-gray-500">{f.label}</label>
                    {editable ? (
                      <textarea
                        rows={3}
                        value={content[f.key] || ''}
                        onChange={(e) => setContent({ ...content, [f.key]: e.target.value })}
                        className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm leading-6 focus:border-blue-500 focus:outline-none"
                      />
                    ) : (
                      <p className="mt-1 whitespace-pre-wrap text-sm leading-6 text-gray-700">{content[f.key] || '-'}</p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="mt-6 flex items-center justify-between">
            <button onClick={() => setStep(2)} className="rounded-md border border-gray-300 px-5 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">
              ← 修改原始内容
            </button>
            <div className="flex space-x-3">
              <button
                onClick={runOrganize}
                className="rounded-md border border-blue-200 px-5 py-2 text-sm font-medium text-blue-700 hover:bg-blue-50"
              >
                ↻ 重新 AI 整理
              </button>
              {editable ? (
                <button
                  onClick={() => setEditable(false)}
                  className="rounded-md border border-blue-200 px-5 py-2 text-sm font-medium text-blue-700 hover:bg-blue-50"
                >
                  完成修改
                </button>
              ) : (
                <button
                  onClick={() => setEditable(true)}
                  className="rounded-md border border-blue-200 px-5 py-2 text-sm font-medium text-blue-700 hover:bg-blue-50"
                >
                  手工修改
                </button>
              )}
              <button
                onClick={() => {
                  setEditable(false);
                  setStep(4);
                }}
                className="rounded-md px-5 py-2 text-sm font-medium text-white hover:opacity-90"
                style={{ backgroundColor: BLUE }}
              >
                确认内容 →
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ==================== 第四步：确认并提交审核 ==================== */}
      {step === 4 && (
        <div className="mx-auto max-w-2xl">
          <div className="rounded-lg bg-white p-8 shadow-sm">
            <h2 className="text-lg font-semibold text-gray-900">{title || '-'}</h2>
            <div className="mt-2 flex flex-wrap items-center gap-3 text-sm text-gray-500">
              <span className="rounded-full bg-blue-50 px-2.5 py-0.5 text-xs font-medium text-blue-700">
                {typeCards.find((c) => c.key === knowledgeType)?.title}
              </span>
              <span>所属系统：{systemModuleName}</span>
              <span>所属模块：{moduleName}</span>
            </div>

            <div className="mt-6 space-y-5 border-t border-gray-100 pt-6">
              {contentFields[knowledgeType].map((f) => (
                <div key={f.key}>
                  <h4 className="text-sm font-semibold text-gray-700">{f.label}</h4>
                  <p className="mt-1 whitespace-pre-wrap text-sm leading-6 text-gray-600">{content[f.key] || '-'}</p>
                </div>
              ))}
            </div>

            <div className="mt-6 border-t border-gray-100 pt-4">
              <h4 className="text-sm font-semibold text-gray-700">关键词</h4>
              <div className="mt-1.5 flex flex-wrap gap-1.5">
                {(keywordsText.split(/[,，]/).map((s) => s.trim()).filter(Boolean)).map((kw) => (
                  <span key={kw} className="rounded-full bg-blue-50 px-2.5 py-0.5 text-xs text-blue-700">{kw}</span>
                ))}
              </div>
            </div>
          </div>

          <div className="mt-4 rounded-md bg-blue-50 p-4 text-sm leading-6 text-blue-700">
            提交后将进入知识审核流程，审核通过后正式进入部门知识库，并可被 AI 知识助手检索使用。
          </div>

          <div className="mt-6 flex items-center justify-between">
            <button onClick={() => setStep(3)} className="rounded-md border border-gray-300 px-5 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">
              ← 返回修改
            </button>
            <button
              onClick={submitReview}
              disabled={submitting}
              className="rounded-md px-6 py-2.5 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50"
              style={{ backgroundColor: BLUE }}
            >
              {submitting ? '提交中...' : '提交审核'}
            </button>
          </div>
        </div>
      )}
    </div>
    );
}
