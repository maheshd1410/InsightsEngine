'use client';

import { CSSProperties, FormEvent, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getStoredToken, setStoredToken } from '../lib/session';

type LoginResponse = {
  accessToken: string;
  expiresInSeconds: number;
  user: {
    id: string;
    email: string;
    name: string;
    role: string;
  };
};

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:3000/api/v1';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('admin@insights.local');
  const [password, setPassword] = useState('Admin@123');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (getStoredToken().trim()) {
      router.replace('/dashboard');
    }
  }, [router]);

  const signIn = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`${API_BASE_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), password: password.trim() }),
      });
      const data = (await response.json()) as LoginResponse & { message?: string };
      if (!response.ok || !data.accessToken) {
        throw new Error(data.message ?? 'Login failed.');
      }

      setStoredToken(data.accessToken);
      router.replace('/dashboard');
    } catch (loginError) {
      setError(loginError instanceof Error ? loginError.message : 'Unable to login.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main style={styles.page}>
      <section style={styles.card}>
        <h1 style={styles.title}>Sign In</h1>
        <p style={styles.subtitle}>Access the engineering insights workspace.</p>
        <form style={styles.form} onSubmit={signIn}>
          <input
            style={styles.input}
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="Email"
            required
          />
          <input
            style={styles.input}
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            placeholder="Password"
            required
          />
          <button style={styles.button} type="submit" disabled={loading}>
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>
        {error && <p style={styles.error}>{error}</p>}
        <small style={styles.hint}>
          Demo: admin@insights.local / Admin@123
        </small>
      </section>
    </main>
  );
}

const styles: Record<string, CSSProperties> = {
  page: {
    minHeight: '100vh',
    display: 'grid',
    placeItems: 'center',
    padding: 16,
    background: 'linear-gradient(160deg, #f4efe7 0%, #f6f9fc 55%, #ecf7f2 100%)',
    fontFamily: '"Space Grotesk", "Segoe UI", sans-serif',
  },
  card: {
    width: 'min(430px, 100%)',
    background: '#fff',
    border: '1px solid #d5e2e8',
    borderRadius: 14,
    padding: 18,
    boxShadow: '0 12px 28px rgba(20, 44, 65, 0.08)',
  },
  title: {
    margin: 0,
    fontSize: 28,
  },
  subtitle: {
    margin: '8px 0 12px',
    color: '#3d5966',
    fontSize: 14,
  },
  form: {
    display: 'grid',
    gap: 8,
  },
  input: {
    borderRadius: 10,
    border: '1px solid #b7cad1',
    padding: '10px 12px',
    fontSize: 14,
  },
  button: {
    borderRadius: 10,
    border: 'none',
    padding: '10px 12px',
    fontSize: 13,
    fontWeight: 700,
    background: 'linear-gradient(120deg, #f26f4f, #e34f68)',
    color: '#fff',
    cursor: 'pointer',
  },
  error: {
    margin: '10px 0 0',
    fontSize: 13,
    color: '#8d1a14',
    fontWeight: 600,
  },
  hint: {
    display: 'block',
    marginTop: 10,
    color: '#49616d',
  },
};
