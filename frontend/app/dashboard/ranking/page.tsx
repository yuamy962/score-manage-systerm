'use client';

import { useEffect, useState } from 'react';
import { scoreApi } from '@/lib/api';

const roleMap: Record<string, string> = {
  MANAGER: '部门经理',
  PM: '项目经理',
  MEMBER: '普通成员',
};

export default function RankingPage() {
  const [rankings, setRankings] = useState<any[]>([]);
  const [month, setMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });
  const [year, setYear] = useState(() => {
    const now = new Date();
    return now.getFullYear().toString();
  });
  const [loading, setLoading] = useState(true);
  const [config, setConfig] = useState<any[]>([]);
  const [showGradeTip, setShowGradeTip] = useState(false);
  const [activeTab, setActiveTab] = useState<'member' | 'pm'>('member');
  const [pmRankings, setPmRankings] = useState<any[]>([]);
  const [pmLoading, setPmLoading] = useState(true);
  const [periodType, setPeriodType] = useState<'monthly' | 'yearly'>('monthly');

  useEffect(() => {
    loadRanking();
    loadPmRanking();
    loadConfig();
  }, [month, year, periodType]);

  const loadPmRanking = async () => {
    setPmLoading(true);
    try {
      let res;
      if (periodType === 'yearly') {
        res = await scoreApi.yearlyPmRanking(year);
      } else {
        res = await scoreApi.pmRanking(month);
      }
      setPmRankings(res.data || []);
    } catch (e) {
      console.error(e);
    } finally {
      setPmLoading(false);
    }
  };

  const loadRanking = async () => {
    setLoading(true);
    try {
      let res;
      if (periodType === 'yearly') {
        res = await scoreApi.yearlyRanking(year);
      } else {
        res = await scoreApi.ranking(month);
      }
      setRankings(res.data || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const loadConfig = async () => {
    try {
      const res = await scoreApi.getConfig();
      setConfig(res.data || []);
    } catch (e) {
      setConfig([
        { grade: 'A', minScore: 180 },
        { grade: 'B+', minScore: 135 },
        { grade: 'B', minScore: 115 },
        { grade: 'C', minScore: 75 },
        { grade: 'D', minScore: 0 },
      ]);
    }
  };

  const getGrade = (score: number) => {
    if (config.length === 0) return 'D';
    for (const c of config) {
      if (score >= c.minScore) return c.grade;
    }
    return config[config.length - 1]?.grade || 'D';
  };

  const getNextGradeInfo = (score: number) => {
    if (config.length === 0) return null;
    const sorted = [...config].sort((a, b) => b.minScore - a.minScore);
    const currentGrade = getGrade(score);
    const currentIdx = sorted.findIndex(c => c.grade === currentGrade);
    if (currentIdx <= 0) return null;
    const nextGrade = sorted[currentIdx - 1];
    const gap = Math.round((nextGrade.minScore - score) * 10) / 10;
    return { grade: nextGrade.grade, gap };
  };

  const getRankDisplay = (index: number) => {
    const current = rankings[index];
    const prev = rankings[index - 1];
    if (prev && prev.totalScore === current.totalScore && prev.taskCount === current.taskCount) {
      return getRankDisplay(index - 1);
    }
    return index + 1;
  };

  const avgScore = rankings.length > 0 ? rankings[0].avgScore : 0;
  const memberAvgScore = rankings.length > 0 ? rankings[0].memberAvgScore : 0;

  const topThree = rankings.slice(0, 3);

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900">
        {periodType === 'yearly' ? '年度排行' : '月度排行'}
      </h1>

      <div className="mt-6 flex flex-wrap items-center gap-4">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setPeriodType('monthly')}
            className={`rounded-md px-4 py-2 text-sm font-medium transition-colors ${periodType === 'monthly' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
            style={periodType === 'monthly' ? { backgroundColor: 'hsl(var(--telecom-blue))' } : {}}
          >
            月度
          </button>
          <button
            onClick={() => setPeriodType('yearly')}
            className={`rounded-md px-4 py-2 text-sm font-medium transition-colors ${periodType === 'yearly' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
            style={periodType === 'yearly' ? { backgroundColor: 'hsl(var(--telecom-blue))' } : {}}
          >
            年度
          </button>
        </div>

        {periodType === 'monthly' ? (
          <>
            <label className="text-sm font-medium text-gray-700">月份：</label>
            <input
              type="month"
              value={month}
              onChange={(e) => setMonth(e.target.value)}
              className="rounded-md border border-gray-300 px-3 py-2 text-sm"
            />
          </>
        ) : (
          <>
            <label className="text-sm font-medium text-gray-700">年份：</label>
            <input
              type="number"
              value={year}
              onChange={(e) => setYear(String(e.target.value))}
              min="2020"
              max="2099"
              className="rounded-md border border-gray-300 px-3 py-2 text-sm w-24"
            />
          </>
        )}
      </div>

      <div className="mt-4 flex border-b border-gray-200">
        <button
          onClick={() => setActiveTab('member')}
          className={`px-4 py-2 text-sm font-medium ${activeTab === 'member' ? 'border-b-2 text-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
          style={activeTab === 'member' ? { borderColor: 'hsl(var(--telecom-blue))', color: 'hsl(var(--telecom-blue))' } : {}}
        >
          成员榜
        </button>
        <button
          onClick={() => setActiveTab('pm')}
          className={`px-4 py-2 text-sm font-medium ${activeTab === 'pm' ? 'border-b-2 text-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
          style={activeTab === 'pm' ? { borderColor: 'hsl(var(--telecom-blue))', color: 'hsl(var(--telecom-blue))' } : {}}
        >
          PM 榜
        </button>
      </div>

      {activeTab === 'member' && loading ? (
        <div className="mt-8 text-center text-gray-500">加载中...</div>
      ) : (
        <div className="mt-8">
          {/* 冠军领奖台 - 前三名（缩小版） */}
          {topThree.length > 0 && (
            <div className="mb-8 flex items-end justify-center gap-3 sm:gap-6">
              {/* 第二名 */}
              {topThree[1] && (
                <div className="flex flex-col items-center">
                  <div className="mb-2 text-center">
                    <div className="text-2xl">🥈</div>
                    <div className="mt-0.5 text-xs font-bold text-gray-700">{topThree[1].name}</div>
                    <div className="text-[10px] text-gray-500">{topThree[1].totalScore} 分</div>
                  </div>
                  <div className="flex w-16 flex-col items-center justify-end rounded-t-lg bg-gray-200 pb-2 pt-4 shadow sm:w-20" style={{ height: '80px' }}>
                    <div className="text-xl font-bold text-gray-500">2</div>
                  </div>
                </div>
              )}

              {/* 第一名 */}
              {topThree[0] && (
                <div className="flex flex-col items-center">
                  <div className="mb-2 text-center">
                    <div className="text-3xl">👑</div>
                    <div className="mt-0.5 text-sm font-bold text-yellow-600">{topThree[0].name}</div>
                    <div className="text-xs font-medium text-yellow-500">{topThree[0].totalScore} 分</div>
                    <span className="mt-0.5 inline-flex rounded-full bg-yellow-100 px-1.5 py-0.5 text-[10px] font-bold text-yellow-700">
                      {getGrade(topThree[0].totalScore)}
                    </span>
                  </div>
                  <div className="flex w-20 flex-col items-center justify-end rounded-t-lg bg-yellow-100 pb-2 pt-5 shadow-lg sm:w-24" style={{ height: '100px' }}>
                    <div className="text-2xl font-bold text-yellow-600">1</div>
                  </div>
                </div>
              )}

              {/* 第三名 */}
              {topThree[2] && (
                <div className="flex flex-col items-center">
                  <div className="mb-2 text-center">
                    <div className="text-2xl">🥉</div>
                    <div className="mt-0.5 text-xs font-bold text-gray-700">{topThree[2].name}</div>
                    <div className="text-[10px] text-gray-500">{topThree[2].totalScore} 分</div>
                  </div>
                  <div className="flex w-16 flex-col items-center justify-end rounded-t-lg bg-orange-100 pb-2 pt-4 shadow sm:w-20" style={{ height: '70px' }}>
                    <div className="text-xl font-bold text-orange-600">3</div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* 平均线提示 */}
          {rankings.length > 0 && (
            <div className="mb-4 flex flex-wrap items-center gap-4 rounded-lg bg-blue-50 px-4 py-3">
              <div className="flex items-center gap-2 text-sm">
                <span className="inline-block h-0.5 w-6 bg-blue-500"></span>
                <span className="font-medium text-blue-700">全员平均：</span>
                <span className="font-bold text-blue-800">{avgScore} 分</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <span className="inline-block h-0.5 w-6 bg-green-500"></span>
                <span className="font-medium text-green-700">成员平均：</span>
                <span className="font-bold text-green-800">{memberAvgScore} 分</span>
              </div>
              <span className="text-xs text-blue-500">（成员平均不含部门经理）</span>
            </div>
          )}

          {/* 全部人员排行列表 */}
          {rankings.length > 0 && (
            <div className="overflow-hidden rounded-lg bg-white shadow">
              <div className="border-b border-gray-200 bg-gray-50 px-6 py-3">
                <h3 className="text-sm font-semibold text-gray-700">全部排行</h3>
              </div>
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">排名</th>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">姓名</th>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">{periodType === 'yearly' ? '年度积分' : '当月积分'}</th>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">任务完成数</th>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                      <button
                        onClick={() => setShowGradeTip(!showGradeTip)}
                        className="inline-flex items-center gap-1 hover:text-gray-700 focus:outline-none"
                      >
                        绩效等级
                        <svg className="h-3.5 w-3.5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      </button>
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">差距</th>
                  </tr>
                </thead>
                {showGradeTip && (
                  <tbody>
                    <tr>
                      <td colSpan={6} className="bg-blue-50 px-4 py-3">
                        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-blue-800">
                          <span className="font-semibold">绩效等级标准：</span>
                          {config.length > 0 ? config.map((c, i) => {
                            const isLast = i === config.length - 1;
                            return (
                              <span key={c.grade} className="inline-flex items-center rounded-full bg-white px-2 py-0.5 shadow-sm">
                                <span className="font-bold">{c.grade}</span>
                                <span className="ml-1 text-blue-600">
                                  {isLast
                                    ? `< ${config[i - 1]?.minScore || 75} 分`
                                    : `≥ ${c.minScore} 分`}
                                </span>
                              </span>
                            );
                          }) : (
                            <span>加载中...</span>
                          )}
                        </div>
                      </td>
                    </tr>
                  </tbody>
                )}
                <tbody className="divide-y divide-gray-200 bg-white">
                  {rankings.map((r, index) => {
                    const grade = getGrade(r.totalScore);
                    const displayRank = getRankDisplay(index);
                    const isTopThree = displayRank <= 3;
                    const isAboveAvg = r.totalScore >= memberAvgScore;
                    const nextGradeInfo = getNextGradeInfo(r.totalScore);
                    return (
                      <tr key={r.userId} className={isTopThree ? 'bg-yellow-50/50' : ''}>
                        <td className="whitespace-nowrap px-4 py-3 text-sm font-medium">
                          {displayRank === 1 ? (
                            <span className="text-lg">👑</span>
                          ) : displayRank === 2 ? (
                            <span className="text-lg">🥈</span>
                          ) : displayRank === 3 ? (
                            <span className="text-lg">🥉</span>
                          ) : (
                            <span className="text-gray-500">{displayRank}</span>
                          )}
                        </td>
                        <td className="whitespace-nowrap px-4 py-3 text-sm font-medium text-gray-900">
                          {r.name}
                          {isTopThree && (
                            <span className="ml-1 text-xs text-yellow-600">★</span>
                          )}
                        </td>
                        <td className="whitespace-nowrap px-4 py-3 text-sm">
                          <div className="flex items-center gap-2">
                            <span className="font-bold" style={{ color: 'hsl(var(--telecom-blue))' }}>{r.totalScore}</span>
                            {!isAboveAvg && (
                              <span className="inline-flex items-center rounded-full bg-red-50 px-1.5 py-0.5 text-[10px] font-medium text-red-500">
                                低于平均
                              </span>
                            )}
                          </div>
                          {nextGradeInfo && (
                            <div className="mt-0.5 text-[10px] text-gray-400">
                              距 {nextGradeInfo.grade} 还差 {nextGradeInfo.gap} 分
                            </div>
                          )}
                        </td>
                        <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-600">{r.taskCount}</td>
                        <td className="whitespace-nowrap px-4 py-3">
                          <span className="inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold" style={{ backgroundColor: 'hsl(var(--secondary))', color: 'hsl(var(--telecom-dark))' }}>
                            {grade}
                          </span>
                        </td>
                        <td className="whitespace-nowrap px-4 py-3 text-sm">
                          {r.gapToNext > 0 ? (
                            <span className="text-xs text-orange-600">
                              ↑ 差 {r.gapToNext} 分
                            </span>
                          ) : index === 0 ? (
                            <span className="text-xs text-yellow-500 font-medium">🥇 领先</span>
                          ) : (
                            <span className="text-xs text-gray-400">并列</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {rankings.length === 0 && (
            <div className="py-12 text-center text-gray-500">暂无数据</div>
          )}
        </div>
      )}

      {activeTab === 'pm' && pmLoading ? (
        <div className="mt-8 text-center text-gray-500">加载中...</div>
      ) : activeTab === 'pm' && (
        <div className="mt-8">
          <div className="overflow-hidden rounded-lg bg-white shadow">
            <div className="border-b border-gray-200 bg-gray-50 px-6 py-3">
              <h3 className="text-sm font-semibold text-gray-700">PM 排行榜</h3>
            </div>
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">排名</th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">姓名</th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">{periodType === 'yearly' ? '年度积分' : '当月积分'}</th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">管理任务数</th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">绩效等级</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 bg-white">
                {pmRankings.map((r, index) => {
                  const grade = getGrade(r.totalScore);
                  return (
                    <tr key={r.userId}>
                      <td className="whitespace-nowrap px-4 py-3 text-sm font-medium">
                        {index === 0 ? <span className="text-lg">👑</span> : index === 1 ? <span className="text-lg">🥈</span> : index === 2 ? <span className="text-lg">🥉</span> : <span className="text-gray-500">{index + 1}</span>}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-sm font-medium text-gray-900">{r.name}</td>
                      <td className="whitespace-nowrap px-4 py-3 text-sm">
                        <span className="font-bold" style={{ color: 'hsl(var(--telecom-blue))' }}>{r.totalScore}</span>
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-600">{r.taskCount}</td>
                      <td className="whitespace-nowrap px-4 py-3">
                        <span className="inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold" style={{ backgroundColor: 'hsl(var(--secondary))', color: 'hsl(var(--telecom-dark))' }}>
                          {grade}
                        </span>
                      </td>
                    </tr>
                  );
                })}
                {pmRankings.length === 0 && (
                  <tr><td colSpan={5} className="px-4 py-8 text-center text-sm text-gray-500">暂无 PM 数据</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
