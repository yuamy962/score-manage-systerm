'use client';

import { useEffect, useState } from 'react';
import { taskApi, userApi, extensionApi, configApi } from '@/lib/api';

const statusMap: Record<string, string> = {
  POOL: '任务池',
  CLAIMED: '待确认',
  DRAFT: '草稿',
  PENDING: '待执行',
  IN_PROGRESS: '执行中',
  IN_REVIEW: '待审核',
  REJECTED: '已驳回',
  COMPLETED: '已完成',
  CANCELLED: '已取消',
};

const statusColor: Record<string, string> = {
  POOL: 'bg-cyan-100 text-cyan-700',
  CLAIMED: 'bg-orange-100 text-orange-700',
  DRAFT: 'bg-gray-100 text-gray-700',
  PENDING: 'bg-blue-100 text-blue-700',
  IN_PROGRESS: 'bg-yellow-100 text-yellow-700',
  IN_REVIEW: 'bg-purple-100 text-purple-700',
  REJECTED: 'bg-red-100 text-red-700',
  COMPLETED: 'bg-green-100 text-green-700',
  CANCELLED: 'bg-gray-100 text-gray-500',
};

const taskTypeMap: Record<string, string> = {
  REQUIREMENT_DEV: '需求开发',
  OPS_SUPPORT: '运维支撑',
};

const taskSourceMap: Record<string, string> = {
  PROJECT: '项目',
  REQUIREMENT: '需求',
  OTHER: '其它',
};

const taskActionMap: Record<string, string> = {
  SELF_DEV: '自研',
  NON_SELF_DEV: '非自研',
};

function getFinishStatus(task: any): { label: string; color: string } {
  if (!task.actualFinishAt || !task.planFinishAt) {
    return { label: '-', color: '' };
  }
  const actual = new Date(task.actualFinishAt).setHours(0, 0, 0, 0);
  const plan = new Date(task.planFinishAt).setHours(0, 0, 0, 0);
  if (actual < plan) {
    return { label: '提前', color: 'bg-green-100 text-green-700' };
  } else if (actual > plan) {
    return { label: '延期', color: 'bg-red-100 text-red-700' };
  } else {
    return { label: '正常', color: 'bg-blue-100 text-blue-700' };
  }
}

