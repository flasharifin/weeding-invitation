import Image from "next/image";

// Foto dioptimalkan Next.js (ukuran responsif, WebP/AVIF) agar ringan di HP.
// SVG (placeholder) tidak perlu dioptimalkan.
export default function Photo({
  src, alt, sizes, priority, className,
}: { src: string; alt: string; sizes: string; priority?: boolean; className?: string }) {
  return (
    <Image
      src={src} alt={alt} fill sizes={sizes} priority={priority} className={className}
      style={{ objectFit: "cover" }} unoptimized={src.endsWith(".svg")}
    />
  );
}
