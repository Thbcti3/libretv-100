/**
 * 品牌标识：可爱吉祥物（圆脸 + 大眼 + 大笑 + 腮红 + 小星星）。
 * 纯 SVG，任意尺寸清晰；与 favicon / PWA 图标同一形象。
 */
export function Logo({ className = 'h-8 w-8', showWord = false }: { className?: string; showWord?: boolean }) {
  return (
    <span className="inline-flex items-center gap-2">
      <svg viewBox="0 0 48 48" className={className} role="img" aria-label="LibreTV">
        <defs>
          <linearGradient id="ltvRing" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#8b5cff" />
            <stop offset="100%" stopColor="#22d3ee" />
          </linearGradient>
          <linearGradient id="ltvFace" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#d8bda0" />
            <stop offset="100%" stopColor="#bfa184" />
          </linearGradient>
        </defs>

        {/* 底：暗紫圆角 + 极光描边 */}
        <rect x="1" y="1" width="46" height="46" rx="13" fill="#1a1229" />
        <rect x="1" y="1" width="46" height="46" rx="13" fill="url(#ltvRing)" opacity="0.16" />
        <rect x="1" y="1" width="46" height="46" rx="13" fill="none" stroke="url(#ltvRing)" strokeWidth="1.4" opacity="0.9" />

        {/* 耳朵 */}
        <circle cx="15" cy="15.5" r="4.6" fill="#b08e70" />
        <circle cx="33" cy="15.5" r="4.6" fill="#b08e70" />

        {/* 脑袋 */}
        <ellipse cx="24" cy="26.5" rx="15.4" ry="14.4" fill="url(#ltvFace)" />
        <ellipse cx="24" cy="19.5" rx="10.6" ry="4.6" fill="#e2cbb0" opacity="0.55" />

        {/* 眼睛 */}
        <ellipse cx="18.4" cy="25.2" rx="2.5" ry="3.0" fill="#1c1610" />
        <ellipse cx="29.6" cy="25.2" rx="2.5" ry="3.0" fill="#1c1610" />
        <circle cx="17.6" cy="24.0" r="0.95" fill="#ffffff" />
        <circle cx="28.8" cy="24.0" r="0.95" fill="#ffffff" />

        {/* 腮红 */}
        <ellipse cx="13.8" cy="30.4" rx="2.7" ry="1.6" fill="#f28c96" opacity="0.42" />
        <ellipse cx="34.2" cy="30.4" rx="2.7" ry="1.6" fill="#f28c96" opacity="0.42" />

        {/* 大白牙笑容 */}
        <rect x="16.2" y="29.4" width="15.6" height="7.2" rx="3.2" fill="#ffffff" />
        <line x1="24" y1="29.8" x2="24" y2="36.2" stroke="#e6d2bc" strokeWidth="0.9" />

        {/* 小星星 */}
        <path d="M40.6 8.6l1.1 2.6 2.6 1.1-2.6 1.1-1.1 2.6-1.1-2.6-2.6-1.1 2.6-1.1z" fill="#ffc8e6" />
        <path d="M43.6 14.6l.6 1.4 1.4.6-1.4.6-.6 1.4-.6-1.4-1.4-.6 1.4-.6z" fill="#ffaad2" opacity="0.85" />
      </svg>

      {showWord && (
        <span className="text-[17px] font-semibold tracking-tight text-white">
          Libre<span className="bg-gradient-to-r from-violet-400 to-cyan-300 bg-clip-text text-transparent">TV</span>
        </span>
      )}
    </span>
  );
}
