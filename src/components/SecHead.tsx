// Kepala bagian: crest ornamen emas + judul (opsional).
export default function SecHead({ title }: { title?: string }) {
  return (
    <div className="sec-head">
      <div className="crest" aria-hidden="true" />
      {title && <h3>{title}</h3>}
    </div>
  );
}