export default function TasksPage() {
  const [tasks, setTasks] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editTask, setEditTask] = useState<any>(null);
  const [viewTask, setViewTask] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<'tasks' | 'pool' | 'review' | 'extension'>('tasks');
  
  const [filters, setFilters] = useState({
    assigneeId: '',
    creatorId: '',
    status: '',
    planFinishEnd: '',
  });
  const [showSearch, setShowSearch] = useState(true);
  const [sortConfig, setSortConfig] = useState({ key: '', direction: 'asc' });
  const [newTask, setNewTask] = useState({
    title: '',
    description: '',
    estimatedDays: 1,
    finalDays: 1,
    taskType: 'REQUIREMENT_DEV',
    taskSource: 'OTHER',
    sourceNo: '',
    sourceName: '',
    taskAction: 'SELF_DEV',
    scoreRatio: 1.00,
    planFinishAt: '',
    isPoolTask: false,
    claimRatio: 1.0,
    selectedUsers: [] as string[],
    ratios: {} as Record<string, number>,
    systemModuleId: '',
  });

  const [systemModules, setSystemModules] = useState<any[]>([]);

  const [submitFinalDaysModal, setSubmitFinalDaysModal] = useState<{open: boolean; taskId: string; value: number}>({ open: false, taskId: '', value: 1 });
  const [approveFinalDaysModal, setApproveFinalDaysModal] = useState<{open: boolean; taskId: string; value: number}>({ open: false, taskId: '', value: 1 });
  const [approveClaimModal, setApproveClaimModal] = useState<{open: boolean; taskId: string; claimerName: string; ratio: number}>({ open: false, taskId: '', claimerName: '', ratio: 1 });
  const [extensionModal, setExtensionModal] = useState<{open: boolean; taskId: string; taskTitle: string}>({ open: false, taskId: '', taskTitle: '' });
  const [extensionForm, setExtensionForm] = useState({ reason: '', extendDays: 1 });
  const [pendingExtensions, setPendingExtensions] = useState<any[]>([]);
  const [extReviewNote, setExtReviewNote] = useState('');

  const taskTypeOptions = [
    { value: 'REQUIREMENT_DEV', label: '需求开发' },
    { value: 'OPS_SUPPORT', label: '运维支撑' },
  ];

  const taskSourceOptions = [
    { value: 'PROJECT', label: '项目' },
    { value: 'REQUIREMENT', label: '需求' },
    { value: 'OTHER', label: '其它' },
  ];

  const taskActionOptions = [
    { value: 'SELF_DEV', label: '自研' },
    { value: 'NON_SELF_DEV', label: '非自研' },
  ];
  const user = JSON.parse(localStorage.getItem('user') || '{}');

  const canCreate = user.role === 'PM' || user.role === 'MANAGER';
  const canEdit = user.role === 'PM' || user.role === 'MANAGER';

  useEffect(() => {
    loadTasks();
    loadUsers();
    loadSystemModules();
    if (canCreate) {
      loadPendingExtensions();
    }
  }, []);

  const loadTasks = async () => {
    setLoading(true);
    try {
      const filterParams = Object.fromEntries(
        Object.entries(filters).filter(([, v]) => v !== '')
      );
      const res = await taskApi.list(undefined, Object.keys(filterParams).length > 0 ? filterParams : undefined);
      setTasks(res.data || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (key: string, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const resetFilters = () => {
    setFilters({
      assigneeId: '',
      creatorId: '',
      status: '',
      planFinishEnd: '',
    });
  };

  const handleSort = (key: string) => {
    let direction = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  const sortIcon = (key: string) => {
    if (sortConfig.key !== key) {
      return <span className="ml-1 text-gray-400">↕</span>;
    }
    return sortConfig.direction === 'asc' ? (
      <span className="ml-1 text-blue-500">↑</span>
    ) : (
      <span className="ml-1 text-blue-500">↓</span>
    );
  };

  const loadUsers = async () => {
    try {
      const res = await userApi.list();
      setUsers(res.data || []);
    } catch (e) {
      console.error(e);
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

  const getRatiosSum = () => {
    return Object.values(newTask.ratios).reduce((sum, r) => sum + r, 0);
  };

  const defaultNewTask = {
    title: '', description: '', estimatedDays: 1, finalDays: 1,
    taskType: 'REQUIREMENT_DEV', taskSource: 'OTHER', sourceNo: '', sourceName: '', taskAction: 'SELF_DEV',
    scoreRatio: 1.00, planFinishAt: '', isPoolTask: false, claimRatio: 1.0,
    selectedUsers: [] as string[], ratios: {} as Record<string, number>,
    systemModuleId: '',
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();

    if (newTask.isPoolTask) {
      try {
        await taskApi.create({
          title: newTask.title,
          description: newTask.description || undefined,
          estimatedDays: Number(newTask.estimatedDays),
          taskType: newTask.taskType,
          taskSource: newTask.taskSource,
          sourceNo: newTask.sourceNo || undefined,
          sourceName: newTask.sourceName || undefined,
          taskAction: newTask.taskAction,
          scoreRatio: Number(newTask.scoreRatio),
          planFinishAt: newTask.planFinishAt || undefined,
          isPoolTask: true,
          claimRatio: Number(newTask.claimRatio),
          assignees: [],
          systemModuleId: newTask.systemModuleId || undefined,
        });
        setShowModal(false);
        setNewTask(defaultNewTask);
        loadTasks();
      } catch (e: any) {
        alert(e.response?.data?.message || '创建失败');
      }
      return;
    }

    if (newTask.selectedUsers.length === 0) {
      alert('请至少选择一个成员');
      return;
    }
    const ratio = 1 / newTask.selectedUsers.length;
    try {
      await taskApi.create({
        title: newTask.title,
        description: newTask.description || undefined,
        estimatedDays: Number(newTask.estimatedDays),
        taskType: newTask.taskType,
        taskSource: newTask.taskSource,
        sourceNo: newTask.sourceNo || undefined,
        sourceName: newTask.sourceName || undefined,
        taskAction: newTask.taskAction,
        scoreRatio: Number(newTask.scoreRatio),
        planFinishAt: newTask.planFinishAt || undefined,
        assignees: newTask.selectedUsers.map((id: string) => ({ userId: id, ratio })),
        systemModuleId: newTask.systemModuleId || undefined,
      });
      setShowModal(false);
      setNewTask(defaultNewTask);
      loadTasks();
    } catch (e: any) {
      alert(e.response?.data?.message || '创建失败');
    }
  };

  const handleStatus = async (id: string, status: string, finalDays?: number) => {
    try {
      await taskApi.updateStatus(id, { status, finalDays });
      loadTasks();
    } catch (e: any) {
      alert(e.response?.data?.message || '操作失败');
    }
  };

  const openSubmitModal = (task: any) => {
    setSubmitFinalDaysModal({ open: true, taskId: task.id, value: task.finalDays || task.estimatedDays || 1 });
  };

  const handleSubmitWithFinalDays = async () => {
    await handleStatus(submitFinalDaysModal.taskId, 'IN_REVIEW', submitFinalDaysModal.value);
    setSubmitFinalDaysModal({ open: false, taskId: '', value: 1 });
  };

  const openApproveModal = (task: any) => {
    setApproveFinalDaysModal({ open: true, taskId: task.id, value: task.finalDays || task.estimatedDays || 1 });
  };

  const handleApproveWithFinalDays = async () => {
    try {
      await taskApi.approve(approveFinalDaysModal.taskId, { finalDays: approveFinalDaysModal.value });
      setApproveFinalDaysModal({ open: false, taskId: '', value: 1 });
      loadTasks();
    } catch (e: any) {
      alert(e.response?.data?.message || '审核失败');
    }
  };

  const handleClaim = async (id: string) => {
    try {
      await taskApi.claim(id);
      loadTasks();
    } catch (e: any) {
      alert(e.response?.data?.message || '领取失败');
    }
  };

  const handleCancelClaim = async (id: string) => {
    try {
      await taskApi.cancelClaim(id);
      loadTasks();
    } catch (e: any) {
      alert(e.response?.data?.message || '取消领取失败');
    }
  };

  const openApproveClaimModal = (task: any) => {
    setApproveClaimModal({
      open: true,
      taskId: task.id,
      claimerName: task.claimedUser?.name || '未知',
      ratio: task.claimRatio || 1.0,
    });
  };

  const handleApproveClaim = async () => {
    try {
      await taskApi.approveClaim(approveClaimModal.taskId, { ratio: approveClaimModal.ratio });
      setApproveClaimModal({ open: false, taskId: '', claimerName: '', ratio: 1 });
      loadTasks();
    } catch (e: any) {
      alert(e.response?.data?.message || '确认领取失败');
    }
  };

  const handleRejectClaim = async (id: string) => {
    try {
      await taskApi.rejectClaim(id);
      loadTasks();
    } catch (e: any) {
      alert(e.response?.data?.message || '驳回领取失败');
    }
  };

  const handleReturnToPool = async (id: string) => {
    if (!confirm('确定要将此任务退回任务池吗？')) return;
    try {
      await taskApi.returnToPool(id);
      loadTasks();
    } catch (e: any) {
      alert(e.response?.data?.message || '退回失败');
    }
  };

  const handleDelete = async (task: any) => {
    if (!confirm(`确定删除任务【${task.title}】吗？删除后不可恢复。`)) return;
    try {
      await taskApi.delete(task.id);
      loadTasks();
    } catch (e: any) {
      alert(e.response?.data?.message || '删除失败');
    }
  };

  const handleApplyExtension = async () => {
    try {
      await extensionApi.apply(extensionModal.taskId, extensionForm);
      setExtensionModal({ open: false, taskId: '', taskTitle: '' });
      setExtensionForm({ reason: '', extendDays: 1 });
      alert('延期申请已提交，等待审批');
    } catch (e: any) {
      alert(e.response?.data?.message || '申请失败');
    }
  };

  const loadPendingExtensions = async () => {
    try {
      const res = await extensionApi.pending();
      setPendingExtensions(res.data || []);
    } catch (e) {
      console.error(e);
    }
  };

  const handleExtReview = async (id: string, approved: boolean) => {
    try {
      await extensionApi.review(id, { approved, note: extReviewNote });
      setExtReviewNote('');
      loadPendingExtensions();
    } catch (e: any) {
      alert(e.response?.data?.message || '操作失败');
    }
  };

  const handleEdit = (task: any) => {
    setEditTask(task);
    const existingRatios: Record<string, number> = {};
    const selectedUsers = task.assignments?.map((a: any) => {
      existingRatios[a.userId] = a.ratio;
      return a.userId;
    }) || [];
    setNewTask({
      title: task.title,
      description: task.description || '',
      estimatedDays: task.estimatedDays || 1,
      finalDays: task.finalDays || task.estimatedDays || 1,
      taskType: task.taskType || 'REQUIREMENT_DEV',
      taskSource: task.taskSource || 'OTHER',
      sourceNo: task.sourceNo || '',
      sourceName: task.sourceName || '',
      taskAction: task.taskAction || 'SELF_DEV',
      scoreRatio: task.scoreRatio ?? (task.taskAction === 'NON_SELF_DEV' ? 0.60 : 1.00),
      planFinishAt: task.planFinishAt ? new Date(task.planFinishAt).toISOString().split('T')[0] : '',
      isPoolTask: task.isPoolTask || false,
      claimRatio: task.claimRatio || 1.0,
      selectedUsers,
      ratios: existingRatios,
      systemModuleId: task.systemModuleId || '',
    });
    setShowModal(true);
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTask.isPoolTask && newTask.selectedUsers.length === 0) {
      alert('请至少选择一个成员');
      return;
    }
    if (!newTask.isPoolTask) {
      const sum = getRatiosSum();
      if (Math.abs(sum - 1) > 0.01) {
        alert(`贡献比例总和必须为1，当前总和为 ${sum.toFixed(2)}`);
        return;
      }
    }
    try {
      const updateData: any = {
        title: newTask.title,
        description: newTask.description || undefined,
        estimatedDays: Number(newTask.estimatedDays),
        taskType: newTask.taskType,
        taskSource: newTask.taskSource,
        sourceNo: newTask.sourceNo || undefined,
        sourceName: newTask.sourceName || undefined,
        taskAction: newTask.taskAction,
        scoreRatio: Number(newTask.scoreRatio),
        planFinishAt: newTask.planFinishAt || undefined,
      };
      if (!newTask.isPoolTask) {
        updateData.assignees = newTask.selectedUsers.map((id: string) => ({
          userId: id,
          ratio: newTask.ratios[id] || 0,
        }));
      }
      await taskApi.update(editTask.id, updateData);
      setShowModal(false);
      setEditTask(null);
      setNewTask(defaultNewTask);
      loadTasks();
    } catch (e: any) {
      alert(e.response?.data?.message || '编辑失败');
    }
  };

  const closeModal = () => {
    setShowModal(false);
    setEditTask(null);
    setNewTask(defaultNewTask);
  };

  const handleView = async (task: any) => {
    try {
      const res = await taskApi.detail(task.id);
      setViewTask(res.data);
    } catch (e: any) {
      setViewTask(task);
    }
  };

  const toggleUser = (userId: string) => {
    setNewTask(prev => {
      if (prev.selectedUsers.includes(userId)) {
        const newRatios = { ...prev.ratios };
        delete newRatios[userId];
        return { ...prev, selectedUsers: prev.selectedUsers.filter(id => id !== userId), ratios: newRatios };
      } else {
        const newRatios = { ...prev.ratios };
        const count = prev.selectedUsers.length + 1;
        newRatios[userId] = parseFloat((1 / count).toFixed(2));
        const equalRatio = parseFloat((1 / count).toFixed(2));
        const updatedRatios: Record<string, number> = {};
        prev.selectedUsers.forEach(id => {
          updatedRatios[id] = equalRatio;
        });
        updatedRatios[userId] = equalRatio;
        return { ...prev, selectedUsers: [...prev.selectedUsers, userId], ratios: updatedRatios };
      }
    });
  };

  const handleRatioChange = (userId: string, value: string) => {
    const num = parseFloat(value);
    if (!isNaN(num) && num >= 0 && num <= 1) {
      setNewTask(prev => ({
        ...prev,
        ratios: { ...prev.ratios, [userId]: num },
      }));
    }
  };

  const poolTasks = tasks.filter(t => t.isPoolTask && t.status === 'POOL');
  const nonPoolTasks = tasks.filter(t => !(t.isPoolTask && t.status === 'POOL'));
  const reviewTasks = tasks.filter(t => t.status === 'IN_REVIEW');

  const sortedTasks = [...nonPoolTasks].sort((a, b) => {
    if (!sortConfig.key) return 0;
    let aVal: any, bVal: any;
    switch (sortConfig.key) {
      case 'assignee':
        aVal = a.assignments?.map((x: any) => x.user?.name).join(',') || '';
        bVal = b.assignments?.map((x: any) => x.user?.name).join(',') || '';
        break;
      case 'status':
        aVal = a.status;
        bVal = b.status;
        break;
      case 'planFinish':
        aVal = a.planFinishAt || '';
        bVal = b.planFinishAt || '';
        break;
      case 'finishStatus':
        const getStatus = (task: any) => {
          if (!task.actualFinishAt || !task.planFinishAt) return 0;
          const actual = new Date(task.actualFinishAt).getTime();
          const plan = new Date(task.planFinishAt).getTime();
          if (actual < plan) return -1;
          if (actual > plan) return 1;
          return 0;
        };
        aVal = getStatus(a);
        bVal = getStatus(b);
        break;
      default:
        return 0;
    }
    if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1;
    if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1;
    return 0;
  });

  const formatDate = (d: string | null | undefined) => d ? new Date(d).toLocaleDateString('zh-CN') : '-';

  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">任务管理</h1>
        {canCreate && (
          <button
            onClick={() => setShowModal(true)}
            className="rounded-md px-4 py-2 text-sm font-medium text-white hover:opacity-90"
            style={{ backgroundColor: 'hsl(var(--telecom-blue))' }}
          >
            + 新建任务
          </button>
        )}
      </div>

      <div className="mt-4 flex border-b border-gray-200">
        <button
          onClick={() => setActiveTab('tasks')}
          className={`px-4 py-2 text-sm font-medium ${activeTab === 'tasks' ? 'border-b-2 text-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
          style={activeTab === 'tasks' ? { borderColor: 'hsl(var(--telecom-blue))', color: 'hsl(var(--telecom-blue))' } : {}}
        >
          我的任务
        </button>
        <button
          onClick={() => setActiveTab('pool')}
          className={`px-4 py-2 text-sm font-medium ${activeTab === 'pool' ? 'border-b-2 text-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
          style={activeTab === 'pool' ? { borderColor: 'hsl(var(--telecom-blue))', color: 'hsl(var(--telecom-blue))' } : {}}
        >
          任务池 {poolTasks.length > 0 && <span className="ml-1 inline-flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-xs text-white">{poolTasks.length}</span>}
        </button>
        {canCreate && (
          <button
            onClick={() => { setActiveTab('review'); loadTasks(); }}
            className={`px-4 py-2 text-sm font-medium ${activeTab === 'review' ? 'border-b-2 text-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
            style={activeTab === 'review' ? { borderColor: 'hsl(var(--telecom-blue))', color: 'hsl(var(--telecom-blue))' } : {}}
          >
            待审核任务 {reviewTasks.length > 0 && <span className="ml-1 inline-flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-xs text-white">{reviewTasks.length}</span>}
          </button>
        )}
        {canCreate && (
          <button
            onClick={() => { setActiveTab('extension'); loadPendingExtensions(); }}
            className={`px-4 py-2 text-sm font-medium ${activeTab === 'extension' ? 'border-b-2 text-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
            style={activeTab === 'extension' ? { borderColor: 'hsl(var(--telecom-blue))', color: 'hsl(var(--telecom-blue))' } : {}}
          >
            延期审批 {pendingExtensions.length > 0 && <span className="ml-1 inline-flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-xs text-white">{pendingExtensions.length}</span>}
          </button>
        )}
      </div>

      {/* 搜索过滤栏 */}
      {activeTab === 'tasks' && (
        <>
          <div className="mt-4 flex justify-end">
            <button
              onClick={() => setShowSearch(!showSearch)}
              className="flex items-center gap-1 rounded-md border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-100"
            >
              {showSearch ? (
                <>
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                  </svg>
                  隐藏搜索
                </>
              ) : (
                <>
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                  显示搜索
                </>
              )}
            </button>
          </div>
          {showSearch && (
            <div className="mt-4 rounded-lg bg-gray-50 p-4">
              <div className="grid grid-cols-4 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-500">负责人</label>
                  <select
                    value={filters.assigneeId}
                    onChange={(e) => handleFilterChange('assigneeId', e.target.value)}
                    className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                  >
                    <option value="">全部负责人</option>
                    {users.map((user: any) => (
                      <option key={user.id} value={user.id}>{user.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500">任务下达人</label>
                  <select
                    value={filters.creatorId}
                    onChange={(e) => handleFilterChange('creatorId', e.target.value)}
                    className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                  >
                    <option value="">全部下达人</option>
                    {users.filter((user: any) => user.role === 'PM' || user.role === 'MANAGER').map((user: any) => (
                      <option key={user.id} value={user.id}>{user.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500">状态</label>
                  <select
                    value={filters.status}
                    onChange={(e) => handleFilterChange('status', e.target.value)}
                    className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                  >
                    <option value="">全部状态</option>
                    {Object.entries(statusMap).map(([value, label]) => (
                      <option key={value} value={value}>{label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500">计划完成时间</label>
                  <input
                    type="date"
                    value={filters.planFinishEnd}
                    onChange={(e) => handleFilterChange('planFinishEnd', e.target.value)}
                    className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                  />
                </div>
              </div>
              <div className="mt-3 flex justify-end gap-2">
                <button
                  onClick={resetFilters}
                  className="rounded-md border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-100"
                >
                  重置
                </button>
                <button
                  onClick={loadTasks}
                  className="rounded-md px-3 py-1.5 text-xs font-medium text-white hover:opacity-90"
                  style={{ backgroundColor: 'hsl(var(--telecom-blue))' }}
                >
                  搜索
                </button>
              </div>
            </div>
          )}
        </>
      )}

      {loading ? (
        <div className="mt-8 text-center text-gray-500">加载中...</div>
      ) : activeTab === 'pool' ? (
        <div className="mt-6 overflow-hidden rounded-lg bg-white shadow">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">任务标题</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">工作量（人日）</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">实际积分</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">贡献比例</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">创建人</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">计划完成</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 bg-white">
              {poolTasks.map((task) => (
                <tr key={task.id}>
                  <td className="px-4 py-4 text-sm font-medium text-gray-900" title={task.title}>
                    <span className="block max-w-[200px] truncate">{task.title}</span>
                  </td>
                  <td className="whitespace-nowrap px-4 py-4 text-sm text-gray-500">{task.estimatedDays}</td>
                  <td className="whitespace-nowrap px-4 py-4 text-sm text-gray-500">
                    {(task.estimatedDays * (task.scoreRatio || 1)).toFixed(2)}
                  </td>
                  <td className="whitespace-nowrap px-4 py-4 text-sm text-gray-500">
                    {((task.claimRatio || 1) * 100).toFixed(0)}%
                  </td>
                  <td className="whitespace-nowrap px-4 py-4 text-sm text-gray-500">{task.creator?.name || '-'}</td>
                  <td className="whitespace-nowrap px-4 py-4 text-sm text-gray-500">
                    {formatDate(task.planFinishAt)}
                  </td>
                  <td className="whitespace-nowrap px-4 py-4 text-sm">
                    <div className="flex gap-2">
                      <button onClick={() => handleView(task)} style={{ color: 'hsl(var(--telecom-blue))' }} className="hover:opacity-70 font-medium">查看</button>
                      {user.role === 'MEMBER' && (
                        <button onClick={() => handleClaim(task.id)} style={{ color: 'hsl(var(--telecom-blue))' }} className="hover:opacity-70 font-medium">领取</button>
                      )}
                      {canEdit && (
                        <button onClick={() => handleEdit(task)} style={{ color: 'hsl(var(--telecom-blue))' }} className="hover:opacity-70">编辑</button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {poolTasks.length === 0 && (
                <tr><td colSpan={7} className="px-4 py-8 text-center text-sm text-gray-500">暂无任务池任务</td></tr>
              )}
            </tbody>
          </table>
        </div>
      ) : activeTab === 'tasks' ? (
        <div className="mt-6 overflow-hidden rounded-lg bg-white shadow">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">任务标题</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">工作量（人日）</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">实际积分</th>
                <th 
                  className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 cursor-pointer hover:text-gray-700"
                  onClick={() => handleSort('assignee')}
                >
                  负责人{sortIcon('assignee')}
                </th>
                <th 
                  className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 cursor-pointer hover:text-gray-700"
                  onClick={() => handleSort('status')}
                >
                  状态{sortIcon('status')}
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">实际开始</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">实际完成</th>
                <th 
                  className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 cursor-pointer hover:text-gray-700"
                  onClick={() => handleSort('planFinish')}
                >
                  计划完成{sortIcon('planFinish')}
                </th>
                <th 
                  className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 cursor-pointer hover:text-gray-700"
                  onClick={() => handleSort('finishStatus')}
                >
                  完成状态{sortIcon('finishStatus')}
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 bg-white">
              {sortedTasks.map((task) => (
                <tr key={task.id}>
                  <td className="px-4 py-4 text-sm font-medium text-gray-900" title={task.title}>
                    <span className="block max-w-[120px] truncate">{task.title}</span>
                    {task.isPoolTask && <span className="ml-1 inline-flex rounded bg-cyan-50 px-1 text-xs text-cyan-600">池</span>}
                  </td>
                  <td className="whitespace-nowrap px-4 py-4 text-sm text-gray-500">
                    {task.finalDays !== null && task.finalDays !== undefined && task.finalDays !== task.estimatedDays
                      ? `${task.estimatedDays} → ${task.finalDays}`
                      : task.estimatedDays}
                  </td>
                  <td className="whitespace-nowrap px-4 py-4 text-sm text-gray-500">
                    {(() => {
                      const workDays = task.finalDays || task.estimatedDays || 0;
                      const totalScore = workDays * (task.scoreRatio || 1);
                      return totalScore > 0 ? totalScore.toFixed(2) : '-';
                    })()}
                  </td>
                  <td className="whitespace-nowrap px-4 py-4 text-sm text-gray-500">
                    {task.status === 'CLAIMED' && task.claimedUser
                      ? `${task.claimedUser.name}（待确认）`
                      : task.assignments?.map((a: any) => a.user?.name).join(', ') || '-'}
                  </td>
                  <td className="whitespace-nowrap px-4 py-4">
                    <span className={`inline-flex rounded-full px-2 text-xs font-semibold leading-5 ${statusColor[task.status]}`}>
                      {statusMap[task.status]}
                    </span>
                  </td>
                  <td className="whitespace-nowrap px-4 py-4 text-sm text-gray-500">
                    {formatDate(task.actualStartAt)}
                  </td>
                  <td className="whitespace-nowrap px-4 py-4 text-sm text-gray-500">
                    {formatDate(task.actualFinishAt)}
                  </td>
                  <td className="whitespace-nowrap px-4 py-4 text-sm text-gray-500">
                    {formatDate(task.planFinishAt)}
                  </td>
                  <td className="whitespace-nowrap px-4 py-4">
                    {(() => {
                      const fs = getFinishStatus(task);
                      return fs.label !== '-' ? (
                        <span className={`inline-flex rounded-full px-2 text-xs font-semibold leading-5 ${fs.color}`}>
                          {fs.label}
                        </span>
                      ) : (
                        <span className="text-sm text-gray-400">-</span>
                      );
                    })()}
                  </td>
                  <td className="whitespace-nowrap px-4 py-4 text-sm">
                    <div className="flex gap-2">
                      <button onClick={() => handleView(task)} style={{ color: 'hsl(var(--telecom-blue))' }} className="hover:opacity-70 font-medium">查看</button>
                      {task.status === 'CLAIMED' && task.claimedBy === user.id && (
                        <button onClick={() => handleCancelClaim(task.id)} className="text-gray-600 hover:text-gray-900">取消领取</button>
                      )}
                      {task.status === 'CLAIMED' && (task.createdBy === user.id || user.role === 'MANAGER') && (
                        <>
                          <button onClick={() => openApproveClaimModal(task)} className="text-green-600 hover:text-green-900">确认领取</button>
                          <button onClick={() => handleRejectClaim(task.id)} className="text-red-600 hover:text-red-900">驳回领取</button>
                        </>
                      )}
                      {task.status === 'PENDING' && task.assignments?.some((a: any) => a.userId === user.id) && (
                        <button onClick={() => handleStatus(task.id, 'IN_PROGRESS')} style={{ color: 'hsl(var(--telecom-blue))' }} className="hover:opacity-70">开始</button>
                      )}
                      {task.status === 'PENDING' && task.isPoolTask && (task.assignments?.some((a: any) => a.userId === user.id) || task.createdBy === user.id || user.role === 'MANAGER') && !task.actualStartAt && (
                        <button onClick={() => handleReturnToPool(task.id)} className="text-orange-600 hover:text-orange-900">退回池</button>
                      )}
                      {task.status === 'IN_PROGRESS' && task.assignments?.some((a: any) => a.userId === user.id) && (
                        <button onClick={() => openSubmitModal(task)} style={{ color: 'hsl(var(--telecom-blue))' }} className="hover:opacity-70">提交完成</button>
                      )}
                      {task.status === 'IN_PROGRESS' && task.assignments?.some((a: any) => a.userId === user.id) && task.planFinishAt && (
                        <button onClick={() => setExtensionModal({ open: true, taskId: task.id, taskTitle: task.title })} className="text-orange-600 hover:text-orange-900">申请延期</button>
                      )}
                      {task.status === 'IN_REVIEW' && (task.createdBy === user.id || user.role === 'MANAGER') && (
                        <button onClick={() => openApproveModal(task)} className="text-green-600 hover:text-green-900">审核通过</button>
                      )}
                      {task.status === 'IN_REVIEW' && (task.createdBy === user.id || user.role === 'MANAGER') && (
                        <button onClick={() => handleStatus(task.id, 'REJECTED')} className="text-red-600 hover:text-red-900">驳回</button>
                      )}
                      {task.status === 'REJECTED' && task.assignments?.some((a: any) => a.userId === user.id) && (
                        <button onClick={() => handleStatus(task.id, 'IN_PROGRESS')} style={{ color: 'hsl(var(--telecom-blue))' }} className="hover:opacity-70">重新处理</button>
                      )}
                      {canEdit && ['DRAFT', 'PENDING', 'POOL', 'IN_PROGRESS'].includes(task.status) && (
                        <button onClick={() => handleEdit(task)} style={{ color: 'hsl(var(--telecom-blue))' }} className="hover:opacity-70">编辑</button>
                      )}
                      {canEdit && ['DRAFT', 'PENDING', 'POOL', 'CLAIMED'].includes(task.status) && (
                        <button onClick={() => handleDelete(task)} className="text-red-600 hover:text-red-900">删除</button>
                      )}
                      {task.createdBy === user.id && ['DRAFT', 'PENDING', 'IN_PROGRESS', 'REJECTED', 'POOL'].includes(task.status) && (
                        <button onClick={() => handleStatus(task.id, 'CANCELLED')} className="text-gray-600 hover:text-gray-900">取消</button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {nonPoolTasks.length === 0 && (
                <tr><td colSpan={10} className="px-4 py-8 text-center text-sm text-gray-500">暂无任务</td></tr>
              )}
            </tbody>
          </table>
        </div>
      ) : null}

      {/* 待审核任务 */}
      {activeTab === 'review' && canCreate && (
        <div className="mt-6 overflow-hidden rounded-lg bg-white shadow">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">任务标题</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">工作量（人日）</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">实际积分</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">负责人</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">创建人</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">实际完成</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">计划完成</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 bg-white">
              {reviewTasks.map((task) => (
                <tr key={task.id}>
                  <td className="px-4 py-4 text-sm font-medium text-gray-900" title={task.title}>
                    <span className="block max-w-[200px] truncate">{task.title}</span>
                  </td>
                  <td className="whitespace-nowrap px-4 py-4 text-sm text-gray-500">
                    {task.finalDays !== null && task.finalDays !== undefined && task.finalDays !== task.estimatedDays
                      ? `${task.estimatedDays} → ${task.finalDays}`
                      : task.estimatedDays}
                  </td>
                  <td className="whitespace-nowrap px-4 py-4 text-sm text-gray-500">
                    {(() => {
                      const workDays = task.finalDays || task.estimatedDays || 0;
                      const totalScore = workDays * (task.scoreRatio || 1);
                      return totalScore > 0 ? totalScore.toFixed(2) : '-';
                    })()}
                  </td>
                  <td className="whitespace-nowrap px-4 py-4 text-sm text-gray-500">
                    {task.assignments?.map((a: any) => a.user?.name).join(', ') || '-'}
                  </td>
                  <td className="whitespace-nowrap px-4 py-4 text-sm text-gray-500">{task.creator?.name || '-'}</td>
                  <td className="whitespace-nowrap px-4 py-4 text-sm text-gray-500">
                    {formatDate(task.actualFinishAt)}
                  </td>
                  <td className="whitespace-nowrap px-4 py-4 text-sm text-gray-500">
                    {formatDate(task.planFinishAt)}
                  </td>
                  <td className="whitespace-nowrap px-4 py-4 text-sm">
                    <div className="flex gap-2">
                      <button onClick={() => handleView(task)} style={{ color: 'hsl(var(--telecom-blue))' }} className="hover:opacity-70 font-medium">查看</button>
                      {(task.createdBy === user.id || user.role === 'MANAGER') && (
                        <>
                          <button onClick={() => openApproveModal(task)} className="text-green-600 hover:text-green-900">审核通过</button>
                          <button onClick={() => handleStatus(task.id, 'REJECTED')} className="text-red-600 hover:text-red-900">驳回</button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {reviewTasks.length === 0 && (
                <tr><td colSpan={8} className="px-4 py-8 text-center text-sm text-gray-500">暂无待审核任务</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* 延期审批 */}
      {activeTab === 'extension' && canCreate && (
        <div className="mt-6 overflow-hidden rounded-lg bg-white shadow">
          <div className="border-b border-gray-200 px-6 py-4">
            <h2 className="font-medium text-gray-900">待审批延期申请</h2>
          </div>
          {pendingExtensions.length === 0 ? (
            <div className="px-6 py-12 text-center text-sm text-gray-500">暂无待审批的延期申请</div>
          ) : (
            <div className="divide-y divide-gray-200">
              {pendingExtensions.map((ext) => (
                <div key={ext.id} className="px-6 py-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="font-medium text-gray-900">
                        {ext.task?.title || `任务 ${ext.taskId}`}
                      </span>
                      <span className="ml-2 text-sm text-gray-500">
                        申请人：{ext.user?.name} | 延期 {ext.extendDays} 天
                      </span>
                    </div>
                  </div>
                  <p className="mt-1 text-sm text-gray-600">原因：{ext.reason}</p>
                  <p className="mt-1 text-xs text-gray-400">
                    新截止日期：{new Date(ext.newDeadline).toLocaleDateString('zh-CN')}
                  </p>
                  <div className="mt-3 flex items-center gap-2">
                    <input
                      type="text"
                      placeholder="审批意见（可选）"
                      value={extReviewNote}
                      onChange={(e) => setExtReviewNote(e.target.value)}
                      className="flex-1 rounded-lg border border-gray-300 px-3 py-1.5 text-sm"
                    />
                    <button
                      onClick={() => handleExtReview(ext.id, true)}
                      className="rounded-lg bg-green-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-green-700"
                    >
                      通过
                    </button>
                    <button
                      onClick={() => handleExtReview(ext.id, false)}
                      className="rounded-lg bg-red-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-red-700"
                    >
                      驳回
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* 新建/编辑任务弹窗 */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-lg bg-white p-6 shadow-xl">
            <h3 className="text-lg font-medium text-gray-900">{editTask ? '编辑任务' : '新建任务'}</h3>
            <form onSubmit={editTask ? handleUpdate : handleCreate} className="mt-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">任务标题</label>
                <input required value={newTask.title} onChange={e => setNewTask({...newTask, title: e.target.value})}
                  className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">任务描述</label>
                <textarea value={newTask.description} onChange={e => setNewTask({...newTask, description: e.target.value})}
                  rows={3} placeholder="请输入任务描述..."
                  className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm" />
              </div>

              {!editTask && (
                <div className="flex items-center gap-3">
                  <label className="flex cursor-pointer items-center gap-2">
                    <input type="checkbox" checked={newTask.isPoolTask} onChange={e => setNewTask({...newTask, isPoolTask: e.target.checked})}
                      className="h-4 w-4 rounded border-gray-300" />
                    <span className="text-sm font-medium text-gray-700">放入任务池（不指定负责人，由成员主动领取）</span>
                  </label>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">任务类型</label>
                  <select value={newTask.taskType} onChange={e => setNewTask({...newTask, taskType: e.target.value})}
                    className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm">
                    {taskTypeOptions.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">任务来源</label>
                  <select value={newTask.taskSource} onChange={e => setNewTask({...newTask, taskSource: e.target.value, sourceNo: '', sourceName: ''})}
                    className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm">
                    {taskSourceOptions.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                  </select>
                  {newTask.taskSource === 'REQUIREMENT' && (
                    <input type="text" placeholder="请输入需求单号" value={newTask.sourceNo}
                      onChange={e => setNewTask({...newTask, sourceNo: e.target.value})}
                      className="mt-2 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm" />
                  )}
                  {newTask.taskSource === 'PROJECT' && (
                    <input type="text" placeholder="请输入项目名称" value={newTask.sourceName}
                      onChange={e => setNewTask({...newTask, sourceName: e.target.value})}
                      className="mt-2 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm" />
                  )}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">任务动作</label>
                  <select value={newTask.taskAction} onChange={e => {
                    const action = e.target.value;
                    const ratio = action === 'NON_SELF_DEV' ? 0.60 : 1.00;
                    setNewTask({...newTask, taskAction: action, scoreRatio: ratio});
                  }}
                    className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm">
                    {taskActionOptions.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">积分转换比例</label>
                  <input type="number" step="0.01" min="0" max="1" required
                    value={newTask.scoreRatio}
                    onChange={e => setNewTask({...newTask, scoreRatio: Number(e.target.value)})}
                    className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm" />
                  <p className="mt-1 text-xs text-gray-500">
                    {newTask.taskAction === 'NON_SELF_DEV' ? '非自研默认60%，可调整' : '自研为100%'}
                  </p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">预估工作量（人日）</label>
                  <input type="number" step="0.5" min="0.5" required value={newTask.estimatedDays} onChange={e => {
                    const val = Number(e.target.value);
                    setNewTask({...newTask, estimatedDays: val, finalDays: val});
                  }}
                    className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm" />
                </div>
                {editTask && !newTask.isPoolTask && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700">最终工作量（人日）</label>
                    <input type="number" step="0.5" min="0.5" required value={newTask.finalDays} onChange={e => setNewTask({...newTask, finalDays: Number(e.target.value)})}
                      className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm" />
                  </div>
                )}
                {newTask.isPoolTask && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700">领取人贡献比例</label>
                    <input type="number" step="0.01" min="0.01" max="1" required
                      value={newTask.claimRatio}
                      onChange={e => setNewTask({...newTask, claimRatio: Number(e.target.value)})}
                      className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm" />
                    <p className="mt-1 text-xs text-gray-500">领取人获得的贡献比例，PM审核时可调整</p>
                  </div>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">计划完成时间</label>
                <input type="date" value={newTask.planFinishAt} onChange={e => setNewTask({...newTask, planFinishAt: e.target.value})}
                  className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">系统归属</label>
                <select value={newTask.systemModuleId} onChange={e => setNewTask({...newTask, systemModuleId: e.target.value})}
                  className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm">
                  <option value="">请选择系统归属</option>
                  {systemModules.map(module => (
                    <option key={module.id} value={module.id}>{module.name}</option>
                  ))}
                </select>
              </div>
              {!newTask.isPoolTask && (
                <div>
                  <label className="block text-sm font-medium text-gray-700">分配成员</label>
                  <div className="mt-2 max-h-48 overflow-y-auto border rounded-md p-2">
                    {users.filter((u: any) => u.role !== 'MANAGER').map((u: any) => (
                      <div key={u.id} className="flex items-center gap-2 py-1">
                        <label className="flex cursor-pointer items-center gap-2">
                          <input type="checkbox" checked={newTask.selectedUsers.includes(u.id)} onChange={() => toggleUser(u.id)} />
                          <span className="text-sm">{u.name}</span>
                        </label>
                        {newTask.selectedUsers.includes(u.id) && editTask && (
                          <div className="ml-auto flex items-center gap-1">
                            <span className="text-xs text-gray-500">比例:</span>
                            <input
                              type="number"
                              step="0.01"
                              min="0"
                              max="1"
                              value={newTask.ratios[u.id] ?? ''}
                              onChange={e => handleRatioChange(u.id, e.target.value)}
                              className="w-16 rounded border border-gray-300 px-1.5 py-0.5 text-center text-xs"
                            />
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                  {editTask && newTask.selectedUsers.length > 0 && (
                    <div className="mt-2 flex items-center justify-between text-xs">
                      <span className={Math.abs(getRatiosSum() - 1) <= 0.01 ? 'text-green-600' : 'text-red-600'}>
                        比例总和: {getRatiosSum().toFixed(2)}
                      </span>
                      {Math.abs(getRatiosSum() - 1) > 0.01 && (
                        <button
                          type="button"
                          onClick={() => {
                            const equalRatio = parseFloat((1 / newTask.selectedUsers.length).toFixed(2));
                            const newRatios: Record<string, number> = {};
                            newTask.selectedUsers.forEach(id => { newRatios[id] = equalRatio; });
                            setNewTask(prev => ({ ...prev, ratios: newRatios }));
                          }}
                          className="text-blue-600 hover:text-blue-800"
                        >
                          均分
                        </button>
                      )}
                    </div>
                  )}
                </div>
              )}
              <div className="mt-6 flex justify-end gap-3">
                <button type="button" onClick={closeModal} className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">取消</button>
                <button type="submit" className="rounded-md px-4 py-2 text-sm font-medium text-white hover:opacity-90" style={{ backgroundColor: 'hsl(var(--telecom-blue))' }}>{editTask ? '保存' : '创建'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 查看任务详情弹窗 */}
      {viewTask && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-lg bg-white p-6 shadow-xl">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-medium text-gray-900">任务详情</h3>
              <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${statusColor[viewTask.status]}`}>
                {statusMap[viewTask.status]}
              </span>
            </div>

            <div className="mt-4 space-y-3">
              <div>
                <span className="text-sm font-medium text-gray-500">任务标题</span>
                <p className="mt-0.5 text-sm text-gray-900">{viewTask.title}</p>
              </div>

              {viewTask.description && (
                <div>
                  <span className="text-sm font-medium text-gray-500">任务描述</span>
                  <p className="mt-0.5 whitespace-pre-wrap text-sm text-gray-900">{viewTask.description}</p>
                </div>
              )}

              <div className="grid grid-cols-2 gap-x-6 gap-y-3">
                <div>
                  <span className="text-sm font-medium text-gray-500">任务类型</span>
                  <p className="mt-0.5 text-sm text-gray-900">{taskTypeMap[viewTask.taskType] || viewTask.taskType}</p>
                </div>
                <div>
                  <span className="text-sm font-medium text-gray-500">任务来源</span>
                  <p className="mt-0.5 text-sm text-gray-900">
                    {taskSourceMap[viewTask.taskSource] || viewTask.taskSource}
                    {viewTask.taskSource === 'REQUIREMENT' && viewTask.sourceNo && `：${viewTask.sourceNo}`}
                    {viewTask.taskSource === 'PROJECT' && viewTask.sourceName && `：${viewTask.sourceName}`}
                  </p>
                </div>
                <div>
                  <span className="text-sm font-medium text-gray-500">任务动作</span>
                  <p className="mt-0.5 text-sm text-gray-900">{taskActionMap[viewTask.taskAction] || viewTask.taskAction}</p>
                </div>
                <div>
                  <span className="text-sm font-medium text-gray-500">积分转换比例</span>
                  <p className="mt-0.5 text-sm text-gray-900">{(viewTask.scoreRatio * 100).toFixed(0)}%</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-x-6 gap-y-3">
                <div>
                  <span className="text-sm font-medium text-gray-500">预估工作量</span>
                  <p className="mt-0.5 text-sm text-gray-900">{viewTask.estimatedDays} 人日</p>
                </div>
                <div>
                  <span className="text-sm font-medium text-gray-500">最终工作量</span>
                  <p className="mt-0.5 text-sm text-gray-900">
                    {viewTask.finalDays !== null && viewTask.finalDays !== undefined
                      ? `${viewTask.finalDays} 人日`
                      : '-'}
                  </p>
                </div>
                <div>
                  <span className="text-sm font-medium text-gray-500">实际积分</span>
                  <p className="mt-0.5 text-sm font-semibold text-gray-900">
                    {(() => {
                      const workDays = viewTask.finalDays || viewTask.estimatedDays || 0;
                      const totalScore = workDays * (viewTask.scoreRatio || 1);
                      return totalScore > 0 ? totalScore.toFixed(2) : '-';
                    })()}
                  </p>
                </div>
                <div>
                  <span className="text-sm font-medium text-gray-500">计划完成时间</span>
                  <p className="mt-0.5 text-sm text-gray-900">{formatDate(viewTask.planFinishAt)}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-x-6 gap-y-3">
                <div>
                  <span className="text-sm font-medium text-gray-500">创建人</span>
                  <p className="mt-0.5 text-sm text-gray-900">{viewTask.creator?.name || '-'}</p>
                </div>
                <div>
                  <span className="text-sm font-medium text-gray-500">创建时间</span>
                  <p className="mt-0.5 text-sm text-gray-900">{formatDate(viewTask.createdAt)}</p>
                </div>
              </div>

              {viewTask.isPoolTask && (
                <div className="grid grid-cols-2 gap-x-6 gap-y-3">
                  <div>
                    <span className="text-sm font-medium text-gray-500">任务池任务</span>
                    <p className="mt-0.5 text-sm text-gray-900">是</p>
                  </div>
                  {viewTask.claimRatio && (
                    <div>
                      <span className="text-sm font-medium text-gray-500">领取人贡献比例</span>
                      <p className="mt-0.5 text-sm text-gray-900">{(viewTask.claimRatio * 100).toFixed(0)}%</p>
                    </div>
                  )}
                </div>
              )}

              {(viewTask.status === 'CLAIMED' || viewTask.status === 'PENDING' || viewTask.status === 'IN_PROGRESS' || viewTask.status === 'IN_REVIEW' || viewTask.status === 'COMPLETED' || viewTask.status === 'REJECTED') && (
                <div>
                  <span className="text-sm font-medium text-gray-500">
                    {viewTask.status === 'CLAIMED' ? '领取人' : '负责人'}
                  </span>
                  <div className="mt-1">
                    {viewTask.status === 'CLAIMED' && viewTask.claimedUser ? (
                      <div className="flex items-center gap-2 rounded-md bg-orange-50 px-3 py-2">
                        <span className="text-sm text-gray-900">{viewTask.claimedUser.name}</span>
                        <span className="text-xs text-orange-600">（待确认）</span>
                      </div>
                    ) : viewTask.assignments?.length > 0 ? (
                      <div className="space-y-1">
                        {viewTask.assignments.map((a: any) => (
                          <div key={a.id} className="flex items-center justify-between rounded-md bg-gray-50 px-3 py-2">
                            <span className="text-sm text-gray-900">{a.user?.name}</span>
                            <span className="text-xs text-gray-500">贡献比例 {(a.ratio * 100).toFixed(0)}%</span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-gray-400">暂无</p>
                    )}
                  </div>
                </div>
              )}

              <div className="grid grid-cols-3 gap-x-6 gap-y-3">
                <div>
                  <span className="text-sm font-medium text-gray-500">实际开始</span>
                  <p className="mt-0.5 text-sm text-gray-900">{formatDate(viewTask.actualStartAt)}</p>
                </div>
                <div>
                  <span className="text-sm font-medium text-gray-500">实际完成</span>
                  <p className="mt-0.5 text-sm text-gray-900">{formatDate(viewTask.actualFinishAt)}</p>
                </div>
                <div>
                  <span className="text-sm font-medium text-gray-500">完成状态</span>
                  <p className="mt-0.5">
                    {(() => {
                      const fs = getFinishStatus(viewTask);
                      return fs.label !== '-' ? (
                        <span className={`inline-flex rounded-full px-2 text-xs font-semibold leading-5 ${fs.color}`}>{fs.label}</span>
                      ) : (
                        <span className="text-sm text-gray-400">-</span>
                      );
                    })()}
                  </p>
                </div>
              </div>

              {viewTask.scoreRecords?.length > 0 && (
                <div>
                  <span className="text-sm font-medium text-gray-500">积分记录</span>
                  <div className="mt-1 space-y-1">
                    {viewTask.scoreRecords.map((r: any) => (
                      <div key={r.id} className="flex items-center justify-between rounded-md bg-green-50 px-3 py-2">
                        <span className="text-sm text-gray-900">{r.user?.name}</span>
                        <span className="text-sm font-medium text-green-700">+{r.score.toFixed(2)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="mt-6 flex justify-end">
              <button onClick={() => setViewTask(null)} className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">关闭</button>
            </div>
          </div>
        </div>
      )}

      {/* 成员提交完成 - 修正最终工作量弹窗 */}
      {submitFinalDaysModal.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl">
            <h3 className="text-lg font-medium text-gray-900">提交完成</h3>
            <p className="mt-2 text-sm text-gray-600">请确认最终工作量（人日），如有偏差可在此修正：</p>
            <div className="mt-4">
              <label className="block text-sm font-medium text-gray-700">最终工作量（人日）</label>
              <input type="number" step="0.5" min="0.5" required
                value={submitFinalDaysModal.value}
                onChange={e => setSubmitFinalDaysModal({...submitFinalDaysModal, value: Number(e.target.value)})}
                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm" />
            </div>
            <div className="mt-6 flex justify-end gap-3">
              <button onClick={() => setSubmitFinalDaysModal({ open: false, taskId: '', value: 1 })} className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">取消</button>
              <button onClick={handleSubmitWithFinalDays} className="rounded-md px-4 py-2 text-sm font-medium text-white hover:opacity-90" style={{ backgroundColor: 'hsl(var(--telecom-blue))' }}>确认提交</button>
            </div>
          </div>
        </div>
      )}

      {/* 项目经理审核 - 修正最终工作量弹窗 */}
      {approveFinalDaysModal.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl">
            <h3 className="text-lg font-medium text-gray-900">审核通过</h3>
            <p className="mt-2 text-sm text-gray-600">请确认最终工作量（人日），如有偏差可在此修正：</p>
            <div className="mt-4">
              <label className="block text-sm font-medium text-gray-700">最终工作量（人日）</label>
              <input type="number" step="0.5" min="0.5" required
                value={approveFinalDaysModal.value}
                onChange={e => setApproveFinalDaysModal({...approveFinalDaysModal, value: Number(e.target.value)})}
                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm" />
            </div>
            <div className="mt-6 flex justify-end gap-3">
              <button onClick={() => setApproveFinalDaysModal({ open: false, taskId: '', value: 1 })} className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">取消</button>
              <button onClick={handleApproveWithFinalDays} className="rounded-md px-4 py-2 text-sm font-medium text-white hover:opacity-90" style={{ backgroundColor: 'hsl(var(--telecom-blue))' }}>确认审核</button>
            </div>
          </div>
        </div>
      )}

      {/* PM确认领取弹窗 */}
      {approveClaimModal.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl">
            <h3 className="text-lg font-medium text-gray-900">确认领取</h3>
            <p className="mt-2 text-sm text-gray-600">
              成员 <span className="font-semibold">{approveClaimModal.claimerName}</span> 申请领取此任务，请确认贡献比例：
            </p>
            <div className="mt-4">
              <label className="block text-sm font-medium text-gray-700">领取人贡献比例</label>
              <input type="number" step="0.01" min="0.01" max="1" required
                value={approveClaimModal.ratio}
                onChange={e => setApproveClaimModal({...approveClaimModal, ratio: Number(e.target.value)})}
                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm" />
              <p className="mt-1 text-xs text-gray-500">如需添加其他协作者，可在确认后编辑任务</p>
            </div>
            <div className="mt-6 flex justify-end gap-3">
              <button onClick={() => setApproveClaimModal({ open: false, taskId: '', claimerName: '', ratio: 1 })} className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">取消</button>
              <button onClick={handleApproveClaim} className="rounded-md px-4 py-2 text-sm font-medium text-white hover:opacity-90" style={{ backgroundColor: 'hsl(var(--telecom-blue))' }}>确认领取</button>
            </div>
          </div>
        </div>
      )}

      {/* 申请延期弹窗 */}
      {extensionModal.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl">
            <h3 className="text-lg font-medium text-gray-900">申请延期</h3>
            <p className="mt-2 text-sm text-gray-600">
              任务：<span className="font-semibold">{extensionModal.taskTitle}</span>
            </p>
            <div className="mt-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">延期天数</label>
                <input type="number" min="1" max="30" required
                  value={extensionForm.extendDays}
                  onChange={e => setExtensionForm({...extensionForm, extendDays: Number(e.target.value)})}
                  className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">延期原因</label>
                <textarea required rows={3}
                  value={extensionForm.reason}
                  onChange={e => setExtensionForm({...extensionForm, reason: e.target.value})}
                  className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                  placeholder="请说明延期原因..." />
              </div>
              <div className="rounded-lg bg-orange-50 p-3 text-sm text-orange-700">
                ⚠️ 每人每月最多申请3次延期。审批通过的延期不扣罚积分。
              </div>
            </div>
            <div className="mt-6 flex justify-end gap-3">
              <button onClick={() => { setExtensionModal({ open: false, taskId: '', taskTitle: '' }); setExtensionForm({ reason: '', extendDays: 1 }); }} className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">取消</button>
              <button onClick={handleApplyExtension} className="rounded-md bg-orange-600 px-4 py-2 text-sm font-medium text-white hover:bg-orange-700">提交申请</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
