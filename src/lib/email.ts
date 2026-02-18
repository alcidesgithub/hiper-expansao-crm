import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY || 're_123456789');
const FROM_EMAIL = process.env.RESEND_FROM_EMAIL || 'noreply@hiperfarma.com.br';

const BRAND = {
  name: 'Expansao Hiperfarma',
  primary: '#DF362D',
  secondary: '#114F99',
  text: '#1E293B',
  muted: '#64748B',
  surface: '#F8FAFC',
  border: '#E2E8F0',
};

function escapeHtml(value: unknown): string {
  const text = value == null ? '' : String(value);
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function sanitizeUrl(url?: string): string | null {
  if (!url) return null;
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return null;
    return parsed.toString();
  } catch {
    return null;
  }
}

function resolveAppUrl(explicitAppUrl?: string): string | null {
  const candidates = [explicitAppUrl, process.env.NEXT_PUBLIC_APP_URL, process.env.NEXTAUTH_URL];
  for (const candidate of candidates) {
    const sanitized = sanitizeUrl(candidate?.trim());
    if (sanitized) return sanitized.replace(/\/$/, '');
  }
  return null;
}

function renderEmailLayout(params: {
  appUrl?: string;
  preheader: string;
  title: string;
  subtitle: string;
  body: string;
}): string {
  const appUrl = resolveAppUrl(params.appUrl);
  const logoUrl = appUrl ? `${appUrl}/logo-cor.png` : '/logo-cor.png';

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(params.title)}</title>
</head>
<body style="margin:0;padding:0;background:#f1f5f9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif;color:${BRAND.text};">
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;mso-hide:all;">${escapeHtml(params.preheader)}</div>
  <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background:#f1f5f9;padding:24px 12px;">
    <tr>
      <td align="center">
        <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="max-width:620px;background:#ffffff;border:1px solid ${BRAND.border};border-radius:16px;overflow:hidden;">
          <tr>
            <td style="padding:24px;border-bottom:1px solid ${BRAND.border};background:linear-gradient(135deg,#fff5f5 0%,#eff6ff 100%);">
              <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
                <tr>
                  <td valign="middle" align="left">
                    <img src="${logoUrl}" width="180" alt="Rede Hiperfarma" style="display:block;max-width:180px;height:auto;border:0;outline:none;text-decoration:none;">
                  </td>
                  <td valign="middle" align="right" style="font-size:12px;color:${BRAND.muted};">
                    ${escapeHtml(BRAND.name)}
                  </td>
                </tr>
              </table>
              <h1 style="margin:20px 0 8px;font-size:24px;line-height:1.25;color:${BRAND.secondary};">${escapeHtml(params.title)}</h1>
              <p style="margin:0;font-size:14px;line-height:1.5;color:${BRAND.muted};">${escapeHtml(params.subtitle)}</p>
            </td>
          </tr>
          <tr>
            <td style="padding:24px;">
              ${params.body}
            </td>
          </tr>
          <tr>
            <td style="padding:16px 24px;border-top:1px solid ${BRAND.border};background:${BRAND.surface};font-size:12px;line-height:1.5;color:${BRAND.muted};">
              Expansao Hiperfarma | Comunicacao comercial automatica.
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim();
}

function renderDataRow(label: string, value: string): string {
  return `<tr>
    <td style="padding:8px 0;color:${BRAND.muted};font-size:14px;width:40%;">${escapeHtml(label)}</td>
    <td style="padding:8px 0;color:${BRAND.text};font-size:14px;font-weight:600;">${value}</td>
  </tr>`;
}

function renderSection(title: string, content: string, background: string = '#ffffff'): string {
  return `
<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="margin:0 0 16px;border:1px solid ${BRAND.border};border-radius:12px;background:${background};">
  <tr>
    <td style="padding:16px;">
      <h3 style="margin:0 0 12px;font-size:16px;color:${BRAND.secondary};">${escapeHtml(title)}</h3>
      ${content}
    </td>
  </tr>
</table>
  `.trim();
}

function formatCurrency(value: number): string {
  return value.toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    maximumFractionDigits: 2,
  });
}

interface MeetingConfirmationData {
  leadName: string;
  leadEmail: string;
  consultorName: string;
  date: string;
  time: string;
  meetingLink?: string;
  rescheduleUrl?: string;
  appUrl?: string;
}

