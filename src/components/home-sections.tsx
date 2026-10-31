'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { useLiveQuery } from 'dexie-react-hooks';
import { api } from '@/lib/client-api';
import { useAppStore } from '@/lib/store';
import { cn, buildWatchUrl } from '@/lib/utils';
import { db } from '@/lib/db';
import type { DoubanItem } from '@/lib/types';
import { SmartImage } from './smart-image';
import { PosterCard } from './poster-card';
import { useFavorites } from './use-favorites';

/**
 * 极光版首页 · 编辑式排版
 * Hero：左侧衬线大标题 + 右侧悬浮海报；章节：编号 + 发丝线；卡片：鼠标聚光。
 */

const ROWS = [
  { id: 'hot', title: '热度飙升', en: 'TRENDING', sub: '全网都在追', type: 'tv' as const, tag: '热门' },
  { id: 'us', title: '美剧', en: 'US SERIES', sub: '欧美剧集', type: 'tv' as const, tag: '美剧' },
  { id: 'anime', title: '动漫', en: 'ANIME', sub: '日本动画', type: 'tv' as const, tag: '日本动画' },
  { id: 'guoman', title: '国产动漫', en: 'DONGHUA', sub: '高分优先', type: 'movie' as const, tag: '国产动画' },
  { id: 'movie', title: '电影', en: 'FEATURE', sub: '院线 & 经典', type: 'movie' as const, tag: '热门' },
  { id: 'variety', title: '综艺', en: 'VARIETY', sub: '热门综娱', type: 'tv' as const, tag: '综艺' },
  { id: 'doc', title: '纪录片', en: 'DOCUMENTARY', sub: '高分纪实', type: 'tv' as const, tag: '纪录片' },
];

const TABS = [
  { id: 'hot', label: '热度' },
  { id: 'us', label: '美剧' },
  { id: 'anime', label: '动漫' },
  { id: 'guoman', label: '国产动漫' },
  { id: 'movie', label: '电影' },
];

