'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';

interface SourceRow {
  name: string;
  ok: number;
  fail: number;
  timeout: number;
  total: number;
  successRate: number;
  avgMs: number;
  lastError?: string;
  lastAt: number;
}

interface Snapshot {
  startedAt: number;
  uptimeMs: number;
  visits: number;
  searches: number;
  today: { visits: number; searches: number; uniques: number };
  trend: Array<{ date: string; visits: number; searches: number; uniques: number }>;
  keywords: Array<{ word: string; count: number }>;
  sources: SourceRow[];
  recent: Array<{ t: number; wd: string; ms: number; results: number; sources: number; fails: number }>;
  visitors: Array<{ t: number; ip: string; device: string; kind: 'visit' | 'login' }>;
}

function fmtTime(t: number): string {
  const d = new Date(t);
  const p = (n: number) => String(n).padStart(2, '0');
  return `${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`;
}

function fmtUptime(ms: number): string {
  const d = Math.floor(ms / 86400000);
  const h = Math.floor((ms % 86400000) / 3600000);
  const m = Math.floor((ms % 3600000) / 60000);
  return d > 0 ? `${d} 天 ${h} 小时` : h > 0 ? `${h} 小时 ${m} 分` : `${m} 分钟`;
}

export default function AdminPage() {
  const [authed, setAuthed] = useState<boolean | null>(null);
  const [data, setData] = useState<Snapshot | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState({ user: '', password: '' });
  const [lastUpdated, setLastUpdated] = useState(0);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/stats', { cache: 'no-store' });
      if (res.status === 401) {
        setAuthed(false);
        setData(null);
        return;
      }
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = (await res.json()) as Snapshot;
      setData(json);
      setAuthed(true);
      setLastUpdated(Date.now());
    } catch (e) {
      setError(e instanceof Error ? e.message : '加载失败');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (!authed) return;
    const timer = setInterval(() => void load(), 30000);
    return () => clearInterval(timer);
  }, [authed, load]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const json = (await res.json()) as { success?: boolean; error?: string };
      if (!res.ok || !json.success) throw new Error(json.error || '登录失败');
      setForm({ user: '', password: '' });
      await load();
    } catch (e2) {
      setError(e2 instanceof Error ? e2.message : '登录失败');
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    await fetch('/api/admin/logout', { method: 'POST' });
    setAuthed(false);
    setData(null);
  };

  if (authed === null) {
    return (
      <div className="ltv-home flex min-h-screen items-center justify-center">
        <div className="glass rounded-2xl px-6 py-4 text-sm text-muted">正在校验管理会话…</div>
      </div>
    );
  }

  if (!authed) {
    return (
      <div className="ltv-home flex min-h-screen items-center justify-center px-4">
        <form onSubmit={submit} className="glass w-full max-w-sm rounded-2xl p-6">
          <h1 className="mb-1 text-lg font-semibold text-content">LibreTV 管理后台</h1>
          <p className="mb-5 text-xs text-muted">请使用管理员账号登录</p>
          <label className="mb-1 block text-xs text-muted">账号</label>
          <input
            className="input mb-3 w-full"
            value={form.user}
            onChange={(e) => setForm((f) => ({ ...f, user: e.target.value }))}
            autoComplete="username"
            placeholder="管理员账号"
          />
          <label className="mb-1 block text-xs text-muted">密码</label>
          <input
            className="input w-full"
            type="password"
            value={form.password}
            onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
            autoComplete="current-password"
            placeholder="管理员密码"
          />
          {error && <p className="mt-3 text-xs text-danger">{error}</p>}
          <button className="btn-primary mt-5 w-full" disabled={loading || !form.user || !form.password}>
            {loading ? '登录中…' : '登录'}
          </button>
        </form>
      </div>
    );
  }

  return <Dashboard data={data} loading={loading} lastUpdated={lastUpdated} onRefresh={load} onLogout={logout} />;
}

