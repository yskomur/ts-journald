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
  socketPath?: string;
  fallbackToConsole?: boolean;
  maxRetries?: number;
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
