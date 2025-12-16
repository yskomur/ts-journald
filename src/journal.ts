import { JournalSocket } from './socket-client';
import { StackTrace } from './stack-trace';
import {
  JournalEntry,
  Priority,
  JournalOptions,
  CallerInfo
} from './types';
import { MESSAGE_MAX_SIZE } from './constants';

export class SystemdJournal {
  private readonly socket: JournalSocket;
  private readonly identifier: string;
  private readonly syslogIdentifier: string;
  private readonly captureStackTrace: boolean;
  private readonly fallbackToConsole: boolean;
  private readonly pid: number;
  private readonly uid: number;
  private readonly hostname: string;
  private readonly fieldsCache: Map<string, string>;

  constructor(options: JournalOptions = {}) {
    this.identifier = options.identifier || process.title || 'nodejs';
    this.syslogIdentifier = options.syslogIdentifier || this.identifier;
    this.captureStackTrace = options.captureStackTrace ?? true;
    this.fallbackToConsole = options.fallbackToConsole ?? true;

    this.socket = new JournalSocket(options.socketPath);
    this.pid = process.pid;
    this.uid = process.getuid ? process.getuid() : 0;
    this.hostname = require('os').hostname();

    this.fieldsCache = new Map();
    this.setupStaticFields();

    this.setupErrorHandling();
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

  private setupErrorHandling(): void {
    this.socket.on('error', (error) => {
      if (this.fallbackToConsole) {
        console.error('Journal socket error:', error.message);
      }
    });
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
    fields.set('PRIORITY', (entry.priority || Priority.INFO).toString());

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
      const success = this.socket.send(fields);

      if (!success && this.fallbackToConsole) {
        this.fallbackToConsoleLog(entry);
      }

      return success;
    } catch (error) {
      if (this.fallbackToConsole) {
        this.fallbackToConsoleLog(entry, error);
      }
      return false;
    }
  }

  private fallbackToConsoleLog(entry: JournalEntry, error?: any): void {
    const priority = entry.priority || Priority.INFO;
    const prefix = `[${Priority[priority]}]`;
    const message = `${prefix} ${entry.message}`;

    switch (priority) {
      case Priority.EMERG | Priority.ALERT | Priority.CRIT | Priority.ERR:
        console.error(message);
        if (error) console.error(error);
        break;
      case Priority.WARNING:
        console.warn(message);
        break;
      case Priority.NOTICE | Priority.INFO:
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
    return this.socket.isConnected();
  }

  public close(): void {
    this.socket.close();
  }

  public addStaticField(name: string, value: string): void {
    this.fieldsCache.set(name.toUpperCase(), value);
  }

  public removeStaticField(name: string): boolean {
    return this.fieldsCache.delete(name.toUpperCase());
  }
}
