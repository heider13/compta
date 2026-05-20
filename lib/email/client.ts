// Client Resend pour l'envoi d'emails transactionnels
// Doc : https://resend.com/docs/api-reference/emails/send-email

interface SendEmailParams {
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
  from?: string;
  replyTo?: string;
}

const RESEND_API = 'https://api.resend.com/emails';

export async function sendEmail(params: SendEmailParams): Promise<{ id: string | null; mocked: boolean }> {
  const apiKey = process.env.RESEND_API_KEY;
  const defaultFrom = process.env.RESEND_FROM || 'Compta <onboarding@resend.dev>';

  if (!apiKey) {
    console.warn('[email] RESEND_API_KEY absente, email mock :', params.subject, '->', params.to);
    return { id: null, mocked: true };
  }

  const res = await fetch(RESEND_API, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: params.from || defaultFrom,
      to: Array.isArray(params.to) ? params.to : [params.to],
      subject: params.subject,
      html: params.html,
      text: params.text,
      reply_to: params.replyTo,
    }),
  });

  if (!res.ok) {
    const detail = await res.text().catch(() => '');
    throw new Error(`Resend ${res.status}: ${detail.slice(0, 300)}`);
  }
  const data = (await res.json()) as { id: string };
  return { id: data.id, mocked: false };
}
