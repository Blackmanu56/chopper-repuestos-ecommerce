import React from "react";
import { notFound } from "next/navigation";
import { getComboByIdAction, getPublicCombosAction } from "@/actions/combos";
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

  const allCombos = await getPublicCombosAction();
  const otherCombos = allCombos.filter((c) => c.id !== combo.id);

  return <ComboDetailClient combo={combo} otherCombos={otherCombos} />;
}
