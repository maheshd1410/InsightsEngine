'use client';

import { CSSProperties, FormEvent, useEffect, useMemo, useState } from 'react';

type TrendDirection = 'up' | 'down' | 'flat';
type TileStatus = 'green' | 'amber' | 'red';
type ActionStatus = 'open' | 'in_progress' | 'blocked' | 'done';

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

type Organization = {
  id: string;
  name: string;
  code: string;
  isActive: boolean;
};

type Team = {
  id: string;
  organizationId: string;
  name: string;
  isActive: boolean;
};

type PlanningCycle = {
  id: string;
  teamId: string;
  name: string;
  startDate: string;
  endDate: string;
};

type CapacityPlan = {
  id: string;
  planningCycleId: string;
  teamId: string;
  plannedHours: number;
};

type ListResponse<T> = {
  items: T[];
  page: number;
  pageSize: number;
  total: number;
};

type ApiError = {
  statusCode?: number;
  message?: string | string[];
  error?: string;
};

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:3000/api/v1';
const TOKEN_STORAGE_KEY = 'insights_engine_bearer_token';

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

const defaultList = <T,>(): ListResponse<T> => ({
  items: [],
  page: 1,
  pageSize: 25,
  total: 0,
});

export default function HomePage() {
  const [bearerToken, setBearerToken] = useState('');
  const [sessionMessage, setSessionMessage] = useState('Token not set.');

  const [organizationId, setOrganizationId] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [portfolioData, setPortfolioData] = useState<PortfolioDashboardResponse | null>(null);
  const [portfolioLoading, setPortfolioLoading] = useState(false);
  const [portfolioError, setPortfolioError] = useState<string | null>(null);

  const [organizations, setOrganizations] = useState<ListResponse<Organization>>(defaultList());
  const [teams, setTeams] = useState<ListResponse<Team>>(defaultList());
  const [planningCycles, setPlanningCycles] = useState<ListResponse<PlanningCycle>>(defaultList());
  const [capacityPlans, setCapacityPlans] = useState<ListResponse<CapacityPlan>>(defaultList());

  const [workspaceLoading, setWorkspaceLoading] = useState(false);
  const [workspaceError, setWorkspaceError] = useState<string | null>(null);
  const [workspaceSuccess, setWorkspaceSuccess] = useState<string | null>(null);

  const [teamCreateOrganizationId, setTeamCreateOrganizationId] = useState('');
  const [teamCreateName, setTeamCreateName] = useState('');
  const [teamFilterOrganizationId, setTeamFilterOrganizationId] = useState('');

  const [cycleCreateTeamId, setCycleCreateTeamId] = useState('');
  const [cycleCreateName, setCycleCreateName] = useState('');
  const [cycleCreateStartDate, setCycleCreateStartDate] = useState('');
  const [cycleCreateEndDate, setCycleCreateEndDate] = useState('');
  const [cycleFilterTeamId, setCycleFilterTeamId] = useState('');
  const [cycleFilterDateFrom, setCycleFilterDateFrom] = useState('');
  const [cycleFilterDateTo, setCycleFilterDateTo] = useState('');

  const [capCreateTeamId, setCapCreateTeamId] = useState('');
  const [capCreatePlanningCycleId, setCapCreatePlanningCycleId] = useState('');
  const [capCreatePlannedHours, setCapCreatePlannedHours] = useState('');
  const [capFilterTeamId, setCapFilterTeamId] = useState('');
  const [capFilterPlanningCycleId, setCapFilterPlanningCycleId] = useState('');

  const hasTiles = (portfolioData?.summaryTiles?.length ?? 0) > 0;
  const tileCountLabel = useMemo(() => {
    const count = portfolioData?.summaryTiles?.length ?? 0;
    return `${count} metric${count === 1 ? '' : 's'}`;
  }, [portfolioData]);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }
    const token = window.localStorage.getItem(TOKEN_STORAGE_KEY) ?? '';
    if (token) {
      setBearerToken(token);
      setSessionMessage('Token restored from local session.');
    }
  }, []);

  const persistToken = () => {
    if (typeof window === 'undefined') {
      return;
    }
    if (bearerToken.trim()) {
      window.localStorage.setItem(TOKEN_STORAGE_KEY, bearerToken.trim());
      setSessionMessage('Token saved in local session.');
      return;
    }
    window.localStorage.removeItem(TOKEN_STORAGE_KEY);
    setSessionMessage('Token cleared from local session.');
  };

  const apiRequest = async <T,>(
    path: string,
    options?: RequestInit & { skipAuth?: boolean },
  ): Promise<T> => {
    const headers = new Headers(options?.headers ?? {});
    headers.set('Content-Type', 'application/json');

    if (!options?.skipAuth && bearerToken.trim()) {
      headers.set('Authorization', `Bearer ${bearerToken.trim()}`);
    }

    const response = await fetch(`${API_BASE_URL}${path}`, {
      ...options,
      headers,
      cache: 'no-store',
    });

    const payloadText = await response.text();
    const payloadJson = payloadText ? (JSON.parse(payloadText) as unknown) : null;

    if (!response.ok) {
      const errorPayload = payloadJson as ApiError | null;
      const message =
        typeof errorPayload?.message === 'string'
          ? errorPayload.message
          : Array.isArray(errorPayload?.message)
            ? errorPayload.message.join(', ')
            : `Request failed with ${response.status}`;
      throw new Error(message);
    }

    return payloadJson as T;
  };

  const fetchPortfolioDashboard = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setPortfolioLoading(true);
    setPortfolioError(null);

    try {
      const query = new URLSearchParams();
      if (organizationId.trim()) query.set('organizationId', organizationId.trim());
      if (dateFrom) query.set('dateFrom', dateFrom);
      if (dateTo) query.set('dateTo', dateTo);

      const payload = await apiRequest<PortfolioDashboardResponse>(
        `/dashboards/portfolio?${query.toString()}`,
      );
      setPortfolioData(payload);
    } catch (error) {
      setPortfolioData(null);
      setPortfolioError(error instanceof Error ? error.message : 'Unexpected error.');
    } finally {
      setPortfolioLoading(false);
    }
  };

  const runWorkspaceAction = async (
    action: () => Promise<void>,
    successMessage: string,
  ): Promise<void> => {
    setWorkspaceError(null);
    setWorkspaceSuccess(null);
    setWorkspaceLoading(true);
    try {
      await action();
      setWorkspaceSuccess(successMessage);
    } catch (error) {
      setWorkspaceError(error instanceof Error ? error.message : 'Unexpected error.');
    } finally {
      setWorkspaceLoading(false);
    }
  };

  const loadOrganizations = async () =>
    runWorkspaceAction(async () => {
      const payload = await apiRequest<ListResponse<Organization>>('/organizations?page=1&pageSize=100');
      setOrganizations(payload);
    }, 'Organizations loaded.');

  const loadTeams = async () =>
    runWorkspaceAction(async () => {
      const query = new URLSearchParams({ page: '1', pageSize: '100' });
      if (teamFilterOrganizationId.trim()) {
        query.set('organizationId', teamFilterOrganizationId.trim());
      }
      const payload = await apiRequest<ListResponse<Team>>(`/teams?${query.toString()}`);
      setTeams(payload);
    }, 'Teams loaded.');

  const createTeam = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    await runWorkspaceAction(async () => {
      await apiRequest<Team>('/teams', {
        method: 'POST',
        body: JSON.stringify({
          organizationId: teamCreateOrganizationId.trim(),
          name: teamCreateName.trim(),
        }),
      });
      setTeamCreateName('');
      await loadTeams();
    }, 'Team created.');
  };

  const loadPlanningCycles = async () =>
    runWorkspaceAction(async () => {
      const query = new URLSearchParams({ page: '1', pageSize: '100' });
      if (cycleFilterTeamId.trim()) query.set('teamId', cycleFilterTeamId.trim());
      if (cycleFilterDateFrom) query.set('dateFrom', cycleFilterDateFrom);
      if (cycleFilterDateTo) query.set('dateTo', cycleFilterDateTo);
      const payload = await apiRequest<ListResponse<PlanningCycle>>(
        `/planning-cycles?${query.toString()}`,
      );
      setPlanningCycles(payload);
    }, 'Planning cycles loaded.');

  const createPlanningCycle = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    await runWorkspaceAction(async () => {
      await apiRequest<PlanningCycle>('/planning-cycles', {
        method: 'POST',
        body: JSON.stringify({
          teamId: cycleCreateTeamId.trim(),
          name: cycleCreateName.trim(),
          startDate: cycleCreateStartDate,
          endDate: cycleCreateEndDate,
        }),
      });
      setCycleCreateName('');
      await loadPlanningCycles();
    }, 'Planning cycle created.');
  };

  const loadCapacityPlans = async () =>
    runWorkspaceAction(async () => {
      const query = new URLSearchParams({ page: '1', pageSize: '100' });
      if (capFilterTeamId.trim()) query.set('teamId', capFilterTeamId.trim());
      if (capFilterPlanningCycleId.trim()) {
        query.set('planningCycleId', capFilterPlanningCycleId.trim());
      }
      const payload = await apiRequest<ListResponse<CapacityPlan>>(
        `/capacity-plans?${query.toString()}`,
      );
      setCapacityPlans(payload);
    }, 'Capacity plans loaded.');

  const createCapacityPlan = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    await runWorkspaceAction(async () => {
      await apiRequest<CapacityPlan>('/capacity-plans', {
        method: 'POST',
        body: JSON.stringify({
          teamId: capCreateTeamId.trim(),
          planningCycleId: capCreatePlanningCycleId.trim(),
          plannedHours: Number(capCreatePlannedHours),
        }),
      });
      setCapCreatePlannedHours('');
      await loadCapacityPlans();
    }, 'Capacity plan created.');
  };

  const clearWorkspaceMessages = () => {
    setWorkspaceError(null);
    setWorkspaceSuccess(null);
  };

  return (
    <main style={styles.page}>
      <section style={styles.hero}>
        <p style={styles.kicker}>Insights Engine</p>
        <h1 style={styles.title}>Portfolio Dashboard + Capacity Workspace</h1>
        <p style={styles.subtitle}>
          FE-002 and FE-003: persistent auth token helper and planning workspace operations.
        </p>
      </section>

      <section style={styles.panel}>
        <h2 style={styles.sectionTitle}>Auth Session Helper</h2>
        <div style={styles.filterGrid}>
          <label style={styles.fieldWide}>
            <span style={styles.label}>Bearer Token</span>
            <input
              style={styles.input}
              type="password"
              value={bearerToken}
              onChange={(e) => setBearerToken(e.target.value)}
              placeholder="Paste JWT token for secured APIs"
            />
          </label>
          <button style={styles.secondaryButton} type="button" onClick={persistToken}>
            Save / Clear Token
          </button>
          <p style={styles.hint}>{sessionMessage}</p>
        </div>
      </section>

      <section style={styles.panel}>
        <h2 style={styles.sectionTitle}>Portfolio Dashboard (FE-001)</h2>
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
          <button type="submit" style={styles.ctaButton} disabled={portfolioLoading}>
            {portfolioLoading ? 'Loading...' : 'Load Dashboard'}
          </button>
        </form>

        <div style={styles.resultPanel}>
          {portfolioLoading && <div style={styles.infoCard}>Loading portfolio metrics...</div>}
          {!portfolioLoading && portfolioError && (
            <div style={{ ...styles.infoCard, ...styles.errorCard }}>
              <strong>Unable to load dashboard.</strong>
              <span>{portfolioError}</span>
            </div>
          )}
          {!portfolioLoading && !portfolioError && portfolioData && !hasTiles && (
            <div style={styles.infoCard}>No KPI tiles returned for current filters.</div>
          )}
          {!portfolioLoading && !portfolioError && portfolioData && hasTiles && (
            <>
              <div style={styles.metaRow}>
                <strong>{tileCountLabel}</strong>
                <span>
                  {portfolioData.dateFrom ?? 'No start'} to {portfolioData.dateTo ?? 'No end'}
                </span>
              </div>
              <div style={styles.tileGrid}>
                {portfolioData.summaryTiles.map((tile) => (
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
        </div>
      </section>

      <section style={styles.panel}>
        <h2 style={styles.sectionTitle}>Capacity Planning Workspace (FE-003)</h2>
        {workspaceLoading && <p style={styles.hint}>Executing request...</p>}
        {workspaceError && <p style={styles.errorText}>Error: {workspaceError}</p>}
        {workspaceSuccess && <p style={styles.successText}>{workspaceSuccess}</p>}

        <div style={styles.workspaceBlock}>
          <h3 style={styles.blockTitle}>Organizations (Reference)</h3>
          <button style={styles.secondaryButton} type="button" onClick={loadOrganizations}>
            Load Organizations
          </button>
          <small style={styles.hint}>{organizations.total} records</small>
          <pre style={styles.pre}>{JSON.stringify(organizations.items, null, 2)}</pre>
        </div>

        <div style={styles.workspaceBlock}>
          <h3 style={styles.blockTitle}>Teams</h3>
          <form style={styles.formRow} onSubmit={createTeam}>
            <input
              style={styles.input}
              type="text"
              value={teamCreateOrganizationId}
              onChange={(e) => setTeamCreateOrganizationId(e.target.value)}
              placeholder="organizationId"
            />
            <input
              style={styles.input}
              type="text"
              value={teamCreateName}
              onChange={(e) => setTeamCreateName(e.target.value)}
              placeholder="team name"
            />
            <button style={styles.ctaButton} type="submit">
              Create Team
            </button>
          </form>
          <div style={styles.formRow}>
            <input
              style={styles.input}
              type="text"
              value={teamFilterOrganizationId}
              onChange={(e) => setTeamFilterOrganizationId(e.target.value)}
              placeholder="filter organizationId (optional)"
            />
            <button style={styles.secondaryButton} type="button" onClick={loadTeams}>
              Load Teams
            </button>
          </div>
          <small style={styles.hint}>{teams.total} records</small>
          <pre style={styles.pre}>{JSON.stringify(teams.items, null, 2)}</pre>
        </div>

        <div style={styles.workspaceBlock}>
          <h3 style={styles.blockTitle}>Planning Cycles</h3>
          <form style={styles.formGrid} onSubmit={createPlanningCycle}>
            <input
              style={styles.input}
              type="text"
              value={cycleCreateTeamId}
              onChange={(e) => setCycleCreateTeamId(e.target.value)}
              placeholder="teamId"
            />
            <input
              style={styles.input}
              type="text"
              value={cycleCreateName}
              onChange={(e) => setCycleCreateName(e.target.value)}
              placeholder="cycle name"
            />
            <input
              style={styles.input}
              type="date"
              value={cycleCreateStartDate}
              onChange={(e) => setCycleCreateStartDate(e.target.value)}
            />
            <input
              style={styles.input}
              type="date"
              value={cycleCreateEndDate}
              onChange={(e) => setCycleCreateEndDate(e.target.value)}
            />
            <button style={styles.ctaButton} type="submit">
              Create Cycle
            </button>
          </form>
          <div style={styles.formGrid}>
            <input
              style={styles.input}
              type="text"
              value={cycleFilterTeamId}
              onChange={(e) => setCycleFilterTeamId(e.target.value)}
              placeholder="filter teamId"
            />
            <input
              style={styles.input}
              type="date"
              value={cycleFilterDateFrom}
              onChange={(e) => setCycleFilterDateFrom(e.target.value)}
            />
            <input
              style={styles.input}
              type="date"
              value={cycleFilterDateTo}
              onChange={(e) => setCycleFilterDateTo(e.target.value)}
            />
            <button style={styles.secondaryButton} type="button" onClick={loadPlanningCycles}>
              Load Cycles
            </button>
          </div>
          <small style={styles.hint}>{planningCycles.total} records</small>
          <pre style={styles.pre}>{JSON.stringify(planningCycles.items, null, 2)}</pre>
        </div>

        <div style={styles.workspaceBlock}>
          <h3 style={styles.blockTitle}>Capacity Plans</h3>
          <form style={styles.formGrid} onSubmit={createCapacityPlan}>
            <input
              style={styles.input}
              type="text"
              value={capCreateTeamId}
              onChange={(e) => setCapCreateTeamId(e.target.value)}
              placeholder="teamId"
            />
            <input
              style={styles.input}
              type="text"
              value={capCreatePlanningCycleId}
              onChange={(e) => setCapCreatePlanningCycleId(e.target.value)}
              placeholder="planningCycleId"
            />
            <input
              style={styles.input}
              type="number"
              value={capCreatePlannedHours}
              onChange={(e) => setCapCreatePlannedHours(e.target.value)}
              placeholder="plannedHours"
              min={0}
              step={1}
            />
            <button style={styles.ctaButton} type="submit">
              Create Capacity Plan
            </button>
          </form>
          <div style={styles.formGrid}>
            <input
              style={styles.input}
              type="text"
              value={capFilterTeamId}
              onChange={(e) => setCapFilterTeamId(e.target.value)}
              placeholder="filter teamId"
            />
            <input
              style={styles.input}
              type="text"
              value={capFilterPlanningCycleId}
              onChange={(e) => setCapFilterPlanningCycleId(e.target.value)}
              placeholder="filter planningCycleId"
            />
            <button style={styles.secondaryButton} type="button" onClick={loadCapacityPlans}>
              Load Capacity Plans
            </button>
            <button style={styles.secondaryButton} type="button" onClick={clearWorkspaceMessages}>
              Clear Messages
            </button>
          </div>
          <small style={styles.hint}>{capacityPlans.total} records</small>
          <pre style={styles.pre}>{JSON.stringify(capacityPlans.items, null, 2)}</pre>
        </div>
      </section>
    </main>
  );
}

const styles: Record<string, CSSProperties> = {
  page: {
    minHeight: '100vh',
    background:
      'radial-gradient(circle at 20% 10%, #f9efe6 0%, #fff8f3 35%, #f1f8fa 100%)',
    padding: '28px 18px 52px',
    fontFamily: '"Space Grotesk", "Segoe UI", sans-serif',
    color: '#16202a',
  },
  hero: {
    maxWidth: 1100,
    margin: '0 auto 18px',
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
    margin: '8px 0 8px',
    fontSize: 'clamp(28px, 5vw, 46px)',
    lineHeight: 1.06,
  },
  subtitle: {
    margin: 0,
    maxWidth: 760,
    fontSize: 15,
    color: '#3e5462',
  },
  panel: {
    maxWidth: 1100,
    margin: '0 auto 16px',
    borderRadius: 16,
    border: '1px solid #d7e4e8',
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    padding: 16,
    boxShadow: '0 10px 28px rgba(20, 44, 65, 0.08)',
  },
  sectionTitle: {
    margin: '2px 0 12px',
    fontSize: 18,
  },
  filterGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
    gap: 10,
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
    padding: '10px 12px',
    fontSize: 13,
    fontWeight: 700,
    background: 'linear-gradient(120deg, #f26f4f, #e34f68)',
    color: '#fff',
    cursor: 'pointer',
    minHeight: 40,
  },
  secondaryButton: {
    borderRadius: 10,
    border: '1px solid #b9ced6',
    padding: '10px 12px',
    fontSize: 13,
    fontWeight: 600,
    background: '#fff',
    color: '#16303a',
    cursor: 'pointer',
    minHeight: 40,
  },
  hint: {
    margin: 0,
    fontSize: 12,
    color: '#48606b',
  },
  resultPanel: {
    marginTop: 12,
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
    gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))',
    gap: 10,
  },
  tileCard: {
    borderRadius: 14,
    padding: 12,
    background: 'linear-gradient(180deg, #ffffff 0%, #f5fafb 100%)',
    border: '1px solid #d5e5ea',
    boxShadow: '0 8px 20px rgba(24, 61, 84, 0.08)',
  },
  tileHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    marginBottom: 6,
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
    fontSize: 14,
  },
  tileValue: {
    margin: '7px 0 5px',
    fontSize: 28,
    fontWeight: 800,
    color: '#182a31',
  },
  tileFooter: {
    margin: 0,
    fontSize: 12,
    color: '#415b67',
  },
  workspaceBlock: {
    border: '1px solid #dde8ec',
    borderRadius: 12,
    padding: 12,
    marginTop: 12,
    background: '#fdfefe',
  },
  blockTitle: {
    margin: '0 0 8px',
    fontSize: 15,
  },
  formRow: {
    display: 'grid',
    gridTemplateColumns: '2fr 2fr 1fr',
    gap: 8,
    marginBottom: 8,
  },
  formGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
    gap: 8,
    marginBottom: 8,
  },
  pre: {
    margin: '8px 0 0',
    padding: 10,
    maxHeight: 220,
    overflow: 'auto',
    borderRadius: 8,
    backgroundColor: '#0f1720',
    color: '#d9ecff',
    fontSize: 12,
  },
  errorText: {
    margin: '6px 0',
    color: '#8d1a14',
    fontSize: 13,
    fontWeight: 600,
  },
  successText: {
    margin: '6px 0',
    color: '#216b44',
    fontSize: 13,
    fontWeight: 600,
  },
};
