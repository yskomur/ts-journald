import { Socket } from 'net';
import { EventEmitter } from 'events';
import { JOURNAL_SOCKET_PATH, FIELD_MAX_SIZE } from './constants';

export class JournalSocket extends EventEmitter {
  private socket: Socket;
  private connected: boolean = false;
  private queue: Buffer[] = [];
  private readonly socketPath: string;

  constructor(socketPath: string = JOURNAL_SOCKET_PATH) {
    super();
    this.socketPath = socketPath;
    this.socket = new Socket();

    this.setupSocket();
    this.connect();
  }

  private setupSocket(): void {
    this.socket.on('connect', () => {
      this.connected = true;
      this.emit('connected');
      this.flushQueue();
    });

    this.socket.on('error', (error) => {
      this.connected = false;
      this.emit('error', error);
    });

    this.socket.on('close', () => {
      this.connected = false;
      this.emit('disconnected');

      // 5 saniye sonra reconnect
      setTimeout(() => this.reconnect(), 5000);
    });
  }

  private connect(): void {
    try {
      this.socket.connect(this.socketPath);
    } catch (error) {
      this.emit('error', error);
    }
  }

  private reconnect(): void {
    if (!this.connected) {
      this.socket.destroy();
      this.socket = new Socket();
      this.setupSocket();
      this.connect();
    }
  }

  private flushQueue(): void {
    while (this.queue.length > 0 && this.connected) {
      const data = this.queue.shift();
      if (data) {
        this.socket.write(data);
      }
    }
  }

  private validateField(name: string, value: string): boolean {
    if (name.length === 0) return false;
    if (value.length > FIELD_MAX_SIZE) return false;

    // Field name validation (journald kuralları)
    const invalidChars = /[^a-zA-Z0-9_]/;
    return !invalidChars.test(name);


  }

  public send(fields: Map<string, string>): boolean {
    // Journald formatı: FIELD=value\nFIELD2=value2\n\n (çift newline ile bitir)
    const chunks: string[] = [];

    for (const [name, value] of fields) {
      if (!this.validateField(name, value)) {
        continue;
      }

      // Escape newlines in values
      const escapedValue = value.replace(/\n/g, ' ');
      chunks.push(`${name}=${escapedValue}`);
    }

    // Boş entry göndermeyelim
    if (chunks.length === 0) {
      return false;
    }

    chunks.push(''); // Son newline için
    const data = chunks.join('\n');

    const buffer = Buffer.from(data, 'utf8');

    if (this.connected) {
      return this.socket.write(buffer);
    } else {
      this.queue.push(buffer);
      return false;
    }
  }

  public sendFields(fields: Record<string, string>): boolean {
    const map = new Map(Object.entries(fields));
    return this.send(map);
  }

  public close(): void {
    this.socket.destroy();
    this.removeAllListeners();
  }

  public isConnected(): boolean {
    return this.connected;
  }
}