export function HomeSections({ onPick }: { onPick: (title: string) => void }) {
  const [tab, setTab] = useState('hot');
  const fav = useFavorites();

  const jumpTo = useCallback((id: string) => {
    setTab(id);
    document.getElementById(`home-row-${id}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, []);

  const randomPick = useCallback(() => {
    const tiles = Array.from(document.querySelectorAll('#home-row-hot .poster-tile')) as HTMLElement[];
    tiles[Math.floor(Math.random() * Math.max(1, tiles.length))]?.click();
  }, []);

  return (
    <div className="pb-10">
      <HeroCarousel onPick={onPick} fav={fav} />

      {/* 分类条 */}
      <div className="sticky top-[52px] z-30 mt-8">
        <div className="flex items-center gap-2 border-y border-white/10 bg-[#06070f]/80 py-2.5 backdrop-blur-xl">
          <div className="scrollbar-none flex flex-1 items-center gap-0.5 overflow-x-auto">
            {TABS.map((t) => (
              <button
                key={t.id}
                onClick={() => jumpTo(t.id)}
                data-active={tab === t.id}
                className="pill-tab shrink-0 rounded-lg px-3 py-1 text-[12.5px] font-medium text-white/55 hover:text-white"
              >
                {t.label}
              </button>
            ))}
          </div>
          <button
            onClick={randomPick}
            className="flex shrink-0 items-center gap-1.5 rounded-lg border border-white/10 px-2.5 py-1 text-[11.5px] text-white/60 transition hover:border-white/25 hover:text-white"
          >
            <svg viewBox="0 0 24 24" className="h-3 w-3" fill="none" stroke="currentColor" strokeWidth={2}>
              <path d="M16 3h5v5M4 20L21 3M21 16v5h-5M15 15l6 6M4 4l5 5" />
            </svg>
            随机
          </button>
        </div>
      </div>

      <div className="mt-10 space-y-14">
        <ContinueRow />
        <FavRow fav={fav} onPick={onPick} />
        {ROWS.map((row, i) => (
          <CategoryRow key={row.id} row={row} index={i + 1} onPick={onPick} fav={fav} />
        ))}
      </div>
    </div>
  );
}

/* ------------------------------ Hero ------------------------------ */

function HeroCarousel({ onPick, fav }: { onPick: (t: string) => void; fav: ReturnType<typeof useFavorites> }) {
  const imageProxyMode = useAppStore((s) => s.imageProxyMode);
  const customImageProxy = useAppStore((s) => s.customImageProxy);
  const query = useQuery({
    queryKey: ['douban', 'tv', '热门', 'hero'],
    queryFn: ({ signal }) => api.douban('tv', '热门', 0, 8, signal),
    staleTime: 10 * 60_000,
  });
  const slides = useMemo(() => (query.data?.items ?? []).slice(0, 5), [query.data]);
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    if (paused || slides.length <= 1) return;
    const timer = setInterval(() => setIndex((i) => (i + 1) % slides.length), 7000);
    return () => clearInterval(timer);
  }, [paused, slides.length]);

  const current = slides[index];
  const isFav = current ? fav.has(current.title) : false;

  return (
    <section className="relative -mx-4 overflow-hidden" onMouseEnter={() => setPaused(true)} onMouseLeave={() => setPaused(false)}>
      <div className="absolute inset-0">
        {current?.cover && (
          <SmartImage url={current.cover} mode={imageProxyMode} customProxy={customImageProxy} alt="" className="kenburns h-full w-full object-cover opacity-70" />
        )}
        <div className="absolute inset-0 bg-[#06070f]/72" />
        <div className="absolute inset-0 bg-gradient-to-r from-[#06070f] via-[#06070f]/70 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-t from-[#06070f] via-transparent to-[#06070f]/60" />
        <div
          className="absolute inset-0 opacity-50 mix-blend-screen"
          style={{
            background:
              'radial-gradient(42% 55% at 14% 22%, rgba(124,92,255,.50), transparent 70%), radial-gradient(38% 48% at 82% 10%, rgba(34,211,238,.30), transparent 70%)',
          }}
        />
      </div>

      <div className="relative mx-auto flex h-[62vh] min-h-[440px] max-w-[1400px] items-center px-6">
        {current ? (
          <div className="grid w-full grid-cols-1 items-center gap-10 md:grid-cols-[1.15fr_0.85fr]">
            <div>
              <div className="mb-5 flex items-center gap-3">
                <span className="section-index">
                  {String(index + 1).padStart(2, '0')} / {String(slides.length).padStart(2, '0')}
                </span>
                <span className="hairline w-10" />
                <span className="text-[10px] uppercase tracking-[0.32em] text-white/45">Editor&apos;s Pick</span>
              </div>

              <h1 className="font-display text-[clamp(2.4rem,6vw,5rem)] leading-[1.04] text-white drop-shadow-[0_18px_60px_rgba(0,0,0,.75)]">
                {current.title}
              </h1>

              <div className="mt-5 flex flex-wrap items-center gap-3 text-[12px] text-white/55">
                <span className="rounded border border-white/20 px-1.5 py-0.5">{current.isTv ? '剧集' : '电影'}</span>
                {current.rating && <span className="font-semibold text-amber-300">★ {current.rating}</span>}
                <span className="hairline w-8" />
                <span className="tracking-wide">豆瓣精选 · 极光推荐</span>
              </div>

              <div className="mt-9 flex items-center gap-3">
                <button
                  onClick={() => onPick(current.title)}
                  className="aurora-cta inline-flex items-center gap-2 rounded-full px-7 py-3 text-[13px] font-semibold tracking-wide text-white"
                >
                  <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="currentColor"><path d="M8 5v14l11-7z" /></svg>
                  立即观看
                </button>
                <button
                  onClick={() => fav.toggle({ title: current.title, pic: current.cover, rating: current.rating })}
                  className={cn(
                    'inline-flex items-center gap-2 rounded-full border px-6 py-3 text-[13px] tracking-wide transition',
                    isFav ? 'border-rose-400/60 bg-rose-500/15 text-rose-200' : 'border-white/20 text-white/75 hover:border-white/40 hover:text-white'
                  )}
                >
                  <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill={isFav ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth={1.8}>
                    <path d="M20.8 4.6a5.5 5.5 0 00-7.8 0L12 5.7l-1-1.1a5.5 5.5 0 10-7.8 7.8l8.8 8.8 8.8-8.8a5.5 5.5 0 000-7.8z" />
                  </svg>
                  {isFav ? '已收藏' : '追剧'}
                </button>
              </div>

              <div className="mt-10 flex items-center gap-2">
                {slides.map((s, i) => (
                  <button
                    key={s.id}
                    onClick={() => setIndex(i)}
                    aria-label={`第 ${i + 1} 张`}
                    className={cn(
                      'h-[2px] rounded-full transition-all duration-500',
                      i === index ? 'w-10 bg-gradient-to-r from-violet-400 to-cyan-300' : 'w-4 bg-white/25 hover:bg-white/50'
                    )}
                  />
                ))}
              </div>
            </div>

            <div className="hidden justify-self-end md:block">
              <div className="relative w-[240px] rotate-[1.5deg] transition-transform duration-500 hover:rotate-0 hover:scale-[1.02]">
                <div className="absolute -inset-4 rounded-3xl bg-gradient-to-br from-violet-500/30 to-cyan-400/20 blur-2xl" />
                <div className="relative aspect-[2/3] overflow-hidden rounded-2xl ring-1 ring-white/20 shadow-[0_30px_80px_-24px_rgba(0,0,0,.9)]">
                  {current.cover && (
                    <SmartImage url={current.cover} mode={imageProxyMode} customProxy={customImageProxy} alt={current.title} className="h-full w-full object-cover" />
                  )}
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="h-40 w-full animate-pulse rounded-2xl bg-white/5" />
        )}
      </div>
    </section>
  );
}

/* --------------------------- 继续观看 --------------------------- */

function ContinueRow() {
  const router = useRouter();
  const history = useLiveQuery(() => db.history.orderBy('timestamp').reverse().limit(16).toArray(), []);
  const items = useMemo(
    () => (history ?? []).filter((h) => h.duration > 0 && h.playbackPosition > 10).slice(0, 12),
    [history]
  );

  if (items.length === 0) return null;

  return (
    <RowShell title="继续观看" en="RESUME" sub="从上次停下的地方接着看">
      {items.map((h) => (
        <div key={h.id} className="w-[136px] shrink-0 snap-start sm:w-[152px]">
          <PosterCard
            title={h.title}
            pic={h.pic}
            badge={`EP ${h.episodeIndex + 1}`}
            progress={h.duration > 0 ? h.playbackPosition / h.duration : undefined}
            onOpen={() =>
              router.push(buildWatchUrl({ sourceKey: h.sourceKey, vodId: h.vodId, index: h.episodeIndex, title: h.title, sourceUrl: h.sourceUrl }))
            }
          />
        </div>
      ))}
    </RowShell>
  );
}

/* ---------------------------- 追剧 ---------------------------- */

function FavRow({ fav, onPick }: { fav: ReturnType<typeof useFavorites>; onPick: (t: string) => void }) {
  if (fav.items.length === 0) return null;
  return (
    <RowShell title="我的追剧" en="WATCHLIST" sub={`${fav.items.length} 部`}>
      {fav.items.slice(0, 20).map((f) => (
        <div key={f.title} className="w-[136px] shrink-0 snap-start sm:w-[152px]">
          <PosterCard
            title={f.title}
            pic={f.pic}
            rating={f.rating}
            onOpen={() => onPick(f.title)}
            faved
            onToggleFav={() => fav.toggle({ title: f.title, pic: f.pic, rating: f.rating })}
          />
        </div>
      ))}
    </RowShell>
  );
}

/* -------------------------- 分类行 -------------------------- */

function CategoryRow({
  row,
  index,
  onPick,
  fav,
}: {
  row: (typeof ROWS)[number];
  index: number;
  onPick: (t: string) => void;
  fav: ReturnType<typeof useFavorites>;
}) {
  const query = useQuery({
    queryKey: ['douban', row.type, row.tag, 'row'],
    queryFn: ({ signal }) => api.douban(row.type, row.tag, 0, 18, signal),
    staleTime: 10 * 60_000,
  });

  const items = useMemo(() => {
    const list = query.data?.items ?? [];
    if (row.id !== 'guoman') return list;
    const score = (s?: string) => {
      const n = parseFloat(s || '');
      return Number.isFinite(n) ? n : 0;
    };
    return [...list].sort((a, b) => score(b.rating) - score(a.rating) || a.title.localeCompare(b.title, 'zh-Hans-CN'));
  }, [query.data, row.id]);

  return (
    <RowShell id={row.id} title={row.title} en={row.en} sub={row.sub} index={index}>
      {items.length === 0
        ? Array.from({ length: 9 }).map((_, i) => (
            <div key={i} className="w-[136px] shrink-0 sm:w-[152px]">
              <div className="aspect-[2/3] animate-pulse rounded-2xl bg-white/5" />
            </div>
          ))
        : items.map((item: DoubanItem) => (
            <div key={item.id} className="w-[136px] shrink-0 snap-start sm:w-[152px]">
              <PosterCard
                title={item.title}
                pic={item.cover}
                rating={item.rating}
                onOpen={() => onPick(item.title)}
                faved={fav.has(item.title)}
                onToggleFav={() => fav.toggle({ title: item.title, pic: item.cover, rating: item.rating })}
              />
            </div>
          ))}
    </RowShell>
  );
}

/* -------------------------- 通用外壳 -------------------------- */

function RowShell({
  id,
  title,
  en,
  sub,
  index,
  children,
}: {
  id?: string;
  title: string;
  en: string;
  sub?: string;
  index?: number;
  children: React.ReactNode;
}) {
  const scroller = useRef<HTMLDivElement>(null);
  const wrapRef = useRef<HTMLElement>(null);
  const [shown, setShown] = useState(false);
  const scrollTo = (dx: number) => scroller.current?.scrollBy({ left: dx, behavior: 'smooth' });

  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    if (typeof IntersectionObserver === 'undefined') {
      setShown(true);
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) {
            setShown(true);
            io.disconnect();
          }
        }
      },
      { rootMargin: '180px' }
    );
    io.observe(el);
    // 兜底：无论是否进入视口，1.2 秒后都显示，避免异常环境下整块空白
    const fallback = setTimeout(() => setShown(true), 1200);
    return () => {
      clearTimeout(fallback);
      io.disconnect();
    };
  }, []);

  return (
    <section ref={wrapRef} id={id ? `home-row-${id}` : undefined} className={cn('scroll-mt-28 reveal', shown && 'is-in')}>
      <header className="mb-4 flex items-end justify-between">
        <div>
          <div className="mb-2 flex items-center gap-3">
            {index !== undefined && <span className="section-index">{String(index).padStart(2, '0')}</span>}
            <span className="section-index !text-white/25">{en}</span>
            <span className="hairline w-8" />
          </div>
          <div className="flex items-baseline gap-3">
            <h2 className="font-display text-[23px] leading-none text-white">{title}</h2>
            {sub && <span className="text-[11.5px] tracking-wide text-white/35">{sub}</span>}
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          <button onClick={() => scrollTo(-640)} aria-label="向左" className="rounded-full border border-white/10 p-1.5 text-white/45 transition hover:border-white/30 hover:text-white">
            <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth={2}><path d="M15 19l-7-7 7-7" /></svg>
          </button>
          <button onClick={() => scrollTo(640)} aria-label="向右" className="rounded-full border border-white/10 p-1.5 text-white/45 transition hover:border-white/30 hover:text-white">
            <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth={2}><path d="M9 5l7 7-7 7" /></svg>
          </button>
        </div>
      </header>

      <div ref={scroller} className="scrollbar-none flex snap-x snap-mandatory gap-3.5 overflow-x-auto scroll-smooth pb-2">
        {children}
      </div>
    </section>
  );
}
