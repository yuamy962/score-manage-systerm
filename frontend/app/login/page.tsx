'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { authApi } from '@/lib/api';

export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [captchaId, setCaptchaId] = useState('');
  const [captchaQuestion, setCaptchaQuestion] = useState('');
  const [captchaAnswer, setCaptchaAnswer] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showChangePassword, setShowChangePassword] = useState(false);
  const [changePasswordData, setChangePasswordData] = useState({ oldPassword: '', newPassword: '', confirmPassword: '' });
  const [changePasswordError, setChangePasswordError] = useState('');
  const [changePasswordLoading, setChangePasswordLoading] = useState(false);

  useEffect(() => {
    refreshCaptcha();
  }, []);

  const refreshCaptcha = async () => {
    try {
      const res = await authApi.getCaptcha();
      setCaptchaId(res.data.captchaId);
      setCaptchaQuestion(res.data.question);
      setCaptchaAnswer('');
    } catch (e) {
      console.error('获取验证码失败', e);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await authApi.login(username, password, captchaId, captchaAnswer);
      const { token, user } = res.data;
      localStorage.setItem('token', token);
      localStorage.setItem('user', JSON.stringify(user));
      if (user.mustChangePassword) {
        setShowChangePassword(true);
      } else {
        router.push('/dashboard');
      }
    } catch (err: any) {
      const msg = err.response?.data?.message || '登录失败';
      setError(msg);
      refreshCaptcha();
    } finally {
      setLoading(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setChangePasswordError('');
    if (changePasswordData.newPassword !== changePasswordData.confirmPassword) {
      setChangePasswordError('两次输入的新密码不一致');
      return;
    }
    if (changePasswordData.newPassword.length < 8) {
      setChangePasswordError('新密码长度不能少于8位');
      return;
    }
    if (!/^(?=.*[a-zA-Z])(?=.*\d)/.test(changePasswordData.newPassword)) {
      setChangePasswordError('新密码必须包含字母和数字');
      return;
    }
    setChangePasswordLoading(true);
    try {
      await authApi.changePassword(changePasswordData.oldPassword, changePasswordData.newPassword);
      const userStr = localStorage.getItem('user');
      if (userStr) {
        const user = JSON.parse(userStr);
        delete user.mustChangePassword;
        localStorage.setItem('user', JSON.stringify(user));
      }
      setShowChangePassword(false);
      router.push('/dashboard');
    } catch (err: any) {
      setChangePasswordError(err.response?.data?.message || '密码修改失败');
    } finally {
      setChangePasswordLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center" style={{ backgroundColor: 'hsl(var(--telecom-dark))' }}>
      <div className="w-full max-w-md space-y-8 rounded-lg bg-white p-8 shadow-xl">
        <div className="text-center">
          <h1 className="text-2xl font-bold tracking-tight text-gray-900">
            积分绩效管理系统
          </h1>
          <p className="mt-2 text-sm text-gray-600">请使用账号密码登录</p>
        </div>

        {showChangePassword ? (
          <form className="mt-8 space-y-6" onSubmit={handleChangePassword}>
            <div className="rounded-md bg-amber-50 p-3 text-sm text-amber-700">
              您正在使用默认弱密码，请立即修改密码后继续使用系统
            </div>
            {changePasswordError && (
              <div className="rounded-md bg-red-50 p-3 text-sm text-red-600">
                {changePasswordError}
              </div>
            )}
            <div>
              <label className="block text-sm font-medium text-gray-700">旧密码</label>
              <input type="password" required value={changePasswordData.oldPassword}
                onChange={(e) => setChangePasswordData({ ...changePasswordData, oldPassword: e.target.value })}
                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-[hsl(var(--telecom-blue))] focus:outline-none focus:ring-[hsl(var(--telecom-blue))]" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">新密码</label>
              <input type="password" required value={changePasswordData.newPassword}
                onChange={(e) => setChangePasswordData({ ...changePasswordData, newPassword: e.target.value })}
                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-[hsl(var(--telecom-blue))] focus:outline-none focus:ring-[hsl(var(--telecom-blue))]" />
              <p className="mt-1 text-xs text-gray-500">至少8位，必须包含字母和数字</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">确认新密码</label>
              <input type="password" required value={changePasswordData.confirmPassword}
                onChange={(e) => setChangePasswordData({ ...changePasswordData, confirmPassword: e.target.value })}
                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-[hsl(var(--telecom-blue))] focus:outline-none focus:ring-[hsl(var(--telecom-blue))]" />
            </div>
            <button type="submit" disabled={changePasswordLoading}
              className="flex w-full justify-center rounded-md px-4 py-2 text-sm font-semibold text-white shadow-sm transition-colors disabled:opacity-50"
              style={{ backgroundColor: 'hsl(var(--telecom-blue))' }}>
              {changePasswordLoading ? '修改中...' : '修改密码并进入系统'}
            </button>
          </form>
        ) : (
          <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
            {error && (
              <div className="rounded-md bg-red-50 p-3 text-sm text-red-600">
                {error}
              </div>
            )}
            <div>
              <label htmlFor="username" className="block text-sm font-medium text-gray-700">
                用户名
              </label>
              <input id="username" type="text" required value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-[hsl(var(--telecom-blue))] focus:outline-none focus:ring-[hsl(var(--telecom-blue))]"
                placeholder="请输入用户名" />
            </div>
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                密码
              </label>
              <input id="password" type="password" required value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-[hsl(var(--telecom-blue))] focus:outline-none focus:ring-[hsl(var(--telecom-blue))]"
                placeholder="请输入密码" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">
                验证码 <span className="text-xs text-gray-400">（{captchaQuestion || '加载中...'}）</span>
              </label>
              <div className="mt-1 flex gap-2">
                <input
                  type="text"
                  required
                  value={captchaAnswer}
                  onChange={(e) => setCaptchaAnswer(e.target.value)}
                  className="block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-[hsl(var(--telecom-blue))] focus:outline-none focus:ring-[hsl(var(--telecom-blue))]"
                  placeholder="请输入答案"
                />
                <button
                  type="button"
                  onClick={refreshCaptcha}
                  className="whitespace-nowrap rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-600 hover:bg-gray-50"
                  title="刷新验证码"
                >
                  刷新
                </button>
              </div>
            </div>
            <button type="submit" disabled={loading}
              className="flex w-full justify-center rounded-md px-4 py-2 text-sm font-semibold text-white shadow-sm transition-colors disabled:opacity-50"
              style={{ backgroundColor: 'hsl(var(--telecom-blue))' }}
              onMouseEnter={(e) => (e.currentTarget.style.opacity = '0.9')}
              onMouseLeave={(e) => (e.currentTarget.style.opacity = '1')}>
              {loading ? '登录中...' : '登录'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
