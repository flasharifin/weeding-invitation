import { redirect } from "next/navigation";
import { getRole } from "@/lib/auth";
import Scanner from "./Scanner";

export default async function ScanPage() {
  const role = await getRole();
  if (!role) redirect("/login?next=/scan");
  return <Scanner />;
}
