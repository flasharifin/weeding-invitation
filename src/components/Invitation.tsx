import { event } from "@/lib/config";
import type { Guest, Wish } from "@/lib/db";
import Shell from "@/app/i/[token]/Shell";
import Countdown from "@/app/i/[token]/Countdown";
import Rsvp from "@/app/i/[token]/Rsvp";
import Wishes from "@/app/i/[token]/Wishes";
import Qr from "@/app/i/[token]/Qr";
import Gallery from "@/app/i/[token]/Gallery";
import Reveal from "@/app/i/[token]/Reveal";
import Photo from "./Photo";
import Corners from "./Corners";
import Divider from "./Divider";

type InvitationGuest = Pick<Guest, "id" | "name" | "token" | "pax" | "rsvp" | "checkedInAt">;

function Heading({ eyebrow, children }: { eyebrow?: string; children: React.ReactNode }) {
  return <header className="garden-heading">
    <div className="crest" aria-hidden="true" />
    {eyebrow && <p className="garden-eyebrow">{eyebrow}</p>}
    <h2>{children}</h2>
  </header>;
}

function Scene() { return <div className="garden-landscape" aria-hidden="true" />; }

function Portrait({ src, name }: { src: string; name: string }) {
  return <div className="garden-portrait">
    {src.endsWith(".svg") ? <div className="garden-initial" aria-label={`Foto ${name} belum tersedia`}><span>{name[0]}</span></div>
      : <Photo src={src} alt={name} sizes="210px" />}
  </div>;
}

function calendarUrl() {
  const escape = (value: string) => value.replace(/\\/g, "\\\\").replace(/\n/g, "\\n").replace(/,/g, "\\,").replace(/;/g, "\\;");
  const start = new Date(event.dateISO).toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
  const data = ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//Panorama Digital//Wedding//ID", "BEGIN:VEVENT",
    `UID:wedding-${start}@panorama-digital`, `DTSTAMP:${start}`, `DTSTART:${start}`,
    `SUMMARY:${escape(`Pernikahan ${event.bride} & ${event.groom}`)}`,
    `LOCATION:${escape(`${event.venue}, ${event.address}`)}`,
    `DESCRIPTION:${escape(`${event.dateText}, ${event.timeText}`)}`, "END:VEVENT", "END:VCALENDAR"].join("\r\n");
  return `data:text/calendar;charset=utf-8,${encodeURIComponent(data)}`;
}

