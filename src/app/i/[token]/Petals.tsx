// Kelopak yang jatuh pelan. Nilai dihitung deterministik dari indeks (tanpa Math.random)
// agar HTML server dan client sama.
const COUNT = 16;

export default function Petals({ top }: { top: boolean }) {
  return (
    <div className={top ? "petals top" : "petals"} aria-hidden>
      {Array.from({ length: COUNT }, (_, i) => (
        <span
          key={i}
          className="petal"
          style={{
            left: `${(i * 37 + 8) % 100}%`,
            width: 9 + ((i * 7) % 9),
            height: 9 + ((i * 7) % 9),
            animationDuration: `${12 + ((i * 5) % 9)}s`,
            animationDelay: `-${(i * 3) % 15}s`,
          }}
        >
          <i
            className={i % 3 === 0 ? "gold" : ""}
            style={{ animationDuration: `${3 + (i % 4)}s`, animationDelay: `-${i % 3}s` }}
          />
        </span>
      ))}
    </div>
  );
}
