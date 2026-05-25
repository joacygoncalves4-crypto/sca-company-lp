"use client";

import { useState } from "react";
import LeadCard from "./LeadCard";

type Lead = {
  id: string;
  nome: string;
  telefone: string;
  email: string;
  instagram: string | null;
  segmento: string;
  faturamento: string;
  cnpj: string | null;
  investimento: string | null;
  status: string;
  createdAt: string;
};

const FATURAMENTO_COLUMNS = [
  "Até R$30 mil",
  "R$30 mil a R$50 mil",
  "R$50 mil a R$80 mil",
  "R$80 mil a R$100 mil",
  "R$100 mil a R$150 mil",
  "R$150 mil a R$250 mil",
  "R$250 mil a R$400 mil",
  "R$420 mil a R$600 mil",
  "R$601 mil a R$1 milhão",
  "Mais de R$1 milhão",
];

const COLUMN_COLORS: Record<string, string> = {
  "Até R$30 mil": "border-t-gray-500",
  "R$30 mil a R$50 mil": "border-t-blue-600",
  "R$50 mil a R$80 mil": "border-t-blue-500",
  "R$80 mil a R$100 mil": "border-t-indigo-500",
  "R$100 mil a R$150 mil": "border-t-violet-500",
  "R$150 mil a R$250 mil": "border-t-purple-500",
  "R$250 mil a R$400 mil": "border-t-pink-500",
  "R$420 mil a R$600 mil": "border-t-orange-500",
  "R$601 mil a R$1 milhão": "border-t-amber-500",
  "Mais de R$1 milhão": "border-t-green-500",
};

const STATUS_FILTER_OPTIONS = [
  { value: "todos", label: "Todos" },
  { value: "novo", label: "Novos" },
  { value: "em_contato", label: "Em Contato" },
  { value: "proposta", label: "Proposta" },
  { value: "fechado", label: "Fechados" },
  { value: "perdido", label: "Perdidos" },
];

function shortFaturamento(f: string) {
  const map: Record<string, string> = {
    "Até R$30 mil": "Até 30k",
    "R$30 mil a R$50 mil": "30k–50k",
    "R$50 mil a R$80 mil": "50k–80k",
    "R$80 mil a R$100 mil": "80k–100k",
    "R$100 mil a R$150 mil": "100k–150k",
    "R$150 mil a R$250 mil": "150k–250k",
    "R$250 mil a R$400 mil": "250k–400k",
    "R$420 mil a R$600 mil": "420k–600k",
    "R$601 mil a R$1 milhão": "601k–1M",
    "Mais de R$1 milhão": "+1M",
  };
  return map[f] ?? f;
}

export default function KanbanBoard({ initialLeads }: { initialLeads: Lead[] }) {
  const [leads, setLeads] = useState<Lead[]>(initialLeads);
  const [statusFilter, setStatusFilter] = useState("todos");
  const [search, setSearch] = useState("");

  function handleStatusChange(id: string, status: string) {
    setLeads((prev) =>
      prev.map((l) => (l.id === id ? { ...l, status } : l))
    );
  }

  function handleDelete(id: string) {
    setLeads((prev) => prev.filter((l) => l.id !== id));
  }

  const filtered = leads.filter((l) => {
    const matchStatus = statusFilter === "todos" || l.status === statusFilter;
    const q = search.toLowerCase();
    const matchSearch =
      !q ||
      l.nome.toLowerCase().includes(q) ||
      l.email.toLowerCase().includes(q) ||
      l.telefone.includes(q) ||
      (l.instagram ?? "").toLowerCase().includes(q);
    return matchStatus && matchSearch;
  });

  const totalVisible = filtered.length;

  return (
    <div>
      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3 mb-6">
        <input
          type="text"
          placeholder="Buscar lead por nome, email ou telefone..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="bg-[#111820] border border-[#1e2a38] rounded-lg px-3 py-2 text-white text-sm placeholder-[#8a9ab0] focus:outline-none focus:border-[#0057ff] w-full sm:w-72"
        />

        <div className="flex items-center gap-2 flex-wrap">
          {STATUS_FILTER_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => setStatusFilter(opt.value)}
              className={`text-xs font-bold px-3 py-1.5 rounded-full border transition-colors ${
                statusFilter === opt.value
                  ? "bg-[#0057ff] border-[#0057ff] text-white"
                  : "border-[#1e2a38] text-[#8a9ab0] hover:border-[#8a9ab0]"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>

        <span className="text-[#8a9ab0] text-xs ml-auto">
          {totalVisible} lead{totalVisible !== 1 ? "s" : ""}
        </span>
      </div>

      {/* Kanban columns */}
      <div className="flex gap-4 overflow-x-auto pb-6" style={{ minHeight: "60vh" }}>
        {FATURAMENTO_COLUMNS.map((col) => {
          const colLeads = filtered.filter((l) => l.faturamento === col);
          const topColor = COLUMN_COLORS[col] ?? "border-t-[#0057ff]";

          return (
            <div
              key={col}
              className={`flex-shrink-0 w-72 bg-[#111820] border border-[#1e2a38] border-t-2 ${topColor} rounded-xl flex flex-col`}
            >
              {/* Column header */}
              <div className="px-4 py-3 border-b border-[#1e2a38] flex items-center justify-between">
                <div>
                  <p className="text-white text-xs font-bold">{shortFaturamento(col)}</p>
                  <p className="text-[#8a9ab0] text-xs mt-0.5 leading-tight hidden sm:block">
                    {col}
                  </p>
                </div>
                <span className="bg-[#1e2a38] text-[#c8d4e4] text-xs font-bold px-2 py-0.5 rounded-full">
                  {colLeads.length}
                </span>
              </div>

              {/* Cards */}
              <div className="p-3 flex flex-col gap-3 overflow-y-auto flex-1">
                {colLeads.length === 0 ? (
                  <p className="text-[#8a9ab0] text-xs text-center mt-4 opacity-50">
                    Nenhum lead
                  </p>
                ) : (
                  colLeads.map((lead) => (
                    <LeadCard
                      key={lead.id}
                      lead={lead as never}
                      onStatusChange={handleStatusChange}
                      onDelete={handleDelete}
                    />
                  ))
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
