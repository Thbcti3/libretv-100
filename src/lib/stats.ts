import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

/**
 * 后台统计：内存计数 + 定期落盘（JSON 文件），单实例部署足够。
 * 记录：访问量（按天）、搜索量（按天）、搜索热词、各源成功/超时/失败与平均耗时、最近搜索。
 * 说明：LibreTV 本身无状态，观看历史等均在用户浏览器，这里统计的是服务端能观测到的行为。
 */

export interface SourceStat {
  ok: number;
  fail: number;
  timeout: number;
  totalMs: number;
  lastError?: string;
  lastAt: number;
}

export interface VisitorRecord {
  t: number;
  ip: string;
  device: string;
  kind: 'visit' | 'login';
}

export interface SearchRecord {
  t: number;
  wd: string;
  ms: number;
  results: number;
  sources: number;
  fails: number;
}

interface DayBucket {
  visits: number;
  searches: number;
  uniques: string[];
}

interface StatsState {
  startedAt: number;
  visits: number;
  searches: number;
  days: Record<string, DayBucket>;
  keywords: Record<string, number>;
  sources: Record<string, SourceStat>;
  recent: SearchRecord[];
  visitors: VisitorRecord[];
}

const STORE_FILE = process.env.STATS_FILE || path.join(process.cwd(), 'data', 'stats.json');
const MAX_RECENT = 120;
const MAX_KEYWORDS = 800;
const MAX_DAYS = 60;

function emptyState(): StatsState {
  return { startedAt: Date.now(), visits: 0, searches: 0, days: {}, keywords: {}, sources: {}, recent: [], visitors: [] };
}

function load(): StatsState {
  try {
    if (!fs.existsSync(STORE_FILE)) return emptyState();
    const raw = JSON.parse(fs.readFileSync(STORE_FILE, 'utf8')) as Partial<StatsState>;
    const base = emptyState();
    return {
      startedAt: typeof raw.startedAt === 'number' ? raw.startedAt : base.startedAt,
      visits: typeof raw.visits === 'number' ? raw.visits : 0,
      searches: typeof raw.searches === 'number' ? raw.searches : 0,
      days: raw.days && typeof raw.days === 'object' ? raw.days : {},
      keywords: raw.keywords && typeof raw.keywords === 'object' ? raw.keywords : {},
      sources: raw.sources && typeof raw.sources === 'object' ? raw.sources : {},
      recent: Array.isArray(raw.recent) ? raw.recent : [],
      visitors: Array.isArray(raw.visitors) ? raw.visitors : [],
    };
  } catch {
    return emptyState();
  }
}

const state: StatsState = load();
const BOOT_AT = Date.now();

let writeTimer: ReturnType<typeof setTimeout> | undefined;
function persist(): void {
  if (writeTimer) return;
  writeTimer = setTimeout(() => {
    writeTimer = undefined;
    try {
      fs.mkdirSync(path.dirname(STORE_FILE), { recursive: true });
      fs.writeFileSync(STORE_FILE, JSON.stringify(state), 'utf8');
    } catch {
      // 落盘失败不影响主流程
    }
  }, 800);
  if (typeof writeTimer.unref === 'function') writeTimer.unref();
}

