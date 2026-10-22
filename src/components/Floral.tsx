// Ornamen bunga cat air. Aset diletakkan di sudut/tepi section.
// Satu <Floral> = satu rangkaian bunga di satu posisi.

type Spot =
  | "cover-tl" | "cover-tr" | "cover-bl" | "cover-br"
  | "page-tl" | "page-br";

// Tiap sudut dirangkai dari beberapa bunga agar terlihat bertumpuk alami.
const CLUSTERS: Record<Spot, { src: string; style: React.CSSProperties; delay?: number }[]> = {
  "cover-tl": [
    { src: "blossom", style: { width: "44%", left: "-10%", top: "-6%", transform: "rotate(-8deg)" } },
    { src: "lavender", style: { width: "26%", left: "26%", top: "-10%", transform: "rotate(18deg)" }, delay: 1 },
    { src: "cosmos", style: { width: "30%", left: "2%", top: "20%", transform: "rotate(-14deg)" }, delay: 2 },
  ],
  "cover-tr": [
    { src: "amaryllis", style: { width: "40%", right: "-8%", top: "-8%", transform: "rotate(14deg)" } },
    { src: "sprigs", style: { width: "30%", right: "22%", top: "-4%", transform: "rotate(-10deg)" }, delay: 2 },
  ],
  "cover-bl": [
    { src: "carnation-peach", style: { width: "34%", left: "-6%", bottom: "-8%", transform: "rotate(6deg)" } },
    { src: "violet", style: { width: "28%", left: "24%", bottom: "-4%", transform: "rotate(-12deg)" }, delay: 1 },
  ],
  "cover-br": [
    { src: "carnation-white", style: { width: "40%", right: "-8%", bottom: "-10%", transform: "rotate(-8deg)" } },
    { src: "lavender", style: { width: "24%", right: "26%", bottom: "-2%", transform: "scaleX(-1) rotate(12deg)" }, delay: 2 },
  ],
  "page-tl": [
    { src: "blossom", style: { width: "38%", left: "-8%", top: "-4%", transform: "rotate(-10deg)" } },
    { src: "sprigs", style: { width: "26%", left: "22%", top: "-6%", transform: "rotate(12deg)" }, delay: 1 },
  ],
  "page-br": [
    { src: "amaryllis", style: { width: "36%", right: "-8%", bottom: "-4%", transform: "rotate(10deg)" } },
    { src: "cosmos", style: { width: "26%", right: "22%", bottom: "-4%", transform: "scaleX(-1) rotate(-12deg)" }, delay: 2 },
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
