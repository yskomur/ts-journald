import { createRequire } from 'node:module';
import type { JournalEntry } from './types';

const requireCompat =
  typeof require === 'function'
    ? require
    : createRequire(import.meta.url);

interface NativeWriterModule {
  send(fields: Record<string, string>): void;
}

let cachedModule: NativeWriterModule | null | undefined;

function loadNativeWriter(): NativeWriterModule | null {
  if (cachedModule !== undefined) {
    return cachedModule;
  }

  for (const id of ['@yskomur/node-sdjournal', 'node-sdjournal']) {
    try {
      const loaded = requireCompat(id) as NativeWriterModule;
      if (typeof loaded.send === 'function') {
        cachedModule = loaded;
        return cachedModule;
      }
    } catch {
      // Ignore resolution failures and continue to the next candidate.
    }
  }

  cachedModule = null;
  return cachedModule;
}

export class NativeJournalWriter {
  private readonly native: NativeWriterModule | null;

  constructor() {
    this.native = loadNativeWriter();
  }

  public isAvailable(): boolean {
    return this.native !== null;
  }

  public send(entry: JournalEntry, fields: Map<string, string>): boolean {
    if (!this.native) {
      return false;
    }

    try {
      this.native.send(Object.fromEntries(fields));
      return true;
    } catch (error) {
      if (entry.priority !== undefined) {
        fields.set('TS_JOURNALD_NATIVE_PRIORITY', String(entry.priority));
      }
      throw error;
    }
  }

  public close(): void {
    // Writer API is stateless on the native module side.
  }
}
