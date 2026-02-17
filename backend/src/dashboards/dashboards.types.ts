export interface PortfolioSummaryTile {
  metricId: string;
  label: string;
  value: number;
  trendDirection: 'up' | 'down' | 'flat';
  status: 'green' | 'amber' | 'red';
}

export interface PortfolioDashboardResponse {
  dateFrom?: string;
  dateTo?: string;
  summaryTiles: PortfolioSummaryTile[];
}
