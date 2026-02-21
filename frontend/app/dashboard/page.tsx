'use client';

import { CSSProperties, FormEvent, useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { clearStoredToken, getStoredToken, setStoredToken } from '../lib/session';

type TrendDirection = 'up' | 'down' | 'flat';
type TileStatus = 'green' | 'amber' | 'red';
type WorkspaceTab = 'dashboard' | 'planning' | 'management';

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

type Project = {
  id: string;
  organizationId: string;
  teamId?: string;
  name: string;
  code: string;
  description?: string;
  isActive: boolean;
};

type PlanningCycle = {
  id: string;
  projectId: string;
  name: string;
  startDate: string;
  endDate: string;
  isActive: boolean;
};

type CapacityPlan = {
  id: string;
  planningCycleId: string;
  teamId: string;
  plannedHours: number;
};

type CapacitySortField = 'team' | 'cycle' | 'hours' | 'updatedAt';

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
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<WorkspaceTab>('dashboard');
  const [showTechnicalDetails, setShowTechnicalDetails] = useState(false);
  const [bearerToken, setBearerToken] = useState('');
  const [tokenMessage, setTokenMessage] = useState('Token not set.');

  const [organizations, setOrganizations] = useState<ListResponse<Organization>>(defaultList());
  const [teams, setTeams] = useState<ListResponse<Team>>(defaultList());
  const [projects, setProjects] = useState<ListResponse<Project>>(defaultList());
  const [cycles, setCycles] = useState<ListResponse<PlanningCycle>>(defaultList());
  const [capacityPlans, setCapacityPlans] = useState<ListResponse<CapacityPlan>>(defaultList());

  const [selectedOrganizationId, setSelectedOrganizationId] = useState('');
  const [selectedProjectId, setSelectedProjectId] = useState('');
  const [selectedTeamId, setSelectedTeamId] = useState('');
  const [selectedCycleId, setSelectedCycleId] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  const [newCycleName, setNewCycleName] = useState('');
  const [newCycleStartDate, setNewCycleStartDate] = useState('');
  const [newCycleEndDate, setNewCycleEndDate] = useState('');
  const [newCapacityHours, setNewCapacityHours] = useState('');
  const [capacitySearch, setCapacitySearch] = useState('');
  const [capacityMinHours, setCapacityMinHours] = useState('');
  const [capacityMaxHours, setCapacityMaxHours] = useState('');
  const [capacityDateFrom, setCapacityDateFrom] = useState('');
  const [capacityDateTo, setCapacityDateTo] = useState('');
  const [capacitySortField, setCapacitySortField] = useState<CapacitySortField>('updatedAt');
  const [capacitySortDirection, setCapacitySortDirection] = useState<'asc' | 'desc'>('desc');
  const [newOrgName, setNewOrgName] = useState('');
  const [newOrgCode, setNewOrgCode] = useState('');
  const [editOrgId, setEditOrgId] = useState('');
  const [editOrgName, setEditOrgName] = useState('');
  const [editOrgCode, setEditOrgCode] = useState('');
  const [newTeamOrganizationId, setNewTeamOrganizationId] = useState('');
  const [newTeamName, setNewTeamName] = useState('');
  const [newProjectOrganizationId, setNewProjectOrganizationId] = useState('');
  const [newProjectTeamId, setNewProjectTeamId] = useState('');
  const [newProjectName, setNewProjectName] = useState('');
  const [newProjectCode, setNewProjectCode] = useState('');
  const [newProjectDescription, setNewProjectDescription] = useState('');
  const [projectFilterActive, setProjectFilterActive] = useState<'all' | 'active' | 'inactive'>('all');
  const [editCycleId, setEditCycleId] = useState('');
  const [editCycleProjectId, setEditCycleProjectId] = useState('');
  const [editCycleName, setEditCycleName] = useState('');
  const [editCycleStartDate, setEditCycleStartDate] = useState('');
  const [editCycleEndDate, setEditCycleEndDate] = useState('');

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
  const [adminLoading, setAdminLoading] = useState(false);
  const [adminError, setAdminError] = useState<string | null>(null);
  const [adminMessage, setAdminMessage] = useState<string | null>(null);

  useEffect(() => {
    const token = normalizeToken(getStoredToken());
    if (token) {
      setBearerToken(token);
      setTokenMessage('Token restored from local session.');
      return;
    }
    router.replace('/login');
  }, [router]);

  const activeOrganizations = useMemo(
    () => organizations.items.filter((organization) => organization.isActive),
    [organizations.items],
  );

  const activeOrganizationIds = useMemo(
    () => new Set(activeOrganizations.map((organization) => organization.id)),
    [activeOrganizations],
  );

  const visibleTeams = useMemo(
    () => teams.items.filter((team) => activeOrganizationIds.has(team.organizationId)),
    [teams.items, activeOrganizationIds],
  );

  const visibleTeamIds = useMemo(() => new Set(visibleTeams.map((team) => team.id)), [visibleTeams]);

  const visibleProjects = useMemo(
    () =>
      projects.items.filter((project) => {
        if (!activeOrganizationIds.has(project.organizationId)) {
          return false;
        }
        if (project.teamId && !visibleTeamIds.has(project.teamId)) {
          return false;
        }
        return project.isActive;
      }),
    [projects.items, activeOrganizationIds, visibleTeamIds],
  );

  const selectedProject = useMemo(
    () => visibleProjects.find((project) => project.id === selectedProjectId) ?? null,
    [selectedProjectId, visibleProjects],
  );

  const visibleCycles = useMemo(
    () =>
      cycles.items.filter((cycle) => {
        if (!cycle.isActive) {
          return false;
        }
        if (!visibleProjects.some((project) => project.id === cycle.projectId)) {
          return false;
        }
        return true;
      }),
    [cycles.items, visibleProjects],
  );

  const organizationOptions = activeOrganizations;

  const teamOptions = useMemo(() => {
    if (selectedProject) {
      if (selectedProject.teamId) {
        return visibleTeams.filter((team) => team.id === selectedProject.teamId);
      }
      return visibleTeams.filter((team) => team.organizationId === selectedProject.organizationId);
    }
    if (!selectedOrganizationId) return visibleTeams;
    return visibleTeams.filter((team) => team.organizationId === selectedOrganizationId);
  }, [selectedOrganizationId, selectedProject, visibleTeams]);

  const cycleOptions = useMemo(() => {
    if (selectedProjectId) {
      return visibleCycles.filter((cycle) => cycle.projectId === selectedProjectId);
    }
    return visibleCycles;
  }, [selectedProjectId, visibleCycles]);

  const selectedOrganization = useMemo(
    () => activeOrganizations.find((org) => org.id === selectedOrganizationId) ?? null,
    [activeOrganizations, selectedOrganizationId],
  );

  const selectedTeam = useMemo(
    () => visibleTeams.find((team) => team.id === selectedTeamId) ?? null,
    [visibleTeams, selectedTeamId],
  );

  const selectedCycle = useMemo(
    () => visibleCycles.find((cycle) => cycle.id === selectedCycleId) ?? null,
    [visibleCycles, selectedCycleId],
  );

  const tileCount = portfolioData?.summaryTiles.length ?? 0;

  const capacityRows = useMemo(
    () =>
      capacityPlans.items.map((plan) => {
        const team = visibleTeams.find((item) => item.id === plan.teamId);
        const cycle = visibleCycles.find((item) => item.id === plan.planningCycleId);
        const project = visibleProjects.find((item) => item.id === cycle?.projectId);
        return {
          ...plan,
          teamName: team?.name ?? 'Unknown team',
          projectName: project?.name ?? 'Unknown project',
          cycleName: cycle?.name ?? 'Unknown cycle',
          cycleStartDate: cycle?.startDate ?? '',
          cycleEndDate: cycle?.endDate ?? '',
        };
      }),
    [capacityPlans.items, visibleCycles, visibleProjects, visibleTeams],
  );

  const filteredCapacityRows = useMemo(() => {
    let rows = [...capacityRows];
    const searchTerm = capacitySearch.trim().toLowerCase();
    const minHours = capacityMinHours ? Number(capacityMinHours) : null;
    const maxHours = capacityMaxHours ? Number(capacityMaxHours) : null;

    if (searchTerm) {
      rows = rows.filter(
        (row) =>
          row.teamName.toLowerCase().includes(searchTerm) ||
          row.cycleName.toLowerCase().includes(searchTerm) ||
          row.projectName.toLowerCase().includes(searchTerm),
      );
    }

    if (Number.isFinite(minHours)) {
      rows = rows.filter((row) => row.plannedHours >= (minHours as number));
    }

    if (Number.isFinite(maxHours)) {
      rows = rows.filter((row) => row.plannedHours <= (maxHours as number));
    }

    if (capacityDateFrom) {
      rows = rows.filter((row) => !row.cycleStartDate || row.cycleStartDate >= capacityDateFrom);
    }
    if (capacityDateTo) {
      rows = rows.filter((row) => !row.cycleEndDate || row.cycleEndDate <= capacityDateTo);
    }

    rows.sort((left, right) => {
      const direction = capacitySortDirection === 'asc' ? 1 : -1;
      if (capacitySortField === 'hours') {
        return (left.plannedHours - right.plannedHours) * direction;
      }
      if (capacitySortField === 'team') {
        return left.teamName.localeCompare(right.teamName) * direction;
      }
      if (capacitySortField === 'cycle') {
        return left.cycleName.localeCompare(right.cycleName) * direction;
      }
      return left.updatedAt.localeCompare(right.updatedAt) * direction;
    });

    return rows;
  }, [
    capacityDateFrom,
    capacityDateTo,
    capacityMaxHours,
    capacityMinHours,
    capacityRows,
    capacitySearch,
    capacitySortDirection,
    capacitySortField,
  ]);

  const persistToken = () => {
    const normalized = normalizeToken(bearerToken);
    if (normalized) {
      setBearerToken(normalized);
      setStoredToken(normalized);
      setTokenMessage('Token saved in local session.');
      setLookupError(null);
      return;
    }
    clearStoredToken();
    setTokenMessage('Token cleared from local session.');
    setLookupError('Save a valid JWT token before loading reference data.');
  };

  const signOut = () => {
    clearStoredToken();
    router.replace('/login');
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

  const runAdminAction = useCallback(async (action: () => Promise<void>, successMessage: string) => {
    setAdminError(null);
    setAdminMessage(null);
    setAdminLoading(true);
    try {
      await action();
      setAdminMessage(successMessage);
    } catch (error) {
      setAdminError(error instanceof Error ? error.message : 'Unexpected admin error.');
    } finally {
      setAdminLoading(false);
    }
  }, []);

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
        let orgItems: Organization[] = [];
        let teamItems: Team[] = [];
        let projectItems: Project[] = [];
        let cycleItems: PlanningCycle[] = [];
        let orgCount = 0;
        let teamCount = 0;
        let projectCount = 0;
        let cycleCount = 0;
        const failures: string[] = [];

        try {
          const orgPayload = await apiRequest<ListResponse<Organization>>(
            '/organizations?page=1&pageSize=100',
          );
          setOrganizations(orgPayload);
          orgItems = orgPayload.items;
          orgCount = orgPayload.items.filter((organization) => organization.isActive).length;
        } catch (error) {
          failures.push(
            `organizations: ${error instanceof Error ? error.message : 'request failed'}`,
          );
        }

        try {
          const teamPayload = await apiRequest<ListResponse<Team>>('/teams?page=1&pageSize=100');
          setTeams(teamPayload);
          teamItems = teamPayload.items;
          const activeOrganizationIdsFromPayload = new Set(
            orgItems
              .filter((organization) => organization.isActive)
              .map((organization) => organization.id),
          );
          teamCount = teamPayload.items.filter((team) =>
            activeOrganizationIdsFromPayload.has(team.organizationId),
          ).length;
        } catch (error) {
          failures.push(`teams: ${error instanceof Error ? error.message : 'request failed'}`);
        }

        try {
          const projectPayload = await apiRequest<ListResponse<Project>>(
            '/projects?page=1&pageSize=100',
          );
          setProjects(projectPayload);
          projectItems = projectPayload.items;
          const activeOrganizationIdsFromPayload = new Set(
            orgItems
              .filter((organization) => organization.isActive)
              .map((organization) => organization.id),
          );
          const activeTeamIdsFromPayload = new Set(
            teamItems
              .filter((team) => activeOrganizationIdsFromPayload.has(team.organizationId))
              .map((team) => team.id),
          );
          projectCount = projectPayload.items.filter((project) => {
            if (!project.isActive) {
              return false;
            }
            if (!activeOrganizationIdsFromPayload.has(project.organizationId)) {
              return false;
            }
            if (project.teamId && !activeTeamIdsFromPayload.has(project.teamId)) {
              return false;
            }
            return true;
          }).length;
        } catch (error) {
          failures.push(`projects: ${error instanceof Error ? error.message : 'request failed'}`);
        }

        try {
          const cyclePayload = await apiRequest<ListResponse<PlanningCycle>>(
            '/planning-cycles?page=1&pageSize=100',
          );
          setCycles(cyclePayload);
          cycleItems = cyclePayload.items;
          const activeOrganizationIdsFromPayload = new Set(
            orgItems
              .filter((organization) => organization.isActive)
              .map((organization) => organization.id),
          );
          const activeTeamIdsFromPayload = new Set(
            teamItems
              .filter((team) => activeOrganizationIdsFromPayload.has(team.organizationId))
              .map((team) => team.id),
          );
          const activeProjectIdsFromPayload = new Set(
            projectItems
              .filter((project) => project.isActive)
              .map((project) => project.id),
          );
          cycleCount = cycleItems.filter(
            (cycle) => cycle.isActive && activeProjectIdsFromPayload.has(cycle.projectId),
          ).length;
        } catch (error) {
          failures.push(
            `planning-cycles: ${error instanceof Error ? error.message : 'request failed'}`,
          );
        }

        setCapacityPlans(defaultList());

        const totalLoaded = orgCount + teamCount + projectCount + cycleCount;
        if (totalLoaded === 0) {
          setLookupMessage(
            'Reference data loaded, but no records exist yet. Create Organization, Team, Project, and Planning Cycle first.',
          );
        } else {
          setLookupMessage(
            `${successMessage} (Orgs: ${orgCount}, Teams: ${teamCount}, Projects: ${projectCount}, Cycles: ${cycleCount})`,
          );
        }

        if (failures.length > 0) {
          setLookupError(`Partial load: ${failures.join(' | ')}`);
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

  useEffect(() => {
    if (selectedOrganizationId && !activeOrganizations.some((org) => org.id === selectedOrganizationId)) {
      setSelectedOrganizationId('');
      setSelectedProjectId('');
      setSelectedTeamId('');
      setSelectedCycleId('');
      return;
    }
    if (selectedProjectId && !visibleProjects.some((project) => project.id === selectedProjectId)) {
      setSelectedProjectId('');
      setSelectedTeamId('');
      setSelectedCycleId('');
      return;
    }
    if (selectedTeamId && !visibleTeams.some((team) => team.id === selectedTeamId)) {
      setSelectedTeamId('');
      setSelectedCycleId('');
      return;
    }
    if (selectedCycleId && !visibleCycles.some((cycle) => cycle.id === selectedCycleId)) {
      setSelectedCycleId('');
    }
  }, [
    activeOrganizations,
    selectedProjectId,
    selectedCycleId,
    selectedOrganizationId,
    selectedTeamId,
    visibleCycles,
    visibleProjects,
    visibleTeams,
  ]);

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
    if (!selectedProjectId) {
      setWorkspaceError('Select a project before creating a planning cycle.');
      return;
    }
    await runWorkspaceAction(async () => {
      await apiRequest<PlanningCycle>('/planning-cycles', {
        method: 'POST',
        body: JSON.stringify({
          projectId: selectedProjectId,
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
    await runWorkspaceAction(async () => {
      const query = new URLSearchParams({ page: '1', pageSize: '100' });
      if (selectedTeamId) {
        query.set('teamId', selectedTeamId);
      }
      if (selectedCycleId) {
        query.set('planningCycleId', selectedCycleId);
      }
      const plansPayload = await apiRequest<ListResponse<CapacityPlan>>(
        `/capacity-plans?${query.toString()}`,
      );
      setCapacityPlans(plansPayload);
    }, 'Capacity plans loaded.');
  };

  const clearCapacityFilters = () => {
    setCapacitySearch('');
    setCapacityMinHours('');
    setCapacityMaxHours('');
    setCapacityDateFrom('');
    setCapacityDateTo('');
    setCapacitySortField('updatedAt');
    setCapacitySortDirection('desc');
  };

  const createOrganization = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    await runAdminAction(async () => {
      await apiRequest<Organization>('/organizations', {
        method: 'POST',
        body: JSON.stringify({ name: newOrgName.trim(), code: newOrgCode.trim() }),
      });
      setNewOrgName('');
      setNewOrgCode('');
      await bootstrapLookups('Organization created and lists refreshed.');
    }, 'Organization created.');
  };

  const startOrganizationEdit = (organization: Organization) => {
    setEditOrgId(organization.id);
    setEditOrgName(organization.name);
    setEditOrgCode(organization.code);
  };

  const saveOrganizationEdit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!editOrgId) {
      setAdminError('Select an organization to update.');
      return;
    }
    await runAdminAction(async () => {
      await apiRequest<Organization>(`/organizations/${editOrgId}`, {
        method: 'PATCH',
        body: JSON.stringify({ name: editOrgName.trim(), code: editOrgCode.trim() }),
      });
      setEditOrgId('');
      setEditOrgName('');
      setEditOrgCode('');
      await bootstrapLookups('Organization updated and lists refreshed.');
    }, 'Organization updated.');
  };

  const deleteOrganization = async (organizationId: string) => {
    await runAdminAction(async () => {
      await apiRequest<void>(`/organizations/${organizationId}`, { method: 'DELETE' });
      if (selectedOrganizationId === organizationId) {
        setSelectedOrganizationId('');
      }
      await bootstrapLookups('Organization deleted and lists refreshed.');
    }, 'Organization deleted.');
  };

  const createTeamAdmin = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!newTeamOrganizationId) {
      setAdminError('Select organization before creating a team.');
      return;
    }
    await runAdminAction(async () => {
      await apiRequest<Team>('/teams', {
        method: 'POST',
        body: JSON.stringify({
          organizationId: newTeamOrganizationId,
          name: newTeamName.trim(),
        }),
      });
      setNewTeamName('');
      await bootstrapLookups('Team created and lists refreshed.');
    }, 'Team created.');
  };

  const createProjectAdmin = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!newProjectOrganizationId) {
      setAdminError('Select organization before creating a project.');
      return;
    }
    if (newProjectTeamId) {
      const selectedTeam = visibleTeams.find((team) => team.id === newProjectTeamId);
      if (!selectedTeam || selectedTeam.organizationId !== newProjectOrganizationId) {
        setAdminError('Selected team must belong to selected organization.');
        return;
      }
    }

    await runAdminAction(async () => {
      await apiRequest<Project>('/projects', {
        method: 'POST',
        body: JSON.stringify({
          organizationId: newProjectOrganizationId,
          teamId: newProjectTeamId || undefined,
          name: newProjectName.trim(),
          code: newProjectCode.trim(),
          description: newProjectDescription.trim() || undefined,
        }),
      });
      setNewProjectName('');
      setNewProjectCode('');
      setNewProjectDescription('');
      await bootstrapLookups('Project created and lists refreshed.');
    }, 'Project created.');
  };

  const startCycleEdit = (cycle: PlanningCycle) => {
    setEditCycleId(cycle.id);
    setEditCycleProjectId(cycle.projectId);
    setEditCycleName(cycle.name);
    setEditCycleStartDate(cycle.startDate);
    setEditCycleEndDate(cycle.endDate);
  };

  const updateSprint = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!editCycleId || !editCycleProjectId) {
      setWorkspaceError('Select sprint to edit.');
      return;
    }
    await runWorkspaceAction(async () => {
      await apiRequest<PlanningCycle>(`/planning-cycles/${editCycleId}`, {
        method: 'PATCH',
        body: JSON.stringify({
          projectId: editCycleProjectId,
          name: editCycleName.trim(),
          startDate: editCycleStartDate,
          endDate: editCycleEndDate,
        }),
      });
      setEditCycleId('');
      await bootstrapLookups('Sprint updated and lists refreshed.');
    }, 'Sprint updated.');
  };

  const deactivateSprint = async (planningCycleId: string) => {
    await runWorkspaceAction(async () => {
      await apiRequest<void>(`/planning-cycles/${planningCycleId}`, {
        method: 'DELETE',
      });
      if (selectedCycleId === planningCycleId) {
        setSelectedCycleId('');
      }
      await bootstrapLookups('Sprint deactivated and lists refreshed.');
    }, 'Sprint deactivated.');
  };

  return (
    <main style={styles.page}>
      <section style={styles.hero}>
        <h1 style={styles.title}>Engineering Insights</h1>
        <p style={styles.subtitle}>
          Track key portfolio metrics and update planning data from one compact workspace.
        </p>
        <div style={styles.navRow}>
          <Link href="/dashboard" style={styles.secondaryButton}>
            Dashboard
          </Link>
          <Link href="/users" style={styles.secondaryButton}>
            Users
          </Link>
          <button style={styles.secondaryButton} type="button" onClick={signOut}>
            Sign Out
          </button>
        </div>
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
            <button
              type="button"
              style={activeTab === 'management' ? styles.tabActive : styles.tab}
              onClick={() => setActiveTab('management')}
            >
              Management
            </button>
          </div>

          <div style={styles.loginRow}>
            <button style={styles.secondaryButton} type="button" onClick={validateApiConnection}>
              Test API
            </button>
            {showTechnicalDetails && (
              <div style={styles.tokenRow}>
                <input
                  style={styles.input}
                  type="password"
                  value={bearerToken}
                  onChange={(event) => setBearerToken(event.target.value)}
                  placeholder="Manual JWT token override"
                />
                <button style={styles.secondaryButton} type="button" onClick={persistToken}>
                  Save Token
                </button>
              </div>
            )}
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
                setSelectedProjectId('');
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
            <label style={styles.label}>Project</label>
            <select
              style={styles.input}
              value={selectedProjectId}
              onChange={(event) => {
                const projectId = event.target.value;
                setSelectedProjectId(projectId);
                setSelectedCycleId('');
                const project = visibleProjects.find((item) => item.id === projectId);
                if (project?.teamId) {
                  setSelectedTeamId(project.teamId);
                }
              }}
            >
              <option value="">All projects</option>
              {visibleProjects
                .filter(
                  (project) =>
                    !selectedOrganizationId || project.organizationId === selectedOrganizationId,
                )
                .map((project) => (
                  <option key={project.id} value={project.id}>
                    {project.name} ({project.code})
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
              Orgs: {activeOrganizations.length} | Teams: {visibleTeams.length} | Projects:{' '}
              {visibleProjects.length} | Cycles: {visibleCycles.length}
            </small>
          </div>
        </div>
        <div style={styles.statsRow}>
          <article style={styles.statCard}>
            <p style={styles.statLabel}>Organizations</p>
            <p style={styles.statValue}>{activeOrganizations.length}</p>
          </article>
          <article style={styles.statCard}>
            <p style={styles.statLabel}>Teams</p>
            <p style={styles.statValue}>{visibleTeams.length}</p>
          </article>
          <article style={styles.statCard}>
            <p style={styles.statLabel}>Projects</p>
            <p style={styles.statValue}>{visibleProjects.length}</p>
          </article>
          <article style={styles.statCard}>
            <p style={styles.statLabel}>Cycles</p>
            <p style={styles.statValue}>{visibleCycles.length}</p>
          </article>
          <article style={styles.statCard}>
            <p style={styles.statLabel}>Capacity Rows</p>
            <p style={styles.statValue}>{filteredCapacityRows.length}</p>
          </article>
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
      ) : activeTab === 'planning' ? (
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
                <select
                  style={styles.input}
                  value={selectedProjectId}
                  onChange={(event) => {
                    const projectId = event.target.value;
                    setSelectedProjectId(projectId);
                    const project = visibleProjects.find((item) => item.id === projectId);
                    if (project?.teamId) {
                      setSelectedTeamId(project.teamId);
                    }
                  }}
                  required
                >
                  <option value="">Select project</option>
                  {visibleProjects
                    .filter(
                      (project) =>
                        !selectedOrganizationId || project.organizationId === selectedOrganizationId,
                    )
                    .map((project) => (
                      <option key={project.id} value={project.id}>
                        {project.name} ({project.code})
                      </option>
                    ))}
                </select>
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

            <article style={styles.workspaceCard}>
              <h3 style={styles.cardTitle}>Capacity Filters</h3>
              <div style={styles.formStack}>
                <input
                  style={styles.input}
                  type="text"
                  placeholder="Search team or cycle"
                  value={capacitySearch}
                  onChange={(event) => setCapacitySearch(event.target.value)}
                />
                <div style={styles.formGrid}>
                  <input
                    style={styles.input}
                    type="number"
                    placeholder="Min hours"
                    min={0}
                    value={capacityMinHours}
                    onChange={(event) => setCapacityMinHours(event.target.value)}
                  />
                  <input
                    style={styles.input}
                    type="number"
                    placeholder="Max hours"
                    min={0}
                    value={capacityMaxHours}
                    onChange={(event) => setCapacityMaxHours(event.target.value)}
                  />
                </div>
                <div style={styles.formGrid}>
                  <input
                    style={styles.input}
                    type="date"
                    value={capacityDateFrom}
                    onChange={(event) => setCapacityDateFrom(event.target.value)}
                  />
                  <input
                    style={styles.input}
                    type="date"
                    value={capacityDateTo}
                    onChange={(event) => setCapacityDateTo(event.target.value)}
                  />
                </div>
                <div style={styles.formGrid}>
                  <select
                    style={styles.input}
                    value={capacitySortField}
                    onChange={(event) => setCapacitySortField(event.target.value as CapacitySortField)}
                  >
                    <option value="updatedAt">Sort by updated</option>
                    <option value="hours">Sort by hours</option>
                    <option value="team">Sort by team</option>
                    <option value="cycle">Sort by cycle</option>
                  </select>
                  <select
                    style={styles.input}
                    value={capacitySortDirection}
                    onChange={(event) => setCapacitySortDirection(event.target.value as 'asc' | 'desc')}
                  >
                    <option value="desc">Descending</option>
                    <option value="asc">Ascending</option>
                  </select>
                </div>
                <button style={styles.secondaryButton} type="button" onClick={clearCapacityFilters}>
                  Clear Filters
                </button>
              </div>
            </article>
          </div>

          <small style={styles.hint}>
            Capacity plans: loaded {capacityRows.length}, visible {filteredCapacityRows.length}
          </small>

          <div style={styles.tableWrap}>
            <table style={styles.table}>
              <thead>
                <tr>
                  <th style={styles.tableHeader}>Project</th>
                  <th style={styles.tableHeader}>Team</th>
                  <th style={styles.tableHeader}>Cycle</th>
                  <th style={styles.tableHeader}>Cycle Window</th>
                  <th style={styles.tableHeader}>Hours</th>
                  <th style={styles.tableHeader}>Updated</th>
                  {showTechnicalDetails && <th style={styles.tableHeader}>Plan ID</th>}
                </tr>
              </thead>
              <tbody>
                {filteredCapacityRows.length === 0 ? (
                  <tr>
                    <td style={styles.tableCell} colSpan={showTechnicalDetails ? 7 : 6}>
                      No capacity plans match current filters.
                    </td>
                  </tr>
                ) : (
                  filteredCapacityRows.map((plan) => (
                    <tr key={plan.id}>
                      <td style={styles.tableCell}>{plan.projectName}</td>
                      <td style={styles.tableCell}>{plan.teamName}</td>
                      <td style={styles.tableCell}>{plan.cycleName}</td>
                      <td style={styles.tableCell}>
                        {plan.cycleStartDate && plan.cycleEndDate
                          ? `${plan.cycleStartDate} to ${plan.cycleEndDate}`
                          : 'N/A'}
                      </td>
                      <td style={styles.tableCell}>{plan.plannedHours}</td>
                      <td style={styles.tableCell}>{new Date(plan.updatedAt).toLocaleDateString()}</td>
                      {showTechnicalDetails && <td style={styles.tableCell}>{plan.id}</td>}
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <div style={styles.tableWrap}>
            <table style={styles.table}>
              <thead>
                <tr>
                  <th style={styles.tableHeader}>Project</th>
                  <th style={styles.tableHeader}>Sprint</th>
                  <th style={styles.tableHeader}>Start</th>
                  <th style={styles.tableHeader}>End</th>
                  <th style={styles.tableHeader}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {cycleOptions.length === 0 ? (
                  <tr>
                    <td style={styles.tableCell} colSpan={5}>
                      No sprints available for selected filters.
                    </td>
                  </tr>
                ) : (
                  cycleOptions.map((cycle) => (
                    <tr key={cycle.id}>
                      <td style={styles.tableCell}>
                        {visibleProjects.find((project) => project.id === cycle.projectId)?.name ??
                          'Unknown project'}
                      </td>
                      <td style={styles.tableCell}>{cycle.name}</td>
                      <td style={styles.tableCell}>{cycle.startDate}</td>
                      <td style={styles.tableCell}>{cycle.endDate}</td>
                      <td style={styles.tableCell}>
                        <div style={styles.actionRow}>
                          <button
                            style={styles.secondaryButton}
                            type="button"
                            onClick={() => startCycleEdit(cycle)}
                            disabled={workspaceLoading}
                          >
                            Edit
                          </button>
                          <button
                            style={styles.secondaryButton}
                            type="button"
                            onClick={() => void deactivateSprint(cycle.id)}
                            disabled={workspaceLoading}
                          >
                            Deactivate
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {editCycleId && (
            <article style={styles.workspaceCard}>
              <h3 style={styles.cardTitle}>Edit Sprint</h3>
              <form style={styles.formGrid} onSubmit={updateSprint}>
                <select
                  style={styles.input}
                  value={editCycleProjectId}
                  onChange={(event) => setEditCycleProjectId(event.target.value)}
                  required
                >
                  <option value="">Select project</option>
                  {visibleProjects.map((project) => (
                    <option key={project.id} value={project.id}>
                      {project.name} ({project.code})
                    </option>
                  ))}
                </select>
                <input
                  style={styles.input}
                  type="text"
                  value={editCycleName}
                  onChange={(event) => setEditCycleName(event.target.value)}
                  required
                />
                <input
                  style={styles.input}
                  type="date"
                  value={editCycleStartDate}
                  onChange={(event) => setEditCycleStartDate(event.target.value)}
                  required
                />
                <input
                  style={styles.input}
                  type="date"
                  value={editCycleEndDate}
                  onChange={(event) => setEditCycleEndDate(event.target.value)}
                  required
                />
                <button style={styles.ctaButton} type="submit" disabled={workspaceLoading}>
                  Save Sprint
                </button>
              </form>
            </article>
          )}

          {showTechnicalDetails && (
            <small style={styles.hint}>
              Selected IDs: org={selectedOrganization?.id ?? 'n/a'} team={selectedTeam?.id ?? 'n/a'} cycle=
              {selectedCycle?.id ?? 'n/a'}
            </small>
          )}
        </section>
      ) : (
        <section style={styles.panel}>
          <div style={styles.headerRow}>
            <h2 style={styles.sectionTitle}>Organization, Team, and Cycle Management</h2>
            <button
              style={styles.secondaryButton}
              type="button"
              onClick={() => void bootstrapLookups()}
              disabled={lookupLoading || adminLoading}
            >
              Refresh Lists
            </button>
          </div>

          {adminError && <p style={styles.errorText}>{adminError}</p>}
          {adminMessage && <p style={styles.successText}>{adminMessage}</p>}

          <div style={styles.workspaceGrid}>
            <article style={styles.workspaceCard}>
              <h3 style={styles.cardTitle}>Create Organization</h3>
              <form style={styles.formStack} onSubmit={createOrganization}>
                <input
                  style={styles.input}
                  type="text"
                  placeholder="Organization name"
                  value={newOrgName}
                  onChange={(event) => setNewOrgName(event.target.value)}
                  required
                />
                <input
                  style={styles.input}
                  type="text"
                  placeholder="Organization code"
                  value={newOrgCode}
                  onChange={(event) => setNewOrgCode(event.target.value)}
                  required
                />
                <button style={styles.ctaButton} type="submit" disabled={adminLoading}>
                  Create Organization
                </button>
              </form>
            </article>

            <article style={styles.workspaceCard}>
              <h3 style={styles.cardTitle}>Create Team</h3>
              <form style={styles.formStack} onSubmit={createTeamAdmin}>
                <select
                  style={styles.input}
                  value={newTeamOrganizationId}
                  onChange={(event) => setNewTeamOrganizationId(event.target.value)}
                  required
                >
                  <option value="">Select organization</option>
                  {activeOrganizations.map((org) => (
                    <option key={org.id} value={org.id}>
                      {org.name}
                    </option>
                  ))}
                </select>
                <input
                  style={styles.input}
                  type="text"
                  placeholder="Team name"
                  value={newTeamName}
                  onChange={(event) => setNewTeamName(event.target.value)}
                  required
                />
                <button style={styles.ctaButton} type="submit" disabled={adminLoading}>
                  Create Team
                </button>
              </form>
            </article>

            <article style={styles.workspaceCard}>
              <h3 style={styles.cardTitle}>Create Project</h3>
              <form style={styles.formStack} onSubmit={createProjectAdmin}>
                <select
                  style={styles.input}
                  value={newProjectOrganizationId}
                  onChange={(event) => {
                    setNewProjectOrganizationId(event.target.value);
                    setNewProjectTeamId('');
                  }}
                  required
                >
                  <option value="">Select organization</option>
                  {activeOrganizations.map((org) => (
                    <option key={org.id} value={org.id}>
                      {org.name}
                    </option>
                  ))}
                </select>
                <select
                  style={styles.input}
                  value={newProjectTeamId}
                  onChange={(event) => setNewProjectTeamId(event.target.value)}
                >
                  <option value="">No team mapping</option>
                  {visibleTeams
                    .filter((team) => team.organizationId === newProjectOrganizationId)
                    .map((team) => (
                      <option key={team.id} value={team.id}>
                        {team.name}
                      </option>
                    ))}
                </select>
                <input
                  style={styles.input}
                  type="text"
                  placeholder="Project name"
                  value={newProjectName}
                  onChange={(event) => setNewProjectName(event.target.value)}
                  required
                />
                <input
                  style={styles.input}
                  type="text"
                  placeholder="Project code"
                  value={newProjectCode}
                  onChange={(event) => setNewProjectCode(event.target.value)}
                  required
                />
                <input
                  style={styles.input}
                  type="text"
                  placeholder="Description (optional)"
                  value={newProjectDescription}
                  onChange={(event) => setNewProjectDescription(event.target.value)}
                />
                <button style={styles.ctaButton} type="submit" disabled={adminLoading}>
                  Create Project
                </button>
              </form>
            </article>

          </div>

          <div style={styles.tableWrap}>
            <table style={styles.table}>
              <thead>
                <tr>
                  <th style={styles.tableHeader}>Organization</th>
                  <th style={styles.tableHeader}>Code</th>
                  <th style={styles.tableHeader}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {activeOrganizations.length === 0 ? (
                  <tr>
                    <td style={styles.tableCell} colSpan={3}>
                      No organizations available.
                    </td>
                  </tr>
                ) : (
                  activeOrganizations.map((organization) => (
                    <tr key={organization.id}>
                      <td style={styles.tableCell}>{organization.name}</td>
                      <td style={styles.tableCell}>{organization.code}</td>
                      <td style={styles.tableCell}>
                        <div style={styles.actionRow}>
                          <button
                            type="button"
                            style={styles.secondaryButton}
                            onClick={() => startOrganizationEdit(organization)}
                            disabled={adminLoading}
                          >
                            Edit
                          </button>
                          <button
                            type="button"
                            style={styles.secondaryButton}
                            onClick={() => void deleteOrganization(organization.id)}
                            disabled={adminLoading}
                          >
                            Delete
                          </button>
                        </div>
                        {showTechnicalDetails && (
                          <small style={styles.hint}>ID: {organization.id}</small>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {editOrgId && (
            <article style={styles.workspaceCard}>
              <h3 style={styles.cardTitle}>Edit Organization</h3>
              <form style={styles.formGrid} onSubmit={saveOrganizationEdit}>
                <input
                  style={styles.input}
                  type="text"
                  value={editOrgName}
                  onChange={(event) => setEditOrgName(event.target.value)}
                  required
                />
                <input
                  style={styles.input}
                  type="text"
                  value={editOrgCode}
                  onChange={(event) => setEditOrgCode(event.target.value)}
                  required
                />
                <button style={styles.ctaButton} type="submit" disabled={adminLoading}>
                  Save Organization
                </button>
              </form>
            </article>
          )}

          <div style={styles.workspaceGrid}>
            <article style={styles.workspaceCard}>
              <h3 style={styles.cardTitle}>Projects</h3>
              <div style={styles.formGrid}>
                <select
                  style={styles.input}
                  value={projectFilterActive}
                  onChange={(event) =>
                    setProjectFilterActive(event.target.value as 'all' | 'active' | 'inactive')
                  }
                >
                  <option value="all">All projects</option>
                  <option value="active">Active projects</option>
                  <option value="inactive">Inactive projects</option>
                </select>
              </div>
              <ul style={styles.list}>
                {projects.items
                  .filter((project) => {
                    if (projectFilterActive === 'active') return project.isActive;
                    if (projectFilterActive === 'inactive') return !project.isActive;
                    return true;
                  })
                  .map((project) => (
                    <li key={project.id}>
                      {project.name} ({project.code}) -{' '}
                      {activeOrganizations.find((org) => org.id === project.organizationId)?.name ??
                        'Unknown org'}
                      {project.teamId
                        ? ` / ${
                            visibleTeams.find((team) => team.id === project.teamId)?.name ??
                            'Unknown team'
                          }`
                        : ''}
                      {showTechnicalDetails && ` | ${project.id}`}
                    </li>
                  ))}
                {projects.items.length === 0 && <li>No projects available.</li>}
              </ul>
            </article>
            <article style={styles.workspaceCard}>
              <h3 style={styles.cardTitle}>Teams</h3>
              <ul style={styles.list}>
                {visibleTeams.length === 0 && <li>No teams available.</li>}
                {visibleTeams.map((team) => (
                  <li key={team.id}>
                    {team.name} ({activeOrganizations.find((org) => org.id === team.organizationId)?.name ?? 'Unknown org'})
                    {showTechnicalDetails && ` | ${team.id}`}
                  </li>
                ))}
              </ul>
            </article>
            <article style={styles.workspaceCard}>
              <h3 style={styles.cardTitle}>Planning Cycles</h3>
              <ul style={styles.list}>
                {visibleCycles.length === 0 && <li>No planning cycles available.</li>}
                {visibleCycles.map((cycle) => (
                  <li key={cycle.id}>
                    {cycle.name} ({cycle.startDate} to {cycle.endDate})
                    {showTechnicalDetails && ` | ${cycle.id}`}
                  </li>
                ))}
              </ul>
            </article>
          </div>
        </section>
      )}
    </main>
  );
}

const styles: Record<string, CSSProperties> = {
  page: {
    minHeight: '100vh',
    background: 'linear-gradient(160deg, #f3eee5 0%, #f4f9fd 52%, #ebf7f1 100%)',
    padding: '24px 18px 42px',
    fontFamily: '"Space Grotesk", "Segoe UI", sans-serif',
    color: '#1a2b35',
  },
  hero: {
    maxWidth: 1240,
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
  navRow: {
    marginTop: 10,
    display: 'flex',
    gap: 8,
    flexWrap: 'wrap',
  },
  panel: {
    maxWidth: 1240,
    margin: '0 auto 14px',
    borderRadius: 14,
    border: '1px solid #d3e2e8',
    backgroundColor: 'rgba(255, 255, 255, 0.96)',
    padding: 16,
    boxShadow: '0 14px 30px rgba(20, 44, 65, 0.09)',
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
    gridTemplateColumns: 'minmax(220px, 1fr) auto',
    gap: 8,
  },
  loginRow: {
    display: 'flex',
    gap: 8,
    flexWrap: 'wrap',
    alignItems: 'center',
  },
  sectionTitle: {
    margin: '2px 0 10px',
    fontSize: 20,
  },
  filterGrid: {
    marginTop: 12,
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
    gap: 10,
  },
  statsRow: {
    marginTop: 10,
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
    gap: 8,
  },
  statCard: {
    border: '1px solid #d6e5ea',
    background: 'linear-gradient(180deg, #ffffff 0%, #f5fafb 100%)',
    borderRadius: 12,
    padding: '10px 12px',
  },
  statLabel: {
    margin: 0,
    fontSize: 11,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    color: '#4a6370',
    fontWeight: 700,
  },
  statValue: {
    margin: '4px 0 0',
    fontSize: 20,
    fontWeight: 800,
    color: '#1e3640',
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
  actionRow: {
    display: 'flex',
    gap: 8,
    flexWrap: 'wrap',
    marginBottom: 6,
  },
  list: {
    margin: 0,
    paddingLeft: 18,
    display: 'flex',
    flexDirection: 'column',
    gap: 8,
    fontSize: 13,
    color: '#1d3641',
  },
};
