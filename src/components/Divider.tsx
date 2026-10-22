// Pembatas ornamen emas (SVG buatan sendiri, bukan aset pihak lain).
export default function Divider({ className = "" }: { className?: string }) {
  return (
    <svg className={`divider ${className}`} viewBox="0 0 300 40" fill="none" aria-hidden="true" focusable="false">
      <g stroke="currentColor" strokeWidth="1.1" strokeLinecap="round">
        {/* garis horizontal menipis ke ujung */}
        <line x1="20" y1="20" x2="110" y2="20" opacity=".5" />
        <line x1="190" y1="20" x2="280" y2="20" opacity=".5" />
        {/* sulur kiri */}
        <path d="M110 20 C120 20 124 12 132 12 C139 12 140 20 134 21" opacity=".9" />
        <path d="M110 20 C120 20 124 28 132 28 C139 28 140 20 134 19" opacity=".9" />
        {/* sulur kanan (cermin) */}
        <path d="M190 20 C180 20 176 12 168 12 C161 12 160 20 166 21" opacity=".9" />
        <path d="M190 20 C180 20 176 28 168 28 C161 28 160 20 166 19" opacity=".9" />
      </g>
      {/* belah ketupat tengah */}
      <g fill="currentColor">
        <path d="M150 8 L156 20 L150 32 L144 20 Z" opacity=".95" />
        <circle cx="150" cy="20" r="2.4" fill="#fff" />
        <circle cx="120" cy="20" r="1.6" />
        <circle cx="180" cy="20" r="1.6" />
      </g>
      {/* titik ujung */}
      <circle cx="20" cy="20" r="1.5" fill="currentColor" opacity=".5" />
      <circle cx="280" cy="20" r="1.5" fill="currentColor" opacity=".5" />
    </svg>
  );
}
