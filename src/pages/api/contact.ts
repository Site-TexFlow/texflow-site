import type { APIRoute } from "astro";
import { Resend } from "resend";
import { RESEND_API_KEY } from "astro:env/server";

export const prerender = false;

const TO_EMAIL = "contato@texflow.com.br";
const FROM_EMAIL = "TexFlow Site <formulario@texflow.com.br>";

const resend = new Resend(RESEND_API_KEY);

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export const POST: APIRoute = async ({ request }) => {
  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return new Response(JSON.stringify({ error: "Corpo da requisição inválido." }), { status: 400 });
  }

  const name = String(body.name ?? "").trim();
  const company = String(body.company ?? "").trim();
  const email = String(body.email ?? "").trim();
  const whatsapp = String(body.whatsapp ?? "").trim();
  const segment = String(body.segment ?? "").trim();
  const message = String(body.message ?? "").trim();

  if (!name || !company || !email || !whatsapp || !segment || !message) {
    return new Response(JSON.stringify({ error: "Preencha todos os campos obrigatórios." }), { status: 400 });
  }

  if (!/^[^\s@]+@[^\s@]+\.[a-zA-Z]{2,}$/.test(email)) {
    return new Response(JSON.stringify({ error: "E-mail inválido." }), { status: 400 });
  }

  try {
    const { error } = await resend.emails.send({
      from: FROM_EMAIL,
      to: [TO_EMAIL],
      reply_to: email,
      subject: `Novo pedido de orçamento — ${company}`,
      html: `
        <h2>Novo pedido de orçamento pelo site</h2>
        <p><strong>Nome:</strong> ${escapeHtml(name)}</p>
        <p><strong>Empresa:</strong> ${escapeHtml(company)}</p>
        <p><strong>E-mail:</strong> ${escapeHtml(email)}</p>
        <p><strong>WhatsApp:</strong> ${escapeHtml(whatsapp)}</p>
        <p><strong>Segmento de atuação:</strong> ${escapeHtml(segment)}</p>
        <p><strong>Mensagem:</strong></p>
        <p>${escapeHtml(message).replace(/\n/g, "<br />")}</p>
      `,
    });

    if (error) {
      console.error("Resend error:", error);
      return new Response(JSON.stringify({ error: "Falha ao enviar a mensagem." }), { status: 502 });
    }

    return new Response(JSON.stringify({ ok: true }), { status: 200 });
  } catch (err) {
    console.error("Contact form error:", err);
    return new Response(JSON.stringify({ error: "Erro inesperado ao enviar a mensagem." }), { status: 500 });
  }
};
