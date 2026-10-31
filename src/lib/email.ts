import tls from "tls";

export interface SendOtpEmailOptions {
  to: string;
  subject: string;
  html: string;
  fromName?: string;
}

export interface SendOtpEmailResult {
  sent: boolean;
  provider?: "gmail_smtp" | "resend";
  error?: string;
}

/**
 * Zero-dependency TLS SMTP client for Gmail (`smtp.gmail.com:465`).
 * Sends HTML emails to ANY recipient email address worldwide using a Google App Password.
 */
async function sendViaGmailSmtp(
  user: string,
  appPassword: string,
  opts: SendOtpEmailOptions
): Promise<SendOtpEmailResult> {
  const cleanPass = appPassword.replace(/\s+/g, "");
  const host = process.env.SMTP_HOST || "smtp.gmail.com";
  const port = Number(process.env.SMTP_PORT || 465);
  const fromName = opts.fromName || "EdClarity Security";

  return new Promise((resolve) => {
    const socket = tls.connect({ host, port, rejectUnauthorized: true });
    let buffer = "";
    let step = 0;
    let finished = false;

    const done = (result: SendOtpEmailResult) => {
      if (finished) return;
      finished = true;
      try {
        socket.end();
      } catch {}
      resolve(result);
    };

    socket.setTimeout(10000, () => {
      done({ sent: false, error: "SMTP connection timed out" });
    });

    socket.on("error", (err) => {
      done({ sent: false, error: err.message });
    });

    const sendLine = (line: string) => {
      socket.write(line + "\r\n");
    };

    socket.on("data", (chunk) => {
      buffer += chunk.toString("utf8");
      const lines = buffer.split("\r\n");
      buffer = lines.pop() || "";

      for (const line of lines) {
        if (!line) continue;
        // Multi-line SMTP responses have a hyphen at index 3 (e.g. "250-PIPELINING"); wait for final line ("250 ...")
        if (line.length >= 4 && line[3] === "-") continue;

        const code = parseInt(line.slice(0, 3), 10);
        if (code >= 400) {
          done({ sent: false, error: `SMTP ${code}: ${line}` });
          return;
        }

        if (step === 0 && code === 220) {
          step = 1;
          sendLine("EHLO edclarity.ai");
        } else if (step === 1 && code === 250) {
          step = 2;
          const authToken = Buffer.from(`\u0000${user}\u0000${cleanPass}`, "utf8").toString("base64");
          sendLine(`AUTH PLAIN ${authToken}`);
        } else if (step === 2 && code === 235) {
          step = 3;
          sendLine(`MAIL FROM:<${user}>`);
        } else if (step === 3 && code === 250) {
          step = 4;
          sendLine(`RCPT TO:<${opts.to}>`);
        } else if (step === 4 && code === 250) {
          step = 5;
          sendLine("DATA");
        } else if (step === 5 && code === 354) {
          step = 6;
          const mimeMessage = [
            `From: "${fromName}" <${user}>`,
            `To: <${opts.to}>`,
            `Subject: =?UTF-8?B?${Buffer.from(opts.subject, "utf8").toString("base64")}?=`,
            `MIME-Version: 1.0`,
            `Content-Type: text/html; charset=UTF-8`,
            `Content-Transfer-Encoding: base64`,
            ``,
            Buffer.from(opts.html, "utf8").toString("base64"),
            `.`,
          ].join("\r\n");
          sendLine(mimeMessage);
        } else if (step === 6 && code === 250) {
          step = 7;
          sendLine("QUIT");
          done({ sent: true, provider: "gmail_smtp" });
        }
      }
    });
  });
}

/**
 * Dual-Provider Email Dispatcher:
 * 1. Tries Resend API first (if RESEND_API_KEY is configured).
 * 2. If Resend fails (e.g. 403 sandbox restriction when sending to external users without a custom domain),
 *    automatically falls back to Gmail SMTP (SMTP_USER + SMTP_PASS) so ANY live user receives their OTP.
 */
export async function sendTransactionalEmail(opts: SendOtpEmailOptions): Promise<SendOtpEmailResult> {
  const resendApiKey = process.env.RESEND_SIGNUP_API_KEY || process.env.RESEND_API_KEY;
  const resendFrom = process.env.RESEND_FROM_EMAIL || `${opts.fromName || "EdClarity Security"} <onboarding@resend.dev>`;
  const smtpUser = (process.env.SMTP_USER || process.env.GMAIL_USER || "").replace(/^["']|["']$/g, "").trim();
  const smtpPass = (process.env.SMTP_PASS || process.env.GMAIL_APP_PASSWORD || "").replace(/^["']|["']$/g, "").trim();

  let resendError = "";

  // 1. Try Resend first if configured
  if (resendApiKey) {
    try {
      const emailRes = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${resendApiKey}`,
        },
        body: JSON.stringify({
          from: resendFrom,
          to: opts.to,
          subject: opts.subject,
          html: opts.html,
        }),
      });

      const resData = await emailRes.json().catch(() => ({}));
      if (emailRes.ok) {
        console.log(`✅ [Resend API] Email delivered to ${opts.to} (ID: ${resData?.id})`);
        return { sent: true, provider: "resend" };
      }

      resendError = resData?.message || `HTTP ${emailRes.status}`;
      console.warn(`⚠️ [Resend Notice for ${opts.to}]: ${resendError} — checking Gmail SMTP fallback...`);
    } catch (err: any) {
      resendError = err?.message || "Resend network error";
      console.warn(`⚠️ [Resend Error]: ${resendError}`);
    }
  }

  // 2. Automatic Fallback to Gmail SMTP (delivers to ANY email address worldwide without custom domain)
  if (smtpUser && smtpPass) {
    const smtpRes = await sendViaGmailSmtp(smtpUser.trim(), smtpPass.trim(), opts);
    if (smtpRes.sent) {
      console.log(`✅ [Gmail SMTP] Email delivered to ${opts.to} via ${smtpUser}`);
      return smtpRes;
    }
    console.warn(`⚠️ [Gmail SMTP Error]: ${smtpRes.error}`);
    return {
      sent: false,
      error: `Gmail SMTP: ${smtpRes.error}${resendError ? ` | Resend: ${resendError}` : ""}`,
    };
  }

  return {
    sent: false,
    error: resendError || "Neither RESEND_API_KEY nor SMTP_USER/SMTP_PASS configured",
  };
}

