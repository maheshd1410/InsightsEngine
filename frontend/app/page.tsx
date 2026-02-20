'use client';

import { CSSProperties, FormEvent, useCallback, useEffect, useMemo, useState } from 'react';

type TrendDirection = 'up' | 'down' | 'flat';
type TileStatus = 'green' | 'amber' | 'red';
type WorkspaceTab = 'dashboard' | 'planning';

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
};

type Team = {
  id: string;
  organizationId: string;
  name: string;
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
  correlationId?: string;
};

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:3000/api/v1';
const TOKEN_STORAGE_KEY = 'insights_engine_bearer_token';
const NORMALIZED_API_BASE_URL = API_BASE_URL.replace(/\/+$/, '');

const statusColorMap: Record<TileStatus, string> = {
  green: '#2f8f5b',
  amber: '#cc7a00',
  red: '#b3261e',
};

const trendLabelMap: Record<TrendDirection, string> = {
  up: 'Up',
  down: 'Down',
  flat: 'Flat',
};

const defaultList = <T,>(): ListResponse<T> => ({
  items: [],
  page: 1,
  pageSize: 25,
  total: 0,
});

const normalizeToken = (value: string): string => {
  const trimmed = value.trim();
  if (!trimmed) return '';
  return trimmed.toLowerCase().startsWith('bearer ') ? trimmed.slice(7).trim() : trimmed;
};

