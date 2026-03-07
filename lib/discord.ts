const DISCORD_WEBHOOK_URL = process.env.DISCORD_WEBHOOK_URL;

const Colors = {
  error: 0xff0000,
  success: 0x00ff00,
  warning: 0xffff00,
  info: 0x0000ff,
} as const;

type EmbedField = { name: string; value: string; inline?: boolean };

function notifyDiscord(
  title: string,
  color: keyof typeof Colors,
  fields?: EmbedField[],
  description?: string
) {
  if (!DISCORD_WEBHOOK_URL) return;

  fetch(DISCORD_WEBHOOK_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      embeds: [
        {
          title: title.slice(0, 256),
          color: Colors[color],
          description: description?.slice(0, 4096),
          fields: fields?.slice(0, 25).map((f) => ({
            ...f,
            name: f.name.slice(0, 256),
            value: f.value.slice(0, 1024),
          })),
          timestamp: new Date().toISOString(),
        },
      ],
    }),
  }).catch(() => {});
}

export function notifyError(
  title: string,
  error: unknown,
  extra?: Record<string, string>
) {
  const message =
    error instanceof Error ? error.message : String(error);
  const stack =
    error instanceof Error ? error.stack?.slice(0, 1024) : undefined;

  const fields: EmbedField[] = [
    { name: "Error", value: message || "Unknown error" },
  ];
  if (stack) {
    fields.push({ name: "Stack", value: `\`\`\`\n${stack}\n\`\`\`` });
  }
  if (extra) {
    for (const [name, value] of Object.entries(extra)) {
      if (value) fields.push({ name, value });
    }
  }

  notifyDiscord(title, "error", fields);
}

export function notifySuccess(title: string, fields?: Record<string, string>) {
  const embedFields: EmbedField[] = fields
    ? Object.entries(fields).map(([name, value]) => ({
        name,
        value,
        inline: true,
      }))
    : [];

  notifyDiscord(title, "success", embedFields);
}
