'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { authApi } from '@/lib/api';

const allMenuItems = [
  { path: '/dashboard', label: '仪表盘', icon: '📊' },
  { path: '/dashboard/tasks', label: '任务管理', icon: '📋' },
  { path: '/dashboard/issues', label: '问题管理', icon: '🔧' },
  { path: '/dashboard/scores', label: '积分管理', icon: '⭐' },
  { path: '/dashboard/ranking', label: '月度排行', icon: '🏆' },
  { path: '/dashboard/progress', label: '我的进度', icon: '🎯' },
  { path: '/dashboard/badges', label: '成就徽章', icon: '🏅' },
  { path: '/dashboard/appeals', label: '申诉管理', icon: '📝' },
  { path: '/dashboard/extensions', label: '延期申请', icon: '⏰' },
  { path: '/dashboard/reviews', label: '绩效评语', icon: '🤖' },
  { path: '/dashboard/users', label: '用户管理', icon: '👥', roles: ['MANAGER'] },
];

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [user, setUser] = useState<any>(null);
  const [showChangePassword, setShowChangePassword] = useState(false);
  const [changeForm, setChangeForm] = useState({ oldPassword: '', newPassword: '', confirmPassword: '' });
  const [changeError, setChangeError] = useState('');
  const [changeSuccess, setChangeSuccess] = useState('');
  const [changeLoading, setChangeLoading] = useState(false);
  const [showOldPwd, setShowOldPwd] = useState(false);
  const [showNewPwd, setShowNewPwd] = useState(false);
  const [showConfirmPwd, setShowConfirmPwd] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem('token');
    const userStr = localStorage.getItem('user');
    if (!token || !userStr) {
      router.push('/login');
      return;
    }
    setUser(JSON.parse(userStr));
  }, [router]);

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    router.push('/login');
  };

  const openChangePassword = () => {
    setChangeForm({ oldPassword: '', newPassword: '', confirmPassword: '' });
    setChangeError('');
    setChangeSuccess('');
    setShowChangePassword(true);
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setChangeError('');
    setChangeSuccess('');

    if (changeForm.newPassword !== changeForm.confirmPassword) {
      setChangeError('两次输入的新密码不一致');
      return;
    }
    if (changeForm.newPassword.length < 8) {
      setChangeError('新密码长度不能少于8位');
      return;
    }
    if (!/^(?=.*[a-zA-Z])(?=.*\d)/.test(changeForm.newPassword)) {
      setChangeError('新密码必须包含字母和数字');
      return;
    }
    if (changeForm.oldPassword === changeForm.newPassword) {
      setChangeError('新密码不能与旧密码相同');
      return;
    }

    setChangeLoading(true);
    try {
      await authApi.changePassword(changeForm.oldPassword, changeForm.newPassword);
      setChangeSuccess('密码修改成功');
      setTimeout(() => {
        setShowChangePassword(false);
        setChangeSuccess('');
      }, 1500);
    } catch (err: any) {
      setChangeError(err.response?.data?.message || '密码修改失败');
    } finally {
      setChangeLoading(false);
    }
  };

  if (!user) return null;

  const roleText: Record<string, string> = {
    MANAGER: '部门经理',
    PM: '项目经理',
    MEMBER: '普通成员',
  };

  const menuItems = allMenuItems.filter((item) => {
    if (!item.roles) return true;
    return item.roles.includes(user.role);
  });

  return (
    <div className="flex h-screen bg-gray-50">
      <aside className="w-64 flex flex-col" style={{ backgroundColor: 'hsl(var(--telecom-dark))' }}>
        <div className="p-6">
          <h2 className="text-xl font-bold text-white">积分绩效系统</h2>
          <div className="mt-4 rounded-lg p-3" style={{ backgroundColor: 'hsla(var(--telecom-blue), 0.2)' }}>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-white">{user.name}</p>
                <p className="text-xs" style={{ color: 'hsl(var(--telecom-blue))' }}>{roleText[user.role]}</p>
              </div>
              <button
                onClick={openChangePassword}
                className="rounded p-1 text-xs text-gray-300 transition-colors hover:bg-white/20 hover:text-white"
                title="修改密码"
              >
                🔑
              </button>
            </div>
          </div>
        </div>

        <nav className="space-y-1 px-4 flex-1">
          {menuItems.map((item) => (
            <Link
              key={item.path}
              href={item.path}
              className={`flex items-center rounded-lg px-4 py-3 text-sm font-medium transition-colors ${
                pathname === item.path
                  ? 'text-white'
                  : 'text-gray-300 hover:text-white'
              }`}
              style={pathname === item.path ? { backgroundColor: 'hsla(0, 0%, 100%, 0.15)' } : {}}
            >
              <span className="mr-3">{item.icon}</span>
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="p-4">
          <button
            onClick={handleLogout}
            className="flex w-full items-center rounded-lg px-4 py-3 text-sm font-medium text-gray-300 transition-colors hover:bg-red-500/20 hover:text-red-300"
          >
            <span className="mr-3">🚪</span>
            退出登录
          </button>
        </div>
      </aside>

      <main className="flex-1 overflow-auto p-8">
        {children}
      </main>

      {showChangePassword && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl">
            <h3 className="text-lg font-medium text-gray-900">修改密码</h3>
            <p className="mt-1 text-sm text-gray-500">请输入旧密码和新密码</p>

            {changeError && (
              <div className="mt-3 rounded-md bg-red-50 p-3 text-sm text-red-600">{changeError}</div>
            )}
            {changeSuccess && (
              <div className="mt-3 rounded-md bg-green-50 p-3 text-sm text-green-600">{changeSuccess}</div>
            )}

            <form onSubmit={handleChangePassword} className="mt-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">旧密码</label>
                <div className="relative">
                  <input
                    type={showOldPwd ? 'text' : 'password'}
                    required
                    value={changeForm.oldPassword}
                    onChange={(e) => setChangeForm({ ...changeForm, oldPassword: e.target.value })}
                    className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 pr-10 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500"
                  />
                  <button
                    type="button"
                    onClick={() => setShowOldPwd(!showOldPwd)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 text-lg"
                  >
                    {showOldPwd ? '🙈' : '👁️'}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">新密码</label>
                <div className="relative">
                  <input
                    type={showNewPwd ? 'text' : 'password'}
                    required
                    value={changeForm.newPassword}
                    onChange={(e) => setChangeForm({ ...changeForm, newPassword: e.target.value })}
                    className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 pr-10 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPwd(!showNewPwd)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 text-lg"
                  >
                    {showNewPwd ? '🙈' : '👁️'}
                  </button>
                </div>
                <p className="mt-1 text-xs text-gray-500">至少8位，必须包含字母和数字</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">确认新密码</label>
                <div className="relative">
                  <input
                    type={showConfirmPwd ? 'text' : 'password'}
                    required
                    value={changeForm.confirmPassword}
                    onChange={(e) => setChangeForm({ ...changeForm, confirmPassword: e.target.value })}
                    className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 pr-10 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPwd(!showConfirmPwd)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 text-lg"
                  >
                    {showConfirmPwd ? '🙈' : '👁️'}
                  </button>
                </div>
              </div>

              <div className="flex justify-end space-x-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowChangePassword(false)}
                  className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                >
                  取消
                </button>
                <button
                  type="submit"
                  disabled={changeLoading}
                  className="rounded-md px-4 py-2 text-sm font-medium text-white shadow-sm transition-colors disabled:opacity-50"
                  style={{ backgroundColor: 'hsl(var(--telecom-blue))' }}
                >
                  {changeLoading ? '修改中...' : '确认修改'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
