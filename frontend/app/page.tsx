'use client';

import { FormEvent, useMemo, useState } from 'react';

type TrendDirection = 'up' | 'down' | 'flat';
type TileStatus = 'green' | 'amber' | 'red';

type SummaryTile = {
  metricId: string;
  label: string;
  value: number;
  trendDirection: TrendDirection;
  status: TileStatus;
};

type PortfolioDashboardResponse = {
  dateFrom?: string;
  dateTo?: string;
  summaryTiles: SummaryTile[];
};

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:3000/api/v1';

const statusColorMap: Record<TileStatus, string> = {
  green: '#2f8f5b',
  amber: '#cc7a00',
  red: '#b3261e',
};

const trendSymbolMap: Record<TrendDirection, string> = {
  up: '↑',
  down: '↓',
  flat: '→',
};

export default function HomePage() {
  const [organizationId, setOrganizationId] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [bearerToken, setBearerToken] = useState('');
  const [data, setData] = useState<PortfolioDashboardResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const hasTiles = (data?.summaryTiles?.length ?? 0) > 0;
  const tileCountLabel = useMemo(() => {
    const count = data?.summaryTiles?.length ?? 0;
    return `${count} metric${count === 1 ? '' : 's'}`;
  }, [data]);

  const fetchPortfolioDashboard = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsLoading(true);
    setErrorMessage(null);

    try {
      const query = new URLSearchParams();
      if (organizationId.trim()) {
        query.set('organizationId', organizationId.trim());
      }
      if (dateFrom) {
        query.set('dateFrom', dateFrom);
      }
      if (dateTo) {
        query.set('dateTo', dateTo);
      }

      const headers: Record<string, string> = {};
      if (bearerToken.trim()) {
        headers.Authorization = `Bearer ${bearerToken.trim()}`;
      }

      const response = await fetch(`${API_BASE_URL}/dashboards/portfolio?${query.toString()}`, {
        method: 'GET',
        headers,
        cache: 'no-store',
      });

      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as
          | { message?: string | string[] }
          | null;
        const message =
          typeof payload?.message === 'string'
            ? payload.message
            : Array.isArray(payload?.message)
              ? payload.message.join(', ')
              : `Request failed with ${response.status}`;
        throw new Error(message);
      }

      const payload = (await response.json()) as PortfolioDashboardResponse;
      setData(payload);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unexpected error occurred.';
      setErrorMessage(message);
      setData(null);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <main style={styles.page}>
      <section style={styles.hero}>
        <p style={styles.kicker}>Insights Engine</p>
        <h1 style={styles.title}>Portfolio Dashboard</h1>
        <p style={styles.subtitle}>
          Track organization health across planning cycles and capacity commitments.
        </p>
      </section>

      <section style={styles.filterPanel}>
        <form style={styles.filterGrid} onSubmit={fetchPortfolioDashboard}>
          <label style={styles.field}>
            <span style={styles.label}>Organization ID</span>
            <input
              style={styles.input}
              type="text"
              value={organizationId}
              onChange={(e) => setOrganizationId(e.target.value)}
              placeholder="UUID (optional)"
            />
          </label>

          <label style={styles.field}>
            <span style={styles.label}>Date From</span>
            <input
              style={styles.input}
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
            />
          </label>

          <label style={styles.field}>
            <span style={styles.label}>Date To</span>
            <input
              style={styles.input}
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
            />
          </label>

          <label style={styles.fieldWide}>
            <span style={styles.label}>Bearer Token</span>
            <input
              style={styles.input}
              type="password"
              value={bearerToken}
              onChange={(e) => setBearerToken(e.target.value)}
              placeholder="Required for secured endpoint"
            />
          </label>

          <button type="submit" style={styles.ctaButton} disabled={isLoading}>
            {isLoading ? 'Loading...' : 'Load Dashboard'}
          </button>
        </form>
      </section>

      <section style={styles.resultPanel}>
        {isLoading && <div style={styles.infoCard}>Loading portfolio metrics...</div>}

        {!isLoading && errorMessage && (
          <div style={{ ...styles.infoCard, ...styles.errorCard }}>
            <strong>Unable to load dashboard.</strong>
            <span>{errorMessage}</span>
          </div>
        )}

        {!isLoading && !errorMessage && data && !hasTiles && (
          <div style={styles.infoCard}>No KPI tiles returned for current filters.</div>
        )}

        {!isLoading && !errorMessage && data && hasTiles && (
          <>
            <div style={styles.metaRow}>
              <strong>{tileCountLabel}</strong>
              <span>
                {data.dateFrom ?? 'No start'} to {data.dateTo ?? 'No end'}
              </span>
            </div>
            <div style={styles.tileGrid}>
              {data.summaryTiles.map((tile) => (
                <article key={tile.metricId} style={styles.tileCard}>
                  <header style={styles.tileHeader}>
                    <span
                      style={{
                        ...styles.statusDot,
                        backgroundColor: statusColorMap[tile.status],
                      }}
                    />
                    <span style={styles.metricId}>{tile.metricId}</span>
                  </header>
                  <h3 style={styles.tileLabel}>{tile.label}</h3>
                  <p style={styles.tileValue}>{tile.value}</p>
                  <p style={styles.tileFooter}>
                    {trendSymbolMap[tile.trendDirection]} {tile.trendDirection} · {tile.status}
                  </p>
                </article>
              ))}
            </div>
          </>
        )}

        {!isLoading && !errorMessage && !data && (
          <div style={styles.infoCard}>Run the query to load your first portfolio snapshot.</div>
        )}
      </section>
    </main>
  );
}

