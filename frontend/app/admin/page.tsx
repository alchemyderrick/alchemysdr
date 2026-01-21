'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

interface User {
  username: string;
  employee_id: string;
  is_admin: number;
  created_at: string;
  last_login: string | null;
}

interface CreateUserForm {
  username: string;
  password: string;
  employeeId: string;
  isAdmin: boolean;
}

interface EmployeeStats {
  targets: { count: number };
  contacts: { count: number };
  drafts: { count: number };
  sent: { count: number };
  pending: { count: number };
}

export default function AdminDashboard() {
  const router = useRouter();
  const [users, setUsers] = useState<User[]>([]);
  const [stats, setStats] = useState<Record<string, EmployeeStats>>({});
  const [loading, setLoading] = useState(true);
  const [impersonating, setImpersonating] = useState<string | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [createForm, setCreateForm] = useState<CreateUserForm>({
    username: '',
    password: '',
    employeeId: '',
    isAdmin: false,
  });
  const [createError, setCreateError] = useState<string | null>(null);
  const [createSuccess, setCreateSuccess] = useState<string | null>(null);

  useEffect(() => {
    checkAuth();
    loadEmployees();
  }, []);

  const checkAuth = async () => {
    const response = await fetch('/api/auth/status', { credentials: 'include' });
    const data = await response.json();

    if (!data.authenticated || !data.isAdmin) {
      router.push('/');
      return;
    }

    setImpersonating(data.impersonating);
  };

  const loadEmployees = async () => {
    try {
      const response = await fetch('/api/admin/employees', { credentials: 'include' });
      const data = await response.json();
      setUsers(data.users);

      // Load stats for each employee
      for (const user of data.users) {
        const statsResponse = await fetch(`/api/admin/employees/${user.employee_id}/stats`, { credentials: 'include' });
        const statsData = await statsResponse.json();
        setStats(prev => ({ ...prev, [user.employee_id]: statsData.stats }));
      }

      setLoading(false);
    } catch (error) {
      console.error('Failed to load employees:', error);
      setLoading(false);
    }
  };

  const handleImpersonate = async (employeeId: string) => {
    try {
      const response = await fetch('/api/admin/impersonate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ employeeId }),
        credentials: 'include',
      });

      if (response.ok) {
        router.push('/');
        router.refresh();
      }
    } catch (error) {
      console.error('Failed to impersonate:', error);
    }
  };

  const handleStopImpersonate = async () => {
    try {
      const response = await fetch('/api/admin/stop-impersonate', {
        method: 'POST',
        credentials: 'include',
      });

      if (response.ok) {
        setImpersonating(null);
        router.refresh();
      }
    } catch (error) {
      console.error('Failed to stop impersonating:', error);
    }
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreateError(null);
    setCreateSuccess(null);

    try {
      const response = await fetch('/api/admin/create-user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(createForm),
        credentials: 'include',
      });

      const data = await response.json();

      if (response.ok) {
        setCreateSuccess(`${createForm.isAdmin ? 'Admin' : 'User'} "${createForm.username}" created successfully!`);
        setCreateForm({ username: '', password: '', employeeId: '', isAdmin: false });
        setShowCreateForm(false);
        // Reload users list
        loadEmployees();
      } else {
        setCreateError(data.message || data.error || 'Failed to create user');
      }
    } catch (error) {
      setCreateError('Network error. Please try again.');
      console.error('Failed to create user:', error);
    }
  };

  if (loading) {
    return <div className="p-8 text-gray-900 dark:text-white">Loading...</div>;
  }

  return (
    <div className="p-8 min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Admin Dashboard</h1>
        <div className="flex gap-4 items-center">
          {impersonating && (
            <button
              onClick={handleStopImpersonate}
              className="px-4 py-2 bg-yellow-600 text-white rounded hover:bg-yellow-700"
            >
              Stop Impersonating ({impersonating})
            </button>
          )}
          <button
            onClick={() => setShowCreateForm(!showCreateForm)}
            className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
          >
            {showCreateForm ? 'Cancel' : '+ Create User'}
          </button>
        </div>
      </div>

      {/* Create User Form */}
      {showCreateForm && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 mb-6">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">Create New User</h2>

          {createError && (
            <div className="mb-4 p-3 bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200 rounded">
              {createError}
            </div>
          )}

          {createSuccess && (
            <div className="mb-4 p-3 bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200 rounded">
              {createSuccess}
            </div>
          )}

          <form onSubmit={handleCreateUser} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Username
              </label>
              <input
                type="text"
                value={createForm.username}
                onChange={(e) => setCreateForm({ ...createForm, username: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Password (min 6 characters)
              </label>
              <input
                type="password"
                value={createForm.password}
                onChange={(e) => setCreateForm({ ...createForm, password: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                required
                minLength={6}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Employee ID
              </label>
              <input
                type="text"
                value={createForm.employeeId}
                onChange={(e) => setCreateForm({ ...createForm, employeeId: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                required
              />
            </div>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="isAdmin"
                checked={createForm.isAdmin}
                onChange={(e) => setCreateForm({ ...createForm, isAdmin: e.target.checked })}
                className="w-4 h-4"
              />
              <label htmlFor="isAdmin" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Grant admin privileges
              </label>
            </div>

            <div className="flex gap-3">
              <button
                type="submit"
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
              >
                Create {createForm.isAdmin ? 'Admin' : 'User'}
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowCreateForm(false);
                  setCreateError(null);
                  setCreateSuccess(null);
                  setCreateForm({ username: '', password: '', employeeId: '', isAdmin: false });
                }}
                className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="grid gap-6">
        {users.map(user => {
          const userStats = stats[user.employee_id];
          return (
            <div key={user.employee_id} className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                    {user.username}
                    {user.is_admin === 1 && (
                      <span className="ml-2 text-sm bg-purple-600 text-white px-2 py-1 rounded">
                        Admin
                      </span>
                    )}
                  </h2>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Employee ID: {user.employee_id}
                  </p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Last login: {user.last_login ? new Date(user.last_login).toLocaleString() : 'Never'}
                  </p>
                </div>
                <button
                  onClick={() => handleImpersonate(user.employee_id)}
                  className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                >
                  View Console
                </button>
              </div>

              {userStats && (
                <div className="grid grid-cols-5 gap-4 mt-4">
                  <div className="bg-gray-100 dark:bg-gray-700 p-3 rounded">
                    <div className="text-2xl font-bold text-gray-900 dark:text-white">{userStats.targets.count}</div>
                    <div className="text-sm text-gray-600 dark:text-gray-400">Targets</div>
                  </div>
                  <div className="bg-gray-100 dark:bg-gray-700 p-3 rounded">
                    <div className="text-2xl font-bold text-gray-900 dark:text-white">{userStats.contacts.count}</div>
                    <div className="text-sm text-gray-600 dark:text-gray-400">Contacts</div>
                  </div>
                  <div className="bg-gray-100 dark:bg-gray-700 p-3 rounded">
                    <div className="text-2xl font-bold text-gray-900 dark:text-white">{userStats.drafts.count}</div>
                    <div className="text-sm text-gray-600 dark:text-gray-400">Drafts</div>
                  </div>
                  <div className="bg-green-100 dark:bg-green-900 p-3 rounded">
                    <div className="text-2xl font-bold text-gray-900 dark:text-white">{userStats.sent.count}</div>
                    <div className="text-sm text-gray-600 dark:text-gray-400">Sent</div>
                  </div>
                  <div className="bg-yellow-100 dark:bg-yellow-900 p-3 rounded">
                    <div className="text-2xl font-bold text-gray-900 dark:text-white">{userStats.pending.count}</div>
                    <div className="text-sm text-gray-600 dark:text-gray-400">Pending</div>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
