import { redirect } from "next/navigation";

export default function ComprobantePage() {
  redirect("/panel?tab=comprobante");
}