export default function HomePage() {
  const [activeTab, setActiveTab] = useState<WorkspaceTab>('dashboard');
  const [showTechnicalDetails, setShowTechnicalDetails] = useState(false);
  const [bearerToken, setBearerToken] = useState('');
  const [tokenMessage, setTokenMessage] = useState('Token not set.');

  const [organizations, setOrganizations] = useState<ListResponse<Organization>>(defaultList());
  const [teams, setTeams] = useState<ListResponse<Team>>(defaultList());
  const [cycles, setCycles] = useState<ListResponse<PlanningCycle>>(defaultList());
  const [capacityPlans, setCapacityPlans] = useState<ListResponse<CapacityPlan>>(defaultList());

  const [selectedOrganizationId, setSelectedOrganizationId] = useState('');
  const [selectedTeamId, setSelectedTeamId] = useState('');
  const [selectedCycleId, setSelectedCycleId] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  const [newCycleName, setNewCycleName] = useState('');
  const [newCycleStartDate, setNewCycleStartDate] = useState('');
  const [newCycleEndDate, setNewCycleEndDate] = useState('');
  const [newCapacityHours, setNewCapacityHours] = useState('');

  const [portfolioData, setPortfolioData] = useState<PortfolioDashboardResponse | null>(null);
  const [dashboardLoading, setDashboardLoading] = useState(false);
  const [dashboardError, setDashboardError] = useState<string | null>(null);

  const [workspaceLoading, setWorkspaceLoading] = useState(false);
  const [workspaceError, setWorkspaceError] = useState<string | null>(null);
  const [workspaceMessage, setWorkspaceMessage] = useState<string | null>(null);
  const [requestDebug, setRequestDebug] = useState('No requests yet.');
  const [lookupLoading, setLookupLoading] = useState(false);
  const [lookupError, setLookupError] = useState<string | null>(null);
  const [lookupMessage, setLookupMessage] = useState<string | null>(null);
  const [lastLookupAt, setLastLookupAt] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }
    const token = normalizeToken(window.localStorage.getItem(TOKEN_STORAGE_KEY) ?? '');
    if (token) {
      setBearerToken(token);
      setTokenMessage('Token restored from local session.');
    }
  }, []);

  const organizationOptions = organizations.items;

  const teamOptions = useMemo(() => {
    if (!selectedOrganizationId) return teams.items;
    return teams.items.filter((team) => team.organizationId === selectedOrganizationId);
  }, [selectedOrganizationId, teams.items]);

  const cycleOptions = useMemo(() => {
    if (!selectedTeamId) return cycles.items;
    return cycles.items.filter((cycle) => cycle.teamId === selectedTeamId);
  }, [selectedTeamId, cycles.items]);

  const selectedOrganization = useMemo(
    () => organizations.items.find((org) => org.id === selectedOrganizationId) ?? null,
    [organizations.items, selectedOrganizationId],
  );

  const selectedTeam = useMemo(
    () => teams.items.find((team) => team.id === selectedTeamId) ?? null,
    [teams.items, selectedTeamId],
  );

  const selectedCycle = useMemo(
    () => cycles.items.find((cycle) => cycle.id === selectedCycleId) ?? null,
    [cycles.items, selectedCycleId],
  );

  const tileCount = portfolioData?.summaryTiles.length ?? 0;

  const persistToken = () => {
    if (typeof window === 'undefined') {
      return;
    }
    const normalized = normalizeToken(bearerToken);
    if (normalized) {
      setBearerToken(normalized);
      window.localStorage.setItem(TOKEN_STORAGE_KEY, normalized);
      setTokenMessage('Token saved in local session.');
      setLookupError(null);
      return;
    }
    window.localStorage.removeItem(TOKEN_STORAGE_KEY);
    setTokenMessage('Token cleared from local session.');
    setLookupError('Save a valid JWT token before loading reference data.');
  };

  const apiRequest = useCallback(
    async <T,>(path: string, options?: RequestInit & { skipAuth?: boolean }): Promise<T> => {
      const headers = new Headers(options?.headers ?? {});
      headers.set('Content-Type', 'application/json');

      const normalized = normalizeToken(bearerToken);
      if (!options?.skipAuth && normalized) {
        headers.set('Authorization', `Bearer ${normalized}`);
      }

      const normalizedPath = path.startsWith('/') ? path : `/${path}`;
      const requestUrl = `${NORMALIZED_API_BASE_URL}${normalizedPath}`;
      setRequestDebug(requestUrl);

      let response: Response;
      try {
        response = await fetch(requestUrl, {
          ...options,
          headers,
          cache: 'no-store',
        });
      } catch {
        throw new Error(`Failed to reach API at ${requestUrl}`);
      }

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
    },
    [bearerToken],
  );

  const runWorkspaceAction = useCallback(
    async (action: () => Promise<void>, successMessage: string): Promise<void> => {
      setWorkspaceError(null);
      setWorkspaceMessage(null);
      setWorkspaceLoading(true);
      try {
        await action();
        setWorkspaceMessage(successMessage);
      } catch (error) {
        setWorkspaceError(error instanceof Error ? error.message : 'Unexpected error.');
      } finally {
        setWorkspaceLoading(false);
      }
    },
    [],
  );

  const validateApiConnection = async () => {
    await runWorkspaceAction(async () => {
      await apiRequest<ListResponse<Organization>>('/organizations?page=1&pageSize=1');
    }, 'API connection check passed.');
  };

  const bootstrapLookups = useCallback(
    async (successMessage = 'Reference data loaded.') => {
      const normalized = normalizeToken(bearerToken);
      if (!normalized) {
        setLookupError('No token found. Paste JWT and click Save Token.');
        setLookupMessage(null);
        return;
      }

      setLookupLoading(true);
      setLookupError(null);
      setLookupMessage(null);
      try {
        const [orgPayload, teamPayload, cyclePayload] = await Promise.all([
          apiRequest<ListResponse<Organization>>('/organizations?page=1&pageSize=100'),
          apiRequest<ListResponse<Team>>('/teams?page=1&pageSize=100'),
          apiRequest<ListResponse<PlanningCycle>>('/planning-cycles?page=1&pageSize=100'),
        ]);
        setOrganizations(orgPayload);
        setTeams(teamPayload);
        setCycles(cyclePayload);
        setCapacityPlans(defaultList());
        const totalLoaded =
          orgPayload.items.length + teamPayload.items.length + cyclePayload.items.length;
        if (totalLoaded === 0) {
          setLookupMessage(
            'Reference data loaded, but no records exist yet. Create Organization, Team, and Planning Cycle first.',
          );
        } else {
          setLookupMessage(successMessage);
        }
        setLastLookupAt(new Date().toLocaleTimeString());
      } catch (error) {
        setLookupError(error instanceof Error ? error.message : 'Unexpected lookup error.');
        setLastLookupAt(new Date().toLocaleTimeString());
      } finally {
        setLookupLoading(false);
      }
    },
    [apiRequest, bearerToken],
  );

  useEffect(() => {
    const hasToken = normalizeToken(bearerToken).length > 0;
    if (!hasToken) {
      return;
    }
    void bootstrapLookups('Reference data auto-loaded.');
  }, [bearerToken, bootstrapLookups]);

  const loadPortfolioDashboard = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setDashboardLoading(true);
    setDashboardError(null);
    try {
      const query = new URLSearchParams();
      if (selectedOrganizationId) query.set('organizationId', selectedOrganizationId);
      if (dateFrom) query.set('dateFrom', dateFrom);
      if (dateTo) query.set('dateTo', dateTo);
      const payload = await apiRequest<PortfolioDashboardResponse>(
        `/dashboards/portfolio?${query.toString()}`,
      );
      setPortfolioData(payload);
    } catch (error) {
      setPortfolioData(null);
      setDashboardError(error instanceof Error ? error.message : 'Unexpected error.');
    } finally {
      setDashboardLoading(false);
    }
  };

  const createPlanningCycle = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!selectedTeamId) {
      setWorkspaceError('Select a team before creating a planning cycle.');
      return;
    }
    await runWorkspaceAction(async () => {
      await apiRequest<PlanningCycle>('/planning-cycles', {
        method: 'POST',
        body: JSON.stringify({
          teamId: selectedTeamId,
          name: newCycleName.trim(),
          startDate: newCycleStartDate,
          endDate: newCycleEndDate,
        }),
      });
      setNewCycleName('');
      setNewCycleStartDate('');
      setNewCycleEndDate('');
      const cyclePayload = await apiRequest<ListResponse<PlanningCycle>>(
        '/planning-cycles?page=1&pageSize=100',
      );
      setCycles(cyclePayload);
    }, 'Planning cycle created.');
  };

  const createCapacityPlan = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!selectedTeamId || !selectedCycleId) {
      setWorkspaceError('Select a team and cycle before creating a capacity plan.');
      return;
    }
    await runWorkspaceAction(async () => {
      await apiRequest<CapacityPlan>('/capacity-plans', {
        method: 'POST',
        body: JSON.stringify({
          teamId: selectedTeamId,
          planningCycleId: selectedCycleId,
          plannedHours: Number(newCapacityHours),
        }),
      });
      setNewCapacityHours('');
      const query = new URLSearchParams({ page: '1', pageSize: '100' });
      query.set('teamId', selectedTeamId);
      query.set('planningCycleId', selectedCycleId);
      const plansPayload = await apiRequest<ListResponse<CapacityPlan>>(
        `/capacity-plans?${query.toString()}`,
      );
      setCapacityPlans(plansPayload);
    }, 'Capacity plan created.');
  };

  const loadCapacityPlans = async () => {
    if (!selectedTeamId || !selectedCycleId) {
      setWorkspaceError('Select a team and cycle to list capacity plans.');
      return;
    }
    await runWorkspaceAction(async () => {
      const query = new URLSearchParams({ page: '1', pageSize: '100' });
      query.set('teamId', selectedTeamId);
      query.set('planningCycleId', selectedCycleId);
      const plansPayload = await apiRequest<ListResponse<CapacityPlan>>(
        `/capacity-plans?${query.toString()}`,
      );
      setCapacityPlans(plansPayload);
    }, 'Capacity plans loaded.');
  };

  return (
    <main style={styles.page}>
      <section style={styles.hero}>
        <h1 style={styles.title}>Engineering Insights</h1>
        <p style={styles.subtitle}>
          Track key portfolio metrics and update planning data from one compact workspace.
        </p>
      </section>

      <section style={styles.panel}>
        <div style={styles.toolbar}>
          <div style={styles.tabs}>
            <button
              type="button"
              style={activeTab === 'dashboard' ? styles.tabActive : styles.tab}
              onClick={() => setActiveTab('dashboard')}
            >
              Portfolio Dashboard
            </button>
            <button
              type="button"
              style={activeTab === 'planning' ? styles.tabActive : styles.tab}
              onClick={() => setActiveTab('planning')}
            >
              Planning Workspace
            </button>
          </div>

          <div style={styles.tokenRow}>
            <input
              style={styles.input}
              type="password"
              value={bearerToken}
              onChange={(event) => setBearerToken(event.target.value)}
              placeholder="Paste JWT token"
            />
            <button style={styles.secondaryButton} type="button" onClick={persistToken}>
              Save Token
            </button>
            <button style={styles.secondaryButton} type="button" onClick={validateApiConnection}>
              Test API
            </button>
          </div>
          <small style={styles.hint}>{tokenMessage}</small>
          {showTechnicalDetails && (
            <small style={styles.hint}>API base: {NORMALIZED_API_BASE_URL}</small>
          )}
          {showTechnicalDetails && <small style={styles.hint}>Last request: {requestDebug}</small>}
          {lastLookupAt && <small style={styles.hint}>Last lookup: {lastLookupAt}</small>}
          {lookupError && <small style={styles.errorText}>{lookupError}</small>}
          {lookupMessage && <small style={styles.successText}>{lookupMessage}</small>}
        </div>

        <div style={styles.filterGrid}>
          <div style={styles.field}>
            <label style={styles.label}>Organization</label>
            <select
              style={styles.input}
              value={selectedOrganizationId}
              onChange={(event) => {
                setSelectedOrganizationId(event.target.value);
                setSelectedTeamId('');
                setSelectedCycleId('');
              }}
            >
              <option value="">All organizations</option>
              {organizationOptions.map((org) => (
                <option key={org.id} value={org.id}>
                  {org.name} ({org.code})
                </option>
              ))}
            </select>
          </div>
          <div style={styles.field}>
            <label style={styles.label}>Team</label>
            <select
              style={styles.input}
              value={selectedTeamId}
              onChange={(event) => {
                setSelectedTeamId(event.target.value);
                setSelectedCycleId('');
              }}
            >
              <option value="">All teams</option>
              {teamOptions.map((team) => (
                <option key={team.id} value={team.id}>
                  {team.name}
                </option>
              ))}
            </select>
          </div>
          <div style={styles.field}>
            <label style={styles.label}>Cycle</label>
            <select
              style={styles.input}
              value={selectedCycleId}
              onChange={(event) => setSelectedCycleId(event.target.value)}
            >
              <option value="">All cycles</option>
              {cycleOptions.map((cycle) => (
                <option key={cycle.id} value={cycle.id}>
                  {cycle.name}
                </option>
              ))}
            </select>
          </div>
          <div style={styles.field}>
            <label style={styles.label}>Technical</label>
            <label style={styles.checkbox}>
              <input
                type="checkbox"
                checked={showTechnicalDetails}
                onChange={(event) => setShowTechnicalDetails(event.target.checked)}
              />
              Show IDs
            </label>
          </div>
          <div style={styles.field}>
            <label style={styles.label}>Reference Data</label>
            <button
              style={styles.secondaryButton}
              type="button"
              onClick={() => void bootstrapLookups()}
              disabled={lookupLoading}
            >
              {lookupLoading ? 'Loading...' : 'Reload Reference Data'}
            </button>
            <small style={styles.hint}>
              Orgs: {organizations.items.length} | Teams: {teams.items.length} | Cycles:{' '}
              {cycles.items.length}
            </small>
          </div>
        </div>
      </section>

      {activeTab === 'dashboard' ? (
        <section style={styles.panel}>
          <h2 style={styles.sectionTitle}>Portfolio Dashboard</h2>
          <form style={styles.formGrid} onSubmit={loadPortfolioDashboard}>
            <div style={styles.field}>
              <label style={styles.label}>From</label>
              <input
                style={styles.input}
                type="date"
                value={dateFrom}
                onChange={(event) => setDateFrom(event.target.value)}
              />
            </div>
            <div style={styles.field}>
              <label style={styles.label}>To</label>
              <input
                style={styles.input}
                type="date"
                value={dateTo}
                onChange={(event) => setDateTo(event.target.value)}
              />
            </div>
            <button style={styles.ctaButton} type="submit" disabled={dashboardLoading}>
              {dashboardLoading ? 'Loading...' : 'Refresh Dashboard'}
            </button>
          </form>

          {dashboardError && <p style={styles.errorText}>{dashboardError}</p>}

          {!dashboardLoading && !dashboardError && !portfolioData && (
            <p style={styles.hint}>Run dashboard to view KPI tiles.</p>
          )}

          {!dashboardLoading && portfolioData && tileCount === 0 && (
            <p style={styles.hint}>No metrics found for the selected filters.</p>
          )}

          {!dashboardLoading && portfolioData && tileCount > 0 && (
            <div>
              <p style={styles.hint}>
                Showing {tileCount} metric{tileCount === 1 ? '' : 's'}.
              </p>
              <div style={styles.tileGrid}>
                {portfolioData.summaryTiles.map((tile) => (
                  <article key={tile.metricId} style={styles.tileCard}>
                    <div style={styles.tileHeader}>
                      <span
                        style={{
                          ...styles.statusDot,
                          backgroundColor: statusColorMap[tile.status],
                        }}
                      />
                      <p style={styles.tileLabel}>{tile.label}</p>
                    </div>
                    <p style={styles.tileValue}>{tile.value}</p>
                    <p style={styles.tileFooter}>
                      Trend: {trendLabelMap[tile.trendDirection]} | Status: {tile.status}
                    </p>
                    {showTechnicalDetails && <p style={styles.techText}>Metric ID: {tile.metricId}</p>}
                  </article>
                ))}
              </div>
            </div>
          )}
        </section>
      ) : (
        <section style={styles.panel}>
          <div style={styles.headerRow}>
            <h2 style={styles.sectionTitle}>Planning Workspace</h2>
            <button
              style={styles.secondaryButton}
              type="button"
              onClick={() => void bootstrapLookups()}
              disabled={lookupLoading}
            >
              Load Reference Data
            </button>
          </div>

          {workspaceError && <p style={styles.errorText}>{workspaceError}</p>}
          {workspaceMessage && <p style={styles.successText}>{workspaceMessage}</p>}

          <div style={styles.workspaceGrid}>
            <article style={styles.workspaceCard}>
              <h3 style={styles.cardTitle}>Create Planning Cycle</h3>
              <form style={styles.formStack} onSubmit={createPlanningCycle}>
                <input
                  style={styles.input}
                  type="text"
                  value={newCycleName}
                  onChange={(event) => setNewCycleName(event.target.value)}
                  placeholder="Cycle name"
                  required
                />
                <div style={styles.formGrid}>
                  <input
                    style={styles.input}
                    type="date"
                    value={newCycleStartDate}
                    onChange={(event) => setNewCycleStartDate(event.target.value)}
                    required
                  />
                  <input
                    style={styles.input}
                    type="date"
                    value={newCycleEndDate}
                    onChange={(event) => setNewCycleEndDate(event.target.value)}
                    required
                  />
                </div>
                <button style={styles.ctaButton} type="submit" disabled={workspaceLoading}>
                  Create Cycle
                </button>
              </form>
            </article>

            <article style={styles.workspaceCard}>
              <h3 style={styles.cardTitle}>Create Capacity Plan</h3>
              <form style={styles.formStack} onSubmit={createCapacityPlan}>
                <input
                  style={styles.input}
                  type="number"
                  value={newCapacityHours}
                  onChange={(event) => setNewCapacityHours(event.target.value)}
                  placeholder="Planned hours"
                  min={0}
                  step={1}
                  required
                />
                <button style={styles.ctaButton} type="submit" disabled={workspaceLoading}>
                  Save Capacity
                </button>
              </form>
              <button
                style={{ ...styles.secondaryButton, marginTop: 8 }}
                type="button"
                onClick={loadCapacityPlans}
                disabled={workspaceLoading}
              >
                List Capacity Plans
              </button>
            </article>
          </div>

          <div style={styles.tableWrap}>
            <table style={styles.table}>
              <thead>
                <tr>
                  <th style={styles.tableHeader}>Team</th>
                  <th style={styles.tableHeader}>Cycle</th>
                  <th style={styles.tableHeader}>Hours</th>
                  {showTechnicalDetails && <th style={styles.tableHeader}>Plan ID</th>}
                </tr>
              </thead>
              <tbody>
                {capacityPlans.items.length === 0 ? (
                  <tr>
                    <td style={styles.tableCell} colSpan={showTechnicalDetails ? 4 : 3}>
                      No capacity plans loaded yet.
                    </td>
                  </tr>
                ) : (
                  capacityPlans.items.map((plan) => (
                    <tr key={plan.id}>
                      <td style={styles.tableCell}>
                        {teams.items.find((team) => team.id === plan.teamId)?.name ?? 'Unknown team'}
                      </td>
                      <td style={styles.tableCell}>
                        {cycles.items.find((cycle) => cycle.id === plan.planningCycleId)?.name ??
                          'Unknown cycle'}
                      </td>
                      <td style={styles.tableCell}>{plan.plannedHours}</td>
                      {showTechnicalDetails && <td style={styles.tableCell}>{plan.id}</td>}
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {showTechnicalDetails && (
            <small style={styles.hint}>
              Selected IDs: org={selectedOrganization?.id ?? 'n/a'} team={selectedTeam?.id ?? 'n/a'} cycle=
              {selectedCycle?.id ?? 'n/a'}
            </small>
          )}
        </section>
      )}
    </main>
  );
}

const styles: Record<string, CSSProperties> = {
  page: {
    minHeight: '100vh',
    background: 'linear-gradient(160deg, #f4efe7 0%, #f6f9fc 55%, #ecf7f2 100%)',
    padding: '24px 16px 42px',
    fontFamily: '"Space Grotesk", "Segoe UI", sans-serif',
    color: '#1a2b35',
  },
  hero: {
    maxWidth: 1120,
    margin: '0 auto 12px',
  },
  title: {
    margin: 0,
    fontSize: 'clamp(28px, 5vw, 42px)',
    lineHeight: 1.06,
  },
  subtitle: {
    margin: '8px 0 0',
    color: '#3d5966',
    fontSize: 15,
  },
  panel: {
    maxWidth: 1120,
    margin: '0 auto 14px',
    borderRadius: 14,
    border: '1px solid #d5e2e8',
    backgroundColor: 'rgba(255, 255, 255, 0.94)',
    padding: 14,
    boxShadow: '0 12px 28px rgba(20, 44, 65, 0.08)',
  },
  toolbar: {
    display: 'flex',
    flexDirection: 'column',
    gap: 10,
  },
  tabs: {
    display: 'flex',
    gap: 8,
    flexWrap: 'wrap',
  },
  tab: {
    borderRadius: 999,
    border: '1px solid #b7ccd4',
    padding: '8px 12px',
    background: '#fff',
    color: '#1d3b47',
    cursor: 'pointer',
    fontWeight: 600,
  },
  tabActive: {
    borderRadius: 999,
    border: '1px solid #1d6c55',
    padding: '8px 12px',
    background: '#1d6c55',
    color: '#fff',
    cursor: 'pointer',
    fontWeight: 700,
  },
  tokenRow: {
    display: 'grid',
    gridTemplateColumns: 'minmax(220px, 1fr) auto auto',
    gap: 8,
  },
  sectionTitle: {
    margin: '2px 0 10px',
    fontSize: 20,
  },
  filterGrid: {
    marginTop: 12,
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))',
    gap: 10,
  },
  field: {
    display: 'flex',
    flexDirection: 'column',
    gap: 6,
  },
  label: {
    fontSize: 12,
    fontWeight: 700,
    color: '#2a4652',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  input: {
    borderRadius: 10,
    border: '1px solid #b7cad1',
    padding: '9px 11px',
    fontSize: 14,
    color: '#11232b',
    backgroundColor: '#fff',
  },
  checkbox: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 8,
    fontSize: 13,
    color: '#28444f',
  },
  formGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
    gap: 8,
    alignItems: 'end',
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
    color: '#49616d',
  },
  errorText: {
    margin: '8px 0',
    color: '#8d1a14',
    fontSize: 13,
    fontWeight: 600,
  },
  successText: {
    margin: '8px 0',
    color: '#216b44',
    fontSize: 13,
    fontWeight: 600,
  },
  tileGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))',
    gap: 10,
    marginTop: 8,
  },
  tileCard: {
    borderRadius: 12,
    padding: 12,
    background: 'linear-gradient(180deg, #ffffff 0%, #f5fafb 100%)',
    border: '1px solid #d5e5ea',
    boxShadow: '0 8px 18px rgba(24, 61, 84, 0.08)',
  },
  tileHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
  },
  statusDot: {
    width: 10,
    height: 10,
    borderRadius: 999,
  },
  tileLabel: {
    margin: 0,
    fontSize: 14,
  },
  tileValue: {
    margin: '8px 0 5px',
    fontSize: 28,
    fontWeight: 800,
    color: '#182a31',
  },
  tileFooter: {
    margin: 0,
    fontSize: 12,
    color: '#415b67',
  },
  techText: {
    margin: '7px 0 0',
    fontSize: 12,
    color: '#4a6370',
  },
  headerRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 10,
    flexWrap: 'wrap',
  },
  workspaceGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
    gap: 10,
    marginTop: 8,
  },
  workspaceCard: {
    border: '1px solid #d8e7ec',
    borderRadius: 12,
    padding: 12,
    backgroundColor: '#fcfefe',
  },
  cardTitle: {
    margin: '0 0 8px',
    fontSize: 15,
  },
  formStack: {
    display: 'flex',
    flexDirection: 'column',
    gap: 8,
  },
  tableWrap: {
    marginTop: 12,
    overflowX: 'auto',
    border: '1px solid #d9e6eb',
    borderRadius: 12,
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse',
    minWidth: 500,
  },
  tableHeader: {
    textAlign: 'left',
    padding: '10px 12px',
    background: '#f1f6f8',
    borderBottom: '1px solid #d9e6eb',
    fontSize: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  tableCell: {
    padding: '10px 12px',
    borderBottom: '1px solid #e5eef2',
    fontSize: 13,
    color: '#1d3641',
  },
};