function Dashboard({
  data,
  loading,
  lastUpdated,
  onRefresh,
  onLogout,
}: {
  data: Snapshot | null;
  loading: boolean;
  lastUpdated: number;
  onRefresh: () => void;
  onLogout: () => void;
}) {
  const maxTrend = useMemo(() => Math.max(1, ...(data?.trend ?? []).map((d) => Math.max(d.visits, d.searches))), [data]);
  const maxKeyword = useMemo(() => Math.max(1, ...(data?.keywords ?? []).map((k) => k.count)), [data]);

  return (
    <div className="ltv-home min-h-screen">
      <header className="glass-bar sticky top-0 z-30">
        <div className="mx-auto flex h-14 max-w-6xl items-center gap-3 px-4">
          <span className="text-sm font-semibold text-content">LibreTV 管理后台</span>
          <span className="text-[11px] text-faint">
            运行 {data ? fmtUptime(data.uptimeMs) : '—'} · 更新 {lastUpdated ? fmtTime(lastUpdated) : '—'}
          </span>
          <div className="ml-auto flex items-center gap-2">
            <button onClick={onRefresh} className="btn-ghost btn-sm" disabled={loading}>
              {loading ? '刷新中…' : '刷新'}
            </button>
            <button onClick={onLogout} className="btn-ghost btn-sm">
              退出
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl space-y-4 px-4 py-5">
        <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard label="累计访问" value={data?.visits ?? 0} sub={`今日 ${data?.today.visits ?? 0}`} />
          <StatCard label="今日独立访客" value={data?.today.uniques ?? 0} sub="按 IP 哈希去重" />
          <StatCard label="累计搜索" value={data?.searches ?? 0} sub={`今日 ${data?.today.searches ?? 0}`} />
          <StatCard label="收录点播源" value={data?.sources.length ?? 0} sub="按服务端统计" />
        </section>

        <section className="glass rounded-2xl p-4">
          <h2 className="mb-3 text-sm font-semibold text-content">近 14 天趋势</h2>
          {!data || data.trend.length === 0 ? (
            <p className="py-6 text-center text-xs text-faint">暂无数据，有人访问后开始统计</p>
          ) : (
            <div className="flex h-40 items-end gap-2">
              {data.trend.map((d) => (
                <div key={d.date} className="flex flex-1 flex-col items-center gap-1">
                  <div className="flex h-32 w-full items-end justify-center gap-0.5">
                    <div
                      className="w-2.5 rounded-t bg-accent/80"
                      style={{ height: `${Math.max(2, (d.visits / maxTrend) * 100)}%` }}
                      title={`访问 ${d.visits}`}
                    />
                    <div
                      className="w-2.5 rounded-t bg-white/40"
                      style={{ height: `${Math.max(2, (d.searches / maxTrend) * 100)}%` }}
                      title={`搜索 ${d.searches}`}
                    />
                  </div>
                  <span className="text-[10px] text-faint">{d.date.slice(5)}</span>
                </div>
              ))}
            </div>
          )}
          <div className="mt-2 flex gap-4 text-[11px] text-faint">
            <span className="flex items-center gap-1"><i className="h-2 w-2 rounded bg-accent/80" />访问</span>
            <span className="flex items-center gap-1"><i className="h-2 w-2 rounded bg-white/40" />搜索</span>
          </div>
        </section>

        <div className="grid gap-4 lg:grid-cols-2">
          <section className="glass rounded-2xl p-4">
            <h2 className="mb-3 text-sm font-semibold text-content">搜索热词 Top 20</h2>
            {!data || data.keywords.length === 0 ? (
              <p className="py-6 text-center text-xs text-faint">暂无搜索</p>
            ) : (
              <ul className="space-y-1.5">
                {data.keywords.map((k, i) => (
                  <li key={k.word} className="flex items-center gap-2">
                    <span className="w-4 text-right text-[11px] text-faint">{i + 1}</span>
                    <span className="w-28 shrink-0 truncate text-xs text-content" title={k.word}>{k.word}</span>
                    <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-white/10">
                      <div className="h-full rounded-full bg-accent/70" style={{ width: `${(k.count / maxKeyword) * 100}%` }} />
                    </div>
                    <span className="w-8 text-right text-[11px] text-muted">{k.count}</span>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="glass rounded-2xl p-4">
            <h2 className="mb-3 text-sm font-semibold text-content">最近搜索</h2>
            {!data || data.recent.length === 0 ? (
              <p className="py-6 text-center text-xs text-faint">暂无记录</p>
            ) : (
              <div className="scrollbar-thin max-h-72 overflow-y-auto">
                <table className="w-full text-left text-[11px]">
                  <thead className="sticky top-0 bg-transparent text-faint">
                    <tr>
                      <th className="pb-1 font-normal">时间</th>
                      <th className="pb-1 font-normal">关键词</th>
                      <th className="pb-1 text-right font-normal">结果</th>
                      <th className="pb-1 text-right font-normal">耗时</th>
                      <th className="pb-1 text-right font-normal">失败源</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.recent.map((r, i) => (
                      <tr key={`${r.t}-${i}`} className="border-t border-white/5">
                        <td className="py-1 text-faint">{fmtTime(r.t).slice(6)}</td>
                        <td className="max-w-[9rem] truncate py-1 text-content">{r.wd}</td>
                        <td className="py-1 text-right text-muted">{r.results}</td>
                        <td className="py-1 text-right text-muted">{(r.ms / 1000).toFixed(1)}s</td>
                        <td className={`py-1 text-right ${r.fails > 0 ? 'text-warning' : 'text-faint'}`}>{r.fails}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </div>

        <section className="glass rounded-2xl p-4">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-content">访问记录（IP / 设备 / 时间）</h2>
            <span className="text-[11px] text-faint">最近 120 条 · 访问与登录分开计</span>
          </div>
          {!data || data.visitors.length === 0 ? (
            <p className="py-6 text-center text-xs text-faint">暂无记录，有人打开站点后出现</p>
          ) : (
            <div className="scrollbar-thin max-h-80 overflow-auto">
              <table className="w-full text-left text-[11px]">
                <thead className="sticky top-0 text-faint">
                  <tr>
                    <th className="pb-1 font-normal">时间</th>
                    <th className="pb-1 font-normal">IP</th>
                    <th className="pb-1 font-normal">设备</th>
                    <th className="pb-1 text-right font-normal">类型</th>
                  </tr>
                </thead>
                <tbody>
                  {data.visitors.map((v, i) => (
                    <tr key={`${v.t}-${i}`} className="border-t border-white/5">
                      <td className="whitespace-nowrap py-1 text-faint">{fmtTime(v.t)}</td>
                      <td className="py-1 font-mono text-content">{v.ip}</td>
                      <td className="py-1 text-muted">{v.device}</td>
                      <td className="py-1 text-right">
                        <span className={v.kind === 'login' ? 'text-success' : 'text-faint'}>
                          {v.kind === 'login' ? '登录' : '访问'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <section className="glass rounded-2xl p-4">
          <h2 className="mb-3 text-sm font-semibold text-content">点播源健康度</h2>
          {!data || data.sources.length === 0 ? (
            <p className="py-6 text-center text-xs text-faint">暂无数据</p>
          ) : (
            <div className="scrollbar-thin max-h-96 overflow-auto">
              <table className="w-full text-left text-[11px]">
                <thead className="sticky top-0 text-faint">
                  <tr>
                    <th className="pb-1 font-normal">源</th>
                    <th className="pb-1 text-right font-normal">成功</th>
                    <th className="pb-1 text-right font-normal">超时</th>
                    <th className="pb-1 text-right font-normal">失败</th>
                    <th className="pb-1 text-right font-normal">成功率</th>
                    <th className="pb-1 text-right font-normal">平均耗时</th>
                  </tr>
                </thead>
                <tbody>
                  {data.sources.map((s) => (
                    <tr key={s.name} className="border-t border-white/5">
                      <td className="max-w-[14rem] truncate py-1 text-content" title={s.lastError || s.name}>{s.name}</td>
                      <td className="py-1 text-right text-success">{s.ok}</td>
                      <td className="py-1 text-right text-warning">{s.timeout}</td>
                      <td className="py-1 text-right text-danger">{s.fail}</td>
                      <td className="py-1 text-right text-muted">{s.successRate}%</td>
                      <td className="py-1 text-right text-muted">{s.avgMs ? `${s.avgMs}ms` : '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </main>
    </div>
  );
}

function StatCard({ label, value, sub }: { label: string; value: number; sub?: string }) {
  return (
    <div className="glass rounded-2xl p-4">
      <p className="text-[11px] text-faint">{label}</p>
      <p className="mt-1 text-2xl font-semibold tabular-nums text-content">{value.toLocaleString()}</p>
      {sub && <p className="mt-0.5 text-[11px] text-faint">{sub}</p>}
    </div>
  );
}