export async function sendMeetingConfirmationToLead(data: MeetingConfirmationData) {
  if (!process.env.RESEND_API_KEY) {
    console.warn('[Email] RESEND_API_KEY not configured, skipping email');
    return null;
  }

  const leadName = escapeHtml(data.leadName);
  const consultorName = escapeHtml(data.consultorName);
  const date = escapeHtml(data.date);
  const time = escapeHtml(data.time);
  const meetingLink = sanitizeUrl(data.meetingLink);
  const rescheduleUrl = sanitizeUrl(data.rescheduleUrl);
  const leadEmail = escapeHtml(data.leadEmail);

  const detailsTable = `
<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="border-collapse:collapse;">
  ${renderDataRow('Data', date)}
  ${renderDataRow('Horario', time)}
  ${renderDataRow('Consultor', consultorName)}
  ${renderDataRow('Email de contato', leadEmail)}
</table>
  `.trim();

  const body = `
<p style="margin:0 0 16px;font-size:16px;line-height:1.6;">Ola <strong>${leadName}</strong>, obrigado pelo interesse na Expansao Hiperfarma. Sua reuniao estrategica esta confirmada.</p>
${renderSection('Agenda do encontro', detailsTable, '#ffffff')}
${meetingLink ? `<p style="margin:0 0 12px;"><a href="${meetingLink}" style="display:inline-block;padding:12px 20px;border-radius:10px;background:${BRAND.primary};color:#ffffff;font-weight:700;text-decoration:none;">Entrar na reuniao</a></p>` : ''}
<p style="margin:0 0 12px;font-size:14px;line-height:1.6;color:${BRAND.text};">Neste encontro vamos avaliar seu momento, identificar potencial de crescimento e apresentar os proximos passos para uma expansao sustentavel.</p>
${rescheduleUrl ? `<p style="margin:0;font-size:13px;color:${BRAND.muted};">Se precisar ajustar o horario, use o link de reagendamento: <a href="${rescheduleUrl}" style="color:${BRAND.secondary};">${rescheduleUrl}</a></p>` : ''}
  `.trim();

  try {
    return await resend.emails.send({
      from: `Rede Hiperfarma <${FROM_EMAIL}>`,
      to: data.leadEmail,
      subject: 'Sua reuniao estrategica esta confirmada | Expansao Hiperfarma',
      html: renderEmailLayout({
        appUrl: data.appUrl,
        preheader: 'Sua reuniao de expansao esta confirmada. Vamos para o proximo passo.',
        title: 'Reuniao Estrategica Confirmada',
        subtitle: 'Um especialista da Hiperfarma vai conduzir seu diagnostico de crescimento.',
        body,
      }),
    });
  } catch (error) {
    console.error('[Email] Failed to send meeting confirmation to lead:', error);
    return null;
  }
}

interface ConsultorNotificationData {
  consultorEmail: string;
  consultorName: string;
  leadName: string;
  leadEmail: string;
  leadPhone?: string;
  leadCompany?: string;
  score?: number | null;
  grade?: string | null;
  desafios?: string[];
  urgencia?: string;
  roiData?: {
    roiPercentual?: number;
    resultadoMensal?: number;
    viavel?: boolean;
  };
  date: string;
  time: string;
  meetingLink?: string;
  leadNotes?: string;
  leadCrmUrl?: string;
  appUrl?: string;
}

