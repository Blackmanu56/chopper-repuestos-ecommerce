import { prisma } from "../src/lib/prisma";

async function main() {
  const cols: any = await prisma.$queryRaw`
    SELECT table_name, column_name, data_type 
    FROM information_schema.columns 
    WHERE table_name IN ('productos', 'productos_ecommerce')
    ORDER BY table_name, ordinal_position;
  `;
  console.log("Columns:", cols);

  // Check if there are other tables or columns that might hold descriptions
  const otherCols: any = await prisma.$queryRaw`
    SELECT table_name, column_name, data_type
    FROM information_schema.columns
    WHERE column_name ILIKE '%descrip%' OR column_name ILIKE '%compatib%' OR column_name ILIKE '%especific%' OR column_name ILIKE '%moto%'
    ORDER BY table_name, column_name;
  `;
  console.log("Other matching columns across DB:", otherCols);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
