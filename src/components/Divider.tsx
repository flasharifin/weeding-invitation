// Pembatas ornamen emas: garis menipis + belah ketupat di tengah (CSS).
export default function Divider({ className = "" }: { className?: string }) {
  return (
    <div className={`divider ${className}`} aria-hidden="true">
      <i />
    </div>
  );
}
