import { notFound } from "next/navigation";
import { getGuestByToken, listWishes } from "@/lib/db";
import { event } from "@/lib/config";
import Qr from "./Qr";
import Rsvp from "./Rsvp";
import Countdown from "./Countdown";
import Shell from "./Shell";
import Wishes from "./Wishes";
import Gallery from "./Gallery";
import Photo from "@/components/Photo";
import Reveal from "./Reveal";

const d = (n: number) => ({ "--d": n }) as React.CSSProperties;
const SPARKS = [[-6, 12], [96, 6], [102, 46], [-10, 58], [4, 92], [92, 88]];

export const dynamic = "force-dynamic";

export default async function Invitation({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const guest = await getGuestByToken(token);
  if (!guest) notFound();
  const wishes = await listWishes();

  return (
    <Shell name={guest.name} bride={event.bride} groom={event.groom} music={event.musicUrl}>
    <main className="invite">
      <section className="hero">
        <div className="arch-wrap hx" style={d(150)}>
          <div className="arch">
            <Photo src={event.photos.cover} alt={`${event.bride} & ${event.groom}`} sizes="(max-width: 520px) 70vw, 300px" priority />
          </div>
          {SPARKS.map(([l, t], i) => (
            <span key={i} className="spark" style={{ left: `${l}%`, top: `${t}%`, animationDelay: `${i * 0.45}s` }}>✦</span>
          ))}
        </div>
        <p className="eyebrow hx" style={d(500)}>The Wedding Of</p>
        <h1 className="script names hx" style={d(700)}>{event.bride} <span>&amp;</span> {event.groom}</h1>
        <p className="muted hx" style={d(950)}>{event.dateText}</p>
        <div className="to hx" style={d(1200)}>
          <p className="muted">Kepada Yth. Bapak/Ibu/Saudara/i</p>
          <h2>{guest.name}</h2>
          <p className="muted small">Mohon maaf apabila ada kesalahan penulisan nama/gelar</p>
        </div>
      </section>

      <Reveal as="section" className="block">
        <p className="quote">&ldquo;{event.quote}&rdquo;</p>
        <p className="muted small">{event.quoteSource}</p>
      </Reveal>

      <section className="block couple">
        <Reveal variant="left">
          <div className="portrait"><Photo src={event.photos.bride} alt={event.brideFull} sizes="180px" /></div>
          <h3 className="script">{event.brideFull}</h3>
          <p className="muted">{event.brideParents}</p>
        </Reveal>
        <Reveal variant="zoom" delay={150}><div className="amp script">&amp;</div></Reveal>
        <Reveal variant="right">
          <div className="portrait"><Photo src={event.photos.groom} alt={event.groomFull} sizes="180px" /></div>
          <h3 className="script">{event.groomFull}</h3>
          <p className="muted">{event.groomParents}</p>
        </Reveal>
      </section>

      <Reveal as="section" className="block">
        <Countdown target={event.dateISO} />
      </Reveal>

      {event.photos.gallery.length > 0 && (
        <Reveal as="section" className="block">
          <h3 className="script" style={{ fontSize: 32 }}>Galeri Kami</h3>
        <img className="divider" src="/floral/border.webp" alt="" />
          <Gallery photos={event.photos.gallery} />
        </Reveal>
      )}

      <Reveal as="section" className="block card">
        <h3>Acara</h3>
        <img className="divider" src="/floral/border.webp" alt="" />
        <p><strong>{event.dateText}</strong><br />{event.timeText}</p>
        <p><strong>{event.venue}</strong><br />{event.address}</p>
        <a className="btn" href={event.mapsUrl} target="_blank" rel="noreferrer">Buka Peta</a>
      </Reveal>

      <Reveal as="section" className="block card">
        <h3>Konfirmasi Kehadiran</h3>
        <img className="divider" src="/floral/border.webp" alt="" />
        <Rsvp token={guest.token} initial={guest.rsvp} />
      </Reveal>

      <Reveal as="section" className="block card">
        <h3>QR Code Check-in</h3>
        <img className="divider" src="/floral/border.webp" alt="" />
        <p className="muted small">
          Tunjukkan QR ini kepada petugas saat tiba di lokasi.
          QR hanya berlaku <strong>satu kali</strong> untuk {guest.pax} orang.
        </p>
        <Qr token={guest.token} name={guest.name} used={guest.checkedInAt} />
      </Reveal>

      <Reveal as="section" className="block card">
        <h3>Buku Ucapan</h3>
        <img className="divider" src="/floral/border.webp" alt="" />
        <Wishes token={guest.token} guestId={guest.id} initial={wishes} />
      </Reveal>

      <footer className="muted small">
        <p>Merupakan suatu kehormatan atas kehadiran dan doa restu Anda.</p>
        {event.musicCredit && <p className="credit">♫ {event.musicCredit}</p>}
      </footer>
    </main>
    </Shell>
  );
}
