import { hostname } from 'node:os';
import { NativeJournalWriter } from './native-writer';
import { StackTrace } from './stack-trace';
import {
  Priority,
} from './types';
import type {
  CallerInfo,
  JournalEntry,
  JournalOptions,
  JournalRuntimeBackend,
  ManagedBackendOptions,
} from './types';
import { MESSAGE_MAX_SIZE } from './constants';

export class SystemdJournal {
  private readonly writer: NativeJournalWriter | null;
  private readonly backend: JournalRuntimeBackend;
  private readonly identifier: string;
  private readonly syslogIdentifier: string;
  private readonly captureStackTrace: boolean;
  private readonly fallback: JournalOptions['fallback'];
  private readonly managed: ManagedBackendOptions;
  private readonly pid: number;
  private readonly uid: number;
  private readonly hostname: string;
  private readonly cloudProvider: string;
  private readonly fieldsCache: Map<string, string>;

  constructor(options: JournalOptions = {}) {
    this.identifier = options.identifier || process.title || 'nodejs';
    this.syslogIdentifier = options.syslogIdentifier || this.identifier;
    this.captureStackTrace = options.captureStackTrace ?? true;
    this.fallback = options.fallback;
    this.managed = options.managed ?? {};
    this.writer = process.platform === 'linux' ? new NativeJournalWriter() : null;
    this.backend = this.resolveBackend(options);
    this.cloudProvider = this.detectCloudProvider();
    this.pid = process.pid;
    this.uid = process.getuid ? process.getuid() : 0;
    this.hostname = hostname();

    this.fieldsCache = new Map();
    this.setupStaticFields();

  }

  private resolveBackend(options: JournalOptions): JournalRuntimeBackend {
    const requested = options.backend ?? 'auto';
    if (requested !== 'auto') {
      return requested;
    }

    if (process.platform === 'linux' && this.writer?.isAvailable()) {
      return 'journald';
    }

    const managedEndpoint = this.getManagedEndpoint();
    if (managedEndpoint) {
      return 'managed';
    }

    return this.getRequiredFallback('No journald or managed backend is available for backend: "auto".');
  }

  private getRequiredFallback(message: string): JournalRuntimeBackend {
    if (this.fallback) {
      return this.fallback;
    }
    throw new Error(`${message} Configure fallback: "console" or fallback: "dummy".`);
  }

  private detectCloudProvider(): string {
    if (process.env.VERCEL) return 'vercel';
    if (process.env.AWS_LAMBDA_FUNCTION_NAME || process.env.AWS_REGION) return 'aws';
    if (process.env.K_SERVICE || process.env.GCP_PROJECT || process.env.FUNCTION_TARGET) return 'gcp';
    if (process.env.WEBSITE_INSTANCE_ID || process.env.AZURE_FUNCTIONS_ENVIRONMENT || process.env.FUNCTIONS_WORKER_RUNTIME) return 'azure';
    return 'local';
  }

  private getManagedEndpoint(): string {
    return this.managed.endpoint || process.env.TS_JOURNALD_ENDPOINT || '';
  }

  private setupStaticFields(): void {
    // Static fields that don't change
    this.fieldsCache.set('_PID', this.pid.toString());
    this.fieldsCache.set('_UID', this.uid.toString());
    this.fieldsCache.set('_HOSTNAME', this.hostname);
    this.fieldsCache.set('SYSLOG_IDENTIFIER', this.syslogIdentifier);
    this.fieldsCache.set('NODE_VERSION', process.version);
    this.fieldsCache.set('TARGET', this.identifier);

    // Process info
    if (process.argv[1]) {
      this.fieldsCache.set('EXE', process.argv[1]);
    }

    // Command line
    if (process.argv.length > 0) {
      this.fieldsCache.set('CMDLINE', process.argv.join(' '));
    }
  }

  private truncateMessage(message: string): string {
    if (message.length > MESSAGE_MAX_SIZE) {
      return message.substring(0, MESSAGE_MAX_SIZE - 3) + '...';
    }
    return message;
  }

  private addCallerInfo(fields: Map<string, string>, caller: CallerInfo | null): void {
    if (!caller) return;

    fields.set('CODE_FILE', caller.file);
    fields.set('CODE_LINE', caller.line.toString());
    fields.set('CODE_COLUMN', caller.column.toString());

    if (caller.function) {
      fields.set('CODE_FUNC', caller.function);
    }
  }

  private addStackTrace(fields: Map<string, string>, priority: Priority): void {
    if (priority <= Priority.ERR && this.captureStackTrace) {
      const stackTrace = StackTrace.getStackTraceString(5);
      if (stackTrace) {
        fields.set('STACK_TRACE', stackTrace);
      }
    }
  }

  private prepareFields(entry: JournalEntry): Map<string, string> {
    const fields = new Map(this.fieldsCache);

    // Priority
    fields.set('PRIORITY', (entry.priority ?? Priority.INFO).toString());

    // Message
    fields.set('MESSAGE', this.truncateMessage(entry.message));

    // Timestamp (microseconds)
    const timestamp = (Date.now() * 1000).toString();
    fields.set('_SOURCE_REALTIME_TIMESTAMP', timestamp);

    // Capture caller info for errors and critical messages
    if (this.captureStackTrace && entry.priority !== undefined && entry.priority <= Priority.WARNING) {
      const caller = StackTrace.getCallerInfo();
      this.addCallerInfo(fields, caller);
    }

    // Add stack trace for errors
    if (entry.priority !== undefined && entry.priority <= Priority.ERR) {
      this.addStackTrace(fields, entry.priority);
    }

    // Custom fields
    if (entry.fields) {
      for (const [key, value] of Object.entries(entry.fields)) {
        if (value !== undefined && value !== null) {
          fields.set(key.toUpperCase(), String(value));
        }
      }
    }

    return fields;
  }