export default function Invitation({ guest, wishes = [], preview = false }: {
  guest: InvitationGuest; wishes?: Wish[]; preview?: boolean;
}) {
  const date = new Date(event.dateISO);
  const day = new Intl.DateTimeFormat("id-ID", { day: "2-digit", timeZone: "Asia/Jakarta" }).format(date);
  const monthYear = new Intl.DateTimeFormat("id-ID", { month: "long", year: "numeric", timeZone: "Asia/Jakarta" }).format(date);
  const weekday = new Intl.DateTimeFormat("id-ID", { weekday: "long", timeZone: "Asia/Jakarta" }).format(date);
  const shortDate = new Intl.DateTimeFormat("id-ID", { day: "2-digit", month: "2-digit", year: "numeric", timeZone: "Asia/Jakarta" }).format(date).replaceAll("/", " · ");

  return (
    <Shell name={guest.name} bride={event.bride} groom={event.groom} date={shortDate} music={event.musicUrl} preview={preview}>
      <main className="garden-invitation" id="undangan">
        <section className="garden-hero" aria-labelledby="wedding-names">
          <div className="garden-hero-copy">
            <p className="garden-eyebrow">Together, by the grace of Allah</p>
            <h1 className="garden-names" id="wedding-names">{event.bride}<span>&amp; {event.groom}</span></h1>
            <Divider />
            <p className="garden-date">{event.dateText}</p>
            <a href="#mempelai" className="garden-scroll">Jelajahi undangan <span aria-hidden="true">↓</span></a>
          </div>
        </section>

        <section className="garden-section garden-quote">
          <Corners />
          <Reveal>
            <p className="garden-bismillah" lang="ar" dir="rtl">بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ</p>
            <p className="garden-eyebrow">Dalam ikatan yang diridai-Nya</p>
            <blockquote>“{event.quote}”</blockquote>
            <Divider />
            <p className="garden-verse">{event.quoteSource}</p>
          </Reveal>
        </section>

        <section id="mempelai" className="garden-section garden-couple">
          <Corners />
          <Reveal>
            <Heading eyebrow="Dengan penuh syukur dan bahagia">Mempelai</Heading>
            <p className="garden-intro">Dengan memohon rahmat dan rida Allah SWT,<br />kami bermaksud menyelenggarakan pernikahan kami.</p>
            <div className="garden-person">
              <Portrait src={event.photos.bride} name={event.bride} />
              <h3 className="garden-script">{event.bride}</h3>
              <p className="garden-fullname">{event.brideFull}</p>
              <p className="garden-parents">{event.brideParents}</p>
            </div>
            <div className="garden-ampersand" aria-hidden="true">&amp;</div>
            <div className="garden-person">
              <Portrait src={event.photos.groom} name={event.groom} />
              <h3 className="garden-script">{event.groom}</h3>
              <p className="garden-fullname">{event.groomFull}</p>
              <p className="garden-parents">{event.groomParents}</p>
            </div>
          </Reveal>
          <Scene />
        </section>

        <section id="acara" className="garden-section garden-event">
          <Corners />
          <Reveal>
            <Heading eyebrow="Menghitung waktu menuju">Hari Bahagia</Heading>
            <Countdown target={event.dateISO} />
            <div className="garden-event-card">
              <div className="crest" aria-hidden="true" />
              <h3>Resepsi Pernikahan</h3>
              <p className="garden-weekday">{weekday}</p>
              <p className="garden-day">{day}</p>
              <p className="garden-month">{monthYear}</p>
              <Divider />
              <p>{event.timeText}</p>
              <h4>{event.venue}</h4>
              <p className="garden-address">{event.address}</p>
              <div className="garden-event-actions">
                <a className="btn" href={event.mapsUrl} target="_blank" rel="noreferrer"><span aria-hidden="true">⌖</span> Lihat Lokasi</a>
                <a className="btn ghost" href={calendarUrl()} download="pernikahan-shinta-ryan.ics"><span aria-hidden="true">▦</span> Simpan Tanggal</a>
              </div>
            </div>
          </Reveal>
          <Scene />
        </section>

        {event.photos.gallery.length > 0 && <section id="galeri" className="garden-section garden-gallery-section">
          <Corners />
          <Reveal>
            <Heading eyebrow="Kisah yang akan selalu kami kenang">Momen Bersama</Heading>
            <p className="garden-intro">Setiap langkah membawa kami pada hari ini.</p>
            {event.photos.gallery.every((src) => src.endsWith(".svg")) ? (
              <div className="garden-gallery-placeholder">
                <div className="garden-gallery-monogram">{event.bride[0]} <span>&amp;</span> {event.groom[0]}</div>
                <p>Kenangan indah segera hadir di sini.</p>
              </div>
            ) : <Gallery photos={event.photos.gallery} />}
          </Reveal>
        </section>}

        <section id="rsvp" className="garden-section garden-rsvp">
          <Corners />
          <Reveal>
            <Heading>Konfirmasi <span className="garden-script">Kehadiran</span></Heading>
            <p className="garden-intro">Kami menantikan kehadiran Anda.<br />Mohon konfirmasi untuk melengkapi kebahagiaan kami.</p>
            <Rsvp token={guest.token} name={guest.name} pax={guest.pax} initial={guest.rsvp} preview={preview} />
            <Divider />
            <h2 className="garden-wishes-heading">Doa &amp; Ucapan</h2>
            <p className="garden-intro">Doa tulus Anda adalah hadiah terindah bagi kami.</p>
            <Wishes token={guest.token} guestId={guest.id} initial={wishes} preview={preview} />
          </Reveal>
          <Scene />
        </section>

        <section id="check-in" className="garden-section garden-checkin">
          <Corners />
          <Reveal>
            <Heading eyebrow="Sampai jumpa di hari bahagia">Tanda Kehadiran</Heading>
            <p className="garden-intro">Tunjukkan QR ini kepada petugas saat tiba di lokasi.<br />Berlaku satu kali untuk {guest.pax} orang.</p>
            {preview ? <div className="garden-qr-preview"><span aria-hidden="true">⌑</span><p>QR pribadi akan tampil<br />pada tautan undangan tamu.</p></div>
              : <Qr token={guest.token} name={guest.name} used={guest.checkedInAt} />}
          </Reveal>
        </section>

        <footer className="garden-section garden-footer">
          <Corners />
          <p className="garden-eyebrow">Atas kehadiran dan doa restu Anda</p>
          <h2 className="garden-script">Terima Kasih</h2>
          <p>Merupakan suatu kehormatan dan kebahagiaan bagi kami<br />untuk merayakan hari istimewa ini bersama Anda.</p>
          <p className="garden-signature">{event.bride} &amp; {event.groom}</p>
          <Divider />
          <p className="garden-made">DENGAN CINTA · PANORAMA DIGITAL</p>
          {event.musicCredit && <p className="garden-credit">{event.musicCredit}</p>}
          <Scene />
        </footer>
      </main>
    </Shell>
  );
}
