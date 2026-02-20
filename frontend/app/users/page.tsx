'use client';

import { CSSProperties, FormEvent, useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { clearStoredToken, getStoredToken } from '../lib/session';

type AppRole = 'admin' | 'engineering_manager' | 'team_lead' | 'executive';

type User = {
  id: string;
  email: string;
  name: string;
  role: AppRole;
  isActive: boolean;
};

type UsersResponse = {
  items: User[];
  page: number;
  pageSize: number;
  total: number;
};

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:3000/api/v1';

export default function UsersPage() {
  const router = useRouter();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const [newEmail, setNewEmail] = useState('');
  const [newName, setNewName] = useState('');
  const [newRole, setNewRole] = useState<AppRole>('team_lead');
  const [newPassword, setNewPassword] = useState('');

  const [editId, setEditId] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editName, setEditName] = useState('');
  const [editRole, setEditRole] = useState<AppRole>('team_lead');
  const [editPassword, setEditPassword] = useState('');
  const [editActive, setEditActive] = useState(true);

  const authFetch = useCallback(
    async <T,>(path: string, options?: RequestInit): Promise<T> => {
      const token = getStoredToken().trim();
      if (!token) {
        router.replace('/login');
        throw new Error('Please sign in again.');
      }
      const response = await fetch(`${API_BASE_URL}${path}`, {
        ...options,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
          ...(options?.headers ?? {}),
        },
        cache: 'no-store',
      });
      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload?.message ?? `Request failed with ${response.status}`);
      }
      return payload as T;
    },
    [router],
  );

  const loadUsers = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await authFetch<UsersResponse>('/users?page=1&pageSize=100');
      setUsers(response.items);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Unable to load users.');
    } finally {
      setLoading(false);
    }
  }, [authFetch]);

  useEffect(() => {
    if (!getStoredToken().trim()) {
      router.replace('/login');
      return;
    }
    void loadUsers();
  }, [loadUsers, router]);

  const createUser = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setMessage(null);
    try {
      await authFetch<User>('/users', {
        method: 'POST',
        body: JSON.stringify({
          email: newEmail.trim(),
          name: newName.trim(),
          role: newRole,
          password: newPassword.trim(),
        }),
      });
      setNewEmail('');
      setNewName('');
      setNewRole('team_lead');
      setNewPassword('');
      setMessage('User created.');
      await loadUsers();
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Unable to create user.');
    }
  };

  const startEdit = (user: User) => {
    setEditId(user.id);
    setEditEmail(user.email);
    setEditName(user.name);
    setEditRole(user.role);
    setEditPassword('');
    setEditActive(user.isActive);
  };

  const saveEdit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!editId) return;
    setError(null);
    setMessage(null);
    try {
      const body: {
        email: string;
        name: string;
        role: AppRole;
        isActive: boolean;
        password?: string;
      } = {
        email: editEmail.trim(),
        name: editName.trim(),
        role: editRole,
        isActive: editActive,
      };
      if (editPassword.trim()) {
        body.password = editPassword.trim();
      }
      await authFetch<User>(`/users/${editId}`, {
        method: 'PATCH',
        body: JSON.stringify(body),
      });
      setEditId('');
      setMessage('User updated.');
      await loadUsers();
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Unable to update user.');
    }
  };

  const deleteUser = async (id: string) => {
    setError(null);
    setMessage(null);
    try {
      await authFetch<void>(`/users/${id}`, { method: 'DELETE' });
      setMessage('User deactivated.');
      await loadUsers();
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Unable to delete user.');
    }
  };

  const signOut = () => {
    clearStoredToken();
    router.replace('/login');
  };

  return (
    <main style={styles.page}>
      <section style={styles.header}>
        <h1 style={styles.title}>User Administration</h1>
        <div style={styles.nav}>
          <Link href="/dashboard" style={styles.linkButton}>
            Dashboard
          </Link>
          <button style={styles.linkButton} type="button" onClick={signOut}>
            Sign Out
          </button>
        </div>
      </section>

      <section style={styles.panel}>
        <h2 style={styles.sectionTitle}>Create User</h2>
        <form style={styles.formGrid} onSubmit={createUser}>
          <input style={styles.input} value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="Name" required />
          <input style={styles.input} type="email" value={newEmail} onChange={(e) => setNewEmail(e.target.value)} placeholder="Email" required />
          <select style={styles.input} value={newRole} onChange={(e) => setNewRole(e.target.value as AppRole)}>
            <option value="admin">admin</option>
            <option value="engineering_manager">engineering_manager</option>
            <option value="team_lead">team_lead</option>
            <option value="executive">executive</option>
          </select>
          <input style={styles.input} type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder="Password" required />
          <button style={styles.ctaButton} type="submit">Create User</button>
        </form>
        {error && <p style={styles.error}>{error}</p>}
        {message && <p style={styles.success}>{message}</p>}
      </section>

      {editId && (
        <section style={styles.panel}>
          <h2 style={styles.sectionTitle}>Edit User</h2>
          <form style={styles.formGrid} onSubmit={saveEdit}>
            <input style={styles.input} value={editName} onChange={(e) => setEditName(e.target.value)} required />
            <input style={styles.input} type="email" value={editEmail} onChange={(e) => setEditEmail(e.target.value)} required />
            <select style={styles.input} value={editRole} onChange={(e) => setEditRole(e.target.value as AppRole)}>
              <option value="admin">admin</option>
              <option value="engineering_manager">engineering_manager</option>
              <option value="team_lead">team_lead</option>
              <option value="executive">executive</option>
            </select>
            <input style={styles.input} type="password" value={editPassword} onChange={(e) => setEditPassword(e.target.value)} placeholder="New password (optional)" />
            <label style={styles.checkbox}>
              <input type="checkbox" checked={editActive} onChange={(e) => setEditActive(e.target.checked)} />
              Active
            </label>
            <button style={styles.ctaButton} type="submit">Save User</button>
          </form>
        </section>
      )}

      <section style={styles.panel}>
        <div style={styles.sectionHeader}>
          <h2 style={styles.sectionTitle}>Users</h2>
          <button style={styles.linkButton} type="button" onClick={loadUsers} disabled={loading}>
            {loading ? 'Loading...' : 'Refresh'}
          </button>
        </div>
        <table style={styles.table}>
          <thead>
            <tr>
              <th style={styles.th}>Name</th>
              <th style={styles.th}>Email</th>
              <th style={styles.th}>Role</th>
              <th style={styles.th}>Status</th>
              <th style={styles.th}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {users.length === 0 ? (
              <tr>
                <td style={styles.td} colSpan={5}>No users found.</td>
              </tr>
            ) : (
              users.map((user) => (
                <tr key={user.id}>
                  <td style={styles.td}>{user.name}</td>
                  <td style={styles.td}>{user.email}</td>
                  <td style={styles.td}>{user.role}</td>
                  <td style={styles.td}>{user.isActive ? 'Active' : 'Inactive'}</td>
                  <td style={styles.td}>
                    <div style={styles.actions}>
                      <button style={styles.linkButton} type="button" onClick={() => startEdit(user)}>
                        Edit
                      </button>
                      <button style={styles.linkButton} type="button" onClick={() => void deleteUser(user.id)}>
                        Deactivate
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </section>
    </main>
  );
}

const styles: Record<string, CSSProperties> = {
  page: {
    minHeight: '100vh',
    background: 'linear-gradient(160deg, #f4efe7 0%, #f6f9fc 55%, #ecf7f2 100%)',
    padding: 16,
    fontFamily: '"Space Grotesk", "Segoe UI", sans-serif',
    color: '#1a2b35',
  },
  header: {
    maxWidth: 1120,
    margin: '0 auto 12px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 10,
  },
  title: { margin: 0, fontSize: 30 },
  nav: { display: 'flex', gap: 8, flexWrap: 'wrap' },
  panel: {
    maxWidth: 1120,
    margin: '0 auto 12px',
    background: '#fff',
    border: '1px solid #d5e2e8',
    borderRadius: 14,
    padding: 14,
    boxShadow: '0 12px 28px rgba(20, 44, 65, 0.08)',
  },
  sectionHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  sectionTitle: { margin: '0 0 10px', fontSize: 20 },
  formGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
    gap: 8,
  },
  input: {
    borderRadius: 10,
    border: '1px solid #b7cad1',
    padding: '10px 12px',
    fontSize: 14,
  },
  checkbox: { display: 'inline-flex', alignItems: 'center', gap: 8, fontSize: 13 },
  ctaButton: {
    borderRadius: 10,
    border: 'none',
    padding: '10px 12px',
    fontSize: 13,
    fontWeight: 700,
    background: 'linear-gradient(120deg, #f26f4f, #e34f68)',
    color: '#fff',
    cursor: 'pointer',
  },
  linkButton: {
    borderRadius: 10,
    border: '1px solid #b9ced6',
    padding: '8px 10px',
    fontSize: 13,
    fontWeight: 600,
    background: '#fff',
    color: '#16303a',
    cursor: 'pointer',
    textDecoration: 'none',
  },
  error: { margin: '10px 0 0', color: '#8d1a14', fontWeight: 600, fontSize: 13 },
  success: { margin: '10px 0 0', color: '#216b44', fontWeight: 600, fontSize: 13 },
  table: { width: '100%', borderCollapse: 'collapse' },
  th: {
    textAlign: 'left',
    padding: '10px 12px',
    background: '#f1f6f8',
    borderBottom: '1px solid #d9e6eb',
    fontSize: 12,
    textTransform: 'uppercase',
  },
  td: { padding: '10px 12px', borderBottom: '1px solid #e5eef2', fontSize: 13 },
  actions: { display: 'flex', gap: 8, flexWrap: 'wrap' },
};
