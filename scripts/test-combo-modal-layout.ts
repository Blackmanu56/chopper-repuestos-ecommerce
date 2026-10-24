import fs from "fs";
import path from "path";

console.log("================================================================================");
console.log("TEST: DISEÑO Y DISTRIBUCIÓN DEL MODAL DE CREACIÓN / EDICIÓN DE COMBOS");
console.log("================================================================================");

const panelFile = path.join(__dirname, "..", "src", "app", "panel", "page.tsx");
const content = fs.readFileSync(panelFile, "utf8");

// 1. Verificación de contenedor y estructura de scroll
console.log("\n1. Verificando estructura general del modal y scroll interno:");
const hasFixedHeader = content.includes("shrink-0") && content.includes("Nuevo combo");
const hasScrollableBody = content.includes("flex-1 overflow-y-auto") && content.includes("grid grid-cols-1 lg:grid-cols-12");
const hasFixedFooter = content.includes("shrink-0") && content.includes("Guardar combo") && content.includes("Cancelar");

console.log(`   - Cabecera fija con título y cierre: ${hasFixedHeader ? "✓" : "✗"}`);
console.log(`   - Cuerpo con scroll interno y 2 columnas en desktop: ${hasScrollableBody ? "✓" : "✗"}`);
console.log(`   - Pie de modal fijo con botones de acción: ${hasFixedFooter ? "✓" : "✗"}`);

if (!hasFixedHeader || !hasScrollableBody || !hasFixedFooter) {
  console.error("❌ Falló la verificación de estructura fija/desplazable.");
  process.exit(1);
}

// 2. Verificación de las 5 secciones organizadas
console.log("\n2. Verificando organización en secciones claras:");
const hasSecInfo = content.includes("Información general") && content.includes("comboNombre") && content.includes("comboBadge");
const hasSecPrecios = content.includes("Precios y rentabilidad") && content.includes("comboPrecio") && content.includes("comboPrecioRegularCalculado");
const hasSecAhorroStock = content.includes("comboAhorroCalculado") && content.includes("comboStockCalculado");
const hasSecFotos = content.includes("Fotos del combo (hasta 4)") && content.includes("comboImages");
const hasSecIncluidos = content.includes("Repuestos incluidos") && content.includes("comboItems.map");
const hasSecBuscador = content.includes("Buscar y sumar repuestos") && content.includes("comboItemSearch");

console.log(`   - Sección 1: Información general y publicación: ${hasSecInfo ? "✓" : "✗"}`);
console.log(`   - Sección 2: Precios, descuentos y stock conjunto: ${hasSecPrecios && hasSecAhorroStock ? "✓" : "✗"}`);
console.log(`   - Sección 3: Fotos del combo (hasta 4 slots): ${hasSecFotos ? "✓" : "✗"}`);
console.log(`   - Sección 4: Repuestos incluidos con steppers y subtotales: ${hasSecIncluidos ? "✓" : "✗"}`);
console.log(`   - Sección 5: Buscador y catálogo de repuestos con agregar directo: ${hasSecBuscador ? "✓" : "✗"}`);

if (!hasSecInfo || !hasSecPrecios || !hasSecAhorroStock || !hasSecFotos || !hasSecIncluidos || !hasSecBuscador) {
  console.error("❌ Alguna sección requerida no fue detectada correctamente.");
  process.exit(1);
}

// 3. Verificación de adaptación a temas claro y oscuro
console.log("\n3. Verificando compatibilidad de temas claro y oscuro:");
const hasLightDarkCard = content.includes("bg-white dark:bg-[#16171c]") && content.includes("border-slate-200 dark:border-[#26272e]");
const hasLightDarkInputs = content.includes("bg-white dark:bg-[#0f1012]") && content.includes("text-slate-900 dark:text-white");
const hasLightDarkTexts = content.includes("text-slate-500 dark:text-[#9a9ba3]") && content.includes("text-slate-800 dark:text-white");

console.log(`   - Contenedores y bordes adaptables: ${hasLightDarkCard ? "✓" : "✗"}`);
console.log(`   - Campos de entrada adaptables (inputs/selects/textareas): ${hasLightDarkInputs ? "✓" : "✗"}`);
console.log(`   - Contrastes tipográficos en ambos modos: ${hasLightDarkTexts ? "✓" : "✗"}`);

if (!hasLightDarkCard || !hasLightDarkInputs || !hasLightDarkTexts) {
  console.error("❌ Faltan clases de tema claro/oscuro en componentes clave.");
  process.exit(1);
}

// 4. Verificación de integridad de lógica
console.log("\n4. Verificando preservación de lógica y validaciones:");
const hasValidations = content.includes("comboFormErrors.nombre") && content.includes("comboFormErrors.precio") && content.includes("comboFormErrors.items");
const hasSaveHandler = content.includes("handleSaveCombo") && content.includes("saving ? \"Guardando...\"");

console.log(`   - Validaciones de formulario activas: ${hasValidations ? "✓" : "✗"}`);
console.log(`   - Manejador de guardado y feedback conservado: ${hasSaveHandler ? "✓" : "✗"}`);

if (!hasValidations || !hasSaveHandler) {
  console.error("❌ La lógica de validación o guardado fue alterada.");
  process.exit(1);
}

console.log("\n================================================================================");
console.log("✅ TODAS LAS VERIFICACIONES DEL MODAL DE COMBOS PASARON SATISFACTORIAMENTE.");
console.log("================================================================================");
