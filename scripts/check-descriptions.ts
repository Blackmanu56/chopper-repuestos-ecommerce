import { prisma } from "../src/lib/prisma";

async function main() {
  const total = await prisma.productoEcommerce.count();
  const withDesc = await prisma.productoEcommerce.findMany({
    where: { descripcion: { not: null } },
    select: { id: true, productoId: true, descripcion: true },
  });

  const totalProductos = await prisma.producto.count();

  console.log("Total Productos:", totalProductos);
  console.log("Total ProductoEcommerce:", total);
  console.log("Con descripcion no null:", withDesc.length);

  for (const p of withDesc) {
    console.log(`[ID ${p.id} - ProdID ${p.productoId}]: ${p.descripcion}`);
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
