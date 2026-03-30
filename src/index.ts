import { SystemdJournal } from './journal';
import { Priority } from './types';
import type {
  JournalOptions,
  JournalEntry,
  JournalBackend,
  ManagedBackendOptions,
} from './types';

// Default singleton instance
let defaultInstance: SystemdJournal | null = null;
let cleanupHooksRegistered = false;

function registerCleanupHooks(): void {
  if (cleanupHooksRegistered) {
    return;
  }

  const cleanup = () => {
    if (defaultInstance) {
      defaultInstance.close();
    }
  };

  process.once('SIGTERM', cleanup);
  process.once('SIGINT', cleanup);
  process.once('beforeExit', cleanup);
  process.once('exit', cleanup);

  cleanupHooksRegistered = true;
}

export { SystemdJournal as Journal };
export { Priority };
export type {
  JournalOptions,
  JournalEntry,
  JournalBackend,
  ManagedBackendOptions,
};

export function createJournal(options?: JournalOptions): SystemdJournal {
  defaultInstance = new SystemdJournal(options);
  registerCleanupHooks();
  return defaultInstance;
}

export function getJournal(): SystemdJournal {
  if (!defaultInstance) {
    defaultInstance = createJournal();
  }
  return defaultInstance;
}

// Convenience exports that use default instance
export const emergency = (msg: string, fields?: Record<string, any>) =>
  getJournal().emergency(msg, fields);

export const alert = (msg: string, fields?: Record<string, any>) =>
  getJournal().alert(msg, fields);

export const critical = (msg: string, fields?: Record<string, any>) =>
  getJournal().critical(msg, fields);

export const error = (msg: string, fields?: Record<string, any>) =>
  getJournal().error(msg, fields);

export const warning = (msg: string, fields?: Record<string, any>) =>
  getJournal().warning(msg, fields);

export const notice = (msg: string, fields?: Record<string, any>) =>
  getJournal().notice(msg, fields);

export const info = (msg: string, fields?: Record<string, any>) =>
  getJournal().info(msg, fields);

export const debug = (msg: string, fields?: Record<string, any>) =>
  getJournal().debug(msg, fields);

export const log = (priority: Priority, msg: string, fields?: Record<string, any>) =>
  getJournal().log(priority, msg, fields);

export const isConnected = () => getJournal().isConnected();

export const close = () => {
  if (defaultInstance) {
    defaultInstance.close();
    defaultInstance = null;
  }
};
