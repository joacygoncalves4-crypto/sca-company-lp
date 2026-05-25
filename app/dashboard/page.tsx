import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import KanbanBoard from "@/components/KanbanBoard";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");

  const leads = await prisma.lead.findMany({
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="min-h-screen bg-[#080c10]">
      {/* Navbar */}
      <header className="bg-[#0d1117] border-b border-[#1e2a38] px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="font-black text-xl tracking-widest text-white" style={{ fontFamily: "sans-serif" }}>
            SCA <span className="text-[#0057ff]">CRM</span>
          </span>
          <span className="text-[#1e2a38]">|</span>
          <span className="text-[#8a9ab0] text-sm">Painel de Leads</span>
        </div>

        <div className="flex items-center gap-4">
          <div className="text-right">
            <p className="text-white text-sm font-semibold">{session.user?.name}</p>
            <p className="text-[#8a9ab0] text-xs">{session.user?.email}</p>
          </div>
          <form action="/api/auth/signout" method="POST">
            <button
              formAction="/api/auth/signout"
              className="text-[#8a9ab0] hover:text-white text-xs border border-[#1e2a38] hover:border-[#8a9ab0] rounded-lg px-3 py-1.5 transition-colors"
            >
              Sair
            </button>
          </form>
        </div>
      </header>

      {/* Stats bar */}
      <div className="bg-[#0d1117] border-b border-[#1e2a38] px-6 py-3 flex items-center gap-6 overflow-x-auto">
        <Stat label="Total de Leads" value={leads.length} color="text-white" />
        <Stat label="Novos" value={leads.filter((l) => l.status === "novo").length} color="text-[#0057ff]" />
        <Stat label="Em Contato" value={leads.filter((l) => l.status === "em_contato").length} color="text-yellow-400" />
        <Stat label="Proposta" value={leads.filter((l) => l.status === "proposta").length} color="text-purple-400" />
        <Stat label="Fechados" value={leads.filter((l) => l.status === "fechado").length} color="text-green-400" />
        <Stat label="Perdidos" value={leads.filter((l) => l.status === "perdido").length} color="text-red-400" />
      </div>

      {/* Kanban */}
      <main className="p-6">
        <KanbanBoard initialLeads={leads as never} />
      </main>
    </div>
  );
}

function Stat({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="flex items-center gap-2 flex-shrink-0">
      <span className={`font-black text-lg ${color}`}>{value}</span>
      <span className="text-[#8a9ab0] text-xs">{label}</span>
    </div>
  );
}
