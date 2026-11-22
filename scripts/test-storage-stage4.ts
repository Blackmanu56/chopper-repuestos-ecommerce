import { detectImageMagicBytes, uploadCatalogImage, rollbackStorageUpload, MAX_CATALOG_FILE_SIZE } from "../src/lib/storage-service";
import { getCatalogImageUrl, MIGRATED_PRODUCT_FILES, MIGRATED_COMBO_FILES } from "../src/lib/storage-catalog";
import { prisma } from "../src/lib/prisma";

async function runStage4Tests() {
  console.log("================================================================================");
  console.log("   SUITE DE PRUEBAS ETAPA 4: COMPATIBILIDAD STORAGE EN E-COMMERCE              ");
  console.log("================================================================================\n");

  let totalTests = 0;
  let passedTests = 0;

  function assert(condition: boolean, testName: string, details?: string) {
    totalTests++;
    if (condition) {
      passedTests++;
      console.log(`[PASS] ${testName}`);
    } else {
      console.error(`[FAIL] ${testName}${details ? ` -> ${details}` : ""}`);
      process.exitCode = 1;
    }
  }

  // 1. Magic bytes
  console.log("--- 1. Validación de Formatos Magic Bytes ---");
  const fakeText = Buffer.from("Not an image");
  assert(!detectImageMagicBytes(fakeText).valid, "Rechaza texto plano");

  const realWebpHeader = Buffer.concat([
    Buffer.from("RIFF"),
    Buffer.from([0x20, 0x00, 0x00, 0x00]),
    Buffer.from("WEBP"),
    Buffer.alloc(20),
  ]);
  assert(detectImageMagicBytes(realWebpHeader).valid, "Acepta WebP genuino");

  // 2. Límites
  console.log("\n--- 2. Límite de Tamaño de Archivo ---");
  const oversized = Buffer.alloc(MAX_CATALOG_FILE_SIZE + 1024);
  oversized[0] = 0xff;
  oversized[1] = 0xd8;
  oversized[2] = 0xff;
  const resOver = await uploadCatalogImage(oversized, "combos");
  assert(!resOver.success, "Rechaza archivos superiores a 5 MB");

  // 3. Resolución de Catálogo
  console.log("\n--- 3. Resolución Compartida en E-commerce ---");
  let allProductsPass = true;
  for (const f of MIGRATED_PRODUCT_FILES) {
    if (!getCatalogImageUrl(`/uploads/${f}`).includes("catalogo-chopper/productos/")) {
      allProductsPass = false;
    }
  }
  assert(allProductsPass, "Las 12 imágenes de productos resuelven a Supabase Storage");

  let allCombosPass = true;
  for (const f of MIGRATED_COMBO_FILES) {
    if (!getCatalogImageUrl(`/combos/${f}`).includes("catalogo-chopper/combos/")) {
      allCombosPass = false;
    }
  }
  assert(allCombosPass, "Las 6 imágenes de combos resuelven a Supabase Storage");

  // Nuevas URLs de Storage
  const testNewStorageUrl = "https://feecgedfxtmtmdaakxgy.supabase.co/storage/v1/object/public/catalogo-chopper/combos/combo-nuevo-2026.jpg";
  assert(getCatalogImageUrl(testNewStorageUrl) === testNewStorageUrl, "Nueva URL pública de combo se respeta intacta");

  // Reemplazo seguro en Combos:
  console.log("\n--- 4. Reemplazo Seguro en Combos de E-commerce ---");
  const publicCombos = await prisma.comboEcommerce.findMany({ where: { activo: true } });
  assert(publicCombos.length === 12, "Los 12 combos reales activos se recuperan sin error");

  console.log("\n================================================================================");
  console.log(`RESULTADO DE LA SUITE: ${passedTests} de ${totalTests} pruebas superadas (${Math.round((passedTests / totalTests) * 100)}%)`);
  console.log("================================================================================");
}

runStage4Tests()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
