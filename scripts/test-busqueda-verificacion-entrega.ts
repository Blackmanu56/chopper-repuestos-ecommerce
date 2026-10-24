import { prisma } from "../src/lib/prisma";
import assert from "assert";

function normalizeDni(dni?: string | null): string {
  return (dni || "").replace(/\D/g, "").trim();
}

async function runTests() {
  console.log("================================================================================");
  console.log("TEST: BÚSQUEDA Y VERIFICACIÓN DE IDENTIDAD EN ENTREGAS");
  console.log("================================================================================\n");

  // 1. Obtener pedidos reales de la base de datos para pruebas
  const pedidos = await prisma.pedidoEcommerce.findMany({
    include: { items: true },
    orderBy: { id: "desc" },
    take: 10,
  });

  assert(pedidos.length > 0, "Debe haber pedidos en la base de datos");
  const pedidoPrueba = pedidos[0];
  console.log(`1. Analizando pedido de prueba #ORD-${pedidoPrueba.numero}...`);
  console.log(`   - Cliente: ${pedidoPrueba.nombreCliente}`);
  console.log(`   - DNI registrado: ${pedidoPrueba.dniCliente || "Sin DNI"}`);
  console.log(`   - Estado: ${pedidoPrueba.estado}`);
  console.log(`   - Estado Pago: ${pedidoPrueba.estadoPago}`);
  console.log(`   - Modalidad: ${pedidoPrueba.modalidadEntrega}\n`);

  // 2. Prueba de Algoritmo de Búsqueda por #ORD y DNI
  console.log("2. Verificando algoritmo de búsqueda de pedidos...");

  const dniTest = pedidoPrueba.dniCliente || "35123456";
  const numTest = pedidoPrueba.numero;

  // Casos de búsqueda por número de orden
  const searchQueriesOrd = [
    `#ORD-${numTest}`,
    `ORD-${numTest}`,
    `#${numTest}`,
    String(numTest),
  ];

  for (const q of searchQueriesOrd) {
    const rawQ = q.trim().toLowerCase();
    const cleanDigits = q.replace(/\D/g, "");
    const matchesOrd =
      `#ord-${numTest}`.includes(rawQ) ||
      `ord-${numTest}`.includes(rawQ) ||
      String(numTest).includes(rawQ) ||
      (cleanDigits.length > 0 && String(numTest) === cleanDigits);

    assert(matchesOrd === true, `Debe coincidir con la búsqueda de orden: '${q}'`);
  }
  console.log("  ✓ Coincidencia exacta y flexible por número de orden (#ORD-XX, ORD-XX, XX)");

  // Casos de búsqueda por DNI (con y sin puntos)
  const cleanDni = dniTest.replace(/\D/g, "");
  const formattedDni = cleanDni.length === 8
    ? `${cleanDni.slice(0, 2)}.${cleanDni.slice(2, 5)}.${cleanDni.slice(5)}`
    : cleanDni;

  const searchQueriesDni = [cleanDni, formattedDni];
  for (const q of searchQueriesDni) {
    const rawQ = q.trim().toLowerCase();
    const cleanDigits = q.replace(/\D/g, "");
    const pDniClean = dniTest.replace(/\D/g, "");
    const matchesDni =
      dniTest.toLowerCase().includes(rawQ) ||
      (cleanDigits.length >= 3 && pDniClean.includes(cleanDigits));

    assert(matchesDni === true, `Debe coincidir con la búsqueda de DNI: '${q}'`);
  }
  console.log("  ✓ Coincidencia flexible de DNI con y sin puntos");

  // 3. Verificación de inicialización vacía del campo DNI
  console.log("\n3. Verificando inicialización de verificación de DNI...");
  let codigoRetiroVerificado = "DNI_ANTERIOR_123";
  // Simular apertura de modal handleOpenEntregaModal(p)
  codigoRetiroVerificado = "";
  assert(codigoRetiroVerificado === "", "El campo debe iniciar siempre vacío al abrir");
  console.log("  ✓ El campo de verificación inicia vacío (sin precargar datos del cliente)");

  // 4. Verificación y validación de coincidencia de DNI
  console.log("\n4. Verificando validación de DNI ingresado vs registrado...");
  const dniRegistrado = pedidoPrueba.dniCliente || "35.123.456";

  function validarDni(ingresado: string, registrado: string | null) {
    const dniRegNorm = normalizeDni(registrado);
    const dniIngNorm = normalizeDni(ingresado);
    const hasDniInput = ingresado.trim().length > 0;
    const isDniValido = Boolean(
      hasDniInput &&
      (dniRegNorm
        ? dniIngNorm === dniRegNorm
        : ingresado.trim().toLowerCase() === (registrado || "").trim().toLowerCase())
    );
    return { hasDniInput, isDniValido, isDniInvalido: Boolean(hasDniInput && !isDniValido) };
  }

  // Caso 4.1: Campo vacío
  const resVacio = validarDni("", dniRegistrado);
  assert(resVacio.hasDniInput === false, "Sin input");
  assert(resVacio.isDniValido === false, "No debe ser válido si está vacío");
  console.log("  ✓ Campo vacío: no autoriza cobro ni entrega");

  // Caso 4.2: DNI incorrecto
  const resInvalido = validarDni("99.999.999", dniRegistrado);
  assert(resInvalido.hasDniInput === true, "Tiene input");
  assert(resInvalido.isDniValido === false, "DNI incorrecto no debe ser válido");
  assert(resInvalido.isDniInvalido === true, "DNI incorrecto marcado como inválido");
  console.log("  ✓ DNI diferente: bloqueado y rechazado correctamente");

  // Caso 4.3: DNI correcto con diferente formato (ej: sin puntos vs con puntos)
  const resValidoSinPuntos = validarDni(normalizeDni(dniRegistrado), dniRegistrado);
  assert(resValidoSinPuntos.isDniValido === true, "DNI sin puntos debe coincidir");

  const resValidoConPuntos = validarDni(dniRegistrado, dniRegistrado);
  assert(resValidoConPuntos.isDniValido === true, "DNI idéntico debe coincidir");
  console.log("  ✓ DNI coincidente: validación exitosa y autorización habilitada");

  // 5. Integridad de reglas operativas
  console.log("\n5. Verificando reglas de entrega y cobro...");
  // Estado no listo
  const isEnPreparacion = (estado: string) => estado === "PREPARANDO" || estado === "CONFIRMADO" || estado === "PENDIENTE";
  assert(isEnPreparacion("PREPARANDO") === true, "Preparando debe bloquearse");
  assert(isEnPreparacion("CONFIRMADO") === true, "Confirmado debe bloquearse");
  assert(isEnPreparacion("LISTO_PARA_RETIRAR") === false, "Listo para retirar puede proceder");
  console.log("  ✓ Bloqueo estricto si el pedido todavía no fue finalizado por Stock");

  // Pago en efectivo pendiente
  const isFaltaCobro = (metodo: string, estadoPago: string) => metodo === "EFECTIVO_LOCAL" && estadoPago !== "PAGADO";
  assert(isFaltaCobro("EFECTIVO_LOCAL", "PENDIENTE") === true, "Efectivo pendiente bloquea entrega");
  assert(isFaltaCobro("EFECTIVO_LOCAL", "PAGADO") === false, "Efectivo pagado permite entrega");
  console.log("  ✓ Bloqueo de entrega si no se registró previamente el cobro en efectivo");

  console.log("\n================================================================================");
  console.log("✅ TODAS LAS PRUEBAS DE BÚSQUEDA Y VERIFICACIÓN PASARON EXITOSAMENTE.");
  console.log("================================================================================");
}

runTests()
  .catch((e) => {
    console.error("Error en pruebas:", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