export async function sendMeetingNotificationToConsultor(data: ConsultorNotificationData) {
  if (!process.env.RESEND_API_KEY) {
    console.warn('[Email] RESEND_API_KEY not configured, skipping email');
    return null;
  }

  const consultorName = escapeHtml(data.consultorName);
  const leadName = escapeHtml(data.leadName);
  const leadCompany = escapeHtml(data.leadCompany);
  const leadPhone = escapeHtml(data.leadPhone);
  const leadEmail = escapeHtml(data.leadEmail);
  const gradeRaw = data.grade ? String(data.grade).trim().toUpperCase() : '';
  const grade = gradeRaw ? escapeHtml(gradeRaw) : '';
  const date = escapeHtml(data.date);
  const time = escapeHtml(data.time);
  const urgenciaRaw = data.urgencia ? String(data.urgencia).trim() : '';
  const urgencia = urgenciaRaw ? escapeHtml(urgenciaRaw) : '';
  const desafios = (data.desafios || [])
    .map((item) => item?.trim())
    .filter((item): item is string => Boolean(item))
    .map((item) => escapeHtml(item));
  const leadNotes = data.leadNotes ? escapeHtml(data.leadNotes) : null;
  const meetingLink = sanitizeUrl(data.meetingLink);
  const leadCrmUrl = sanitizeUrl(data.leadCrmUrl);
  const score = Number.isFinite(data.score) ? Number(data.score) : null;
  const roiPercentual = Number.isFinite(data.roiData?.roiPercentual) ? Number(data.roiData?.roiPercentual) : null;
  const resultadoMensal = Number.isFinite(data.roiData?.resultadoMensal) ? Number(data.roiData?.resultadoMensal) : null;
  const hasQualificationBlock = score !== null || Boolean(grade) || roiPercentual !== null || resultadoMensal !== null || desafios.length > 0 || Boolean(urgencia);

  const leadRows = `
<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="border-collapse:collapse;">
  ${renderDataRow('Nome', leadName)}
  ${leadCompany ? renderDataRow('Empresa', leadCompany) : ''}
  ${leadPhone ? renderDataRow('Telefone', leadPhone) : ''}
  ${renderDataRow('Email', leadEmail)}
</table>
  `.trim();

  const meetingRows = `
<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="border-collapse:collapse;">
  ${renderDataRow('Data', date)}
  ${renderDataRow('Horario', time)}
  ${meetingLink ? renderDataRow('Link', `<a href="${meetingLink}" style="color:${BRAND.secondary};font-weight:600;">Acessar reuniao</a>`) : ''}
</table>
  `.trim();

  const qualificationRows = `
<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="border-collapse:collapse;">
  ${score !== null ? renderDataRow('Score', `${score}/100`) : ''}
  ${grade ? renderDataRow('Grade', grade) : ''}
  ${roiPercentual !== null ? renderDataRow('ROI estimado', `${roiPercentual}%`) : ''}
  ${resultadoMensal !== null ? renderDataRow('Resultado mensal', formatCurrency(resultadoMensal)) : ''}
  ${urgencia ? renderDataRow('Urgencia', urgencia) : ''}
</table>
  `.trim();

  const desafiosHtml = desafios.length
    ? `<ul style="margin:12px 0 0;padding-left:18px;color:${BRAND.text};font-size:14px;">${desafios.map((item) => `<li style="margin-bottom:4px;">${item}</li>`).join('')}</ul>`
    : '';

  const body = `
<p style="margin:0 0 16px;font-size:16px;line-height:1.6;">Ola <strong>${consultorName}</strong>, voce recebeu uma nova oportunidade comercial com reuniao confirmada.</p>
${renderSection('Perfil do lead', leadRows, '#ffffff')}
${renderSection('Agenda comercial', meetingRows, '#eff6ff')}
${hasQualificationBlock ? renderSection('Potencial de conversao', `${qualificationRows}${desafiosHtml}`, '#fff7ed') : ''}
${leadNotes ? renderSection('Contexto informado pelo lead', `<p style="margin:0;font-size:14px;line-height:1.6;color:${BRAND.text};">${leadNotes}</p>`, '#f8fafc') : ''}
${leadCrmUrl ? `<p style="margin:0;"><a href="${leadCrmUrl}" style="display:inline-block;padding:12px 20px;border-radius:10px;background:${BRAND.primary};color:#ffffff;font-weight:700;text-decoration:none;">Priorizar lead no CRM</a></p>` : ''}
  `.trim();

  try {
    return await resend.emails.send({
      from: `CRM Hiperfarma <${FROM_EMAIL}>`,
      to: data.consultorEmail,
      subject: grade ? `Nova oportunidade comercial - Lead Grade ${gradeRaw}` : 'Nova oportunidade comercial com reuniao',
      html: renderEmailLayout({
        appUrl: data.appUrl,
        preheader: 'Novo lead com potencial de conversao aguardando atendimento.',
        title: 'Nova Oportunidade Agendada',
        subtitle: 'Acione rapido para aumentar a chance de conversao.',
        body,
      }),
    });
  } catch (error) {
    console.error('[Email] Failed to send notification to consultor:', error);
    return null;
  }
}

interface SimpleEmailData {
  to: string;
  subject: string;
  html: string;
}

export async function sendEmail(data: SimpleEmailData) {
  if (!process.env.RESEND_API_KEY) {
    console.warn('[Email] RESEND_API_KEY not configured, skipping email');
    return null;
  }

  try {
    return await resend.emails.send({
      from: `Rede Hiperfarma <${FROM_EMAIL}>`,
      to: data.to,
      subject: data.subject,
      html: data.html,
    });
  } catch (error) {
    console.error('[Email] Failed to send email:', error);
    return null;
  }
}
