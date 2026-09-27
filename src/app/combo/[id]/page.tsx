import { redirect } from "next/navigation";

interface PageProps {
  params: Promise<{
    id: string;
  }>;
}

export default async function ComboAliasPage({ params }: PageProps) {
  const { id } = await params;
  redirect(`/combos/${id}`);
}
