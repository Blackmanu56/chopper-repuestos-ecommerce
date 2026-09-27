import { prisma } from "../src/lib/prisma";

async function main() {
  const totalProds = await prisma.producto.count();
  console.log(`Total productos en DB: ${totalProds}`);

  const prodsEcommerce = await prisma.productoEcommerce.findMany({
    include: { producto: true },
  });
  console.log(`Total productosEcommerce: ${prodsEcommerce.length}`);
  for (const pe of prodsEcommerce) {
    console.log(`ID: ${pe.id}, ProdID: ${pe.productoId}, Nombre: ${pe.producto.nombre}, Oferta: ${pe.enOferta}, Destacado: ${pe.destacado}, Recomendado: ${pe.recomendado}, Badge: ${pe.badgePromo}`);
  }

  const combos = await prisma.comboEcommerce.findMany({
    include: { items: { include: { producto: true } } },
  });
  console.log(`Total combosEcommerce: ${combos.length}`);
  for (const c of combos) {
    console.log(`Combo: ${c.nombre} ($${c.precio}) - items: ${c.items.length}`);
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
