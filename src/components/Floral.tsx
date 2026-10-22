// Ornamen bunga cat air domain publik (Redouté, "Choix des plus belles fleurs", 1827).
// Latar kertas sudah dipotong jadi transparan. Satu <Floral> = satu posisi.

type Spot =
  | "cover-tl" | "cover-tr" | "cover-bl" | "cover-br"
  | "page-tl" | "page-br";

// Tangkai bunga tegak; di sudut atas dibuat menjuntai ke bawah, di sudut
// bawah tumbuh ke atas. Ukuran & rotasi disetel per posisi.
const CLUSTERS: Record<Spot, { src: string; style: React.CSSProperties; delay?: number }[]> = {
  "cover-tl": [
    { src: "roses-white", style: { width: "74%", left: "-14%", top: "-16%", transform: "rotate(205deg)" } },
    { src: "blossoms", style: { width: "46%", left: "30%", top: "-10%", transform: "rotate(150deg)" }, delay: 1 },
  ],
  "cover-tr": [
    { src: "rose-branch", style: { width: "70%", right: "-14%", top: "-14%", transform: "scaleX(-1) rotate(205deg)" } },
    { src: "sprig", style: { width: "44%", right: "28%", top: "-8%", transform: "rotate(165deg)" }, delay: 1 },
  ],
  "cover-bl": [
    { src: "rose-yellow", style: { width: "66%", left: "-12%", bottom: "-14%", transform: "rotate(-12deg)" } },
    { src: "lily-pink", style: { width: "42%", left: "30%", bottom: "-8%", transform: "rotate(16deg)" }, delay: 2 },
  ],
  "cover-br": [
    { src: "roses-white", style: { width: "70%", right: "-14%", bottom: "-14%", transform: "scaleX(-1) rotate(10deg)" } },
    { src: "blossoms", style: { width: "42%", right: "28%", bottom: "-6%", transform: "rotate(-18deg)" }, delay: 2 },
  ],
  "page-tl": [
    { src: "rose-branch", style: { width: "64%", left: "-14%", top: "-14%", transform: "rotate(200deg)" } },
    { src: "blossoms", style: { width: "40%", left: "26%", top: "-8%", transform: "rotate(150deg)" }, delay: 1 },
  ],
  "page-br": [
    { src: "rose-yellow", style: { width: "60%", right: "-12%", bottom: "-12%", transform: "scaleX(-1) rotate(-10deg)" } },
    { src: "sprig", style: { width: "40%", right: "26%", bottom: "-6%", transform: "rotate(14deg)" }, delay: 2 },
  ],
};

export default function Floral({ spot, className = "" }: { spot: Spot; className?: string }) {
  return (
    <div className={`floral ${spot} ${className}`} aria-hidden="true">
      {CLUSTERS[spot].map((f, i) => (
        <img
          key={i}
          src={`/floral/${f.src}.webp`}
          alt=""
          className="fl-img"
          style={{ ...f.style, animationDelay: `${(f.delay ?? 0) * 1.3}s` }}
          draggable={false}
        />
      ))}
    </div>
  );
}
