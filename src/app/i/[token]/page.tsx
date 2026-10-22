import { notFound } from "next/navigation";
import { getGuestByToken, listWishes } from "@/lib/db";
import Invitation from "@/components/Invitation";

export const dynamic = "force-dynamic";

export default async function InvitationPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const guest = await getGuestByToken(token);
  if (!guest) notFound();
  const wishes = await listWishes();
  return <Invitation guest={guest} wishes={wishes} />;
}