function dayKey(t = Date.now()): string {
  const d = new Date(t);
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${mm}-${dd}`;
}

function bucket(key: string): DayBucket {
  if (!state.days[key]) state.days[key] = { visits: 0, searches: 0, uniques: [] };
  return state.days[key];
}

/** 访问者标识：对 IP 做哈希，不落明文 */
function visitorId(ip: string): string {
  return crypto.createHash('sha256').update(ip).digest('hex').slice(0, 16);
}

/** 从 UA 解析出「系统 · 浏览器」，用于后台展示 */
function parseDevice(ua: string): string {
  if (!ua) return '未知设备';
  const os = /Windows NT 10/.test(ua) || /Windows/.test(ua)
    ? 'Windows'
    : /iPhone/.test(ua)
      ? 'iPhone'
      : /iPad/.test(ua)
        ? 'iPad'
        : /Android/.test(ua)
          ? 'Android'
          : /Mac OS X/.test(ua)
            ? 'macOS'
            : /Linux/.test(ua)
              ? 'Linux'
              : '其他';
  const br = /MicroMessenger/i.test(ua)
    ? '微信'
    : /QQBrowser/i.test(ua)
      ? 'QQ浏览器'
      : /Edg\//i.test(ua)
        ? 'Edge'
        : /Chrome\//i.test(ua)
          ? 'Chrome'
          : /Safari\//i.test(ua)
            ? 'Safari'
            : /Firefox\//i.test(ua)
              ? 'Firefox'
              : '未知浏览器';
  return `${os} · ${br}`;
}

export function recordVisit(ip: string, ua = '', kind: 'visit' | 'login' = 'visit'): void {
  const key = dayKey();
  const b = bucket(key);
  b.visits += 1;
  const id = visitorId(ip);
  if (!b.uniques.includes(id)) b.uniques.push(id);
  state.visits += 1;
  state.visitors.unshift({ t: Date.now(), ip, device: parseDevice(ua), kind });
  if (state.visitors.length > 300) state.visitors.length = 300;
  pruneDays();
  persist();
}

export function recordSearch(input: {
  wd: string;
  ms: number;
  results: number;
  sources: number;
  failures: Array<{ sourceKey: string; sourceName?: string; error?: string; timedOut?: boolean }>;
  outcomes: Array<{ sourceKey: string; sourceName?: string; ok: boolean; ms?: number; timedOut?: boolean }>;
}): void {
  const key = dayKey();
  bucket(key).searches += 1;
  state.searches += 1;

  const wd = input.wd.trim().slice(0, 40);
  if (wd) {
    state.keywords[wd] = (state.keywords[wd] || 0) + 1;
    const keys = Object.keys(state.keywords);
    if (keys.length > MAX_KEYWORDS) {
      // 丢弃最冷门的词，避免文件无限增长
      keys.sort((a, b) => state.keywords[a] - state.keywords[b]);
      for (const k of keys.slice(0, keys.length - MAX_KEYWORDS)) delete state.keywords[k];
    }
  }

  for (const o of input.outcomes) {
    const name = o.sourceName || o.sourceKey;
    const s = (state.sources[name] ||= { ok: 0, fail: 0, timeout: 0, totalMs: 0, lastAt: 0 });
    if (o.ok) {
      s.ok += 1;
      s.totalMs += o.ms ?? 0;
    } else if (o.timedOut) {
      s.timeout += 1;
    } else {
      s.fail += 1;
    }
    s.lastAt = Date.now();
  }

  for (const f of input.failures) {
    const name = f.sourceName || f.sourceKey;
    const s = (state.sources[name] ||= { ok: 0, fail: 0, timeout: 0, totalMs: 0, lastAt: 0 });
    if (f.error) s.lastError = f.error;
  }

  state.recent.unshift({
    t: Date.now(),
    wd,
    ms: Math.round(input.ms),
    results: input.results,
    sources: input.sources,
    fails: input.failures.length,
  });
  if (state.recent.length > MAX_RECENT) state.recent.length = MAX_RECENT;
  persist();
}

function pruneDays(): void {
  const keys = Object.keys(state.days).sort();
  if (keys.length <= MAX_DAYS) return;
  for (const k of keys.slice(0, keys.length - MAX_DAYS)) delete state.days[k];
}

export interface StatsSnapshot {
  startedAt: number;
  uptimeMs: number;
  visits: number;
  searches: number;
  today: { visits: number; searches: number; uniques: number };
  trend: Array<{ date: string; visits: number; searches: number; uniques: number }>;
  keywords: Array<{ word: string; count: number }>;
  sources: Array<{
    name: string;
    ok: number;
    fail: number;
    timeout: number;
    total: number;
    successRate: number;
    avgMs: number;
    lastError?: string;
    lastAt: number;
  }>;
  recent: SearchRecord[];
  visitors: VisitorRecord[];
}

export function getStatsSnapshot(): StatsSnapshot {
  const today = bucket(dayKey());
  const trend: Array<{ date: string; visits: number; searches: number; uniques: number }> = [];
  for (let i = 13; i >= 0; i -= 1) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const key = dayKey(d.getTime());
    const b = state.days[key];
    trend.push({
      date: key,
      visits: b?.visits ?? 0,
      searches: b?.searches ?? 0,
      uniques: b?.uniques.length ?? 0,
    });
  }

  const keywords = Object.entries(state.keywords)
    .map(([word, count]) => ({ word, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 20);

  const sources = Object.entries(state.sources)
    .map(([name, s]) => {
      const total = s.ok + s.fail + s.timeout;
      return {
        name,
        ok: s.ok,
        fail: s.fail,
        timeout: s.timeout,
        total,
        successRate: total ? Math.round((s.ok / total) * 100) : 0,
        avgMs: s.ok ? Math.round(s.totalMs / s.ok) : 0,
        lastError: s.lastError,
        lastAt: s.lastAt,
      };
    })
    .sort((a, b) => b.total - a.total);

  return {
    startedAt: state.startedAt,
    uptimeMs: Date.now() - BOOT_AT,
    visits: state.visits,
    searches: state.searches,
    today: { visits: today.visits, searches: today.searches, uniques: today.uniques.length },
    trend,
    keywords,
    sources,
    recent: state.recent.slice(0, 40),
    visitors: state.visitors.slice(0, 120),
  };
}
