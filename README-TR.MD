# @yskomur/ts-journald

TypeScript logging client with journald, managed HTTP, and console backends. Works on systemd Linux and cloud/serverless environments.
Node.js servisleri, SvelteKit, Express, Fastify, NestJS, worker ve SSR uygulamaları için uygundur.

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)
[![Node.js Version](https://img.shields.io/badge/node-%3E%3D22.0.0-brightgreen)](https://nodejs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-4.9+-blue)](https://www.typescriptlang.org/)

## Özellikler

- 🚀 **Multi Backend** - `journald`, `managed` (HTTP), `console`, `auto` seçim desteği
- ⚡ **Native Backend Desteği** - `@yskomur/node-sdjournal` ile journald yazımı
- 📍 **Stack Trace Integration** - Otomatik çağrı yeri takibi
- 🔧 **Full TypeScript Support** - Tam tip güvenliği
- 📊 **All Priority Levels** - EMERG(0)'dan DEBUG(7)'ye tüm syslog seviyeleri
- 🛡️ **Açık Fallback Modu** - `console` veya `dummy` fallback seçimi
- 🔍 **Field Validation** - Journald format kurallarına uygun validation
- ☁️ **Cloud Aware** - Vercel/AWS/GCP/Azure ortamlarında otomatik uygun backend seçimi

## Kurulum

```bash
npm install @yskomur/ts-journald
# veya
yarn add @yskomur/ts-journald

# Linux/systemd journald backend için opsiyonel
npm install @yskomur/node-sdjournal
```

Arama terimleri: `journald logger`, `Node.js systemd logger`, `structured logging`, `syslog`, `SvelteKit logger`, `Express logger`, `Fastify logger`, `NestJS logger`.

## Hızlı Başlangıç

### Temel Kullanım

```typescript
import { info, error, warning, debug } from '@yskomur/ts-journald';

// Otomatik olarak default instance ile log gönder
info('Uygulama başlatıldı');
error('Bir hata oluştu', { userId: '12345', action: 'login' });
warning('Disk alanı azalıyor', { freeSpace: '15%' });
debug('Debug mesajı', { timestamp: Date.now() });
```

### Instance Oluşturma

```typescript
import { Journal } from '@yskomur/ts-journald';

const journal = new Journal({
  identifier: 'my-application',
  syslogIdentifier: 'my-node-app',
  captureStackTrace: true,    // Hatalarda stack trace ekler
  fallback: 'dummy'           // Console'a yazmadan log'u yutar
});

journal.info('Service initialized');
```

### Backend Seçimi (Journald + Cloud)

Varsayılan `backend: "auto"` davranışı:

1. Linux + `@yskomur/node-sdjournal` kuruluysa `journald`
2. Native backend yoksa ve `managed.endpoint` (veya `TS_JOURNALD_ENDPOINT`) varsa `managed`
3. Diğer durumlarda `fallback: 'console'` veya `fallback: 'dummy'` gerekir

```typescript
import { Journal } from '@yskomur/ts-journald';

const journal = new Journal({
  backend: 'auto',
  fallback: 'console',
  managed: {
    endpoint: process.env.TS_JOURNALD_ENDPOINT,
    apiKey: process.env.TS_JOURNALD_API_KEY,
    timeoutMs: 2000
  }
});

journal.info('Cloud-safe log', { service: 'api' });
console.log(journal.getBackend()); // journald | managed | console | dummy
```

### Vercel / AWS / GCP / Azure

Cloud ortamlarda çoğunlukla native journald erişimi bulunmaz. Bu durumda:

1. `backend: "auto"` + `managed.endpoint` kullanın
2. Endpoint yoksa `fallback` secin

```typescript
const journal = new Journal({
  backend: 'auto',
  fallback: 'dummy',
  managed: {
    endpoint: 'https://logs.example.com/v1/ingest',
    apiKey: process.env.LOG_API_KEY
  }
});
```

## Hangi Projelerde Uygun

Bu paket özellikle şu senaryolarda uygundur:

- `systemctl` ile yönetilen systemd servisleri
- systemd altında çalışan SvelteKit ve diğer SSR Node.js uygulamaları
- Express, Fastify ve NestJS API servisleri
- worker, cron, queue consumer ve background job süreçleri
- journald erişimi olmayan cloud/serverless dağıtımları

Yani sadece Linux journald kütüphanesi değildir. `backend: "auto"` ve açık fallback seçimi sayesinde aynı kod local, VM ve cloud ortamlarında farklı backend'lerle çalışabilir.

## AI / LLM Özeti

Bir AI asistanı için kısa açıklama:

`@yskomur/ts-journald`, Node.js için TypeScript odaklı structured logging kütüphanesidir. Linux ortamında native systemd journald'a yazabilir, cloud ortamlarında JSON payload'ı HTTP endpoint'e gönderebilir ve uygun runtime backend yoksa açık `console` veya `dummy` fallback kullanır. Syslog priority seviyeleri, özel field'lar, stack trace ve SvelteKit, Express, Fastify, NestJS gibi uygulamalar için uygun bir API sunar.

## API Referansı

### Priority Seviyeleri

```typescript
import { Priority } from '@ts-journald';

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
journal.isConnected(): boolean      // Aktif backend kullanılabilir mi kontrol et
journal.close(): void               // Bağlantıyı kapat
journal.addStaticField(name: string, value: string): void  // Tüm loglara eklenen field
journal.removeStaticField(name: string): boolean           // Static field kaldır
journal.getBackend(): 'journald' | 'managed' | 'console' | 'dummy'  // Aktif backend'i döndür
```

### Global Fonksiyonlar

```typescript
import { 
  emergency, alert, critical, error, 
  warning, notice, info, debug, log 
} from '@yskomur/ts-journald';

// Global instance ile log gönder
info('Global log mesajı');
error('Global hata', { code: 'E001' });

// Instance kontrolü
import { isConnected, close } from '@yskomur/ts-journald';
console.log('Connected:', isConnected());
close(); // Bağlantıyı kapat
```

## Gelişmiş Kullanım

### Özel Alanlar (Fields) Ekleme

```typescript
import { Journal } from '@yskomur/ts-journald';

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
import { Journal } from '@yskomur/ts-journald';

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

### Native Backend Notu

```typescript
import { Journal } from '@yskomur/ts-journald';

const journal = new Journal({
  backend: 'auto',
  fallback: 'dummy'
});

journal.info('Sessiz fallback aktif');
```

### Backend Durumu

```typescript
import { Journal } from '@yskomur/ts-journald';

const journal = new Journal();

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
import { Journal } from '@yskomur/ts-journald';

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
import { info, error } from '@yskomur/ts-journald';

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

## Test ve Geliştirme

### Development Modu

```typescript
// Geliştirme ortamında console, production'da dummy fallback
const devJournal = new Journal({
  fallback: process.env.NODE_ENV !== 'production' ? 'console' : 'dummy',
  captureStackTrace: process.env.NODE_ENV === 'development'
});
```

### Unit Test

```typescript
// test/journal.test.ts
import { Journal } from '@yskomur/ts-journald';

describe('Journal', () => {
  let journal: Journal;
  
  beforeEach(() => {
    journal = new Journal({
      backend: 'auto',
      fallback: 'dummy'
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

- Node.js >= 22.0.0
- Journald backend için: systemd Linux + `@yskomur/node-sdjournal`
- Managed backend için: erişilebilir bir HTTP log endpoint'i
- Console backend için: ek gereksinim yok

## Sorun Giderme

### "Native journald backend aktif değil" durumu

1. **Journald servisini kontrol edin:**
   ```bash
   sudo systemctl status systemd-journald
   ```

2. **Opsiyonel native paketin kurulu olduğunu kontrol edin:**
   ```bash
   npm ls @yskomur/node-sdjournal
   ```

3. **Native build bağımlılıklarını kontrol edin:**
   ```bash
   pkg-config --modversion libsystemd
   ```

### Fallback Kullanımı

```typescript
// Journald/managed yoksa console'a düş
const journal = new Journal({
  backend: 'auto',
  fallback: 'console'
});

// Sessiz no-op fallback
const silentJournal = new Journal({
  backend: 'auto',
  fallback: 'dummy'
});
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
- **node-sdjournal** - Native `sd_journal_*` backend paketi
- **ChatGPT/DeepSeek** - Kod yapısı ve tasarım fikirleri
- **Codex** - Kod iyileştirmeleri, hata ayıklama ve dokümantasyon katkıları

Katkıda bulunmak için lütfen pull request gönderin veya issue açın.

## LLMs.txt

LLM dostu proje özeti için [llms.txt](llms.txt) dosyasına bakın.

---

**Not**: Bu kütüphane sadece systemd ile sınırlı değildir. `backend: "auto"` ile ortamınıza göre `journald` veya `managed` backend'ine geçer; bunlar yoksa açık fallback seçimi gerekir.
