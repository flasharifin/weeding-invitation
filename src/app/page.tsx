import Link from "next/link";
import { event } from "@/lib/config";

export default function Home() {
  return (
    <main className="garden-site garden-home">
      <p className="garden-eyebrow">The wedding of</p>
      <h1 className="garden-names">{event.bride}<span>&amp; {event.groom}</span></h1>
      <p>{event.dateText}</p>
      <p>Silakan buka tautan undangan pribadi yang dikirimkan kepada Anda.</p>
      <Link className="btn ghost" href="/preview">Lihat Preview Undangan</Link>
    </main>
  );
}
