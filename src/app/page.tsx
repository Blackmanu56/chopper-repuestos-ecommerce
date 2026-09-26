import { prisma } from "@/lib/prisma";

export default async function HomePage() {
  let productCount = 0;
  let dbConnected = false;

  try {
    productCount = await prisma.producto.count();
    dbConnected = true;
  } catch (error) {
    console.error("Database connection error:", error);
  }

  return (
    <main className="min-h-screen flex flex-col items-center justify-center p-8 text-center">
      <h1 className="text-3xl font-bold mb-4">Chopper Repuestos - Ecommerce</h1>
      <p className="text-slate-400 mb-6">Proyecto base inicializado y conectado a Supabase.</p>
      
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 max-w-md w-full">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-500 mb-3">
          Estado de Conexión
        </h2>
        <div className="flex items-center justify-between mb-2">
          <span>Base de datos:</span>
          <span className={dbConnected ? "text-emerald-400 font-semibold" : "text-rose-400 font-semibold"}>
            {dbConnected ? "Conectada (Supabase sa-east-1)" : "Desconectada"}
          </span>
        </div>
        <div className="flex items-center justify-between">
          <span>Productos sincronizados:</span>
          <span className="font-mono text-lg font-bold text-amber-400">{productCount}</span>
        </div>
      </div>
    </main>
  );
}
