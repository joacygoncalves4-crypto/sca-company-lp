"use client";

import { useState } from "react";

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

const STATUS_OPTIONS = [
  { value: "novo", label: "Novo Lead", color: "bg-blue-500" },
  { value: "em_contato", label: "Em Contato", color: "bg-yellow-500" },
  { value: "proposta", label: "Proposta", color: "bg-purple-500" },
  { value: "fechado", label: "Fechado", color: "bg-green-500" },
  { value: "perdido", label: "Perdido", color: "bg-red-500" },
];

function getStatusStyle(status: string) {
  return STATUS_OPTIONS.find((s) => s.value === status) ?? STATUS_OPTIONS[0];
}

function formatPhone(phone: string) {
  return phone.replace(/\D/g, "");
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function LeadCard({
  lead,
  onStatusChange,
  onDelete,
}: {
  lead: Lead;
  onStatusChange: (id: string, status: string) => void;
  onDelete: (id: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [updating, setUpdating] = useState(false);
  const currentStatus = getStatusStyle(lead.status);

  async function handleStatusChange(newStatus: string) {
    setUpdating(true);
    await fetch(`/api/leads/${lead.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: newStatus }),
    });
    onStatusChange(lead.id, newStatus);
    setUpdating(false);
    setOpen(false);
  }

  async function handleDelete() {
    if (!confirm(`Remover o lead de ${lead.nome}?`)) return;
    await fetch(`/api/leads/${lead.id}`, { method: "DELETE" });
    onDelete(lead.id);
  }

  const waLink = `https://wa.me/55${formatPhone(lead.telefone)}`;

  return (
    <div className="bg-[#0d1117] border border-[#1e2a38] rounded-xl p-4 space-y-3 hover:border-[#0057ff]/40 transition-colors group">
      {/* Header: nome + status */}
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-white font-semibold text-sm leading-tight">{lead.nome}</p>
          <p className="text-[#8a9ab0] text-xs mt-0.5">{lead.segmento}</p>
        </div>

        {/* Status badge dropdown */}
        <div className="relative flex-shrink-0">
          <button
            onClick={() => setOpen(!open)}
            disabled={updating}
            className={`flex items-center gap-1.5 text-xs font-bold px-2.5 py-1 rounded-full text-white uppercase tracking-wide ${currentStatus.color} opacity-90 hover:opacity-100 transition-opacity`}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-white/60" />
            {currentStatus.label}
          </button>

          {open && (
            <div className="absolute right-0 top-8 z-10 bg-[#111820] border border-[#1e2a38] rounded-xl shadow-xl w-40 overflow-hidden">
              {STATUS_OPTIONS.map((s) => (
                <button
                  key={s.value}
                  onClick={() => handleStatusChange(s.value)}
                  className={`w-full text-left px-3 py-2 text-xs font-bold text-white hover:bg-[#1e2a38] flex items-center gap-2 ${
                    s.value === lead.status ? "bg-[#1e2a38]" : ""
                  }`}
                >
                  <span className={`w-2 h-2 rounded-full ${s.color}`} />
                  {s.label}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Contato */}
      <div className="space-y-1">
        <p className="text-[#c8d4e4] text-xs flex items-center gap-1.5">
          <span className="text-[#8a9ab0]">📞</span>
          {lead.telefone}
        </p>
        <p className="text-[#c8d4e4] text-xs flex items-center gap-1.5 truncate">
          <span className="text-[#8a9ab0]">✉</span>
          <span className="truncate">{lead.email}</span>
        </p>
        {lead.instagram && (
          <p className="text-[#c8d4e4] text-xs flex items-center gap-1.5">
            <span className="text-[#8a9ab0]">@</span>
            {lead.instagram}
          </p>
        )}
      </div>

      {/* CNPJ / Investimento */}
      {(lead.cnpj || lead.investimento) && (
        <div className="border-t border-[#1e2a38] pt-2 space-y-1">
          {lead.cnpj && (
            <p className="text-[#8a9ab0] text-xs">
              CNPJ: <span className="text-[#c8d4e4]">{lead.cnpj}</span>
            </p>
          )}
          {lead.investimento && (
            <p className="text-[#8a9ab0] text-xs">
              Investir R$4k:{" "}
              <span
                className={`font-semibold ${
                  lead.investimento === "Sim" ? "text-green-400" : "text-red-400"
                }`}
              >
                {lead.investimento}
              </span>
            </p>
          )}
        </div>
      )}

      {/* Footer: data + botão WhatsApp */}
      <div className="flex items-center justify-between pt-1 border-t border-[#1e2a38]">
        <p className="text-[#8a9ab0] text-xs">{formatDate(lead.createdAt)}</p>

        <div className="flex items-center gap-1.5">
          <button
            onClick={handleDelete}
            className="text-[#8a9ab0] hover:text-red-400 transition-colors p-1 rounded opacity-0 group-hover:opacity-100"
            title="Remover lead"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="13"
              height="13"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <polyline points="3 6 5 6 21 6" />
              <path d="M19 6l-1 14H6L5 6" />
              <path d="M10 11v6M14 11v6" />
              <path d="M9 6V4h6v2" />
            </svg>
          </button>

          <a
            href={waLink}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 bg-[#15d27d] hover:bg-[#11b86b] text-[#062a18] font-bold text-xs px-3 py-1.5 rounded-lg transition-colors"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="13"
              height="13"
              viewBox="0 0 24 24"
              fill="currentColor"
            >
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
            </svg>
            WhatsApp
          </a>
        </div>
      </div>
    </div>
  );
}
