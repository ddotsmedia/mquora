import nodemailer from 'nodemailer';

let transporter: ReturnType<typeof nodemailer.createTransport> | null = null;

export function mailConfigured(): boolean {
  return Boolean(process.env.SMTP_HOST && process.env.SMTP_FROM);
}

// Sends a plain-text email over SMTP. In development without SMTP the message is logged instead.
export async function sendMail(to: string, subject: string, text: string): Promise<void> {
  if (!mailConfigured()) {
    if (process.env.NODE_ENV === 'development') {
      console.log(`[mail:dev] to=${to} subject=${subject}\n${text}`);
      return;
    }
    throw new Error('SMTP is not configured (SMTP_HOST and SMTP_FROM)');
  }
  if (!transporter) {
    const port = Number(process.env.SMTP_PORT || 587);
    transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port,
      secure: port === 465,
      auth: process.env.SMTP_USER ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS } : undefined,
    });
  }
  await transporter.sendMail({ from: process.env.SMTP_FROM, to, subject, text });
}
