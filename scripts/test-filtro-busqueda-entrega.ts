import { prisma } from "../src/lib/prisma";

async function main() {
  console.log("================================================================================");
  console.log("TEST: VERIFICACIÓN DE LOS TRES FILTROS CON PEDIDOS DEL MISMO CLIENTE");
  console.log("================================================================================");

  // Mismo cliente (Carlos Motero, DNI 34.567.890 / 34567890) con pedidos en distintos estados
  const mockPedidos = [
    { id: "p1", numero: 201, dniCliente: "34.567.890", nombreCliente: "Carlos Motero", modalidadEntrega: "RETIRO_LOCAL", estado: "LISTO_ENTREGA", estadoPago: "PAGADO" },
    { id: "p2", numero: 202, dniCliente: "34567890", nombreCliente: "Carlos Motero", modalidadEntrega: "RETIRO_LOCAL", estado: "ENTREGADO", estadoPago: "PAGADO" },
    { id: "p3", numero: 203, dniCliente: "34.567.890", nombreCliente: "Carlos Motero", modalidadEntrega: "RETIRO_LOCAL", estado: "LISTO_PARA_RETIRAR", estadoPago: "PENDIENTE" },
    { id: "p4", numero: 204, dniCliente: "34567890", nombreCliente: "Carlos Motero", modalidadEntrega: "RETIRO_LOCAL", estado: "CONFIRMADO", estadoPago: "PAGADO" },
    { id: "p5", numero: 205, dniCliente: "34.567.890", nombreCliente: "Carlos Motero", modalidadEntrega: "RETIRO_LOCAL", estado: "CANCELADO", estadoPago: "RECHAZADO" },
    // Otro cliente para verificar aislamiento
    { id: "p6", numero: 301, dniCliente: "22.333.444", nombreCliente: "Juan Perez", modalidadEntrega: "RETIRO_LOCAL", estado: "LISTO_ENTREGA", estadoPago: "PAGADO" },
  ];

  function filterEntrega(pedidos: typeof mockPedidos, entregaTab: string, filtroEstadoEntrega: string, busquedaEntrega: string) {
    return pedidos.filter((p) => {
      if (p.estado === "CANCELADO") return false;
      if (p.modalidadEntrega !== entregaTab) return false;

      // Respetar estrictamente el filtro activo por estado de entrega
      if (filtroEstadoEntrega === "POR_ENTREGAR") {
        if (p.estado !== "LISTO_PARA_RETIRAR" && p.estado !== "LISTO_ENTREGA") return false;
      } else if (filtroEstadoEntrega === "ENTREGADOS") {
        if (p.estado !== "ENTREGADO") return false;
      } else if (filtroEstadoEntrega === "TODOS") {
        if (
          p.estado !== "LISTO_PARA_RETIRAR" &&
          p.estado !== "LISTO_ENTREGA" &&
          p.estado !== "ENTREGADO"
        ) {
          return false;
        }
      }

      if (!busquedaEntrega.trim()) return true;

      const rawQ = busquedaEntrega.trim().toLowerCase();
      const cleanDigits = busquedaEntrega.replace(/\D/g, "");

      const matchesOrd =
        `#ord-${p.numero}`.includes(rawQ) ||
        `ord-${p.numero}`.includes(rawQ) ||
        String(p.numero).includes(rawQ) ||
        (cleanDigits.length > 0 && String(p.numero) === cleanDigits);

      const pDniClean = (p.dniCliente || "").replace(/\D/g, "");
      const matchesDni =
        (p.dniCliente || "").toLowerCase().includes(rawQ) ||
        (cleanDigits.length >= 3 && pDniClean.includes(cleanDigits));

      const matchesName = (p.nombreCliente || "").toLowerCase().includes(rawQ);

      return matchesOrd || matchesDni || matchesName;
    });
  }

  console.log("\n1. FILTRO: «POR ENTREGAR» con búsqueda de DNI del cliente:");
  const porEntregarDni = filterEntrega(mockPedidos, "RETIRO_LOCAL", "POR_ENTREGAR", "34567890");
  const numsPorEntregar = porEntregarDni.map((p) => p.numero);
  console.log("   Resultados obtenidos:", numsPorEntregar);
  if (
    numsPorEntregar.length === 2 &&
    numsPorEntregar.includes(201) &&
    numsPorEntregar.includes(203) &&
    !numsPorEntregar.includes(202) && // NO debe incluir el entregado
    !numsPorEntregar.includes(204) && // NO debe incluir el confirmado/no preparado
    !numsPorEntregar.includes(205)    // NO debe incluir el cancelado
  ) {
    console.log("  ✓ Correcto: Únicamente pedidos pendientes de entrega (#ORD-201 y #ORD-203). El pedido ENTREGADO (#ORD-202) queda excluido.");
  } else {
    throw new Error(`Falló filtro POR_ENTREGAR: ${JSON.stringify(numsPorEntregar)}`);
  }

  console.log("\n2. FILTRO: «ENTREGADOS» con la misma búsqueda de DNI:");
  const entregadosDni = filterEntrega(mockPedidos, "RETIRO_LOCAL", "ENTREGADOS", "34567890");
  const numsEntregados = entregadosDni.map((p) => p.numero);
  console.log("   Resultados obtenidos:", numsEntregados);
  if (
    numsEntregados.length === 1 &&
    numsEntregados[0] === 202 &&
    !numsEntregados.includes(201) &&
    !numsEntregados.includes(203)
  ) {
    console.log("  ✓ Correcto: Únicamente pedidos entregados (#ORD-202). Los pedidos por entregar quedan excluidos.");
  } else {
    throw new Error(`Falló filtro ENTREGADOS: ${JSON.stringify(numsEntregados)}`);
  }

  console.log("\n3. FILTRO: «TODOS» con la misma búsqueda de DNI:");
  const todosDni = filterEntrega(mockPedidos, "RETIRO_LOCAL", "TODOS", "34567890");
  const numsTodos = todosDni.map((p) => p.numero);
  console.log("   Resultados obtenidos:", numsTodos);
  if (
    numsTodos.length === 3 &&
    numsTodos.includes(201) &&
    numsTodos.includes(202) &&
    numsTodos.includes(203) &&
    !numsTodos.includes(204) && // CONFIRMADO aún no listo para entrega
    !numsTodos.includes(205)    // CANCELADO
  ) {
    console.log("  ✓ Correcto: Incluye pedidos listos y entregados (#ORD-201, #ORD-202 y #ORD-203) sin mezclar pedidos en preparación o cancelados.");
  } else {
    throw new Error(`Falló filtro TODOS: ${JSON.stringify(numsTodos)}`);
  }

  console.log("\n4. BÚSQUEDA POR NÚMERO DE ORDEN (#ORD) cruzado con filtros:");
  const ord202EnPorEntregar = filterEntrega(mockPedidos, "RETIRO_LOCAL", "POR_ENTREGAR", "#ORD-202");
  if (ord202EnPorEntregar.length === 0) {
    console.log("  ✓ Correcto: Al buscar el pedido entregado '#ORD-202' dentro de 'Por Entregar', devuelve 0 resultados.");
  } else {
    throw new Error("Falló respeto de filtro activo al buscar por #ORD");
  }

  const ord201EnEntregados = filterEntrega(mockPedidos, "RETIRO_LOCAL", "ENTREGADOS", "201");
  if (ord201EnEntregados.length === 0) {
    console.log("  ✓ Correcto: Al buscar el pedido listo '201' dentro de 'Entregados', devuelve 0 resultados.");
  } else {
    throw new Error("Falló respeto de filtro activo al buscar por #ORD");
  }

  console.log("\n5. BÚSQUEDA POR DNI CON Y SIN PUNTOS:");
  const dniPuntos = filterEntrega(mockPedidos, "RETIRO_LOCAL", "POR_ENTREGAR", "34.567.890");
  const dniSinPuntos = filterEntrega(mockPedidos, "RETIRO_LOCAL", "POR_ENTREGAR", "34567890");
  if (dniPuntos.length === 2 && dniSinPuntos.length === 2) {
    console.log("  ✓ Correcto: Coincidencia idéntica buscando con puntos ('34.567.890') o sin puntos ('34567890').");
  } else {
    throw new Error("Falló coincidencia flexible de DNI");
  }

  console.log("\n6. CONTADORES DE PESTAÑAS (INVARIANTES ANTE BÚSQUEDA):");
  const countPorEntregar = mockPedidos.filter((p) => p.modalidadEntrega === "RETIRO_LOCAL" && (p.estado === "LISTO_PARA_RETIRAR" || p.estado === "LISTO_ENTREGA")).length;
  const countEntregados = mockPedidos.filter((p) => p.modalidadEntrega === "RETIRO_LOCAL" && p.estado === "ENTREGADO").length;
  const countTodos = mockPedidos.filter((p) => p.modalidadEntrega === "RETIRO_LOCAL" && (p.estado === "LISTO_PARA_RETIRAR" || p.estado === "LISTO_ENTREGA" || p.estado === "ENTREGADO")).length;
  console.log(`   - Por Entregar: ${countPorEntregar}`);
  console.log(`   - Entregados: ${countEntregados}`);
  console.log(`   - Todos: ${countTodos}`);
  if (countPorEntregar === 3 && countEntregados === 1 && countTodos === 4) {
    console.log("  ✓ Correcto: Los contadores reflejan el universo real de la modalidad sin ser afectados por la caja de búsqueda.");
  } else {
    throw new Error("Falló cálculo de contadores");
  }

  console.log("\n================================================================================");
  console.log("✅ TODAS LAS PRUEBAS DE LOS TRES FILTROS Y BÚSQUEDA FINALIZARON EXITOSAMENTE.");
  console.log("================================================================================");
}

main().catch((err) => {
  console.error("Error:", err);
  process.exit(1);
});
