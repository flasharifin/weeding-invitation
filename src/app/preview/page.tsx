import Invitation from "@/components/Invitation";

export default function PreviewPage() {
  return <Invitation preview guest={{
    id: "preview", token: "", name: "Bapak/Ibu/Saudara/i", pax: 2,
    rsvp: null, checkedInAt: null,
  }} />;
}
