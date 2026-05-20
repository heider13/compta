// Templates HTML simples (inline CSS, 600px max, monocolumn)
// Chaque fonction retourne { subject, html, text }

interface EmailContent {
  subject: string;
  html: string;
  text: string;
}

function layout(title: string, body: string): string {
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><title>${escape(title)}</title></head>
<body style="margin:0;padding:0;background:#FAFAFC;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;color:#1A1A1F;">
<table width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#FAFAFC;padding:40px 16px;"><tr><td align="center">
<table width="600" cellpadding="0" cellspacing="0" border="0" style="background:#fff;border-radius:14px;border:1px solid #E5E7EB;overflow:hidden;max-width:600px;">
<tr><td style="padding:24px 32px;border-bottom:1px solid #E5E7EB;">
<span style="display:inline-block;width:28px;height:28px;background:#5B36D6;color:#fff;border-radius:8px;text-align:center;line-height:28px;font-weight:600;">C</span>
<span style="margin-left:10px;font-size:18px;font-weight:600;letter-spacing:-0.02em;">compta</span>
</td></tr>
<tr><td style="padding:32px;font-size:15px;line-height:1.55;color:#374151;">${body}</td></tr>
<tr><td style="padding:20px 32px;background:#FAFAFC;border-top:1px solid #E5E7EB;font-size:12px;color:#6B7280;">
Compta — La plateforme de formalités juridiques pour cabinets professionnels.
</td></tr>
</table></td></tr></table></body></html>`;
}

function escape(s: string): string {
  return String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!));
}

function btn(label: string, url: string): string {
  return `<a href="${url}" style="display:inline-block;padding:12px 22px;background:#5B36D6;color:#fff;border-radius:10px;text-decoration:none;font-weight:500;font-size:14px;">${escape(label)}</a>`;
}

export function cabinetInvitation(p: { cabinetName: string; inviterName: string; acceptUrl: string }): EmailContent {
  const subject = `${p.inviterName} vous invite à rejoindre ${p.cabinetName} sur Compta`;
  const body = `<h2 style="margin:0 0 12px;font-size:22px;letter-spacing:-0.02em;">Vous avez reçu une invitation</h2>
<p>${escape(p.inviterName)} vous invite à rejoindre le cabinet <strong>${escape(p.cabinetName)}</strong> sur Compta.</p>
<p>Compta est la plateforme tout-en-un pour la gestion des formalités juridiques d'entreprise via le Guichet Unique INPI.</p>
<p style="margin:28px 0;">${btn("Accepter l'invitation", p.acceptUrl)}</p>
<p style="font-size:13px;color:#6B7280;">Le lien expire dans 7 jours.</p>`;
  return { subject, html: layout(subject, body), text: `${p.inviterName} vous invite à rejoindre ${p.cabinetName} sur Compta. Lien : ${p.acceptUrl}` };
}

export function dossierSubmitted(p: { clientName: string; dossierRef: string; formaliteType: string; viewUrl: string }): EmailContent {
  const subject = `Nouveau dossier soumis · ${p.dossierRef}`;
  const body = `<h2 style="margin:0 0 12px;font-size:22px;">Nouveau dossier à valider</h2>
<p>Le dossier <strong>${escape(p.dossierRef)}</strong> pour <strong>${escape(p.clientName)}</strong> (${escape(p.formaliteType)}) a été soumis pour votre validation.</p>
<p style="margin:24px 0;">${btn('Voir le dossier', p.viewUrl)}</p>`;
  return { subject, html: layout(subject, body), text: `Nouveau dossier ${p.dossierRef} pour ${p.clientName} à valider. ${p.viewUrl}` };
}

export function dossierAmendmentRequested(p: { clientName: string; dossierRef: string; message: string; viewUrl: string }): EmailContent {
  const subject = `Correction demandée · ${p.dossierRef}`;
  const body = `<h2 style="margin:0 0 12px;font-size:22px;">Correction demandée</h2>
<p>Le dossier <strong>${escape(p.dossierRef)}</strong> pour <strong>${escape(p.clientName)}</strong> nécessite une correction.</p>
<div style="padding:16px;background:#FEF3C7;border-left:3px solid #F59E0B;border-radius:8px;margin:16px 0;color:#92400E;font-size:14px;">${escape(p.message)}</div>
<p style="margin:24px 0;">${btn('Voir et corriger', p.viewUrl)}</p>`;
  return { subject, html: layout(subject, body), text: `Correction demandée sur ${p.dossierRef} : ${p.message}` };
}

export function dossierValidated(p: { clientName: string; dossierRef: string; inpiRef?: string; viewUrl: string }): EmailContent {
  const subject = `Dossier validé · ${p.dossierRef}`;
  const inpiLine = p.inpiRef ? `<p style="font-size:13px;color:#6B7280;">Référence INPI : <span style="font-family:monospace;">${escape(p.inpiRef)}</span></p>` : '';
  const body = `<h2 style="margin:0 0 12px;font-size:22px;">✓ Dossier validé</h2>
<p>Le dossier <strong>${escape(p.dossierRef)}</strong> pour <strong>${escape(p.clientName)}</strong> a été validé et transmis à l'INPI.</p>
${inpiLine}
<p style="margin:24px 0;">${btn('Voir le dossier', p.viewUrl)}</p>`;
  return { subject, html: layout(subject, body), text: `Dossier ${p.dossierRef} validé.${p.inpiRef ? ' INPI : ' + p.inpiRef : ''}` };
}

export function signatureRequest(p: { clientName: string; dossierRef: string; signatureUrl: string }): EmailContent {
  const subject = `Signature requise · ${p.dossierRef}`;
  const body = `<h2 style="margin:0 0 12px;font-size:22px;">Document à signer</h2>
<p>Bonjour,</p>
<p>Le dossier <strong>${escape(p.dossierRef)}</strong> pour <strong>${escape(p.clientName)}</strong> est prêt à être signé électroniquement.</p>
<p style="margin:24px 0;">${btn('Signer le document', p.signatureUrl)}</p>
<p style="font-size:13px;color:#6B7280;">La signature se fait via notre prestataire qualifié RGS. Le lien expire dans 14 jours.</p>`;
  return { subject, html: layout(subject, body), text: `Signature requise pour ${p.dossierRef} : ${p.signatureUrl}` };
}
