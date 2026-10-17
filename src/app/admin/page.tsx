import { redirect } from "next/navigation";
import { getRole } from "@/lib/auth";
import { listGuests, listWishes } from "@/lib/db";
import AdminClient from "./AdminClient";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const role = await getRole();
  if (role !== "admin") redirect(role === "staff" ? "/scan" : "/login?next=/admin");
  return <AdminClient initial={await listGuests()} initialWishes={await listWishes(200)} />;
}
