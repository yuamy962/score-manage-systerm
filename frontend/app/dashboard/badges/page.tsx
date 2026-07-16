'use client';

import { useEffect, useState } from 'react';
import { badgeApi } from '@/lib/api';

const BADGE_ICONS: Record<string, string> = {
  MONTHLY_STAR: '🌟',
  CONSECUTIVE_A_GRADE: '💎',
  TASK_HARVESTER: '🌾',
  ZERO_REJECTION: '🛡️',
  KNOWLEDGE_CONTRIBUTOR: '📚',
  MILESTONE_100: '🏅',
  MILESTONE_500: '🥈',
  MILESTONE_1000: '🥇',
  CONSECUTIVE_BP: '🔥',
};

const BADGE_COLORS: Record<string, string> = {
  MONTHLY_STAR: 'from-yellow-400 to-amber-500',
  CONSECUTIVE_A_GRADE: 'from-purple-400 to-indigo-500',
  TASK_HARVESTER: 'from-green-400 to-emerald-500',
  ZERO_REJECTION: 'from-blue-400 to-cyan-500',
  KNOWLEDGE_CONTRIBUTOR: 'from-pink-400 to-rose-500',
  MILESTONE_100: 'from-orange-400 to-amber-500',
  MILESTONE_500: 'from-slate-400 to-gray-500',
  MILESTONE_1000: 'from-yellow-400 to-yellow-600',
  CONSECUTIVE_BP: 'from-red-400 to-orange-500',
};

export default function BadgesPage() {
  const [badges, setBadges] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadBadges();
  }, []);

  const loadBadges = async () => {
    setLoading(true);
    try {
      const res = await badgeApi.myBadges();
      setBadges(res.data || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="py-12 text-center text-gray-500">加载中...</div>;
  }

  const earnedCount = badges.filter(b => b.earned).length;
  const totalCount = badges.length;

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900">成就徽章</h1>
      <p className="mt-1 text-sm text-gray-500">
        已解锁 {earnedCount}/{totalCount} 个徽章
      </p>

      {/* 总进度 */}
      <div className="mt-4 rounded-lg bg-white p-4 shadow">
        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-600">成就进度</span>
          <span className="font-medium" style={{ color: 'hsl(var(--telecom-blue))' }}>{earnedCount}/{totalCount}</span>
        </div>
        <div className="mt-2 h-3 w-full rounded-full bg-gray-200">
          <div
            className="h-3 rounded-full transition-all"
            style={{
              width: `${totalCount > 0 ? (earnedCount / totalCount) * 100 : 0}%`,
              backgroundColor: 'hsl(var(--telecom-blue))',
            }}
          />
        </div>
      </div>

      {/* 徽章展示 */}
      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {badges.map((badge) => {
          const icon = BADGE_ICONS[badge.type] || '🎖️';
          const gradient = BADGE_COLORS[badge.type] || 'from-gray-400 to-gray-500';

          return (
            <div
              key={badge.type}
              className={`relative overflow-hidden rounded-lg bg-white p-6 shadow transition-all ${
                badge.earned ? 'ring-2 ring-yellow-400/50' : 'opacity-60 grayscale'
              }`}
            >
              {badge.earned && (
                <div className="absolute right-2 top-2">
                  <span className="inline-flex items-center rounded-full bg-green-100 px-2 py-0.5 text-[10px] font-bold text-green-700">
                    ✓ 已解锁
                  </span>
                </div>
              )}

              <div className="flex items-start gap-4">
                <div className={`flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-xl bg-gradient-to-br ${gradient} text-2xl shadow-lg`}>
                  {icon}
                </div>
                <div className="flex-1">
                  <h3 className="text-sm font-bold text-gray-900">{badge.name}</h3>
                  <p className="mt-1 text-xs text-gray-500">{badge.description}</p>
                  {badge.earned && badge.earnedAt && (
                    <p className="mt-2 text-[10px] text-gray-400">
                      获得时间：{new Date(badge.earnedAt).toLocaleDateString('zh-CN')}
                    </p>
                  )}
                  {badge.earned && badge.reason && (
                    <p className="mt-1 text-[10px] text-yellow-600">{badge.reason}</p>
                  )}
                  {!badge.earned && (
                    <p className="mt-2 text-[10px] text-gray-400 italic">尚未解锁</p>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* 徽章说明 */}
      <div className="mt-8 rounded-lg bg-blue-50 p-6">
        <h3 className="text-sm font-semibold text-blue-800">徽章获取说明</h3>
        <div className="mt-3 space-y-2 text-xs text-blue-700">
          <p>🌟 <strong>月度之星</strong>：当月积分排名第1名自动获得</p>
          <p>💎 <strong>连续3个月A级</strong>：连续3个月绩效等级达到A</p>
          <p>🌾 <strong>任务收割机</strong>：当月完成任务数≥10个</p>
          <p>🛡️ <strong>零驳回</strong>：当月无被驳回的任务</p>
          <p>📚 <strong>知识贡献者</strong>：当月获得团队贡献积分</p>
          <p>🏅 <strong>百积分里程碑</strong>：累计积分达到100分</p>
          <p>🥈 <strong>五百积分里程碑</strong>：累计积分达到500分</p>
          <p>🥇 <strong>千积分里程碑</strong>：累计积分达到1000分</p>
          <p>🔥 <strong>稳定输出</strong>：连续3个月绩效等级达到B+以上</p>
        </div>
      </div>
    </div>
  );
}
