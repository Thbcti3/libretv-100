'use client';

import { useEffect, useState } from 'react';
import { useAppStore } from '@/lib/store';
import { cn } from '@/lib/utils';
import { SmartImage } from './smart-image';

/**
 * 极光版海报卡：无边框、图片为主、hover 上浮 + 外发光。
 * 支持评分、进度条、收藏红心。
 */
export function PosterCard({
  title,
  pic,
  rating,
  progress,
  badge,
  onOpen,
  onToggleFav,
  faved = false,
  className,
}: {
  title: string;
  pic?: string;
  rating?: string;
  /** 0~1 观看进度，显示底部进度条 */
  progress?: number;
  badge?: string;
  onOpen: () => void;
  onToggleFav?: () => void;
  faved?: boolean;
  className?: string;
}) {
  const imageProxyMode = useAppStore((s) => s.imageProxyMode);
  const customImageProxy = useAppStore((s) => s.customImageProxy);
  const [failed, setFailed] = useState(false);

  useEffect(() => setFailed(false), [pic]);

  return (
    <div
      className={cn(
        'poster-tile spotlight group relative aspect-[2/3] w-full cursor-pointer overflow-hidden rounded-2xl bg-white/5',
        'ring-1 ring-white/10',
        className
      )}
      role="button"
      tabIndex={0}
      onClick={onOpen}
      onMouseMove={(e) => {
        const r = e.currentTarget.getBoundingClientRect();
        e.currentTarget.style.setProperty('--mx', `${e.clientX - r.left}px`);
        e.currentTarget.style.setProperty('--my', `${e.clientY - r.top}px`);
      }}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onOpen();
        }
      }}
      aria-label={title}
    >
      {pic && !failed ? (
        <SmartImage
          url={pic}
          mode={imageProxyMode}
          customProxy={customImageProxy}
          alt={title}
          className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.04]"
          onExhausted={() => setFailed(true)}
        />
      ) : (
        <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-violet-500/20 to-cyan-400/10">
          <span className="px-2 text-center text-[11px] text-white/50">{title}</span>
        </div>
      )}

      {/* 底部渐隐 + 标题 */}
      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/90 via-black/45 to-transparent px-2.5 pb-2 pt-8">
        {rating && (
          <span className="mb-1 inline-block rounded-md bg-black/45 px-1.5 py-0.5 text-[10px] font-medium text-amber-300 backdrop-blur">
            ★ {rating}
          </span>
        )}
        <p className="truncate text-[12.5px] font-medium text-white/95" title={title}>
          {title}
        </p>
      </div>

      {badge && (
        <span className="absolute left-2 top-2 rounded-md bg-black/55 px-1.5 py-0.5 text-[10px] text-white/85 backdrop-blur">
          {badge}
        </span>
      )}

      {typeof progress === 'number' && progress > 0 && (
        <div className="absolute inset-x-0 bottom-0 h-1 bg-white/15">
          <div
            className="h-full bg-gradient-to-r from-violet-400 to-cyan-300"
            style={{ width: `${Math.min(100, Math.max(2, progress * 100))}%` }}
          />
        </div>
      )}

      {onToggleFav && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onToggleFav();
          }}
          aria-label={faved ? '取消追剧' : '加入追剧'}
          className={cn(
            'poster-overlay absolute right-2 top-2 rounded-full p-1.5 backdrop-blur transition',
            faved ? 'bg-rose-500/85 text-white' : 'bg-black/45 text-white/75 hover:text-white'
          )}
        >
          <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill={faved ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth={2}>
            <path d="M20.8 4.6a5.5 5.5 0 00-7.8 0L12 5.7l-1-1.1a5.5 5.5 0 10-7.8 7.8l8.8 8.8 8.8-8.8a5.5 5.5 0 000-7.8z" />
          </svg>
        </button>
      )}
    </div>
  );
}
