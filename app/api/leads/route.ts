import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

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
  const apiKey = process.env.VEX_API_KEY;
  if (!apiKey) return;

  const customFields: Record<string, string> = {
    email: lead.email,
    segmento: lead.segmento,
    faturamento: lead.faturamento,
  };
  if (lead.instagram) customFields.instagram = lead.instagram;
  if (lead.cnpj) customFields.cnpj = lead.cnpj;
  if (lead.investimento) customFields.investimento = lead.investimento;

  try {
    const res = await fetch("https://api.crmvex.com.br/api/contact", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "api-key": apiKey,
      },
      body: JSON.stringify({
        number: formatPhone(lead.telefone),
        name: lead.nome,
        tags: ["LP SCA Company", lead.segmento, lead.faturamento],
        customFields,
      }),
    });

    if (!res.ok) {
      const err = await res.text();
      console.error("Erro ao enviar para VEX:", res.status, err);
    } else {
      console.log("Lead enviado ao VEX com sucesso.");
    }
  } catch (err) {
    console.error("Falha na chamada VEX:", err);
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

    // Envia para o VEX em paralelo, sem bloquear a resposta
    sendToVex(lead).catch(console.error);

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
