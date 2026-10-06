'use client';

import { useState, useRef, useEffect } from 'react';
import { knowledgeApi } from '@/lib/api';

const BLUE = 'hsl(var(--telecom-blue))';

interface ChatMessage {
  role: 'user' | 'ai';
  content: string;
  sources?: { knowledgeId: string; title: string; version: string; updatedAt: string }[];
  matched?: boolean;
  gapRecorded?: boolean; // 该条无答案消息是否已记录缺口
  gapRecording?: boolean;
  error?: boolean;
}

export default function AskPanel() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  const send = async () => {
    const question = input.trim();
    if (!question || loading) return;
    setInput('');
    setMessages((prev) => [...prev, { role: 'user', content: question }]);
    setLoading(true);
    try {
      const res = await knowledgeApi.ask(question);
      const d = res.data || {};
      setMessages((prev) => [
        ...prev,
        {
          role: 'ai',
          content: d.answer || '抱歉，未能获取回答，请稍后重试。',
          sources: d.sources || [],
          matched: !!d.matched,
          gapRecorded: false,
        },
      ]);
    } catch (e: any) {
      setMessages((prev) => [
        ...prev,
        {
          role: 'ai',
          content: e.response?.data?.message || 'AI 助手暂时不可用，请稍后重试。',
          error: true,
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  // 无答案时记录为知识缺口
  const recordGap = async (index: number) => {
    const msg = messages[index];
    const question = messages
      .slice(0, index)
      .reverse()
      .find((m) => m.role === 'user')?.content;
    if (!question) return;
    setMessages((prev) => prev.map((m, i) => (i === index ? { ...m, gapRecording: true } : m)));
    try {
      await knowledgeApi.createGap({ question });
      setMessages((prev) => prev.map((m, i) => (i === index ? { ...m, gapRecording: false, gapRecorded: true } : m)));
    } catch (e: any) {
      setMessages((prev) => prev.map((m, i) => (i === index ? { ...m, gapRecording: false } : m)));
      alert(e.response?.data?.message || '记录失败，请稍后重试');
    }
  };

  return (
    <div className="overflow-hidden rounded-lg bg-white shadow-sm">
      {/* 顶栏 */}
      <div className="flex items-center border-b border-gray-200 px-6 py-4">
        <div
          className="flex h-9 w-9 items-center justify-center rounded-full text-lg"
          style={{ backgroundColor: 'hsl(var(--telecom-blue) / 0.1)' }}
        >
          🤖
        </div>
        <div className="ml-3">
          <h3 className="text-sm font-semibold text-gray-900">部门 AI 知识助手</h3>
          <p className="text-xs text-gray-500">基于部门已审核知识回答，可咨询业务、系统、操作及问题处理经验</p>
        </div>
      </div>

      {/* 消息区 */}
      <div className="min-h-[320px] space-y-4 bg-gray-50 px-6 py-6" style={{ maxHeight: '60vh', overflowY: 'auto' }}>
        {messages.length === 0 && !loading && (
          <div className="flex flex-col items-center py-16 text-center">
            <div
              className="flex h-14 w-14 items-center justify-center rounded-2xl text-2xl"
              style={{ backgroundColor: 'hsl(var(--telecom-blue) / 0.1)' }}
            >
              🤖
            </div>
            <p className="mt-4 text-sm font-medium text-gray-700">有什么问题，可以直接问我</p>
            <p className="mt-1 text-xs text-gray-500">例如：账务系统有哪些主机？月结资料怎么上传？</p>
          </div>
        )}

        {messages.map((m, i) =>
          m.role === 'user' ? (
            <div key={i} className="flex justify-end">
              <div className="max-w-[75%] rounded-2xl rounded-tr-sm px-4 py-2.5 text-sm text-white" style={{ backgroundColor: BLUE }}>
                {m.content}
              </div>
            </div>
          ) : (
            <div key={i} className="flex justify-start">
              <div className="max-w-[85%] space-y-2">
                <div
                  className={`rounded-2xl rounded-tl-sm border px-4 py-3 text-sm leading-relaxed ${
                    m.error
                      ? 'border-red-200 bg-red-50 text-red-600'
                      : 'border-gray-200 bg-white text-gray-800'
                  }`}
                  style={{ whiteSpace: 'pre-wrap' }}
                >
                  {m.content}
                </div>

                {/* 知识来源 */}
                {m.sources && m.sources.length > 0 && (
                  <div className="flex flex-wrap items-center gap-2 pl-1">
                    <span className="text-xs text-gray-400">知识来源：</span>
                    {m.sources.map((s) => (
                      <span
                        key={s.knowledgeId}
                        className="inline-flex items-center rounded-full bg-blue-50 px-2.5 py-1 text-xs text-blue-700"
                        title={`更新时间：${new Date(s.updatedAt).toLocaleDateString('zh-CN')}`}
                      >
                        📄 {s.title}（{s.version}）
                      </span>
                    ))}
                  </div>
                )}

                {/* 无答案：记录知识缺口 */}
                {m.matched === false && !m.error && (
                  <div className="pl-1">
                    {m.gapRecorded ? (
                      <span className="inline-flex items-center rounded-full bg-green-50 px-2.5 py-1 text-xs text-green-700">
                        ✓ 已记录为知识缺口，等待负责人处理
                      </span>
                    ) : (
                      <button
                        onClick={() => recordGap(i)}
                        disabled={m.gapRecording}
                        className="rounded-md border border-blue-200 bg-blue-50 px-3 py-1.5 text-xs font-medium text-blue-700 transition-colors hover:bg-blue-100 disabled:opacity-60"
                      >
                        {m.gapRecording ? '记录中...' : '+ 记录为知识缺口'}
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>
          ),
        )}

        {loading && (
          <div className="flex justify-start">
            <div className="flex items-center gap-2 rounded-2xl rounded-tl-sm border border-gray-200 bg-white px-4 py-3 text-sm text-gray-500">
              <span className="h-2 w-2 animate-bounce rounded-full bg-blue-400 [animation-delay:0ms]" />
              <span className="h-2 w-2 animate-bounce rounded-full bg-blue-400 [animation-delay:150ms]" />
              <span className="h-2 w-2 animate-bounce rounded-full bg-blue-400 [animation-delay:300ms]" />
              AI 正在检索知识库...
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* 输入区 */}
      <div className="border-t border-gray-200 px-6 py-4">
        <div className="flex items-center gap-3">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.nativeEvent.isComposing) send();
            }}
            placeholder="有什么问题，可以直接问我..."
            className="flex-1 rounded-md border border-gray-300 px-4 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:outline-none"
            disabled={loading}
          />
          <button
            onClick={send}
            disabled={loading || !input.trim()}
            className="rounded-md px-5 py-2.5 text-sm font-medium text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
            style={{ backgroundColor: BLUE }}
          >
            发送
          </button>
        </div>
        <p className="mt-2 text-xs text-gray-400">
          回答仅基于部门已审核发布的知识，AI 不会编造业务信息；未命中时可记录为知识缺口。
        </p>
      </div>
    </div>
  );
}
