'use client';

import { useEffect, useState } from 'react';
import { scoreApi } from '@/lib/api';

const TYPE_LABELS: Record<string, string> = {
  REQUIREMENT: '需求开发',
  TESTING: '测试联调',
  OPS: '运维支撑',
  TEAM: '团队贡献',
  CLIENT_POS: '客户表扬',
  CLIENT_NEG: '客户投诉',
  RISK: '风险扣减',
};

export default function ProgressPage() {
  const [progress, setProgress] = useState<any>(null);
  const [comparison, setComparison] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [progressRes, comparisonRes] = await Promise.all([
        scoreApi.myProgress(),
        scoreApi.roleComparison(),
      ]);
      setProgress(progressRes.data);
      setComparison(comparisonRes.data || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="py-12 text-center text-gray-500">加载中...</div>;
  }

  if (!progress) {
    return <div className="py-12 text-center text-gray-500">暂无数据</div>;
  }

  const gradeColors: Record<string, string> = {
    'A': 'bg-green-100 text-green-800',
    'B+': 'bg-blue-100 text-blue-800',
    'B': 'bg-yellow-100 text-yellow-800',
    'C': 'bg-orange-100 text-orange-800',
    'D': 'bg-red-100 text-red-800',
  };

  const nextGradeProgress = progress.nextGrade && progress.nextGradeGap > 0
    ? Math.max(0, Math.min(100, ((progress.currentScore) / (progress.currentScore + progress.nextGradeGap)) * 100))
    : 100;

  const sprintUrgency = progress.daysRemaining <= 3 ? 'text-red-600' : progress.daysRemaining <= 7 ? 'text-orange-600' : 'text-gray-600';

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900">我的进度</h1>
      <p className="mt-1 text-sm text-gray-500">{progress.currentMonth} 月绩效追踪</p>

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* 核心指标卡片 */}
        <div className="rounded-lg bg-white p-6 shadow">
          <h3 className="text-sm font-medium text-gray-500">当前积分</h3>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-3xl font-bold" style={{ color: 'hsl(var(--telecom-blue))' }}>{progress.currentScore}</span>
            <span className="text-sm text-gray-500">分</span>
          </div>
          <div className="mt-2">
            <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${gradeColors[progress.currentGrade] || 'bg-gray-100 text-gray-800'}`}>
              {progress.currentGrade}
            </span>
          </div>
          <div className="mt-3 border-t pt-3 text-xs text-gray-500">
            累计积分：<span className="font-medium text-gray-700">{progress.totalScore}</span> 分
          </div>
        </div>

        <div className="rounded-lg bg-white p-6 shadow">
          <h3 className="text-sm font-medium text-gray-500">排名情况</h3>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-3xl font-bold" style={{ color: 'hsl(var(--telecom-blue))' }}>{progress.myRank}</span>
            <span className="text-sm text-gray-500">/ {progress.totalMembers} 人</span>
          </div>
          <div className="mt-2 text-xs text-gray-500">
            成员平均：<span className="font-medium text-gray-700">{progress.memberAvgScore}</span> 分
          </div>
          <div className="mt-1 text-xs text-gray-500">
            同角色平均：<span className="font-medium text-gray-700">{progress.sameRoleAvg}</span> 分
            （排名 {progress.sameRoleRank}/{progress.sameRoleTotal}）
          </div>
        </div>

        <div className="rounded-lg bg-white p-6 shadow">
          <h3 className="text-sm font-medium text-gray-500">时间进度</h3>
          <div className="mt-2">
            <span className={`text-3xl font-bold ${sprintUrgency}`}>{progress.daysRemaining}</span>
            <span className="text-sm text-gray-500"> 天</span>
          </div>
          <div className="mt-1 text-xs text-gray-500">
            已过 {progress.daysPassed} 天 / 共 {progress.daysPassed + progress.daysRemaining} 天
          </div>
          <div className="mt-3">
            <div className="flex items-center justify-between text-xs">
              <span className="text-gray-500">月度进度</span>
              <span className="font-medium">{Math.round(progress.daysPassed / (progress.daysPassed + progress.daysRemaining) * 100)}%</span>
            </div>
            <div className="mt-1 h-2 w-full rounded-full bg-gray-200">
              <div
                className="h-2 rounded-full transition-all"
                style={{
                  width: `${Math.round(progress.daysPassed / (progress.daysPassed + progress.daysRemaining) * 100)}%`,
                  backgroundColor: 'hsl(var(--telecom-blue))',
                }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* 等级进度条 */}
      <div className="mt-6 rounded-lg bg-white p-6 shadow">
        <h3 className="text-sm font-semibold text-gray-700">绩效等级进度</h3>
        {progress.nextGrade ? (
          <div className="mt-4">
            <div className="flex items-center justify-between text-sm">
              <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${gradeColors[progress.currentGrade] || 'bg-gray-100 text-gray-800'}`}>
                当前 {progress.currentGrade}
              </span>
              <span className="text-orange-600 font-medium">
                距 {progress.nextGrade} 还差 {progress.nextGradeGap} 分
              </span>
              <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${gradeColors[progress.nextGrade] || 'bg-gray-100 text-gray-800'}`}>
                目标 {progress.nextGrade}
              </span>
            </div>
            <div className="mt-3 h-4 w-full rounded-full bg-gray-200">
              <div
                className="h-4 rounded-full transition-all"
                style={{
                  width: `${nextGradeProgress}%`,
                  backgroundColor: 'hsl(var(--telecom-blue))',
                }}
              />
            </div>
            <div className="mt-2 flex justify-between text-xs text-gray-400">
              <span>{progress.currentScore} 分</span>
              <span>{progress.currentScore + progress.nextGradeGap} 分</span>
            </div>
          </div>
        ) : (
          <div className="mt-4 rounded-lg bg-green-50 p-4 text-center">
            <span className="text-lg">🎉</span>
            <p className="mt-1 text-sm font-medium text-green-700">已达到最高等级！继续保持！</p>
          </div>
        )}
      </div>

      {/* 积分预测 */}
      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="rounded-lg bg-white p-6 shadow">
          <h3 className="text-sm font-semibold text-gray-700">积分预测</h3>
          <div className="mt-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">日均积分</span>
              <span className="text-sm font-bold" style={{ color: 'hsl(var(--telecom-blue))' }}>{progress.dailyAvg} 分/天</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">预测月末积分</span>
              <span className="text-sm font-bold" style={{ color: 'hsl(var(--telecom-blue))' }}>{progress.predictedScore} 分</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">完成任务数</span>
              <span className="text-sm font-bold" style={{ color: 'hsl(var(--telecom-blue))' }}>{progress.taskCount} 个</span>
            </div>
          </div>
          {progress.daysRemaining <= 5 && progress.nextGradeGap > 0 && (
            <div className="mt-4 rounded-lg bg-orange-50 p-3">
              <p className="text-xs text-orange-700">
                ⚡ 月末冲刺！距 {progress.nextGrade} 还差 {progress.nextGradeGap} 分，
                需日均 <span className="font-bold">{(progress.nextGradeGap / progress.daysRemaining).toFixed(1)}</span> 分即可达标！
              </p>
            </div>
          )}
        </div>

        {/* 积分构成 */}
        <div className="rounded-lg bg-white p-6 shadow">
          <h3 className="text-sm font-semibold text-gray-700">积分构成</h3>
          <div className="mt-4 space-y-2">
            {progress.scoreBreakdown.map((item: any) => (
              <div key={item.type} className="flex items-center justify-between">
                <span className="text-sm text-gray-600">{TYPE_LABELS[item.type] || item.type}</span>
                <div className="flex items-center gap-2">
                  <div className="h-2 w-24 rounded-full bg-gray-200">
                    <div
                      className="h-2 rounded-full"
                      style={{
                        width: `${progress.currentScore > 0 ? Math.min(100, (item.score / progress.currentScore) * 100) : 0}%`,
                        backgroundColor: item.score >= 0 ? 'hsl(var(--telecom-blue))' : '#ef4444',
                      }}
                    />
                  </div>
                  <span className={`text-sm font-medium ${item.score >= 0 ? 'text-gray-700' : 'text-red-600'}`}>
                    {item.score}
                  </span>
                </div>
              </div>
            ))}
            {progress.scoreBreakdown.length === 0 && (
              <p className="text-sm text-gray-400">暂无积分记录</p>
            )}
          </div>
        </div>
      </div>

      {/* 同角色对比 */}
      {comparison.length > 0 && (
        <div className="mt-6 rounded-lg bg-white p-6 shadow">
          <h3 className="text-sm font-semibold text-gray-700">同角色对比</h3>
          <div className="mt-4">
            <table className="min-w-full divide-y divide-gray-200">
              <thead>
                <tr>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">排名</th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">姓名</th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">积分</th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">等级</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {comparison.map((r: any) => (
                  <tr key={r.userId} className={r.isMe ? 'bg-blue-50' : ''}>
                    <td className="px-3 py-2 text-sm">
                      {r.rank <= 3 ? ['🥇', '🥈', '🥉'][r.rank - 1] : r.rank}
                    </td>
                    <td className="px-3 py-2 text-sm font-medium text-gray-900">
                      {r.name}
                      {r.isMe && <span className="ml-1 text-xs text-blue-600">（我）</span>}
                    </td>
                    <td className="px-3 py-2 text-sm font-medium" style={{ color: 'hsl(var(--telecom-blue))' }}>
                      {r.totalScore}
                    </td>
                    <td className="px-3 py-2">
                      <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-semibold ${gradeColors[r.grade] || 'bg-gray-100 text-gray-800'}`}>
                        {r.grade}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
