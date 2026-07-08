import { NextRequest, NextResponse } from "next/server";
import { createHash } from "crypto";
import { prisma } from "@/lib/db";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

const META_PIXEL_ID = "966812949173995";
const META_CAPI_URL = `https://graph.facebook.com/v19.0/${META_PIXEL_ID}/events`;

function sha256(value: string): string {
  return createHash("sha256").update(value.trim().toLowerCase()).digest("hex");
}

async function sendToMetaCAPI(
  lead: { nome: string; telefone: string; email: string; segmento: string },
  req: NextRequest,
  eventId: string,
  fbc: string,
  fbp: string
) {
  const token = process.env.META_ACCESS_TOKEN;
  if (!token) return;

  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0].trim() ||
    req.headers.get("x-real-ip") ||
    "";
  const userAgent = req.headers.get("user-agent") || "";

  const nameParts = lead.nome.trim().toLowerCase().split(" ");
  const userData: Record<string, unknown> = {
    em: [sha256(lead.email)],
    ph: [sha256("55" + lead.telefone.replace(/\D/g, "").replace(/^55/, ""))],
    fn: [sha256(nameParts[0] || "")],
    ...(nameParts.length > 1 && { ln: [sha256(nameParts[nameParts.length - 1])] }),
    client_ip_address: ip,
    client_user_agent: userAgent,
  };
  if (fbc) userData.fbc = fbc;
  if (fbp) userData.fbp = fbp;

  const payload = {
    data: [
      {
        event_name: "Lead",
        event_time: Math.floor(Date.now() / 1000),
        event_id: eventId,
        action_source: "website",
        event_source_url: "https://www.assessoriavex.com.br/lp.html",
        user_data: userData,
        custom_data: {
          content_name: "LP SCA Company",
          content_category: lead.segmento,
        },
      },
    ],
    access_token: token,
  };

  try {
    const res = await fetch(META_CAPI_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const json = await res.json();
    if (!res.ok) {
      console.error("Erro Meta CAPI:", json);
    } else {
      console.log("✅ Lead enviado à Meta CAPI. events_received:", json.events_received);
    }
  } catch (err) {
    console.error("Falha Meta CAPI:", err);
  }
}

const VEX_WEBHOOK_URL =
  "https://api.crmvex.com.br/webhook/leads/661bb0f9-9965-4832-a0f5-afb06453b798";

const EVOLUTION_URL = "https://evolutionapi.linikrodrigues.com.br";
const EVOLUTION_INSTANCE = "VEX AVISOS LP";
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

  const instance = encodeURIComponent(EVOLUTION_INSTANCE);
  const url = `${EVOLUTION_URL}/message/sendText/${instance}`;
  console.log(`➡️  Enviando notificação ao grupo WhatsApp (${EVOLUTION_GROUP}) via instância "${EVOLUTION_INSTANCE}".`);
  await postJsonWithRetry(
    url,
    { apikey: apiKey },
    { number: EVOLUTION_GROUP, text },
    "Notificação WhatsApp grupo"
  );
}

function formatPhone(raw: string): string {
  const digits = raw.replace(/\D/g, "");
  if (digits.startsWith("55") && digits.length >= 12) return digits;
  return "55" + digits;
}

// POST com retry (backoff) e timeout. Tenta até `attempts` vezes antes de desistir.
async function postJsonWithRetry(
  url: string,
  headers: Record<string, string>,
  body: unknown,
  label: string,
  attempts = 3
): Promise<boolean> {
  const payloadStr = JSON.stringify(body);
  for (let i = 1; i <= attempts; i++) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000); // 10s
    try {
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...headers },
        body: payloadStr,
        signal: controller.signal,
      });
      clearTimeout(timeout);
      const respText = await res.text();
      if (res.ok) {
        console.log(`✅ ${label} OK (tentativa ${i}/${attempts}). Resposta:`, respText.slice(0, 300));
        return true;
      }
      console.error(`❌ ${label} falhou (tentativa ${i}/${attempts}) — status ${res.status}. Resposta:`, respText.slice(0, 500));
      console.error(`   Payload enviado:`, payloadStr.slice(0, 500));
      // 4xx (exceto 429) = erro de dados, não adianta repetir
      if (res.status >= 400 && res.status < 500 && res.status !== 429) return false;
    } catch (err) {
      clearTimeout(timeout);
      console.error(`❌ ${label} erro de rede/timeout (tentativa ${i}/${attempts}):`, err);
    }
    if (i < attempts) await new Promise((r) => setTimeout(r, i * 1500)); // 1.5s, 3s...
  }
  console.error(`🔴 ${label} DESISTIU após ${attempts} tentativas.`);
  return false;
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

  // O webhook do VEX rejeitava com "CONTACT_NUMBER_REQUIRED" porque esperava o
  // telefone em outro campo. Enviamos sob todos os nomes prováveis para garantir
  // que o VEX encontre (campos extras são ignorados pelo destino).
  const payload: Record<string, unknown> = {
    number: phone,
    phone: phone,
    phoneNumber: phone,
    contactNumber: phone,
    contact_number: phone,
    telefone: phone,
    celular: phone,
    whatsapp: phone,
    name: lead.nome,
    contactName: lead.nome,
    email: lead.email,
    segmento: lead.segmento,
    faturamento: lead.faturamento,
    tags: ["LP SCA Company", lead.segmento, lead.faturamento],
  };
  if (lead.instagram) payload.instagram = lead.instagram;
  if (lead.cnpj) payload.cnpj = lead.cnpj;
  if (lead.investimento) payload.investimento_4k = lead.investimento;

  console.log("➡️  Enviando lead ao VEX. Payload:", JSON.stringify(payload));

  // 1. Envia para o Webhook de Entrada do VEX (cria na coluna "Leads da LP")
  const webhookOk = await postJsonWithRetry(VEX_WEBHOOK_URL, {}, payload, "Webhook VEX");

  // 2. Também cria o contato via API REST do VEX (garante que fica nos Contatos)
  const apiKey = process.env.VEX_API_KEY;
  if (apiKey) {
    await postJsonWithRetry(
      "https://api.crmvex.com.br/api/contact",
      { "api-key": apiKey },
      payload,
      "API Contato VEX"
    );
  } else {
    console.warn("⚠️  VEX_API_KEY não configurada — só o webhook rodou (contato não criado via API).");
  }

  if (!webhookOk) {
    console.error("🔴 LEAD NÃO ENTROU NO VEX pelo webhook — verifique os logs acima.");
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

    const eventId = body.meta_event_id || `lead_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
    const fbc = body.meta_fbc || "";
    const fbp = body.meta_fbp || "";

    // Envia para VEX, WA e Meta CAPI em paralelo, sem bloquear a resposta
    sendToVex(lead).catch(console.error);
    notifyWhatsAppGroup(lead).catch(console.error);
    sendToMetaCAPI(lead, req, eventId, fbc, fbp).catch(console.error);

    return NextResponse.json({ success: true, id: lead.id, event_id: eventId }, { status: 201 });
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
