import React from "react";
import { getPublicCombosAction } from "@/actions/combos";
import CombosClient from "./CombosClient";

export default async function CombosPage() {
  const combos = await getPublicCombosAction();

  return <CombosClient initialCombos={combos} />;
}
