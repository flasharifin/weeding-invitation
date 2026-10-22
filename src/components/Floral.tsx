// Ornamen bunga cat air (SVG buatan sendiri) untuk sudut/tepi section.
// Gambar dibuat untuk sudut kiri-atas, lalu dicerminkan lewat class.

function Rose({ x, y, r, c1, c2 }: { x: number; y: number; r: number; c1: string; c2: string }) {
  return (
    <g transform={`translate(${x} ${y})`}>
      {[0, 72, 144, 216, 288].map((a) => (
        <ellipse key={a} cx={0} cy={-r * 0.55} rx={r * 0.52} ry={r * 0.7} fill={c1} opacity=".55" transform={`rotate(${a})`} />
      ))}
      {[36, 108, 180, 252, 324].map((a) => (
        <ellipse key={a} cx={0} cy={-r * 0.35} rx={r * 0.36} ry={r * 0.48} fill={c2} opacity=".6" transform={`rotate(${a})`} />
      ))}
      <circle r={r * 0.2} fill={c2} opacity=".85" />
      <path d={`M${-r * 0.15} 0 q${r * 0.15} ${-r * 0.2} ${r * 0.3} 0`} stroke="#fff" strokeOpacity=".6" fill="none" />
    </g>
  );
}

function Leaf({ x, y, rot, s = 1, fill = "#8aa27a" }: { x: number; y: number; rot: number; s?: number; fill?: string }) {
  return (
    <path
      d="M0 0 C10 -14 32 -16 46 0 C32 14 10 14 0 0Z"
      fill={fill}
      opacity=".7"
      transform={`translate(${x} ${y}) rotate(${rot}) scale(${s})`}
    />
  );
}

function Lavender({ x, y, rot }: { x: number; y: number; rot: number }) {
  const buds = Array.from({ length: 9 }, (_, i) => i);
  return (
    <g transform={`translate(${x} ${y}) rotate(${rot})`}>
      <path d="M0 0 L0 -86" stroke="#7f9a72" strokeWidth="1.6" fill="none" />
      {buds.map((i) => (
        <g key={i}>
          <ellipse cx={-4} cy={-40 - i * 6} rx={4.5} ry={3} fill="#9c8cc9" opacity=".75" transform={`rotate(-25 -4 ${-40 - i * 6})`} />
          <ellipse cx={4} cy={-43 - i * 6} rx={4.5} ry={3} fill="#b3a5d8" opacity=".75" transform={`rotate(25 4 ${-43 - i * 6})`} />
        </g>
      ))}
    </g>
  );
}

export default function Floral({ className = "" }: { className?: string }) {
  return (
    <svg className={`floral ${className}`} viewBox="0 0 220 220" aria-hidden="true" focusable="false">
      <defs>
        <filter id="wc" x="-10%" y="-10%" width="120%" height="120%">
          <feGaussianBlur stdDeviation=".7" />
        </filter>
      </defs>
      <g filter="url(#wc)">
        <path d="M0 40 C60 40 100 80 120 150" stroke="#7f9a72" strokeWidth="2" fill="none" opacity=".7" />
        <path d="M30 0 C40 60 80 100 150 120" stroke="#7f9a72" strokeWidth="2" fill="none" opacity=".7" />
        <Leaf x={40} y={48} rot={25} s={1.1} />
        <Leaf x={76} y={72} rot={50} />
        <Leaf x={98} y={110} rot={75} s={1.1} fill="#9bb38a" />
        <Leaf x={50} y={28} rot={70} s={0.9} fill="#9bb38a" />
        <Leaf x={80} y={66} rot={95} s={0.9} />
        <Leaf x={118} y={104} rot={28} s={1} fill="#9bb38a" />
        <Lavender x={20} y={112} rot={150} />
        <Lavender x={120} y={14} rot={105} />
        <Rose x={34} y={36} r={30} c1="#f2b8c0" c2="#e48fa0" />
        <Rose x={92} y={64} r={20} c1="#f7cdd2" c2="#eba3b0" />
        <Rose x={20} y={96} r={15} c1="#f7cdd2" c2="#e48fa0" />
        <Rose x={128} y={36} r={14} c1="#f2b8c0" c2="#eba3b0" />
        {[[66, 22], [58, 100], [112, 86], [10, 66], [150, 62]].map(([cx, cy], i) => (
          <circle key={i} cx={cx} cy={cy} r={3 + (i % 2)} fill="#fff" opacity=".85" />
        ))}
      </g>
    </svg>
  );
}
