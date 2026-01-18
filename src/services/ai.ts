type AiRecommendationParams = {
  weeks: number;
  days: number;
  trimester: 1 | 2 | 3;
  eddISO: string;
};

type AiResponse = {
  recommendationText: string;
};

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

async function fetchJsonWithTimeout<T>(url: string, init: RequestInit, timeoutMs: number): Promise<T> {
  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, { ...init, signal: init.signal ?? controller.signal });
    const text = await res.text();

    if (!res.ok) {
      // Пытаемся показать полезную ошибку
      throw new Error(`HTTP ${res.status}: ${text}`.slice(0, 1200));
    }

    return JSON.parse(text) as T;
  } finally {
    clearTimeout(t);
  }
}

export async function fetchAiRecommendation(params: AiRecommendationParams): Promise<AiResponse> {
  const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL!;
  const anonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!;

  if (!supabaseUrl || !anonKey) {
    throw new Error("Missing EXPO_PUBLIC_SUPABASE_URL / EXPO_PUBLIC_SUPABASE_ANON_KEY");
  }

  const prompt =
    `Срок беременности: ${params.weeks} недель ${params.days} дней, триместр ${params.trimester}.\n` +
    `ПДР: ${params.eddISO}.\n\n` +
    `Дай рекомендации по пунктам:\n` +
    `1) Образ жизни и физическая активность\n` +
    `2) Питание\n` +
    `3) Сон и режим\n` +
    `4) Что нормально на этом сроке\n` +
    `5) Когда срочно к врачу\n\n` +
    `Кратко и по делу. Без маркдауна, без использования спец-символов`;

  const url = `${supabaseUrl}/functions/v1/openrouter-reco`;

  // 3 попытки: сеть/edge иногда "мигает"
  const backoffs = [0, 800, 2000];
  let lastErr: any = null;

  for (let i = 0; i < backoffs.length; i++) {
    if (backoffs[i] > 0) await sleep(backoffs[i]);

    try {
      const data = await fetchJsonWithTimeout<any>(
        url,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            apikey: anonKey,
            // JWT выключен, но Authorization можно передать тем же anonKey
            Authorization: `Bearer ${anonKey}`,
          },
          body: JSON.stringify({ prompt, max_tokens: 900, temperature: 0.2 }),
        },
        90_000 // длинный таймаут только для LLM
      );

      if (data?.error) {
        throw new Error(`${data.error}: ${data.responseText ?? ""}`.trim());
      }
      if (!data?.recommendationText) throw new Error("Empty completion");

      return { recommendationText: String(data.recommendationText) };
    } catch (e: any) {
      lastErr = e;
      // ретраим только если это не “логическая” ошибка
      if (i < backoffs.length - 1) continue;
    }
  }

  throw lastErr ?? new Error("Unknown AI error");
}
