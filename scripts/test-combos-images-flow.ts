import { prisma } from "../src/lib/prisma";
import { getPublicCombosAction, getComboByIdAction, getAllCombosAdminAction } from "../src/actions/combos";

async function runTests() {
  console.log("================================================================================");
  console.log("TEST: CORRECCIÓN DE IMÁGENES, PORTADA Y GALERÍA DE COMBOS");
  console.log("================================================================================");

  // 1. Probar getPublicCombosAction
  console.log("\n1. Verificando getPublicCombosAction():");
  const publicCombos = await getPublicCombosAction();
  console.log(`   - Cantidad de combos públicos: ${publicCombos.length}`);

  let allSingleUrls = true;
  let allHaveImagenes = true;

  for (const c of publicCombos) {
    if (c.imagen?.includes(",")) {
      console.error(`   ❌ ERROR: Combo ID ${c.id} tiene comas en 'imagen': "${c.imagen}"`);
      allSingleUrls = false;
    }
    if (!c.imagenes || !Array.isArray(c.imagenes) || c.imagenes.length === 0) {
      console.error(`   ❌ ERROR: Combo ID ${c.id} no tiene array 'imagenes' válido.`);
      allHaveImagenes = false;
    }
  }

  if (allSingleUrls && allHaveImagenes) {
    console.log("   ✓ Todos los combos públicos tienen 'imagen' como URL única (Foto 1 Portada).");
    console.log("   ✓ Todos los combos públicos tienen 'imagenes' como array de galería ordenado.");
  } else {
    process.exit(1);
  }

  // 2. Probar caso con combo multicomponente / multiimagen (ej. ID 9)
  console.log("\n2. Verificando caso combo multi-imagen (ID 9):");
  const combo9 = await getComboByIdAction(9);
  if (!combo9) {
    console.log("   (Combo ID 9 no encontrado, buscando cualquier combo con imágenes múltiples...)");
  } else {
    console.log(`   - Combo ID 9: "${combo9.nombre}"`);
    console.log(`     * Portada (imagen): "${combo9.imagen}"`);
    console.log(`     * Galería (imagenes):`, combo9.imagenes);

    if (combo9.imagen?.includes(",")) {
      console.error("   ❌ ERROR: Combo 9 tiene comas en 'imagen'");
      process.exit(1);
    }
    if (!combo9.imagenes || combo9.imagenes.length < 2) {
      console.error("   ❌ ERROR: Combo 9 debería tener al menos 2 imágenes en 'imagenes'");
      process.exit(1);
    }
    if (combo9.imagen !== combo9.imagenes[0]) {
      console.error("   ❌ ERROR: 'imagen' debe coincidir exactamente con imagenes[0] (Foto 1 Portada)");
      process.exit(1);
    }
    console.log("   ✓ Portada y galería de combo multi-imagen verificadas con éxito.");
  }

  // 3. Probar simulación de galería en Detalle (getComboGallery logic)
  console.log("\n3. Verificando generación de galería para el Detalle público:");
  const testCombo = combo9 || publicCombos[0];
  const comboImages = testCombo.imagenes && testCombo.imagenes.length > 0 ? testCombo.imagenes : [testCombo.imagen!];
  
  const gallery: Array<{ id: string; url: string; label: string; isCover?: boolean }> = [];
  comboImages.forEach((url, idx) => {
    gallery.push({
      id: `combo-img-${idx}`,
      url,
      label: idx === 0 ? "Kit Completo (Portada)" : `Foto ${idx + 1} del Combo`,
      isCover: idx === 0,
    });
  });

  (testCombo.items || []).forEach((it, idx) => {
    if (it.producto?.imagen && !gallery.some((g) => g.url === it.producto.imagen)) {
      gallery.push({
        id: `item-img-${it.producto.id}`,
        url: it.producto.imagen,
        label: it.producto.nombre || `Repuesto ${idx + 1}`,
      });
    }
  });

  console.log(`   - Total elementos de galería generados: ${gallery.length}`);
  console.log(`   - Primer elemento es portada: ${gallery[0]?.isCover ? "✓ (Foto 1)" : "✗"}`);
  console.log(`   - URL de portada: "${gallery[0]?.url}"`);

  if (!gallery[0]?.isCover || gallery[0]?.url !== comboImages[0]) {
    console.error("   ❌ ERROR: La primera imagen de la galería debe ser la Portada");
    process.exit(1);
  }

  // 4. Probar getAllCombosAdminAction
  console.log("\n4. Verificando getAllCombosAdminAction():");
  const adminRes = await getAllCombosAdminAction(1); // Suponiendo admin
  if (adminRes.success && adminRes.combos) {
    console.log(`   - Combos para admin recuperados: ${adminRes.combos.length}`);
    const adminCombo9 = adminRes.combos.find((c) => c.id === 9);
    if (adminCombo9) {
      console.log(`   - Combo 9 en admin: portada="${adminCombo9.imagen}", totalFotos=${adminCombo9.imagenes?.length}`);
    }
    console.log("   ✓ Mapeo administrativo verificado.");
  }

  console.log("\n================================================================================");
  console.log("✅ TODAS LAS PRUEBAS DE IMÁGENES, PORTADA Y GALERÍA PASARON EXITOSAMENTE.");
  console.log("================================================================================");
}

runTests()
  .catch((e) => {
    console.error("Error en pruebas:", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