  public send(entry: JournalEntry): boolean {
    try {
      const fields = this.prepareFields(entry);
      let success = false;

      if (this.backend === 'journald' && this.writer) {
        success = this.writer.send(entry, fields);
      } else if (this.backend === 'managed') {
        success = this.sendToManagedBackend(entry, fields);
      } else if (this.backend === 'dummy') {
        success = true;
      } else {
        this.emitToConsole(entry);
        success = true;
      }

      if (!success && this.backend !== 'console' && this.backend !== 'dummy') {
        this.applyFallback(entry);
      }

      return success;
    } catch (error) {
      if (this.backend === 'console' || this.backend === 'dummy') {
        throw error;
      }

      this.applyFallback(entry, error);
      return false;
    }
  }

  private emitToConsole(entry: JournalEntry, error?: unknown): void {
    const priority = entry.priority ?? Priority.INFO;
    const prefix = `[${Priority[priority]}]`;
    const message = `${prefix} ${entry.message}`;

    switch (priority) {
      case Priority.EMERG:
      case Priority.ALERT:
      case Priority.CRIT:
      case Priority.ERR:
        console.error(message);
        if (error) console.error(error);
        break;
      case Priority.WARNING:
        console.warn(message);
        break;
      case Priority.NOTICE:
      case Priority.INFO:
        console.log(message);
        break;
      case Priority.DEBUG:
        console.debug(message);
        break;
    }

    if (entry.fields && Object.keys(entry.fields).length > 0) {
      console.log('Fields:', entry.fields);
    }
  }

  private applyFallback(entry: JournalEntry, error?: unknown): void {
    const fallback = this.getRequiredFallback(
      `Backend "${this.backend}" failed and no fallback is configured.`,
    );

    if (fallback === 'dummy') {
      return;
    }

    this.emitToConsole(entry, error);
  }

  private sendToManagedBackend(entry: JournalEntry, fields: Map<string, string>): boolean {
    const endpoint = this.getManagedEndpoint();
    if (!endpoint) {
      return false;
    }

    if (typeof fetch !== 'function') {
      return false;
    }

    const timeoutMs = this.managed.timeoutMs ?? 2000;
    const payload = {
      message: entry.message,
      priority: entry.priority ?? Priority.INFO,
      fields: Object.fromEntries(fields),
      meta: {
        backend: this.backend,
        cloudProvider: this.cloudProvider,
        pid: this.pid,
        uid: this.uid,
        hostname: this.hostname,
      },
    };

    const headers: Record<string, string> = {
      'content-type': 'application/json',
      ...(this.managed.headers ?? {}),
    };

    const apiKey = this.managed.apiKey || process.env.TS_JOURNALD_API_KEY;
    if (apiKey) {
      headers.authorization = `Bearer ${apiKey}`;
    }

    void fetch(endpoint, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(timeoutMs),
    }).then((response) => {
      if (!response.ok) {
        throw new Error(`Managed backend HTTP ${response.status}`);
      }
    }).catch((error: unknown) => {
      if (this.backend === 'managed') {
        this.applyFallback(entry, error);
      }
    });

    return true;
  }

  // Convenience methods
  public emergency(message: string, fields?: Record<string, any>): boolean {
    return this.send({ message, priority: Priority.EMERG, fields });
  }

  public alert(message: string, fields?: Record<string, any>): boolean {
    return this.send({ message, priority: Priority.ALERT, fields });
  }

  public critical(message: string, fields?: Record<string, any>): boolean {
    return this.send({ message, priority: Priority.CRIT, fields });
  }

  public error(message: string, fields?: Record<string, any>): boolean {
    return this.send({ message, priority: Priority.ERR, fields });
  }

  public warning(message: string, fields?: Record<string, any>): boolean {
    return this.send({ message, priority: Priority.WARNING, fields });
  }

  public notice(message: string, fields?: Record<string, any>): boolean {
    return this.send({ message, priority: Priority.NOTICE, fields });
  }

  public info(message: string, fields?: Record<string, any>): boolean {
    return this.send({ message, priority: Priority.INFO, fields });
  }

  public debug(message: string, fields?: Record<string, any>): boolean {
    return this.send({ message, priority: Priority.DEBUG, fields });
  }

  public log(priority: Priority, message: string, fields?: Record<string, any>): boolean {
    return this.send({ message, priority, fields });
  }

  public isConnected(): boolean {
    if (this.backend === 'journald') {
      return this.writer?.isAvailable() ?? false;
    }
    if (this.backend === 'managed') {
      return Boolean(this.getManagedEndpoint());
    }
    if (this.backend === 'dummy') {
      return false;
    }
    return true;
  }

  public close(): void {
    if (this.writer) {
      this.writer.close();
    }
  }

  public addStaticField(name: string, value: string): void {
    this.fieldsCache.set(name.toUpperCase(), value);
  }

  public removeStaticField(name: string): boolean {
    return this.fieldsCache.delete(name.toUpperCase());
  }

  public getBackend(): JournalRuntimeBackend {
    return this.backend;
  }
}
