import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY || 're_123456789'); // Valid format dummy to prevent crash
const FROM_EMAIL = process.env.RESEND_FROM_EMAIL || 'noreply@hiperfarma.com.br';

// ==========================================
// EMAIL PARA O LEAD (sem ROI, sem score)
// ==========================================

interface MeetingConfirmationData {
  leadName: string;
  leadEmail: string;
  consultorName: string;
  date: string;        // "Quinta-feira, 13 de Fevereiro de 2026"
  time: string;        // "11:00 - 12:00"
  meetingLink?: string; // Link Teams/Zoom (se houver)
  rescheduleUrl?: string;
}

export async function sendMeetingConfirmationToLead(data: MeetingConfirmationData) {
  if (!process.env.RESEND_API_KEY) {
    console.warn('[Email] RESEND_API_KEY not configured, skipping email');
    return null;
  }

  try {
    const result = await resend.emails.send({
      from: `Rede Hiperfarma <${FROM_EMAIL}>`,
      to: data.leadEmail,
      subject: '✅ Reunião Confirmada - Rede Hiperfarma',
      html: `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; color: #334155;">
  <div style="text-align: center; padding: 24px 0; border-bottom: 2px solid #f1f5f9;">
    <h1 style="color: #dc2626; margin: 0; font-size: 24px;">Rede Hiperfarma</h1>
  </div>
  
  <div style="padding: 32px 0;">
    <p style="font-size: 18px;">Olá <strong>${data.leadName}</strong>!</p>
    <p>Sua reunião foi confirmada com sucesso! 🎉</p>
    
    <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 24px; margin: 24px 0;">
      <h3 style="margin: 0 0 16px; color: #1e293b;">📅 DETALHES DA REUNIÃO</h3>
      <table style="width: 100%; border-collapse: collapse;">
        <tr><td style="padding: 8px 0; color: #64748b;">Data</td><td style="padding: 8px 0; font-weight: 600;">${data.date}</td></tr>
        <tr><td style="padding: 8px 0; color: #64748b;">Horário</td><td style="padding: 8px 0; font-weight: 600;">${data.time}</td></tr>
        <tr><td style="padding: 8px 0; color: #64748b;">Consultor</td><td style="padding: 8px 0; font-weight: 600;">${data.consultorName}</td></tr>
      </table>
    </div>
    
    ${data.meetingLink ? `
    <div style="background: #eff6ff; border: 1px solid #bfdbfe; border-radius: 12px; padding: 20px; margin: 24px 0; text-align: center;">
      <p style="margin: 0 0 12px; font-weight: 600; color: #1e40af;">📹 LINK DA REUNIÃO</p>
      <a href="${data.meetingLink}" style="display: inline-block; background: #2563eb; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: 600;">Acessar Reunião</a>
    </div>
    ` : ''}
    
    <div style="background: #fefce8; border: 1px solid #fde68a; border-radius: 12px; padding: 20px; margin: 24px 0;">
      <h4 style="margin: 0 0 12px; color: #92400e;">💡 PREPARE-SE</h4>
      <ul style="margin: 0; padding: 0 0 0 20px; color: #78716c;">
        <li style="margin-bottom: 8px;">Ter em mãos dados de faturamento</li>
        <li style="margin-bottom: 8px;">Listar principais desafios atuais</li>
        <li>Pensar em objetivos de crescimento para a farmácia</li>
      </ul>
    </div>
    
    ${data.rescheduleUrl ? `<p style="text-align: center; color: #94a3b8; font-size: 14px;">📱 <a href="${data.rescheduleUrl}" style="color: #64748b;">Precisa reagendar?</a></p>` : ''}
  </div>
  
  <div style="border-top: 2px solid #f1f5f9; padding: 24px 0; text-align: center; color: #94a3b8; font-size: 12px;">
    <p>Nos vemos em breve! 🚀</p>
    <p>Equipe Hiperfarma</p>
  </div>
</body>
</html>
            `.trim(),
    });
    return result;
  } catch (error) {
    console.error('[Email] Failed to send meeting confirmation to lead:', error);
    return null;
  }
}

// ==========================================
// EMAIL PARA O CONSULTOR (com dados internos completos)
// ==========================================

interface ConsultorNotificationData {
  consultorEmail: string;
  consultorName: string;
  // Lead data
  leadName: string;
  leadEmail: string;
  leadPhone: string;
  leadCompany: string;
  // Qualification
  score: number;
  grade: string;
  desafios: string[];
  urgencia: string;
  // ROI (interno)
  roiData?: {
    roiPercentual?: number;
    resultadoMensal?: number;
    viavel?: boolean;
  };
  // Meeting
  date: string;
  time: string;
  meetingLink?: string;
  leadNotes?: string;
  // CRM link
  leadCrmUrl: string;
}

