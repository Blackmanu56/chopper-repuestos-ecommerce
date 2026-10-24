import { prisma } from "../src/lib/prisma";
import { parseProductMetadata, serializeProductMetadata } from "../src/lib/productMetadata";
import {
  getPublicCombosAction,
  getComboByIdAction,
} from "../src/actions/combos";

async function runTests() {
  console.log("================================================================================");
  console.log("TEST: ESPECIFICACIONES TÉCNICAS Y MOTOS COMPATIBLES EN COMBOS");
  console.log("================================================================================");

  // 1. Test de serialización y parseo de metadata
  console.log("\n1. Verificando roundtrip de parseProductMetadata y serializeProductMetadata:");
  const testDesc = "Kit de transmisión completo reforzado";
  const testSpecs = [
    { caracteristica: "Material corona", valor: "Acero 1045" },
    { caracteristica: "Paso de cadena", valor: "428H x 118L" },
    { caracteristica: "Origen", valor: "Japón" },
  ];
  const testMotos = ["Honda CG 150 Titan", "Yamaha YBR 125", "Motomel S2 150"];

  const serialized = serializeProductMetadata({
    texto: testDesc,
    especificaciones: testSpecs,
    motosCompatibles: testMotos,
  });

  console.log("   - Serializado:", serialized);
  if (!serialized) {
    console.error("   ❌ ERROR: serializeProductMetadata retornó null");
    process.exit(1);
  }

  const parsed = parseProductMetadata(serialized);
  if (parsed.texto !== testDesc) {
    console.error(`   ❌ ERROR: texto esperado "${testDesc}", obtenido "${parsed.texto}"`);
    process.exit(1);
  }
  if (parsed.especificaciones.length !== 3 || parsed.especificaciones[0].caracteristica !== "Material corona") {
    console.error("   ❌ ERROR: especificaciones no coinciden:", parsed.especificaciones);
    process.exit(1);
  }
  if (parsed.motosCompatibles.length !== 3 || !parsed.motosCompatibles.includes("Honda CG 150 Titan")) {
    console.error("   ❌ ERROR: motosCompatibles no coinciden:", parsed.motosCompatibles);
    process.exit(1);
  }
  console.log("   ✓ Roundtrip de metadata exitoso: texto, especificaciones y motosCompatibles intactos.");

  // 2. Test con combos existentes en DB
  console.log("\n2. Verificando lectura de combos existentes desde DB:");
  const publicCombos = await getPublicCombosAction();
  console.log(`   - Total combos públicos: ${publicCombos.length}`);
  
  for (const c of publicCombos) {
    console.log(`   - Combo [${c.id}] "${c.nombre}":`);
    console.log(`     * Specs: ${c.especificaciones?.length || 0}`);
    console.log(`     * Motos compatibles: ${c.motosCompatibles?.length || 0}`);
    if (c.especificaciones && !Array.isArray(c.especificaciones)) {
      console.error(`   ❌ ERROR: especificaciones no es array en combo ${c.id}`);
      process.exit(1);
    }
    if (c.motosCompatibles && !Array.isArray(c.motosCompatibles)) {
      console.error(`   ❌ ERROR: motosCompatibles no es array en combo ${c.id}`);
      process.exit(1);
    }
  }
  console.log("   ✓ Todos los combos leídos tienen especificaciones y motosCompatibles válidos.");

  // 3. Test de persistencia de specs y motos en ComboEcommerce
  console.log("\n3. Verificando persistencia y lectura de especificaciones y compatibilidad:");
  const testDescMetadata = serializeProductMetadata({
    texto: "Descripción de prueba para combo técnico",
    especificaciones: testSpecs,
    motosCompatibles: testMotos,
  });

  const createdCombo = await prisma.comboEcommerce.create({
    data: {
      nombre: "Combo Test Automatizado Specs & Motos",
      slug: "combo-test-automatizado-specs-motos",
      descripcion: testDescMetadata,
      badge: "Test Automático",
      precio: 25000,
      precioRegular: 30000,
      imagen: "/combos/combo-service-motul.jpg",
      activo: true,
      orden: 9999,
    },
  });

  const createdId = createdCombo.id;
  console.log(`   - Combo de prueba creado con ID: ${createdId}`);

  // Recuperamos con getComboByIdAction
  const retrieved = await getComboByIdAction(createdId);
  if (!retrieved) {
    console.error("   ❌ ERROR: Combo de prueba no encontrado tras crearlo");
    process.exit(1);
  }

  console.log(`   - Combo recuperado con getComboByIdAction:`);
  console.log(`     * Descripción limpia: "${retrieved.descripcion}"`);
  console.log(`     * Specs (${retrieved.especificaciones?.length}):`, retrieved.especificaciones);
  console.log(`     * Motos (${retrieved.motosCompatibles?.length}):`, retrieved.motosCompatibles);

  if (retrieved.descripcion !== "Descripción de prueba para combo técnico") {
    console.error("   ❌ ERROR: La descripción limpia no coincide!");
    process.exit(1);
  }
  if (!retrieved.especificaciones || retrieved.especificaciones.length !== 3) {
    console.error("   ❌ ERROR: Especificaciones no coinciden!");
    process.exit(1);
  }
  if (!retrieved.motosCompatibles || retrieved.motosCompatibles.length !== 3) {
    console.error("   ❌ ERROR: Motos compatibles no coinciden!");
    process.exit(1);
  }

  console.log("   ✓ Guardado, persistencia en DB y recuperación por ID verificados con éxito.");

  // 4. Test de actualización (modificar specs y motos)
  console.log("\n4. Verificando edición y actualización de specs y motos:");
  const updatedSpecs = [
    { caracteristica: "Material", valor: "Titanio" },
  ];
  const updatedMotos = ["Honda Wave 110S"];
  const updatedDescMetadata = serializeProductMetadata({
    texto: "Descripción actualizada",
    especificaciones: updatedSpecs,
    motosCompatibles: updatedMotos,
  });

  await prisma.comboEcommerce.update({
    where: { id: createdId },
    data: {
      nombre: "Combo Test Automatizado Specs & Motos (Editado)",
      descripcion: updatedDescMetadata,
      badge: "Test Editado",
      precio: 27000,
      precioRegular: 32000,
    },
  });

  const retrievedUpdated = await getComboByIdAction(createdId);
  if (!retrievedUpdated) {
    console.error("   ❌ ERROR al recuperar combo editado");
    process.exit(1);
  }

  if (retrievedUpdated.especificaciones?.length !== 1 || retrievedUpdated.especificaciones[0].valor !== "Titanio") {
    console.error("   ❌ ERROR: Especificaciones editadas no coinciden:", retrievedUpdated.especificaciones);
    process.exit(1);
  }
  if (retrievedUpdated.motosCompatibles?.length !== 1 || retrievedUpdated.motosCompatibles[0] !== "Honda Wave 110S") {
    console.error("   ❌ ERROR: Motos editadas no coinciden:", retrievedUpdated.motosCompatibles);
    process.exit(1);
  }
  console.log("   ✓ Edición de especificaciones y motos verificada con éxito.");

  // Limpieza del combo de prueba
  console.log("\n5. Limpieza de datos de prueba:");
  await prisma.comboEcommerce.delete({
    where: { id: createdId },
  });
  console.log(`   ✓ Combo de prueba ID ${createdId} eliminado correctamente.`);

  console.log("\n================================================================================");
  console.log("TODAS LAS PRUEBAS DE ESPECIFICACIONES Y MOTOS COMPATIBLES PASARON EXITOSAMENTE");
  console.log("================================================================================");
}

runTests().catch((e) => {
  console.error("Fatal error running tests:", e);
  process.exit(1);
});
