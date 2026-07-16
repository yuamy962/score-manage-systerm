'use client';

import { useEffect, useState } from 'react';
import { userApi, configApi } from '@/lib/api';

const roleMap: Record<string, string> = {
  MANAGER: '部门经理',
  PM: '项目经理',
  MEMBER: '普通成员',
};

export default function UsersPage() {
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [newUser, setNewUser] = useState({ name: '', username: '', password: '', role: 'MEMBER', phone: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const [editModal, setEditModal] = useState<{ type: 'password' | 'phone' | 'role'; user: any } | null>(null);
  const [editValue, setEditValue] = useState('');
  const [editError, setEditError] = useState('');
  const [editLoading, setEditLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'users' | 'config' | 'system'>('users');
  const [taskConfig, setTaskConfig] = useState<{ pmBonusRatio: number } | null>(null);
  const [configLoading, setConfigLoading] = useState(false);
  const [configSaving, setConfigSaving] = useState(false);
  
  const [systemModules, setSystemModules] = useState<any[]>([]);
  const [systemLoading, setSystemLoading] = useState(false);
  const [systemModal, setSystemModal] = useState<{ open: boolean; editItem?: any }>({ open: false });
  const [systemForm, setSystemForm] = useState({ name: '', code: '', description: '' });

  const user = JSON.parse(localStorage.getItem('user') || '{}');

  useEffect(() => {
    loadUsers();
    loadTaskConfig();
    loadSystemModules();
  }, []);

  const loadTaskConfig = async () => {
    try {
      const res = await configApi.getTaskConfig();
      setTaskConfig(res.data);
    } catch (e) {
      console.error(e);
    }
  };

  const handleSaveConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!taskConfig) return;
    setConfigSaving(true);
    try {
      await configApi.updateTaskConfig({ pmBonusRatio: Number(taskConfig.pmBonusRatio) });
      alert('保存成功');
    } catch (e: any) {
      alert(e.response?.data?.message || '保存失败');
    } finally {
      setConfigSaving(false);
    }
  };

  const loadUsers = async () => {
    setLoading(true);
    try {
      const res = await userApi.list();
      setUsers(res.data || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const loadSystemModules = async () => {
    setSystemLoading(true);
    try {
      const res = await configApi.getAllSystemModules();
      setSystemModules(res.data || []);
    } catch (e) {
      console.error(e);
    } finally {
      setSystemLoading(false);
    }
  };

  const openSystemModal = (item?: any) => {
    if (item) {
      setSystemForm({ name: item.name, code: item.code || '', description: item.description || '' });
      setSystemModal({ open: true, editItem: item });
    } else {
      setSystemForm({ name: '', code: '', description: '' });
      setSystemModal({ open: true });
    }
  };

  const closeSystemModal = () => {
    setSystemModal({ open: false, editItem: undefined });
    setSystemForm({ name: '', code: '', description: '' });
  };

  const handleSaveSystemModule = async () => {
    if (!systemForm.name.trim()) {
      alert('请输入系统名称');
      return;
    }
    try {
      if (systemModal.editItem) {
        await configApi.updateSystemModule(systemModal.editItem.id, systemForm);
      } else {
        await configApi.createSystemModule(systemForm);
      }
      closeSystemModal();
      loadSystemModules();
      alert('保存成功');
    } catch (e: any) {
      alert(e.response?.data?.message || '保存失败');
    }
  };

  const handleDeleteSystemModule = async (id: string) => {
    if (!confirm('确定删除该系统模块吗？')) return;
    try {
      await configApi.deleteSystemModule(id);
      loadSystemModules();
      alert('删除成功');
    } catch (e: any) {
      alert(e.response?.data?.message || '删除失败');
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    try {
      await userApi.create(newUser);
      setShowModal(false);
      setNewUser({ name: '', username: '', password: '', role: 'MEMBER', phone: '' });
      setShowPassword(false);
      setErrorMsg('');
      loadUsers();
    } catch (e: any) {
      const msg = e.response?.data?.message?.join?.(', ') || e.response?.data?.message || '创建失败';
      setErrorMsg(msg);
    }
  };

  const toggleStatus = async (id: string, current: boolean) => {
    try {
      await userApi.update(id, { status: !current });
      loadUsers();
    } catch (e: any) {
      alert(e.response?.data?.message || '操作失败');
    }
  };

  const openEditModal = (type: 'password' | 'phone' | 'role', u: any) => {
    setEditModal({ type, user: u });
    if (type === 'phone') {
      setEditValue(u.phone || '');
    } else if (type === 'role') {
      setEditValue(u.role);
    } else {
      setEditValue('');
    }
    setEditError('');
  };

  const handleEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editModal) return;
    setEditError('');
    setEditLoading(true);
    try {
      if (editModal.type === 'password') {
        await userApi.resetPassword(editModal.user.id, editValue);
      } else if (editModal.type === 'role') {
        await userApi.update(editModal.user.id, { role: editValue });
      } else {
        await userApi.update(editModal.user.id, { phone: editValue });
      }
      setEditModal(null);
      loadUsers();
    } catch (e: any) {
      const msg = e.response?.data?.message?.join?.(', ') || e.response?.data?.message || '操作失败';
      setEditError(msg);
    } finally {
      setEditLoading(false);
    }
  };

  if (user.role !== 'MANAGER') {
    return (
      <div className="text-center text-gray-500">
        <p>只有部门经理可以访问用户管理</p>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">用户管理</h1>
        {activeTab === 'users' && (
          <button
            onClick={() => setShowModal(true)}
            className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-500"
          >
            + 新建用户
          </button>
        )}
      </div>

      <div className="mt-4 flex border-b border-gray-200">
        <button
          onClick={() => setActiveTab('users')}
          className={`px-4 py-2 text-sm font-medium ${activeTab === 'users' ? 'border-b-2 text-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
          style={activeTab === 'users' ? { borderColor: 'hsl(var(--telecom-blue))', color: 'hsl(var(--telecom-blue))' } : {}}
        >
          用户列表
        </button>
        <button
          onClick={() => setActiveTab('config')}
          className={`px-4 py-2 text-sm font-medium ${activeTab === 'config' ? 'border-b-2 text-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
          style={activeTab === 'config' ? { borderColor: 'hsl(var(--telecom-blue))', color: 'hsl(var(--telecom-blue))' } : {}}
        >
          任务配置
        </button>
        <button
          onClick={() => setActiveTab('system')}
          className={`px-4 py-2 text-sm font-medium ${activeTab === 'system' ? 'border-b-2 text-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
          style={activeTab === 'system' ? { borderColor: 'hsl(var(--telecom-blue))', color: 'hsl(var(--telecom-blue))' } : {}}
        >
          系统配置
        </button>
      </div>

      {activeTab === 'config' && (
        <div className="mt-6 overflow-hidden rounded-lg bg-white shadow">
          <div className="border-b border-gray-200 bg-gray-50 px-6 py-3">
            <h3 className="text-sm font-semibold text-gray-700">任务配置</h3>
          </div>
          <div className="p-6">
            {taskConfig ? (
              <form onSubmit={handleSaveConfig} className="max-w-md space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">PM 任务管理分成比例</label>
                  <div className="mt-1 flex items-center gap-2">
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      max="1"
                      required
                      value={taskConfig.pmBonusRatio}
                      onChange={e => setTaskConfig({ ...taskConfig, pmBonusRatio: Number(e.target.value) })}
                      className="block w-32 rounded-md border border-gray-300 px-3 py-2 text-sm"
                    />
                    <span className="text-sm text-gray-500">（{(taskConfig.pmBonusRatio * 100).toFixed(0)}%）</span>
                  </div>
                  <p className="mt-1 text-xs text-gray-500">PM 创建的任务审核通过后，PM 可获得任务总积分的该比例作为管理分成</p>
                </div>
                <div className="flex justify-end">
                  <button
                    type="submit"
                    disabled={configSaving}
                    className="rounded-md px-4 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50"
                    style={{ backgroundColor: 'hsl(var(--telecom-blue))' }}
                  >
                    {configSaving ? '保存中...' : '保存'}
                  </button>
                </div>
              </form>
            ) : (
              <div className="text-center text-gray-500">加载中...</div>
            )}
          </div>
        </div>
      )}

      {activeTab === 'system' && (
        <div className="mt-6 overflow-hidden rounded-lg bg-white shadow">
          <div className="flex items-center justify-between border-b border-gray-200 bg-gray-50 px-6 py-3">
            <h3 className="text-sm font-semibold text-gray-700">系统配置</h3>
            <button
              onClick={() => openSystemModal()}
              className="rounded-md px-3 py-1.5 text-xs font-medium text-white hover:opacity-90"
              style={{ backgroundColor: 'hsl(var(--telecom-blue))' }}
            >
              + 添加系统
            </button>
          </div>
          <div className="p-6">
            {systemLoading ? (
              <div className="text-center text-gray-500">加载中...</div>
            ) : (
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">系统名称</th>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">编码</th>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">描述</th>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">状态</th>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">操作</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 bg-white">
                  {systemModules.map((module) => (
                    <tr key={module.id}>
                      <td className="whitespace-nowrap px-4 py-4 text-sm font-medium text-gray-900">{module.name}</td>
                      <td className="whitespace-nowrap px-4 py-4 text-sm text-gray-500">{module.code || '-'}</td>
                      <td className="whitespace-nowrap px-4 py-4 text-sm text-gray-500">{module.description || '-'}</td>
                      <td className="whitespace-nowrap px-4 py-4">
                        <span className={`inline-flex rounded-full px-2 text-xs font-semibold leading-5 ${module.status ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'}`}>
                          {module.status ? '启用' : '禁用'}
                        </span>
                      </td>
                      <td className="whitespace-nowrap px-4 py-4 text-sm">
                        <button
                          onClick={() => openSystemModal(module)}
                          className="text-blue-600 hover:text-blue-900 mr-3"
                        >
                          编辑
                        </button>
                        <button
                          onClick={() => handleDeleteSystemModule(module.id)}
                          className="text-red-600 hover:text-red-900"
                        >
                          删除
                        </button>
                      </td>
                    </tr>
                  ))}
                  {systemModules.length === 0 && (
                    <tr><td colSpan={5} className="px-4 py-8 text-center text-sm text-gray-500">暂无系统配置</td></tr>
                  )}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {activeTab === 'users' && loading ? (
        <div className="mt-8 text-center text-gray-500">加载中...</div>
      ) : activeTab === 'users' && (
        <div className="mt-6 overflow-hidden rounded-lg bg-white shadow">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">姓名</th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">用户名</th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">角色</th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">手机号</th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">状态</th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 bg-white">
              {users.map((u) => (
                <tr key={u.id}>
                  <td className="whitespace-nowrap px-6 py-4 text-sm font-medium text-gray-900">{u.name}</td>
                  <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500">{u.username}</td>
                  <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500">{roleMap[u.role]}</td>
                  <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500">{u.phone || '-'}</td>
                  <td className="whitespace-nowrap px-6 py-4">
                    <span className={`inline-flex rounded-full px-2 text-xs font-semibold leading-5 ${u.status ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                      {u.status ? '启用' : '禁用'}
                    </span>
                  </td>
                  <td className="whitespace-nowrap px-6 py-4 text-sm space-x-3">
                    <button onClick={() => toggleStatus(u.id, u.status)}
                      className="text-blue-600 hover:text-blue-900">
                      {u.status ? '禁用' : '启用'}
                    </button>
                    <button onClick={() => openEditModal('role', u)}
                      className="text-purple-600 hover:text-purple-900">
                      修改角色
                    </button>
                    <button onClick={() => openEditModal('password', u)}
                      className="text-amber-600 hover:text-amber-900">
                      修改密码
                    </button>
                    <button onClick={() => openEditModal('phone', u)}
                      className="text-green-600 hover:text-green-900">
                      修改手机号
                    </button>
                  </td>
                </tr>
              ))}
              {users.length === 0 && (
                <tr><td colSpan={6} className="px-6 py-8 text-center text-sm text-gray-500">暂无用户</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* 新建用户弹窗 */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="w-full max-w-lg rounded-lg bg-white p-6 shadow-xl">
            <h3 className="text-lg font-medium text-gray-900">新建用户</h3>
            {errorMsg && (
              <div className="mt-3 rounded-md bg-red-50 p-3 text-sm text-red-700">
                {errorMsg}
              </div>
            )}
            <form onSubmit={handleCreate} className="mt-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">姓名</label>
                <input required value={newUser.name} onChange={e => setNewUser({...newUser, name: e.target.value})}
                  className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">用户名</label>
                <input required value={newUser.username} onChange={e => setNewUser({...newUser, username: e.target.value})}
                  className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">密码</label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={newUser.password}
                    onChange={e => setNewUser({...newUser, password: e.target.value})}
                    className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 pr-10 text-sm"
                  />
                  <button type="button" onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 text-lg"
                    title={showPassword ? '隐藏密码' : '显示密码'}>
                    {showPassword ? '🙈' : '👁️'}
                  </button>
                </div>
                <p className="mt-1 text-xs text-gray-500">至少8位，必须包含字母和数字</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">企微手机号</label>
                <input value={newUser.phone} onChange={e => setNewUser({...newUser, phone: e.target.value})}
                  placeholder="用于企微群@通知"
                  className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm" />
                <p className="mt-1 text-xs text-gray-500">请填写企微绑定的手机号，任务下发时可@通知</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">角色</label>
                <select value={newUser.role} onChange={e => setNewUser({...newUser, role: e.target.value})}
                  className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm">
                  <option value="MEMBER">普通成员</option>
                  <option value="PM">项目经理</option>
                  <option value="MANAGER">部门经理</option>
                </select>
              </div>
              <div className="mt-6 flex justify-end gap-3">
                <button type="button" onClick={() => { setShowModal(false); setErrorMsg(''); setShowPassword(false); }} className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">取消</button>
                <button type="submit" className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-500">创建</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 修改密码/手机号弹窗 */}
      {editModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl">
            <h3 className="text-lg font-medium text-gray-900">
              {editModal.type === 'password' ? '修改密码' : editModal.type === 'phone' ? '修改手机号' : '修改角色'} — {editModal.user.name}
            </h3>
            {editError && (
              <div className="mt-3 rounded-md bg-red-50 p-3 text-sm text-red-700">
                {editError}
              </div>
            )}
            <form onSubmit={handleEdit} className="mt-4 space-y-4">
              {editModal.type === 'password' ? (
                <div>
                  <label className="block text-sm font-medium text-gray-700">新密码</label>
                  <input type="password" required value={editValue}
                    onChange={e => setEditValue(e.target.value)}
                    className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm" />
                  <p className="mt-1 text-xs text-gray-500">至少8位，必须包含字母和数字</p>
                </div>
              ) : editModal.type === 'role' ? (
                <div>
                  <label className="block text-sm font-medium text-gray-700">角色</label>
                  <select value={editValue} onChange={e => setEditValue(e.target.value)}
                    className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm">
                    <option value="MEMBER">普通成员</option>
                    <option value="PM">项目经理</option>
                    <option value="MANAGER">部门经理</option>
                  </select>
                  <p className="mt-1 text-xs text-gray-500">当前角色：{roleMap[editModal.user.role]}</p>
                </div>
              ) : (
                <div>
                  <label className="block text-sm font-medium text-gray-700">企微手机号</label>
                  <input required value={editValue}
                    onChange={e => setEditValue(e.target.value)}
                    placeholder="用于企微群@通知"
                    className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm" />
                  <p className="mt-1 text-xs text-gray-500">请填写企微绑定的手机号</p>
                </div>
              )}
              <div className="mt-6 flex justify-end gap-3">
                <button type="button" onClick={() => setEditModal(null)} className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">取消</button>
                <button type="submit" disabled={editLoading} className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-500 disabled:opacity-50">
                  {editLoading ? '保存中...' : '保存'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 系统配置弹窗 */}
      {systemModal.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl">
            <h3 className="text-lg font-medium text-gray-900">
              {systemModal.editItem ? '编辑系统' : '添加系统'}
            </h3>
            <form onSubmit={(e) => { e.preventDefault(); handleSaveSystemModule(); }} className="mt-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">系统名称 *</label>
                <input
                  required
                  value={systemForm.name}
                  onChange={e => setSystemForm({ ...systemForm, name: e.target.value })}
                  className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                  placeholder="如：计费中心"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">系统编码</label>
                <input
                  value={systemForm.code}
                  onChange={e => setSystemForm({ ...systemForm, code: e.target.value })}
                  className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                  placeholder="如：BILLING"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">系统描述</label>
                <textarea
                  value={systemForm.description}
                  onChange={e => setSystemForm({ ...systemForm, description: e.target.value })}
                  rows={3}
                  className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                  placeholder="系统描述信息"
                />
              </div>
              <div className="mt-6 flex justify-end gap-3">
                <button type="button" onClick={closeSystemModal} className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">取消</button>
                <button type="submit" className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-500">
                  保存
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