export async function sendMeetingNotificationToConsultor(data: ConsultorNotificationData) {
  if (!process.env.RESEND_API_KEY) {
    console.warn('[Email] RESEND_API_KEY not configured, skipping email');
    return null;
  }

  const gradeEmoji = { A: '🔥', B: '⭐', C: '🟡', D: '🟠', F: '⚫' }[data.grade] || '⚪';

  try {
    const result = await resend.emails.send({
      from: `CRM Hiperfarma <${FROM_EMAIL}>`,
      to: data.consultorEmail,
      subject: `${gradeEmoji} Nova Reunião Agendada - Lead Grade ${data.grade}`,
      html: `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; color: #334155;">
  <div style="text-align: center; padding: 24px 0; border-bottom: 2px solid #f1f5f9;">
    <h1 style="color: #dc2626; margin: 0; font-size: 20px;">CRM Hiperfarma — Nova Reunião</h1>
  </div>
  
  <div style="padding: 24px 0;">
    <p>Olá <strong>${data.consultorName}</strong>, uma nova reunião foi agendada pelo sistema!</p>
    
    <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 20px; margin: 20px 0;">
      <h3 style="margin: 0 0 12px;">👤 LEAD</h3>
      <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
        <tr><td style="padding: 6px 0; color: #64748b;">Nome</td><td style="padding: 6px 0; font-weight: 600;">${data.leadName}</td></tr>
        <tr><td style="padding: 6px 0; color: #64748b;">Empresa</td><td style="padding: 6px 0;">${data.leadCompany}</td></tr>
        <tr><td style="padding: 6px 0; color: #64748b;">Telefone</td><td style="padding: 6px 0;">${data.leadPhone}</td></tr>
        <tr><td style="padding: 6px 0; color: #64748b;">Email</td><td style="padding: 6px 0;">${data.leadEmail}</td></tr>
      </table>
    </div>
    
    <div style="background: #fef2f2; border: 1px solid #fecaca; border-radius: 12px; padding: 20px; margin: 20px 0;">
      <h3 style="margin: 0 0 12px;">📊 QUALIFICAÇÃO (INTERNO)</h3>
      <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
        <tr><td style="padding: 6px 0; color: #64748b;">Score</td><td style="padding: 6px 0; font-weight: 600;">${data.score}/100 (Grade ${data.grade})</td></tr>
        ${data.roiData?.roiPercentual ? `<tr><td style="padding: 6px 0; color: #64748b;">ROI Estimado</td><td style="padding: 6px 0; font-weight: 600;">${data.roiData.roiPercentual}%</td></tr>` : ''}
        ${data.roiData?.resultadoMensal ? `<tr><td style="padding: 6px 0; color: #64748b;">Resultado Mensal</td><td style="padding: 6px 0; font-weight: 600;">R$ ${data.roiData.resultadoMensal.toLocaleString('pt-BR')}</td></tr>` : ''}
      </table>
    </div>
    
    ${data.desafios.length > 0 ? `
    <div style="background: #fffbeb; border: 1px solid #fde68a; border-radius: 12px; padding: 20px; margin: 20px 0;">
      <h3 style="margin: 0 0 12px;">🎯 DESAFIOS PRINCIPAIS</h3>
      <ul style="margin: 0; padding: 0 0 0 20px; font-size: 14px;">
        ${data.desafios.map(d => `<li style="margin-bottom: 4px;">${d}</li>`).join('')}
      </ul>
      <p style="margin: 12px 0 0; font-size: 14px;"><strong>Urgência:</strong> ${data.urgencia}</p>
    </div>
    ` : ''}
    
    <div style="background: #eff6ff; border: 1px solid #bfdbfe; border-radius: 12px; padding: 20px; margin: 20px 0;">
      <h3 style="margin: 0 0 12px;">📅 REUNIÃO</h3>
      <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
        <tr><td style="padding: 6px 0; color: #64748b;">Data</td><td style="padding: 6px 0; font-weight: 600;">${data.date}</td></tr>
        <tr><td style="padding: 6px 0; color: #64748b;">Horário</td><td style="padding: 6px 0; font-weight: 600;">${data.time}</td></tr>
        ${data.meetingLink ? `<tr><td style="padding: 6px 0; color: #64748b;">Link</td><td style="padding: 6px 0;"><a href="${data.meetingLink}">${data.meetingLink}</a></td></tr>` : ''}
      </table>
    </div>
    
    ${data.leadNotes ? `
    <div style="background: #f5f3ff; border: 1px solid #ddd6fe; border-radius: 12px; padding: 20px; margin: 20px 0;">
      <h3 style="margin: 0 0 8px;">💬 OBSERVAÇÕES DO LEAD</h3>
      <p style="margin: 0; font-size: 14px; font-style: italic;">"${data.leadNotes}"</p>
    </div>
    ` : ''}
    
    <div style="text-align: center; margin: 24px 0;">
      <a href="${data.leadCrmUrl}" style="display: inline-block; background: #dc2626; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: 600;">Ver Lead no CRM</a>
    </div>
  </div>
  
  <div style="border-top: 2px solid #f1f5f9; padding: 16px 0; text-align: center; color: #94a3b8; font-size: 12px;">
    <p>CRM Hiperfarma — Sistema de Expansão</p>
  </div>
</body>
</html>
            `.trim(),
    });
    return result;
  } catch (error) {
    console.error('[Email] Failed to send notification to consultor:', error);
    return null;
  }
}

// ==========================================
// EMAIL SIMPLES DE RATE LIMITING (não bloqueia)
// ==========================================

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
