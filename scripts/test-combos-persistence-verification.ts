import { prisma } from "../src/lib/prisma";
import { parseProductMetadata, serializeProductMetadata } from "../src/lib/productMetadata";
import {
  getPublicCombosAction,
  getComboByIdAction,
  getAllCombosAdminAction,
} from "../src/actions/combos";

async function runVerification() {
  console.log("================================================================================");
  console.log("VERIFICACIÓN RIGUROSA: PERSISTENCIA DE INFORMACIÓN TÉCNICA EN COMBOS");
  console.log("================================================================================");

  const initialDesc = "Mantenimiento premium para motores 150cc y 200cc. Incluye componentes certificados.";

  // -----------------------------------------------------------------------------------------
  // 1. Que la descripción original no se pierda ni se duplique al agregar specs o motos
  // -----------------------------------------------------------------------------------------
  console.log("\n[PUNTO 1 & 4] Creando combo inicial con texto plano sin información técnica...");
  const comboCreated = await prisma.comboEcommerce.create({
    data: {
      nombre: "Combo Test Verificación Persistencia",
      slug: "combo-test-verificacion-persistencia",
      descripcion: serializeProductMetadata({ texto: initialDesc }),
      badge: "Edición Limitada",
      precio: 45000,
      precioRegular: 55000,
      imagen: "/combos/combo-service-motul.jpg",
      activo: true,
      orden: 9998,
    },
  });
  const comboId = comboCreated.id;
  console.log(`   ✓ Combo creado con ID: ${comboId}`);

  // Verificar que al guardarse sin specs ni motos, se almacena como texto plano
  const dbRow1 = await prisma.comboEcommerce.findUnique({ where: { id: comboId } });
  console.log(`   - En DB (crudo): "${dbRow1?.descripcion}"`);
  if (dbRow1?.descripcion !== initialDesc) {
    console.error(`   ❌ ERROR: Se esperaba texto plano directo "${initialDesc}", se obtuvo: "${dbRow1?.descripcion}"`);
    process.exit(1);
  }

  // Ahora simulamos agregar especificaciones y motos
  console.log("\n[PUNTO 1 & 3] Agregando especificaciones y motos compatibles...");
  const specsV1 = [
    { caracteristica: "Material", valor: "Acero al Cromo" },
    { caracteristica: "Origen", valor: "Japón" },
  ];
  const motosV1 = ["Honda CG 150 Titan", "Yamaha YBR 125"];

  const serializedV1 = serializeProductMetadata({
    texto: initialDesc,
    especificaciones: specsV1,
    motosCompatibles: motosV1,
  });

  await prisma.comboEcommerce.update({
    where: { id: comboId },
    data: {
      descripcion: serializedV1,
    },
  });

  const retrievedV1 = await getComboByIdAction(comboId);
  if (!retrievedV1) {
    console.error("   ❌ ERROR: No se pudo recuperar el combo V1");
    process.exit(1);
  }

  console.log(`   - Descripción recuperada: "${retrievedV1.descripcion}"`);
  console.log(`   - Especificaciones (${retrievedV1.especificaciones?.length}):`, retrievedV1.especificaciones);
  console.log(`   - Motos (${retrievedV1.motosCompatibles?.length}):`, retrievedV1.motosCompatibles);

  if (retrievedV1.descripcion !== initialDesc) {
    console.error(`   ❌ ERROR: La descripción original se alteró. Esperado: "${initialDesc}", Obtenido: "${retrievedV1.descripcion}"`);
    process.exit(1);
  }
  if (retrievedV1.especificaciones?.length !== 2 || retrievedV1.motosCompatibles?.length !== 2) {
    console.error("   ❌ ERROR: Especificaciones o motos no coinciden con lo cargado.");
    process.exit(1);
  }
  console.log("   ✓ Punto 1 superado: la descripción no se perdió ni se duplicó.");

  // -----------------------------------------------------------------------------------------
  // 2. Que al editar y guardar varias veces un combo se conserven correctamente todos los datos
  // -----------------------------------------------------------------------------------------
  console.log("\n[PUNTO 2] Probando 5 guardados y ediciones consecutivas...");

  // Guardado 2: Guardado idempotente (mismo contenido simulando re-guardar sin cambios)
  const metaRoundtrip2 = parseProductMetadata(retrievedV1.descripcion);
  // Simular lo que hace upsertComboAction cuando recibe la descripción recuperada
  const serializedV2 = serializeProductMetadata({
    texto: parseProductMetadata(retrievedV1.descripcion).texto,
    especificaciones: retrievedV1.especificaciones,
    motosCompatibles: retrievedV1.motosCompatibles,
  });
  await prisma.comboEcommerce.update({
    where: { id: comboId },
    data: { descripcion: serializedV2 },
  });
  const retrievedV2 = await getComboByIdAction(comboId);
  if (retrievedV2?.descripcion !== initialDesc || retrievedV2?.especificaciones?.length !== 2) {
    console.error("   ❌ ERROR en Guardado 2 (idempotencia falló)");
    process.exit(1);
  }
  console.log("   ✓ Guardado consecutivo 2 (idempotente) OK");

  // Guardado 3: Modificar una especificación y agregar una moto compatible
  const specsV3 = [
    { caracteristica: "Material", valor: "Acero Templado 1045" }, // modificado
    { caracteristica: "Origen", valor: "Japón" },
    { caracteristica: "Garantía", valor: "6 meses oficial" }, // nuevo
  ];
  const motosV3 = ["Honda CG 150 Titan", "Yamaha YBR 125", "Motomel S2 150"]; // agregado Motomel
  const serializedV3 = serializeProductMetadata({
    texto: initialDesc,
    especificaciones: specsV3,
    motosCompatibles: motosV3,
  });
  await prisma.comboEcommerce.update({
    where: { id: comboId },
    data: { descripcion: serializedV3 },
  });
  const retrievedV3 = await getComboByIdAction(comboId);
  if (
    retrievedV3?.descripcion !== initialDesc ||
    retrievedV3?.especificaciones?.length !== 3 ||
    retrievedV3?.especificaciones[0].valor !== "Acero Templado 1045" ||
    retrievedV3?.motosCompatibles?.length !== 3
  ) {
    console.error("   ❌ ERROR en Guardado 3 (modificación / adición)");
    process.exit(1);
  }
  console.log("   ✓ Guardado consecutivo 3 (modificación de specs y agregado de motos) OK");

  // Guardado 4: Eliminar especificaciones y motos
  const specsV4 = [{ caracteristica: "Material", valor: "Acero Templado 1045" }]; // reducidas a 1
  const motosV4 = ["Honda CG 150 Titan"]; // reducidas a 1
  const serializedV4 = serializeProductMetadata({
    texto: initialDesc,
    especificaciones: specsV4,
    motosCompatibles: motosV4,
  });
  await prisma.comboEcommerce.update({
    where: { id: comboId },
    data: { descripcion: serializedV4 },
  });
  const retrievedV4 = await getComboByIdAction(comboId);
  if (
    retrievedV4?.descripcion !== initialDesc ||
    retrievedV4?.especificaciones?.length !== 1 ||
    retrievedV4?.motosCompatibles?.length !== 1
  ) {
    console.error("   ❌ ERROR en Guardado 4 (eliminación)");
    process.exit(1);
  }
  console.log("   ✓ Guardado consecutivo 4 (eliminación de specs y motos) OK");

  // Guardado 5: Eliminar TODAS las especificaciones y motos (vuelve a texto plano limpio)
  const serializedV5 = serializeProductMetadata({
    texto: initialDesc,
    especificaciones: [],
    motosCompatibles: [],
  });
  await prisma.comboEcommerce.update({
    where: { id: comboId },
    data: { descripcion: serializedV5 },
  });
  const dbRow5 = await prisma.comboEcommerce.findUnique({ where: { id: comboId } });
  if (dbRow5?.descripcion !== initialDesc) {
    console.error("   ❌ ERROR en Guardado 5: al vaciar specs y motos debería guardar texto plano directo.");
    process.exit(1);
  }
  const retrievedV5 = await getComboByIdAction(comboId);
  if (
    retrievedV5?.descripcion !== initialDesc ||
    (retrievedV5?.especificaciones && retrievedV5.especificaciones.length > 0) ||
    (retrievedV5?.motosCompatibles && retrievedV5.motosCompatibles.length > 0)
  ) {
    console.error("   ❌ ERROR en Guardado 5: los arrays deben estar vacíos.");
    process.exit(1);
  }
  console.log("   ✓ Guardado consecutivo 5 (vaciar specs y motos regresa limpiamente a texto plano) OK");

  // -----------------------------------------------------------------------------------------
  // 5. Que el detalle público muestre únicamente los datos cargados, sin exponer metadatos internos
  // -----------------------------------------------------------------------------------------
  console.log("\n[PUNTO 5] Verificando que combos sin descripción textual NO filtren JSON crudo...");
  const noDescSpecs = [{ caracteristica: "Garantía", valor: "1 Año" }];
  const noDescMotos = ["Honda Tornado 250"];
  const serializedNoDesc = serializeProductMetadata({
    texto: "", // Sin texto descriptivo
    especificaciones: noDescSpecs,
    motosCompatibles: noDescMotos,
  });
  await prisma.comboEcommerce.update({
    where: { id: comboId },
    data: { descripcion: serializedNoDesc },
  });

  const retrievedNoDesc = await getComboByIdAction(comboId);
  console.log(`   - Combo sin texto en DB:`);
  console.log(`     * Campo descripcion devuelto:`, retrievedNoDesc?.descripcion);
  console.log(`     * Specs:`, retrievedNoDesc?.especificaciones);
  console.log(`     * Motos:`, retrievedNoDesc?.motosCompatibles);

  if (retrievedNoDesc?.descripcion !== null) {
    console.error(`   ❌ ERROR CRÍTICO: La descripción no es null cuando texto="", se expuso: "${retrievedNoDesc?.descripcion}"`);
    process.exit(1);
  }
  if (retrievedNoDesc?.especificaciones?.length !== 1 || retrievedNoDesc?.motosCompatibles?.length !== 1) {
    console.error("   ❌ ERROR: No se recuperaron las specs o motos.");
    process.exit(1);
  }
  console.log("   ✓ Punto 5 superado: Jamás se expone JSON crudo al público.");

  // -----------------------------------------------------------------------------------------
  // 6. Que combos existentes sin información técnica sigan funcionando normalmente
  // -----------------------------------------------------------------------------------------
  console.log("\n[PUNTO 4 & 6] Verificando combos existentes en la base de datos...");
  const allCombos = await getPublicCombosAction();
  console.log(`   - Total combos leídos: ${allCombos.length}`);
  for (const c of allCombos) {
    if (c.descripcion && c.descripcion.startsWith("{") && c.descripcion.endsWith("}")) {
      console.error(`   ❌ ERROR: El combo ID ${c.id} expone JSON en su descripción: "${c.descripcion}"`);
      process.exit(1);
    }
  }
  console.log("   ✓ Todos los combos existentes devuelven descripciones limpias o nulas sin JSON.");

  // -----------------------------------------------------------------------------------------
  // Limpieza
  // -----------------------------------------------------------------------------------------
  console.log("\nLimpiando registro de prueba...");
  await prisma.comboEcommerce.delete({ where: { id: comboId } });
  console.log(`   ✓ Registro ${comboId} eliminado.`);

  console.log("\n================================================================================");
  console.log("TODAS LAS VERIFICACIONES DE PERSISTENCIA COMPLETADAS EXITOSAMENTE (6/6)");
  console.log("================================================================================");
}

runVerification().catch((e) => {
  console.error("Error fatal en verificación:", e);
  process.exit(1);
});
