// ── Process Types ──

export type ProcessType = 'web' | 'api' | 'database' | 'system';
export type ProcessStatus = 'running' | 'suspended' | 'stopped';

export interface PortProcess {
  pid: number;
  name: string;
  command: string;
  port: number;
  protocol: 'TCP';
  workingDirectory: string;
  memoryMB: number;
  cpuPercent: number;
  uptime: string;
  startTime: string;
  status: ProcessStatus;
  type: ProcessType;
  workerCount: number;
  isPortctl: boolean;
  isSystem: boolean;
  tags: string[];
  hasLogs: boolean;
}

// ── Config Types ──

export type MatcherType = 'command_contains' | 'process_name' | 'working_directory' | 'regex';

export interface ReservationMatcher {
  type: MatcherType;
  value: string;
}

export interface Reservation {
  port: number;
  matcher: ReservationMatcher;
  restartTemplate: string | null;
  label: string;
}

export type CardClickBehavior = 'openBrowser' | 'openLogs';
export type ViewMode = 'card' | 'table';
export type Theme = 'dark' | 'light';

export interface PortctlSettings {
  dashboardPort: number;
  pollingInterval: number;
  defaultView: ViewMode;
  theme: Theme;
  cardClickBehavior: CardClickBehavior;
  logBufferSize: number;
}

export interface PortctlConfig {
  version: number;
  settings: PortctlSettings;
  reservations: Reservation[];
  blockedPorts: number[];
  pinnedPorts: number[];
  tags: Record<string, string[]>;
  cardOrder: number[];
  customRestartCommands: Record<string, string>;
}

// ── API Types ──

export interface ApiProcessListResponse {
  processes: PortProcess[];
  timestamp: number;
}

export interface ApiStatusResponse {
  running: boolean;
  pid: number;
  uptime: number;
  dashboardUrl: string;
  version: string;
}

export interface ApiMoveRequest {
  targetPort: number;
}

export interface ApiErrorResponse {
  error: string;
  details?: string;
}

export interface LogEntry {
  timestamp: number;
  stream: 'stdout' | 'stderr';
  text: string;
}

export interface ApiLogsResponse {
  pid: number;
  logs: LogEntry[];
  available: boolean;
  message?: string;
}

// ── Toast Types ──

export type ToastType = 'success' | 'error' | 'info';

export interface Toast {
  id: string;
  type: ToastType;
  message: string;
}
