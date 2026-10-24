import { prisma } from "../src/lib/prisma";
import {
  getPublicCombosAction,
  getComboByIdAction,
  getAllCombosAdminAction,
} from "../src/actions/combos";

async function runVisibilityTests() {
  console.log("================================================================================");
  console.log("TEST: REVISIÓN DE PUBLICACIÓN Y VISIBILIDAD DE COMBOS");
  console.log("================================================================================");

  // 1. Crear combo con activo: true y destacado: true
  console.log("\n1. Creando combo de prueba publicado y destacado...");
  const created = await prisma.comboEcommerce.create({
    data: {
      nombre: "Combo Test Visibilidad & Destacado",
      slug: "combo-test-visibilidad-destacado",
      descripcion: "Descripción para prueba de visibilidad",
      badge: "⭐ Recomendado Posadas",
      precio: 35000,
      precioRegular: 45000, // En oferta real
      imagen: "/combos/combo-service-motul.jpg",
      activo: true,
      destacado: true,
      orden: 1,
    },
  });
  const comboId = created.id;
  console.log(`   ✓ Combo creado con ID: ${comboId}`);

  // 2. Verificar en getPublicCombosAction()
  console.log("\n2. Verificando getPublicCombosAction() (debe aparecer y estar primero por ser destacado)...");
  const publicCombos = await getPublicCombosAction();
  const foundInPublic = publicCombos.find((c) => c.id === comboId);
  if (!foundInPublic) {
    console.error("   ❌ ERROR: El combo publicado debería aparecer en getPublicCombosAction()");
    process.exit(1);
  }
  console.log(`   ✓ Combo encontrado en lista pública. Posición: ${publicCombos.indexOf(foundInPublic)} (de ${publicCombos.length})`);
  if (foundInPublic.destacado !== true) {
    console.error("   ❌ ERROR: El combo debería tener destacado: true");
    process.exit(1);
  }
  if (!foundInPublic.enOferta || foundInPublic.descuentoPorcentaje !== 22) {
    console.error("   ❌ ERROR: Estado de oferta o descuento no calculado correctamente:", foundInPublic);
    process.exit(1);
  }
  console.log(`   ✓ En oferta calculada: ${foundInPublic.enOferta}, Descuento: ${foundInPublic.descuentoPorcentaje}% OFF, Ahorro: $${foundInPublic.ahorro}`);

  // 3. Pausar combo (activo: false)
  console.log("\n3. Pausando combo (activo: false)...");
  await prisma.comboEcommerce.update({
    where: { id: comboId },
    data: { activo: false },
  });

  // Verificar que NO aparece en getPublicCombosAction()
  const publicAfterPause = await getPublicCombosAction();
  const foundAfterPause = publicAfterPause.find((c) => c.id === comboId);
  if (foundAfterPause) {
    console.error("   ❌ ERROR: Un combo con activo=false NO debe aparecer en getPublicCombosAction()");
    process.exit(1);
  }
  console.log("   ✓ El combo pausado NO aparece en getPublicCombosAction() (oculto en tienda y catálogo)");

  // Verificar que SÍ aparece en getComboByIdAction() con activo: false
  const directCombo = await getComboByIdAction(comboId);
  if (!directCombo || directCombo.activo !== false) {
    console.error("   ❌ ERROR: getComboByIdAction() debería devolver el combo con activo=false para administración");
    process.exit(1);
  }
  console.log("   ✓ getComboByIdAction() devuelve el combo con activo=false.");

  // 4. Cambiar destacado a false y reactivar
  console.log("\n4. Modificando visibilidad: reactivar (activo: true) y quitar destacado (destacado: false)...");
  await prisma.comboEcommerce.update({
    where: { id: comboId },
    data: { activo: true, destacado: false },
  });

  const updatedCombo = await getComboByIdAction(comboId);
  if (!updatedCombo || updatedCombo.activo !== true || updatedCombo.destacado !== false) {
    console.error("   ❌ ERROR: Estados no se guardaron correctamente");
    process.exit(1);
  }
  console.log("   ✓ Estados actualizados correctamente (activo=true, destacado=false)");

  // Verificar que todos los demás campos siguen intactos
  if (
    updatedCombo.nombre !== "Combo Test Visibilidad & Destacado" ||
    updatedCombo.precio !== 35000 ||
    updatedCombo.precioRegular !== 45000 ||
    updatedCombo.badge !== "⭐ Recomendado Posadas"
  ) {
    console.error("   ❌ ERROR: Se alteraron otros campos del combo:", updatedCombo);
    process.exit(1);
  }
  console.log("   ✓ Integridad de campos preservada (nombre, precios, badge, etc.)");

  // 5. Limpieza
  console.log("\n5. Limpieza del combo de prueba...");
  await prisma.comboEcommerce.delete({ where: { id: comboId } });
  console.log(`   ✓ Combo de prueba ID ${comboId} eliminado.`);

  console.log("\n================================================================================");
  console.log("TODAS LAS PRUEBAS DE PUBLICACIÓN Y VISIBILIDAD PASARON EXITOSAMENTE");
  console.log("================================================================================");
}

runVisibilityTests().catch((e) => {
  console.error("Error fatal en pruebas:", e);
  process.exit(1);
});
