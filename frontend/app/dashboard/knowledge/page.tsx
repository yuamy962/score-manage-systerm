'use client';

import { useState, useEffect, useCallback, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import LibraryPanel from './panels/LibraryPanel';
import MyPanel from './panels/MyPanel';
import ReviewPanel from './panels/ReviewPanel';
import AskPanel from './panels/AskPanel';
import GapPanel from './panels/GapPanel';

type TabKey = 'library' | 'ask' | 'my' | 'review' | 'gaps';

const tabs: { key: TabKey; label: string; roles?: string[] }[] = [
  { key: 'library', label: '知识库' },
  { key: 'ask', label: 'AI 知识助手' },
  { key: 'my', label: '我的知识' },
  { key: 'review', label: '知识审核', roles: ['PM', 'MANAGER'] },
  { key: 'gaps', label: '知识缺口' },
];

function KnowledgeTabs() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<TabKey>('library');
  const [currentUser, setCurrentUser] = useState<any>(null);
  // 缺口转知识：携带问题跳转到「我的知识」自动打开向导
  const [gapPrefill, setGapPrefill] = useState<{ question: string; gapId: string } | null>(null);

  useEffect(() => {
    const userStr = localStorage.getItem('user');
    if (userStr) setCurrentUser(JSON.parse(userStr));
  }, []);

  const accessibleTabs = tabs.filter(
    (t) => !t.roles || (currentUser && t.roles.includes(currentUser.role)),
  );

  useEffect(() => {
    const tab = (searchParams.get('tab') as TabKey) || 'library';
    if (!tabs.some((t) => t.key === tab)) return;
    // 无审核权限时回退到知识库
    if (tab === 'review' && currentUser && !['PM', 'MANAGER'].includes(currentUser.role)) {
      setActiveTab('library');
      return;
    }
    setActiveTab(tab);
  }, [searchParams, currentUser]);

  const switchTab = useCallback(
    (key: TabKey) => {
      setActiveTab(key);
      router.replace(key === 'library' ? '/dashboard/knowledge' : `/dashboard/knowledge?tab=${key}`);
    },
    [router],
  );

  // 缺口转知识：切换到我的知识并预填问题
  const handleGapConvert = useCallback(
    (gapId: string, question: string) => {
      setGapPrefill({ question, gapId });
      switchTab('my');
    },
    [switchTab],
  );

  return (
    <>
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-6">
          {accessibleTabs.map((t) => (
            <button
              key={t.key}
              onClick={() => switchTab(t.key)}
              className={`whitespace-nowrap border-b-2 px-1 py-3 text-sm font-medium transition-colors ${
                activeTab === t.key
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
              }`}
            >
              {t.label}
            </button>
          ))}
        </nav>
      </div>

      {activeTab === 'library' && <LibraryPanel />}
      {activeTab === 'ask' && <AskPanel />}
      {activeTab === 'my' && (
        <MyPanel prefill={gapPrefill} onPrefillConsumed={() => setGapPrefill(null)} />
      )}
      {activeTab === 'review' && <ReviewPanel />}
      {activeTab === 'gaps' && <GapPanel role={currentUser?.role} onConvert={handleGapConvert} />}
    </>
  );
}

export default function KnowledgePage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">知识中心</h1>
        <p className="mt-1 text-sm text-gray-500">沉淀部门经验，AI 辅助整理，审核后统一发布</p>
      </div>

      <Suspense fallback={<div className="py-8 text-center text-gray-500">加载中...</div>}>
        <KnowledgeTabs />
      </Suspense>
    </div>
  );
}
