import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";
import * as dotenv from "dotenv";
dotenv.config();

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter: new PrismaPg(pool) } as any);

prisma.pedidoEcommerce
  .findMany({
    where: {
      nombreCliente: { in: ["Juan Pérez", "Ana López", "Rodrigo García", "Valeria Torres"] },
    },
    select: { id: true, numero: true, nombreCliente: true, modalidadEntrega: true, estado: true, comprobanteUrl: true },
    orderBy: { id: "asc" },
  })
  .then((r) => {
    console.log(`Found ${r.length} orders:`);
    r.forEach((o) => console.log(`  #${o.id} ORD-${o.numero} | ${o.nombreCliente} | ${o.modalidadEntrega} | ${o.estado} | comprobante: ${o.comprobanteUrl ? "✓" : "✗"}`));
  })
  .finally(() => {
    prisma.$disconnect();
    pool.end();
  });