const styles: Record<string, React.CSSProperties> = {
  page: {
    minHeight: '100vh',
    background:
      'radial-gradient(circle at 20% 10%, #f9efe6 0%, #fff8f3 35%, #f1f8fa 100%)',
    padding: '32px 20px 56px',
    fontFamily: '"Space Grotesk", "Segoe UI", sans-serif',
    color: '#16202a',
  },
  hero: {
    maxWidth: 980,
    margin: '0 auto 20px',
  },
  kicker: {
    margin: 0,
    fontSize: 12,
    letterSpacing: 1.8,
    textTransform: 'uppercase',
    color: '#3e6770',
    fontWeight: 700,
  },
  title: {
    margin: '8px 0 10px',
    fontSize: 'clamp(30px, 6vw, 52px)',
    lineHeight: 1.05,
  },
  subtitle: {
    margin: 0,
    maxWidth: 720,
    fontSize: 16,
    color: '#3e5462',
  },
  filterPanel: {
    maxWidth: 980,
    margin: '0 auto',
    borderRadius: 16,
    border: '1px solid #d7e4e8',
    backgroundColor: 'rgba(255, 255, 255, 0.92)',
    padding: 18,
    boxShadow: '0 12px 30px rgba(20, 44, 65, 0.08)',
  },
  filterGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
    gap: 12,
    alignItems: 'end',
  },
  field: {
    display: 'flex',
    flexDirection: 'column',
    gap: 6,
  },
  fieldWide: {
    display: 'flex',
    flexDirection: 'column',
    gap: 6,
    gridColumn: 'span 2',
  },
  label: {
    fontSize: 12,
    fontWeight: 700,
    color: '#28424d',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  input: {
    borderRadius: 10,
    border: '1px solid #b5cad1',
    padding: '10px 12px',
    fontSize: 14,
    color: '#11232b',
    backgroundColor: '#ffffff',
  },
  ctaButton: {
    borderRadius: 10,
    border: 'none',
    padding: '12px 14px',
    fontSize: 14,
    fontWeight: 700,
    background: 'linear-gradient(120deg, #f26f4f, #e34f68)',
    color: '#fff',
    cursor: 'pointer',
    minHeight: 42,
  },
  resultPanel: {
    maxWidth: 980,
    margin: '20px auto 0',
  },
  infoCard: {
    borderRadius: 14,
    background: '#fff',
    border: '1px solid #d8e6ea',
    padding: 16,
    color: '#23343e',
    display: 'flex',
    flexDirection: 'column',
    gap: 6,
  },
  errorCard: {
    borderColor: '#f1b3af',
    background: '#fff5f4',
    color: '#7a1f19',
  },
  metaRow: {
    display: 'flex',
    justifyContent: 'space-between',
    gap: 12,
    alignItems: 'center',
    marginBottom: 12,
    color: '#35515c',
  },
  tileGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))',
    gap: 12,
  },
  tileCard: {
    borderRadius: 14,
    padding: 14,
    background: 'linear-gradient(180deg, #ffffff 0%, #f5fafb 100%)',
    border: '1px solid #d5e5ea',
    boxShadow: '0 8px 20px rgba(24, 61, 84, 0.08)',
  },
  tileHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  statusDot: {
    width: 10,
    height: 10,
    borderRadius: 999,
  },
  metricId: {
    fontSize: 11,
    letterSpacing: 1,
    textTransform: 'uppercase',
    color: '#526f7a',
    fontWeight: 700,
  },
  tileLabel: {
    margin: 0,
    fontSize: 15,
  },
  tileValue: {
    margin: '8px 0 6px',
    fontSize: 30,
    fontWeight: 800,
    color: '#182a31',
  },
  tileFooter: {
    margin: 0,
    fontSize: 13,
    color: '#415b67',
  },
};
