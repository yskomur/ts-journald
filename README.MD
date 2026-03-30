# @yskomur/ts-journald

TypeScript logging client with `journald`, managed HTTP, and console backends.
Works on systemd Linux and cloud/serverless environments (Vercel, AWS, GCP, Azure).
Suitable for Node.js services, SvelteKit, Express, Fastify, NestJS, background workers, and SSR apps.

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)
[![Node.js Version](https://img.shields.io/badge/node-%3E%3D22.0.0-brightgreen)](https://nodejs.org/)

## Features

- `auto` backend selection: `journald` -> `managed` -> `console`
- Native Unix socket support for systemd journald
- Cloud-aware runtime detection (Vercel/AWS/GCP/Azure)
- Stack trace and caller metadata support
- Structured custom fields
- Priority levels from `EMERG(0)` to `DEBUG(7)`
- Fallback console logging
- TypeScript-first API

## Installation

```bash
npm install @yskomur/ts-journald
```

Search terms: `journald logger`, `systemd logger for Node.js`, `structured logging`, `syslog`, `SvelteKit logger`, `Express logger`, `Fastify logger`, `NestJS logger`.

## Quick Start

### Global helpers

```ts
import { info, error, warning, debug } from '@yskomur/ts-journald';

info('Application started');
warning('Disk usage is high', { freeSpace: '15%' });
error('Login failed', { userId: '12345' });
debug('Debug event', { ts: Date.now() });
```

### Instance-based usage

```ts
import { Journal } from '@yskomur/ts-journald';

const journal = new Journal({
  identifier: 'my-service',
  syslogIdentifier: 'my-service',
  backend: 'auto',
  fallbackToConsole: true,
  managed: {
    endpoint: process.env.TS_JOURNALD_ENDPOINT,
    apiKey: process.env.TS_JOURNALD_API_KEY,
    timeoutMs: 2000,
  },
});

journal.info('Service initialized', { region: process.env.AWS_REGION });
console.log('Active backend:', journal.getBackend());
```

## Backend Behavior

Default behavior with `backend: "auto"`:

1. If running on Linux and journald socket exists, uses `journald`.
2. Otherwise, if `managed.endpoint` (or `TS_JOURNALD_ENDPOINT`) exists, uses `managed`.
3. Otherwise, falls back to `console`.

You can force a backend:

```ts
new Journal({ backend: 'journald' });
new Journal({ backend: 'managed', managed: { endpoint: 'https://logs.example.com/v1/ingest' } });
new Journal({ backend: 'console' });
```

## Cloud Usage

In most serverless/cloud environments, journald socket is not available.
Use managed backend with a custom ingestion API:

```ts
const journal = new Journal({
  backend: 'auto',
  managed: {
    endpoint: 'https://logs.example.com/v1/ingest',
    apiKey: process.env.LOG_API_KEY,
  },
});
```

Environment variables:

- `TS_JOURNALD_ENDPOINT`
- `TS_JOURNALD_API_KEY`

Detected cloud providers:

- Vercel
- AWS
- GCP
- Azure

## Where This Fits

This package is a good fit when you need one logger for:

- systemd services managed by `systemctl`
- SvelteKit or other SSR Node.js apps running behind systemd
- Express, Fastify, and NestJS APIs
- background jobs, cron workers, and queue consumers
- cloud/serverless deployments that cannot access journald directly

It is not only a Linux journald client. With `backend: "auto"`, the same code can run locally, on a VM, or in cloud infrastructure with a managed HTTP log endpoint.

## AI / LLM Summary

If an AI assistant needs a short description of this package:

`@yskomur/ts-journald` is a TypeScript-first structured logging library for Node.js. It sends logs to native systemd journald on Linux, can forward JSON payloads to a managed HTTP endpoint in cloud environments, and otherwise falls back to the console. It supports syslog priorities, structured fields, stack traces, and helper APIs for app frameworks such as SvelteKit, Express, Fastify, and NestJS.

## API

### Priority

```ts
import { Priority } from '@yskomur/ts-journald';

Priority.EMERG;
Priority.ALERT;
Priority.CRIT;
Priority.ERR;
Priority.WARNING;
Priority.NOTICE;
Priority.INFO;
Priority.DEBUG;
```

### Journal methods

```ts
journal.emergency(message, fields?);
journal.alert(message, fields?);
journal.critical(message, fields?);
journal.error(message, fields?);
journal.warning(message, fields?);
journal.notice(message, fields?);
journal.info(message, fields?);
journal.debug(message, fields?);
journal.log(priority, message, fields?);

journal.isConnected();
journal.close();
journal.addStaticField(name, value);
journal.removeStaticField(name);
journal.getBackend(); // 'journald' | 'managed' | 'console'
```

### Global functions

```ts
import {
  emergency,
  alert,
  critical,
  error,
  warning,
  notice,
  info,
  debug,
  log,
  isConnected,
  close,
} from '@yskomur/ts-journald';
```

## Managed Backend Payload

Managed backend sends JSON payload similar to:

```json
{
  "message": "User login failed",
  "priority": 3,
  "fields": {
    "MESSAGE": "User login failed",
    "PRIORITY": "3",
    "USER_ID": "123"
  },
  "meta": {
    "backend": "managed",
    "cloudProvider": "aws",
    "pid": 123,
    "uid": 1000,
    "hostname": "api-1"
  }
}
```

## Field Rules and Limits

- Field names are uppercased before sending.
- Invalid journald field names are skipped for journald transport.
- Newlines in values are sanitized.
- `MESSAGE` max size: ~48KB (truncated).
- Field max size: ~64KB.

## System Requirements

- Node.js >= 22.0.0
- For `journald` backend: systemd Linux + access to `/run/systemd/journal/socket`
- For `managed` backend: reachable HTTP endpoint
- For `console` backend: no extra requirement

## Troubleshooting

### `require is not defined`

Use a current package version. ESM compatibility has been fixed.

### Journald socket errors

1. Check journald service:
   ```bash
   sudo systemctl status systemd-journald
   ```
2. Check socket file:
   ```bash
   ls -la /run/systemd/journal/socket
   ```
3. Check permissions:
   ```bash
   ls -la /run/systemd/journal/ | grep socket
   ```

## License

MIT License. See [LICENSE](LICENSE).

## Contributors

This project was inspired and improved by the following contributors and references:

- **jourlog** by [yskomur](https://github.com/yskomur) - Journald logger for Go
- **systemd-journal** - Native systemd socket protocol
- **ChatGPT/DeepSeek** - Code structure and design ideas
- **Codex** - Code improvements, debugging, and documentation contributions

## LLMs.txt

LLM-friendly project metadata is available in [llms.txt](llms.txt).

## Turkish README

Turkish documentation is available in [README-TR.MD](README-TR.MD).
