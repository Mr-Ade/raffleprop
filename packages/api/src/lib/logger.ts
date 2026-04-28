const level = (process.env['LOG_LEVEL'] ?? 'info').toLowerCase();
const LEVELS: Record<string, number> = { debug: 10, info: 20, warn: 30, error: 40 };
const threshold = LEVELS[level] ?? 20;

function log(lvl: string, msg: string, meta?: Record<string, unknown>) {
  if ((LEVELS[lvl] ?? 0) < threshold) return;
  const entry: Record<string, unknown> = {
    time: new Date().toISOString(),
    level: lvl,
    msg,
    env: process.env['NODE_ENV'],
    ...meta,
  };
  (lvl === 'error' ? process.stderr : process.stdout).write(JSON.stringify(entry) + '\n');
}

export const logger = {
  debug: (msg: string, meta?: Record<string, unknown>) => log('debug', msg, meta),
  info:  (msg: string, meta?: Record<string, unknown>) => log('info',  msg, meta),
  warn:  (msg: string, meta?: Record<string, unknown>) => log('warn',  msg, meta),
  error: (msg: string, meta?: Record<string, unknown>) => log('error', msg, meta),
};
