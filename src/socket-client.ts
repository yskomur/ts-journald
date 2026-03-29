import { EventEmitter } from 'events';
import { JOURNAL_SOCKET_PATH, FIELD_MAX_SIZE } from './constants';

export class JournalSocket extends EventEmitter {
  private socket: any;
  private connected: boolean = false;
  private queue: Buffer[] = [];
  private readonly socketPath: string;

  constructor(socketPath: string = JOURNAL_SOCKET_PATH) {
    super();
    this.socketPath = socketPath;
    this.connect();
  }

  private connect(): void {
    try {
      // Unix datagram socket oluştur
      this.socket = require('unix-dgram').createSocket('unix_dgram')

      this.socket.on('connect', () => {
        console.log('Journal socket connected');
        this.connected = true;
        this.emit('connected');
        this.flushQueue();
      });

      this.socket.on('error', (error: Error) => {
        console.error('Journal socket error:', error.message);
        this.connected = false;
        this.emit('error', error);

        // 5 saniye sonra tekrar dene
        setTimeout(() => this.reconnect(), 5000);
      });

      this.socket.on('close', () => {
        console.log('Journal socket closed');
        this.connected = false;
        this.emit('disconnected');
      });

      // Socket'e bağlan
      this.socket.connect(this.socketPath);

    } catch (error) {
      console.error('Failed to create journal socket:', error);
      this.emit('error', error as Error);
    }
  }

  private reconnect(): void {
    if (this.socket) {
      try {
        this.socket.close();
      } catch (e) {
        // Ignore close errors
      }
    }

    this.socket = null;
    this.connected = false;

    setTimeout(() => {
      if (!this.connected) {
        this.connect();
      }
    }, 5000);
  }

  private flushQueue(): void {
    while (this.queue.length > 0 && this.connected && this.socket) {
      const data = this.queue.shift();
      if (data) {
        this.sendBuffer(data);
      }
    }
  }

  private sendBuffer(buffer: Buffer): void {
    if (!this.socket || !this.connected) {
      return;
    }

    this.socket.send(buffer, (error?: Error) => {
      if (error) {
        console.error('Journal send error:', error);
        this.emit('error', error);
      }
    });
  }

  private validateField(name: string, value: string): boolean {
    if (name.length === 0) return false;
    if (value.length > FIELD_MAX_SIZE) {
      console.warn(`Field ${name} exceeds max size (${FIELD_MAX_SIZE} bytes)`);
      return false;
    }

    // Journald field name kuralları
    const invalidChars = /[^a-zA-Z0-9_]/;
    if (invalidChars.test(name)) {
      console.warn(`Invalid field name: ${name}. Only alphanumeric and underscore allowed.`);
      return false;
    }

    return true;
  }

  public send(fields: Map<string, string>): boolean {
    // Journald formatı: FIELD=value\nFIELD2=value2\n\n
    const chunks: string[] = [];

    for (const [name, value] of fields) {
      if (!this.validateField(name, value)) {
        continue;
      }

      // Newline'ları space ile değiştir
      const escapedValue = String(value).replace(/\n/g, ' ').replace(/\r/g, ' ');
      chunks.push(`${name}=${escapedValue}`);
    }

    if (chunks.length === 0) {
      console.warn('No valid fields to send to journal');
      return false;
    }

    chunks.push(''); // Son newline (boş satır)
    const data = chunks.join('\n');
    const buffer = Buffer.from(data, 'utf8');

    // Buffer size kontrolü
    if (buffer.length > 64 * 1024) {
      console.warn(`Journal entry too large: ${buffer.length} bytes`);
      return false;
    }

    if (this.connected && this.socket) {
      this.sendBuffer(buffer);
      return true;
    } else {
      console.warn('Journal socket not connected, queueing message');
      this.queue.push(buffer);
      return false;
    }
  }

  public close(): void {
    if (this.socket) {
      try {
        this.socket.close();
      } catch (e) {
        // Ignore
      }
      this.socket = null;
    }
    this.connected = false;
    this.queue = [];
    this.removeAllListeners();
  }

  public isConnected(): boolean {
    return this.connected;
  }
}
