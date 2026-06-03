import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

const VEX_WEBHOOK_URL =
  "https://api.crmvex.com.br/webhook/leads/661bb0f9-9965-4832-a0f5-afb06453b798";

const EVOLUTION_URL = "https://evolutionapi.linikrodrigues.com.br";
const EVOLUTION_INSTANCE = "SCA VENDAS";
const EVOLUTION_GROUP = "120363408419081492@g.us";

async function notifyWhatsAppGroup(lead: {
  nome: string;
  telefone: string;
  email: string;
  instagram: string | null;
  segmento: string;
  faturamento: string;
  cnpj: string | null;
  investimento: string | null;
}) {
  const apiKey = process.env.EVOLUTION_API_KEY;
  if (!apiKey) {
    console.warn("EVOLUTION_API_KEY não configurada — notificação WA ignorada.");
    return;
  }

  const phone = lead.telefone
    ? lead.telefone.replace(/\D/g, "").replace(/^55/, "")
    : "";
  const waLink = phone ? `https://wa.me/55${phone}` : "";

  const lines = [
    `🔔 *NOVO LEAD — LP SCA Company*`,
    ``,
    `👤 *Nome:* ${lead.nome}`,
    `📱 *Telefone:* ${lead.telefone}${waLink ? `\n🔗 ${waLink}` : ""}`,
    `📧 *E-mail:* ${lead.email}`,
    `👔 *Segmento:* ${lead.segmento}`,
    `💰 *Faturamento:* ${lead.faturamento}`,
  ];
  if (lead.instagram) lines.push(`📸 *Instagram:* @${lead.instagram.replace(/^@/, "")}`);
  if (lead.cnpj) lines.push(`🏢 *CNPJ:* ${lead.cnpj}`);
  if (lead.investimento) lines.push(`💼 *Investiria R$4k?* ${lead.investimento}`);
  lines.push(``, `⏰ ${new Date().toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" })}`);

  const text = lines.join("\n");

  try {
    const instance = encodeURIComponent(EVOLUTION_INSTANCE);
    const res = await fetch(`${EVOLUTION_URL}/message/sendText/${instance}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey: apiKey,
      },
      body: JSON.stringify({ number: EVOLUTION_GROUP, text }),
    });
    if (!res.ok) {
      const err = await res.text();
      console.error("Erro Evolution API:", res.status, err);
    } else {
      console.log("✅ Notificação WhatsApp enviada ao grupo.");
    }
  } catch (err) {
    console.error("Falha Evolution API:", err);
  }
}

function formatPhone(raw: string): string {
  const digits = raw.replace(/\D/g, "");
  if (digits.startsWith("55") && digits.length >= 12) return digits;
  return "55" + digits;
}

async function sendToVex(lead: {
  nome: string;
  telefone: string;
  email: string;
  instagram: string | null;
  segmento: string;
  faturamento: string;
  cnpj: string | null;
  investimento: string | null;
}) {
  const phone = formatPhone(lead.telefone);

  const customFields: Record<string, string> = {
    email: lead.email,
    segmento: lead.segmento,
    faturamento: lead.faturamento,
  };
  if (lead.instagram) customFields.instagram = lead.instagram;
  if (lead.cnpj) customFields.cnpj = lead.cnpj;
  if (lead.investimento) customFields.investimento_4k = lead.investimento;

  const payload: Record<string, unknown> = {
    number: phone,
    name: lead.nome,
    email: lead.email,
    segmento: lead.segmento,
    faturamento: lead.faturamento,
    tags: ["LP SCA Company", lead.segmento, lead.faturamento],
  };
  if (lead.instagram) payload.instagram = lead.instagram;
  if (lead.cnpj) payload.cnpj = lead.cnpj;
  if (lead.investimento) payload.investimento_4k = lead.investimento;

  // 1. Envia para o Webhook de Entrada do VEX (cria na coluna "Leads da LP")
  try {
    const res = await fetch(VEX_WEBHOOK_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const err = await res.text();
      console.error("Erro no webhook VEX:", res.status, err);
    } else {
      console.log("✅ Lead enviado ao webhook VEX (pipeline).");
    }
  } catch (err) {
    console.error("Falha no webhook VEX:", err);
  }

  // 2. Também cria o contato via API REST do VEX (garante que fica nos Contatos)
  const apiKey = process.env.VEX_API_KEY;
  if (apiKey) {
    try {
      const res = await fetch("https://api.crmvex.com.br/api/contact", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "api-key": apiKey,
        },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const err = await res.text();
        console.error("Erro ao criar contato VEX:", res.status, err);
      } else {
        console.log("✅ Contato criado no VEX.");
      }
    } catch (err) {
      console.error("Falha ao criar contato VEX:", err);
    }
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    const lead = await prisma.lead.create({
      data: {
        nome: body.nome || "",
        telefone: body.telefone || "",
        email: body.email || "",
        instagram: body.instagram || null,
        segmento: body.segmento || "",
        faturamento: body.faturamento || "",
        cnpj: body.cnpj || null,
        investimento: body.investimento || null,
        origem: body.origem || "LP SCA Company",
      },
    });

    // Envia para o VEX e notifica grupo WA em paralelo, sem bloquear a resposta
    sendToVex(lead).catch(console.error);
    notifyWhatsAppGroup(lead).catch(console.error);

    return NextResponse.json({ success: true, id: lead.id }, { status: 201 });
  } catch (error) {
    console.error("Erro ao salvar lead:", error);
    return NextResponse.json({ success: false }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  const leads = await prisma.lead.findMany({
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(leads);
}
