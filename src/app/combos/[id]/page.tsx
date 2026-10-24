import React from "react";
import { notFound } from "next/navigation";
import { getComboByIdAction, getPublicCombosAction } from "@/actions/combos";
import { getServerSession } from "@/lib/session";
import ComboDetailClient from "./ComboDetailClient";

interface PageProps {
  params: Promise<{
    id: string;
  }>;
}

export default async function ComboDetailPage({ params }: PageProps) {
  const { id } = await params;
  const comboId = Number(id);

  if (isNaN(comboId)) {
    notFound();
  }

  const combo = await getComboByIdAction(comboId);

  if (!combo) {
    notFound();
  }

  // Si el combo no está activo (pausado/no publicado), solo el personal autorizado puede previsualizarlo
  if (!combo.activo) {
    const session = await getServerSession();
    if (!session || session.kind !== "STAFF") {
      notFound();
    }
  }

  const allCombos = await getPublicCombosAction();
  const otherCombos = allCombos.filter((c) => c.id !== combo.id);

  return <ComboDetailClient combo={combo} otherCombos={otherCombos} />;
}
