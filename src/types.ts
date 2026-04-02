export enum Priority {
  EMERG = 0,    // system is unusable
  ALERT = 1,    // action must be taken immediately
  CRIT = 2,     // critical conditions
  ERR = 3,      // error conditions
  WARNING = 4,  // warning conditions
  NOTICE = 5,   // normal but significant condition
  INFO = 6,     // informational messages
  DEBUG = 7     // debug-level messages
}

export interface JournalEntry {
  message: string;
  priority?: Priority;
  fields?: Record<string, any>;
}

export interface JournalOptions {
  identifier?: string;
  syslogIdentifier?: string;
  captureStackTrace?: boolean;
  maxRetries?: number;
  backend?: JournalBackend;
  fallback?: JournalFallback;
  managed?: ManagedBackendOptions;
}

export type JournalBackend = 'auto' | 'journald' | 'managed' | 'console';
export type JournalFallback = 'console' | 'dummy';
export type JournalRuntimeBackend = Exclude<JournalBackend, 'auto'> | 'dummy';

export interface ManagedBackendOptions {
  endpoint?: string;
  apiKey?: string;
  headers?: Record<string, string>;
  timeoutMs?: number;
}

export interface CallerInfo {
  file: string;
  line: number;
  column: number;
  function?: string;
}

export interface JournalField {
  name: string;
  value: string | number | boolean;
}
