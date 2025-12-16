# ts-journald

Pure TypeScript systemd-journald client using native Unix sockets. Zero dependencies, high performance logging for Node.js applications on systemd systems.

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)
[![Node.js Version](https://img.shields.io/badge/node-%3E%3D14.0.0-brightgreen)](https://nodejs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-4.9+-blue)](https://www.typescriptlang.org/)

## Özellikler

- 🚀 **Zero Dependencies** - Sadece Node.js core modülleri
- ⚡ **High Performance** - Native Unix socket ile direkt journald bağlantısı
- 📍 **Stack Trace Integration** - Otomatik çağrı yeri takibi
- 🔧 **Full TypeScript Support** - Tam tip güvenliği
- 🔄 **Auto Reconnect** - Bağlantı koparsa otomatik yeniden bağlanma
- 📊 **All Priority Levels** - EMERG(0)'dan DEBUG(7)'ye tüm syslog seviyeleri
- 💾 **Queue System** - Bağlantı yokken logları buffer'da tutar
- 🛡️ **Fallback Console** - Journald yoksa console'a yazar
- 🔍 **Field Validation** - Journald format kurallarına uygun validation

## Kurulum

```bash
npm install ts-journald
# veya
yarn add ts-journald
```

## Hızlı Başlangıç

### Temel Kullanım

```typescript
import { info, error, warning, debug } from 'ts-journald';

// Otomatik olarak default instance ile log gönder
info('Uygulama başlatıldı');
error('Bir hata oluştu', { userId: '12345', action: 'login' });
warning('Disk alanı azalıyor', { freeSpace: '15%' });
debug('Debug mesajı', { timestamp: Date.now() });
```

### Instance Oluşturma

```typescript
import { Journal } from 'ts-journald';

const journal = new Journal({
  identifier: 'my-application',
  syslogIdentifier: 'my-node-app',
  captureStackTrace: true,    // Hatalarda stack trace ekler
  fallbackToConsole: true,    // Journald yoksa console'a yazar
  socketPath: '/run/systemd/journal/socket' // Varsayılan socket yolu
});

journal.info('Service initialized');
```

## API Referansı

### Priority Seviyeleri

```typescript
import { Priority } from 'ts-journald';

// Tüm priority seviyeleri:
Priority.EMERG      // 0 - Sistem kullanılamaz
Priority.ALERT      // 1 - Acil eylem gerekiyor
Priority.CRIT       // 2 - Kritik durum
Priority.ERR        // 3 - Hata durumu
Priority.WARNING    // 4 - Uyarı
Priority.NOTICE     // 5 - Önemli normal durum
Priority.INFO       // 6 - Bilgilendirme
Priority.DEBUG      // 7 - Debug
```

### Journal Sınıfı Metodları

```typescript
const journal = new Journal(options);

// Convenience metodları
journal.emergency(message: string, fields?: Record<string, any>): boolean
journal.alert(message: string, fields?: Record<string, any>): boolean
journal.critical(message: string, fields?: Record<string, any>): boolean
journal.error(message: string, fields?: Record<string, any>): boolean
journal.warning(message: string, fields?: Record<string, any>): boolean
journal.notice(message: string, fields?: Record<string, any>): boolean
journal.info(message: string, fields?: Record<string, any>): boolean
journal.debug(message: string, fields?: Record<string, any>): boolean

// Generic log metodu
journal.log(priority: Priority, message: string, fields?: Record<string, any>): boolean

// Yardımcı metodlar
journal.isConnected(): boolean      // Socket bağlantısını kontrol et
journal.close(): void               // Bağlantıyı kapat
journal.addStaticField(name: string, value: string): void  // Tüm loglara eklenen field
journal.removeStaticField(name: string): boolean           // Static field kaldır
```

### Global Fonksiyonlar

```typescript
import { 
  emergency, alert, critical, error, 
  warning, notice, info, debug, log 
} from 'ts-journald';

// Global instance ile log gönder
info('Global log mesajı');
error('Global hata', { code: 'E001' });

// Instance kontrolü
import { isConnected, close } from 'ts-journald';
console.log('Connected:', isConnected());
close(); // Bağlantıyı kapat
```

## Gelişmiş Kullanım

### Özel Alanlar (Fields) Ekleme

```typescript
import { Journal } from 'ts-journald';

const journal = new Journal({
  identifier: 'api-server'
});

// Tüm loglara eklenen static field'lar
journal.addStaticField('DEPLOYMENT_ID', process.env.DEPLOYMENT_ID || 'unknown');
journal.addStaticField('REGION', process.env.AWS_REGION || 'local');

// Log mesajı ile özel field'lar
journal.info('Kullanıcı giriş yaptı', {
  userId: 'user_123',
  ipAddress: '192.168.1.100',
  userAgent: 'Mozilla/5.0',
  sessionId: 'session_abc'
});

// Field kaldırma
journal.removeStaticField('REGION');
```

### Stack Trace ile Hata Yönetimi

```typescript
import { Journal } from 'ts-journald';

const journal = new Journal({
  captureStackTrace: true  // Otomatik stack trace (default: true)
});

try {
  // Bir şeyler yap...
  throw new Error('Test hatası');
} catch (err) {
  journal.error('İşlem başarısız oldu', {
    error: err.message,
    errorCode: 'PROCESS_FAILURE',
    // Stack trace otomatik olarak STACK_TRACE field'ına eklenir
  });
}

// Sadece CRIT ve altı için stack trace
const journal2 = new Journal({
  captureStackTrace: true,
  // Stack trace sadece ERROR ve daha kritik seviyelerde eklenir
});
```

### Custom Socket Yolu

```typescript
import { Journal } from 'ts-journald';

// Farklı socket yolu kullanma
const journal = new Journal({
  socketPath: '/var/run/systemd/journal/socket', // Özel socket yolu
  fallbackToConsole: false // Console'a fallback yapma
});

// Bağlantı durumunu kontrol et
if (!journal.isConnected()) {
  console.warn('Journald socket bağlantısı yok');
}
```

### Queue ve Bağlantı Yönetimi

```typescript
import { Journal } from 'ts-journald';

const journal = new Journal();

// Socket bağlantısı koparsa loglar otomatik olarak queue'lanır
// Bağlantı geri geldiğinde queue'daki loglar gönderilir

// Manuel bağlantı kontrolü
setInterval(() => {
  console.log('Journal connected:', journal.isConnected());
}, 5000);

// Uygulama kapanırken
process.on('SIGTERM', () => {
  journal.close();
  process.exit(0);
});
```

## Örnek Uygulama

```typescript
import { Journal } from 'ts-journald';

class DatabaseService {
  private journal: Journal;
  
  constructor() {
    this.journal = new Journal({
      identifier: 'database-service',
      captureStackTrace: true
    });
    
    this.journal.addStaticField('SERVICE', 'database');
    this.journal.addStaticField('NODE_ENV', process.env.NODE_ENV || 'development');
  }
  
  async connect() {
    this.journal.info('Database bağlantısı başlatılıyor', {
      host: process.env.DB_HOST,
      database: process.env.DB_NAME
    });
    
    try {
      // Bağlantı işlemleri...
      this.journal.info('Database bağlantısı başarılı');
    } catch (error) {
      this.journal.critical('Database bağlantı hatası', {
        error: error.message,
        code: 'DB_CONNECTION_FAILED'
      });
      throw error;
    }
  }
  
  async query(sql: string, params: any[]) {
    this.journal.debug('SQL query çalıştırılıyor', {
      sql: sql.substring(0, 100), // Kısaltılmış SQL
      paramCount: params.length
    });
    
    try {
      // Query çalıştır...
      const result = await db.query(sql, params);
      this.journal.debug('Query başarılı', {
        rowCount: result.rowCount
      });
      return result;
    } catch (error) {
      this.journal.error('Query hatası', {
        sql: sql.substring(0, 200),
        error: error.message,
        errorCode: error.code
      });
      throw error;
    }
  }
}

// Express middleware örneği
import express from 'express';
import { info, error } from 'ts-journald';

const app = express();

app.use((req, res, next) => {
  const start = Date.now();
  
  res.on('finish', () => {
    const duration = Date.now() - start;
    info('HTTP Request', {
      method: req.method,
      path: req.path,
      status: res.statusCode,
      duration: `${duration}ms`,
      ip: req.ip,
      userAgent: req.get('user-agent')
    });
  });
  
  next();
});

app.use((err, req, res, next) => {
  error('Unhandled error', {
    method: req.method,
    path: req.path,
    error: err.message,
    stack: err.stack,
    ip: req.ip
  });
  
  res.status(500).json({ error: 'Internal server error' });
});
```

## Field Formatı ve Limitler

### Journald Field Kuralları

```typescript
// Geçerli field isimleri: harf, rakam, altçizgi
journal.info('Test', {
  USER_ID: '123',       // ✓ GEÇERLİ
  'REQUEST-ID': 'abc',  // ✗ GEÇERSİZ (- karakteri)
  'user.email': 'test@example.com' // ✗ GEÇERSİZ (. karakteri)
});

// Field değerleri string'e çevrilir
journal.info('Test', {
  count: 42,           // "42" olarak kaydedilir
  active: true,        // "true" olarak kaydedilir
  data: { foo: 'bar' } // "[object Object]" olarak kaydedilir
});
```

### Limitler

- **MESSAGE max size**: 48KB (otomatik truncate edilir)
- **FIELD max size**: 64KB (daha büyük değerler gönderilmez)
- **Queue size**: Sınırsız (uygulama memory'sine bağlı)

## Test ve Geliştirme

### Development Modu

```typescript
// Geliştirme ortamında console fallback aktif
const devJournal = new Journal({
  fallbackToConsole: process.env.NODE_ENV !== 'production',
  captureStackTrace: process.env.NODE_ENV === 'development'
});
```

### Unit Test

```typescript
// test/journal.test.ts
import { Journal } from 'ts-journald';

describe('Journal', () => {
  let journal: Journal;
  
  beforeEach(() => {
    journal = new Journal({
      fallbackToConsole: false,
      socketPath: '/tmp/test-journal.sock' // Test socket
    });
  });
  
  afterEach(() => {
    journal.close();
  });
  
  it('should create journal instance', () => {
    expect(journal).toBeInstanceOf(Journal);
  });
  
  it('should send info log', () => {
    const result = journal.info('Test message');
    expect(typeof result).toBe('boolean');
  });
});
```

## Sistem Gereksinimleri

- Node.js >= 14.0.0
- Systemd ile çalışan Linux dağıtımı
- Journald socket erişimi (`/run/systemd/journal/socket`)
- Uygulamanın journald socket'ine yazma izni

## Sorun Giderme

### "Socket connection failed" hatası

1. **Journald servisini kontrol edin:**
   ```bash
   sudo systemctl status systemd-journald
   ```

2. **Socket dosyasını kontrol edin:**
   ```bash
   ls -la /run/systemd/journal/socket
   ```

3. **Socket erişim izinleri:**
   ```bash
   # Socket grubunu kontrol et
   ls -la /run/systemd/journal/ | grep socket
   
   # Kullanıcıyı systemd-journal grubuna ekle
   sudo usermod -a -G systemd-journal $USER
   ```

### Fallback Console Kullanımı

```typescript
// Journald yoksa otomatik console'a yazar
const journal = new Journal({
  fallbackToConsole: true  // Default: true
});

// Sadece bağlantı durumunu logla
journal.info('Test', { _consoleOnly: 'connection test' });
console.log('Is connected:', journal.isConnected());
```

## Performans İpuçları

1. **Static field'ları önceden ekleyin:**
   ```typescript
   // Kötü: Her logda aynı field'ları eklemek
   journal.info('Message', { app: 'myapp', env: 'prod' });
   journal.error('Error', { app: 'myapp', env: 'prod' });
   
   // İyi: Static field kullanımı
   journal.addStaticField('APP', 'myapp');
   journal.addStaticField('ENV', 'prod');
   journal.info('Message');
   journal.error('Error');
   ```

2. **Debug loglarını production'da kapatın:**
   ```typescript
   const journal = new Journal();
   
   // Sadece development'ta debug logları
   if (process.env.NODE_ENV === 'development') {
     journal.debug('Detailed debug info', { data: largeObject });
   }
   ```

3. **Büyük verileri loglamaktan kaçının:**
   ```typescript
   // Kötü: Büyük data loglamak
   journal.info('Data received', { fullData: hugeJSON });
   
   // İyi: Özet bilgi loglamak
   journal.info('Data received', {
     dataSize: hugeJSON.length,
     dataType: typeof hugeJSON,
     hash: createHash(hugeJSON)
   });
   ```

## Lisans

MIT License - Bkz. [LICENSE](LICENSE) dosyası.

## Katkıda Bulunanlar

Bu proje şu kaynaklardan ilham almıştır:

- **jourlog** by [yskomur](https://github.com/yskomur) - Go için journald logger
- **systemd-journal** - Native systemd socket protokolü
- **ChatGPT/DeepSeek** - Kod yapısı ve tasarım fikirleri

Katkıda bulunmak için lütfen pull request gönderin veya issue açın.

---

**Not**: Bu kütüphane sadece systemd journald socket'i olan Linux sistemlerinde çalışır. Diğer sistemlerde fallback console kullanır veya hata verir.
