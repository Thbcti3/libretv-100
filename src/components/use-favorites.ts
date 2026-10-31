'use client';

import { useCallback, useEffect, useState } from 'react';

/** 本地追剧清单（localStorage，不依赖服务端） */
export interface FavItem {
  title: string;
  pic?: string;
  rating?: string;
  addedAt: number;
}

const KEY = 'ltv-favorites';

function read(): FavItem[] {
  try {
    const raw = localStorage.getItem(KEY);
    const arr = raw ? (JSON.parse(raw) as unknown) : [];
    return Array.isArray(arr) ? (arr as FavItem[]) : [];
  } catch {
    return [];
  }
}

export function useFavorites() {
  const [items, setItems] = useState<FavItem[]>([]);

  useEffect(() => {
    setItems(read());
    const onChange = () => setItems(read());
    window.addEventListener('storage', onChange);
    window.addEventListener('ltv-favorites-changed', onChange);
    return () => {
      window.removeEventListener('storage', onChange);
      window.removeEventListener('ltv-favorites-changed', onChange);
    };
  }, []);

  const toggle = useCallback((item: Omit<FavItem, 'addedAt'>) => {
    setItems((prev) => {
      const exists = prev.some((x) => x.title === item.title);
      const next = exists ? prev.filter((x) => x.title !== item.title) : [{ ...item, addedAt: Date.now() }, ...prev];
      try {
        localStorage.setItem(KEY, JSON.stringify(next));
        window.dispatchEvent(new Event('ltv-favorites-changed'));
      } catch {
        // 存储失败时保持内存态
      }
      return next;
    });
  }, []);

  const has = useCallback((title: string) => items.some((x) => x.title === title), [items]);

  return { items, toggle, has };
}
