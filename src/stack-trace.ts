import { CallerInfo } from './types';

export class StackTrace {
  private static readonly nodeInternalPaths = [
    'node:internal',
    'internal/',
    '(native)',
    'node_modules'
  ];

  static isInternalPath(path: string | null): boolean {
    if (path === null) return true;
    return this.nodeInternalPaths.some(internal => path.includes(internal));
  }

  static getCallerInfo(skipFrames: number = 2): CallerInfo | null {
    const originalPrepare = Error.prepareStackTrace;

    Error.prepareStackTrace = (_, stack) => stack;
    const error = new Error();
    const stack = error.stack as unknown as NodeJS.CallSite[];
    Error.prepareStackTrace = originalPrepare;

    if (!Array.isArray(stack)) {
      return null;
    }

    let frameCount = 0;
    for (let i = 0; i < stack.length; i++) {
      const frame = stack[i];
      const fileName = frame.getFileName();

      // İnternal frame'leri atla
      if (this.isInternalPath(fileName)) {
        continue;
      }

      if (frameCount >= skipFrames) {
        return {
          file: fileName || 'unknown',
          line: frame.getLineNumber() || 0,
          column: frame.getColumnNumber() || 0,
          function: frame.getFunctionName() || undefined
        };
      }

      frameCount++;
    }

    return null;
  }

  static getStackTraceString(depth: number = 10): string {
    const stack = new Error().stack;
    if (!stack) return '';

    const lines = stack.split('\n');
    const relevantLines: string[] = [];

    for (let i = 1; i < lines.length && relevantLines.length < depth; i++) {
      const line = lines[i].trim();
      if (!this.isInternalPath(line)) {
        relevantLines.push(line);
      }
    }

    return relevantLines.join('\n');
  }
}
