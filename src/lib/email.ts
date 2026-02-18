import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY || 're_123456789');
const FROM_EMAIL = process.env.RESEND_FROM_EMAIL || 'noreply@hiperfarma.com.br';

function escapeHtml(value: string): string {
  return value
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

interface MeetingConfirmationData {
  leadName: string;
  leadEmail: string;
  consultorName: string;
  date: string;
  time: string;
  meetingLink?: string;
  rescheduleUrl?: string;
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

  try {
    return await resend.emails.send({
      from: `Rede Hiperfarma <${FROM_EMAIL}>`,
      to: data.leadEmail,
      subject: 'Reuniao confirmada - Rede Hiperfarma',
      html: `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; color: #334155;">
  <div style="text-align: center; padding: 24px 0; border-bottom: 2px solid #f1f5f9;">
    <h1 style="color: #dc2626; margin: 0; font-size: 24px;">Rede Hiperfarma</h1>
  </div>
  <div style="padding: 32px 0;">
    <p style="font-size: 18px;">Ola <strong>${leadName}</strong>!</p>
    <p>Sua reuniao foi confirmada com sucesso.</p>
    <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 24px; margin: 24px 0;">
      <h3 style="margin: 0 0 16px; color: #1e293b;">Detalhes da reuniao</h3>
      <table style="width: 100%; border-collapse: collapse;">
        <tr><td style="padding: 8px 0; color: #64748b;">Data</td><td style="padding: 8px 0; font-weight: 600;">${date}</td></tr>
        <tr><td style="padding: 8px 0; color: #64748b;">Horario</td><td style="padding: 8px 0; font-weight: 600;">${time}</td></tr>
        <tr><td style="padding: 8px 0; color: #64748b;">Consultor</td><td style="padding: 8px 0; font-weight: 600;">${consultorName}</td></tr>
      </table>
    </div>
    ${meetingLink ? `<p><a href="${meetingLink}" style="display: inline-block; background: #2563eb; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: 600;">Acessar reuniao</a></p>` : ''}
    ${rescheduleUrl ? `<p style="font-size: 14px; color: #64748b;"><a href="${rescheduleUrl}" style="color: #64748b;">Precisa reagendar?</a></p>` : ''}
  </div>
</body>
</html>
      `.trim(),
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
  leadPhone: string;
  leadCompany: string;
  score: number;
  grade: string;
  desafios: string[];
  urgencia: string;
  roiData?: {
    roiPercentual?: number;
    resultadoMensal?: number;
    viavel?: boolean;
  };
  date: string;
  time: string;
  meetingLink?: string;
  leadNotes?: string;
  leadCrmUrl: string;
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
  const grade = escapeHtml(data.grade);
  const date = escapeHtml(data.date);
  const time = escapeHtml(data.time);
  const urgencia = escapeHtml(data.urgencia);
  const desafios = data.desafios.map((item) => escapeHtml(item));
  const leadNotes = data.leadNotes ? escapeHtml(data.leadNotes) : null;
  const meetingLink = sanitizeUrl(data.meetingLink);
  const leadCrmUrl = sanitizeUrl(data.leadCrmUrl);
  const score = Number.isFinite(data.score) ? data.score : 0;
  const roiPercentual = Number.isFinite(data.roiData?.roiPercentual) ? Number(data.roiData?.roiPercentual) : null;
  const resultadoMensal = Number.isFinite(data.roiData?.resultadoMensal) ? Number(data.roiData?.resultadoMensal) : null;

  try {
    return await resend.emails.send({
      from: `CRM Hiperfarma <${FROM_EMAIL}>`,
      to: data.consultorEmail,
      subject: `Nova reuniao agendada - Lead Grade ${grade}`,
      html: `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; color: #334155;">
  <div style="text-align: center; padding: 24px 0; border-bottom: 2px solid #f1f5f9;">
    <h1 style="color: #dc2626; margin: 0; font-size: 20px;">CRM Hiperfarma - Nova reuniao</h1>
  </div>
  <div style="padding: 24px 0;">
    <p>Ola <strong>${consultorName}</strong>, uma nova reuniao foi agendada.</p>
    <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 20px; margin: 20px 0;">
      <h3 style="margin: 0 0 12px;">Lead</h3>
      <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
        <tr><td style="padding: 6px 0; color: #64748b;">Nome</td><td style="padding: 6px 0; font-weight: 600;">${leadName}</td></tr>
        <tr><td style="padding: 6px 0; color: #64748b;">Empresa</td><td style="padding: 6px 0;">${leadCompany}</td></tr>
        <tr><td style="padding: 6px 0; color: #64748b;">Telefone</td><td style="padding: 6px 0;">${leadPhone}</td></tr>
        <tr><td style="padding: 6px 0; color: #64748b;">Email</td><td style="padding: 6px 0;">${leadEmail}</td></tr>
      </table>
    </div>
    <div style="background: #fef2f2; border: 1px solid #fecaca; border-radius: 12px; padding: 20px; margin: 20px 0;">
      <h3 style="margin: 0 0 12px;">Qualificacao</h3>
      <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
        <tr><td style="padding: 6px 0; color: #64748b;">Score</td><td style="padding: 6px 0; font-weight: 600;">${score}/100 (Grade ${grade})</td></tr>
        ${roiPercentual !== null ? `<tr><td style="padding: 6px 0; color: #64748b;">ROI estimado</td><td style="padding: 6px 0; font-weight: 600;">${roiPercentual}%</td></tr>` : ''}
        ${resultadoMensal !== null ? `<tr><td style="padding: 6px 0; color: #64748b;">Resultado mensal</td><td style="padding: 6px 0; font-weight: 600;">R$ ${resultadoMensal.toLocaleString('pt-BR')}</td></tr>` : ''}
      </table>
    </div>
    ${desafios.length > 0 ? `
    <div style="background: #fffbeb; border: 1px solid #fde68a; border-radius: 12px; padding: 20px; margin: 20px 0;">
      <h3 style="margin: 0 0 12px;">Desafios principais</h3>
      <ul style="margin: 0; padding: 0 0 0 20px; font-size: 14px;">
        ${desafios.map((item) => `<li style="margin-bottom: 4px;">${item}</li>`).join('')}
      </ul>
      <p style="margin: 12px 0 0; font-size: 14px;"><strong>Urgencia:</strong> ${urgencia}</p>
    </div>
    ` : ''}
    <div style="background: #eff6ff; border: 1px solid #bfdbfe; border-radius: 12px; padding: 20px; margin: 20px 0;">
      <h3 style="margin: 0 0 12px;">Reuniao</h3>
      <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
        <tr><td style="padding: 6px 0; color: #64748b;">Data</td><td style="padding: 6px 0; font-weight: 600;">${date}</td></tr>
        <tr><td style="padding: 6px 0; color: #64748b;">Horario</td><td style="padding: 6px 0; font-weight: 600;">${time}</td></tr>
        ${meetingLink ? `<tr><td style="padding: 6px 0; color: #64748b;">Link</td><td style="padding: 6px 0;"><a href="${meetingLink}">${meetingLink}</a></td></tr>` : ''}
      </table>
    </div>
    ${leadNotes ? `
    <div style="background: #f5f3ff; border: 1px solid #ddd6fe; border-radius: 12px; padding: 20px; margin: 20px 0;">
      <h3 style="margin: 0 0 8px;">Observacoes do lead</h3>
      <p style="margin: 0; font-size: 14px; font-style: italic;">"${leadNotes}"</p>
    </div>
    ` : ''}
    ${leadCrmUrl ? `<p><a href="${leadCrmUrl}" style="display: inline-block; background: #dc2626; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: 600;">Ver lead no CRM</a></p>` : ''}
  </div>
</body>
</html>
      `.trim(),
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
