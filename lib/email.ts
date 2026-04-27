import { Resend } from "resend";

const FROM_EMAIL =
  process.env.RESEND_FROM_EMAIL || "PitchKit <hello@lakeview-webdev.com>";

let _resend: Resend | null = null;

function getResend(): Resend {
  if (!_resend) {
    const key = process.env.RESEND_API_KEY;
    if (!key) throw new Error("Missing RESEND_API_KEY");
    _resend = new Resend(key);
  }
  return _resend;
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

interface FollowUpParams {
  to: string;
  previewSlug: string;
  businessName: string | null;
}

export async function sendFollowUpEmail({
  to,
  previewSlug,
  businessName,
}: FollowUpParams) {
  const resend = getResend();
  const baseUrl ="https://pitchkit.app";
  const previewUrl = `${baseUrl}/preview/${previewSlug}`;
  const creditsUrl = `${baseUrl}/credits`;

  const nameLabel = businessName ? escapeHtml(businessName) : "your prospect";
  const subject = businessName
    ? `Your preview for ${businessName} is still live`
    : `Your preview is still live`;

  const html = `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width,initial-scale=1" />
    <title>${escapeHtml(subject)}</title>
  </head>
  <body style="margin:0;padding:0;background:#0a0a0a;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;color:#e5e5e5;">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#0a0a0a;padding:40px 20px;">
      <tr>
        <td align="center">
          <table role="presentation" width="560" cellspacing="0" cellpadding="0" style="max-width:560px;background:#111111;border:1px solid #222;border-radius:16px;overflow:hidden;">
            <tr>
              <td style="padding:32px 32px 8px 32px;">
                <p style="margin:0;font-size:14px;font-weight:600;color:#f59e0b;letter-spacing:0.04em;">PITCHKIT</p>
              </td>
            </tr>
            <tr>
              <td style="padding:8px 32px 24px 32px;">
                <h1 style="margin:0 0 16px 0;font-size:22px;line-height:1.3;font-weight:700;color:#ffffff;">
                  Your preview for ${nameLabel} is still live
                </h1>
                <p style="margin:0 0 16px 0;font-size:15px;line-height:1.6;color:#b5b5b5;">
                  You generated a redesign yesterday but haven't sent it yet. It's hosted and ready to share — just drop the link into your cold email.
                </p>
                <div style="margin:20px 0;padding:14px 16px;background:#0a0a0a;border:1px solid #222;border-radius:10px;">
                  <a href="${previewUrl}" style="color:#f59e0b;font-size:13px;font-family:ui-monospace,SFMono-Regular,Menlo,monospace;text-decoration:none;word-break:break-all;">${previewUrl}</a>
                </div>
                <p style="margin:24px 0 8px 0;font-size:15px;line-height:1.6;color:#b5b5b5;">
                  Want to pitch more prospects this week? Use the code below to take <strong style="color:#ffffff;">33% off</strong> the Starter pack — <strong style="color:#ffffff;">20 credits for $8</strong> ($0.40/credit, your best rate).
                </p>
                <div style="margin:20px 0;padding:16px;background:rgba(245,158,11,0.08);border:1px solid rgba(245,158,11,0.3);border-radius:10px;text-align:center;">
                  <p style="margin:0 0 6px 0;font-size:11px;letter-spacing:0.12em;text-transform:uppercase;color:#b5b5b5;">Use code at checkout</p>
                  <p style="margin:0;font-size:22px;font-weight:700;letter-spacing:0.08em;color:#f59e0b;font-family:ui-monospace,SFMono-Regular,Menlo,monospace;">COMEBACK33</p>
                </div>
                <table role="presentation" cellspacing="0" cellpadding="0" style="margin:24px 0 8px 0;">
                  <tr>
                    <td>
                      <a href="${creditsUrl}" style="display:inline-block;padding:12px 24px;background:#f59e0b;color:#0a0a0a;font-weight:700;font-size:14px;text-decoration:none;border-radius:10px;">
                        Get 20 credits for $8 &rarr;
                      </a>
                    </td>
                  </tr>
                </table>
                <p style="margin:24px 0 0 0;font-size:12px;line-height:1.5;color:#6b6b6b;">
                  Code valid for 7 days. One use per customer.
                </p>
              </td>
            </tr>
            <tr>
              <td style="padding:20px 32px;border-top:1px solid #222;">
                <p style="margin:0;font-size:12px;color:#6b6b6b;">
                  You're receiving this because you created a preview on PitchKit.
                </p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;

  return resend.emails.send({
    from: FROM_EMAIL,
    to,
    subject,
    html,
  });
}

interface ProductHuntLaunchParams {
  to: string;
  productHuntUrl: string;
}

export async function sendProductHuntLaunchEmail({
  to,
  productHuntUrl,
}: ProductHuntLaunchParams) {
  const resend = getResend();
  const subject = "PitchKit just got better - and we're live on Product Hunt today";
  const appUrl = "https://pitchkit.dev";
  const safePhUrl = escapeHtml(productHuntUrl);
  const safeAppUrl = escapeHtml(appUrl);
  const appUrlLabel = escapeHtml(appUrl.replace(/^https?:\/\//, ""));

  const linkStyle =
    "color:#f59e0b;text-decoration:underline;text-underline-offset:3px;";

  const html = `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width,initial-scale=1" />
    <title>${escapeHtml(subject)}</title>
  </head>
  <body style="margin:0;padding:0;background:#0a0a0a;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;color:#e5e5e5;">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#0a0a0a;padding:40px 20px;">
      <tr>
        <td align="center">
          <table role="presentation" width="560" cellspacing="0" cellpadding="0" style="max-width:560px;background:#111111;border:1px solid #222;border-radius:16px;overflow:hidden;">
            <tr>
              <td style="padding:32px 32px 8px 32px;">
                <p style="margin:0;font-size:14px;font-weight:600;color:#f59e0b;letter-spacing:0.04em;">PITCHKIT</p>
              </td>
            </tr>
            <tr>
              <td style="padding:8px 32px 24px 32px;">
                <h1 style="margin:0 0 16px 0;font-size:22px;line-height:1.3;font-weight:700;color:#ffffff;">
                  PitchKit just got better — and we're live on Product Hunt today
                </h1>
                <p style="margin:0 0 16px 0;font-size:15px;line-height:1.6;color:#b5b5b5;">
                  You signed up for PitchKit a while back. Since then the generations have gotten a lot better and the prices have come way down. Today I'm putting it in front of the world on Product Hunt.
                </p>
                <p style="margin:0 0 16px 0;font-size:15px;line-height:1.6;color:#b5b5b5;">
                  If you've been meaning to actually try it: <a href="${safeAppUrl}" style="${linkStyle}">${appUrlLabel}</a>. Generate a mockup for a local business in your area in about 30 seconds.
                </p>
                <div style="margin:20px 0;padding:16px;background:rgba(245,158,11,0.08);border:1px solid rgba(245,158,11,0.3);border-radius:10px;text-align:center;">
                  <p style="margin:0 0 6px 0;font-size:11px;letter-spacing:0.12em;text-transform:uppercase;color:#b5b5b5;">A free credit on me &mdash; redeem at <a href="${safeAppUrl}/credits" style="color:#b5b5b5;text-decoration:underline;">${appUrlLabel}/credits</a></p>
                  <p style="margin:0;font-size:22px;font-weight:700;letter-spacing:0.08em;color:#f59e0b;font-family:ui-monospace,SFMono-Regular,Menlo,monospace;">PHUNT</p>
                </div>
                <p style="margin:0 0 16px 0;font-size:15px;line-height:1.6;color:#b5b5b5;">
                  If you want to see what I built and how other freelancers are reacting: <a href="${safePhUrl}" style="${linkStyle}">our Product Hunt page</a>. A comment or upvote there would mean a lot, but no pressure.
                </p>
                <p style="margin:24px 0 0 0;font-size:15px;line-height:1.6;color:#b5b5b5;">
                  &mdash; Stevan
                </p>
              </td>
            </tr>
            <tr>
              <td style="padding:20px 32px;border-top:1px solid #222;">
                <p style="margin:0;font-size:12px;color:#6b6b6b;">
                  You're receiving this because you signed up for PitchKit. If you'd rather not get future updates like this, just reply and let me know.
                </p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;

  return resend.emails.send({
    from: FROM_EMAIL,
    to,
    subject,
    html,
  });
}
