type AiRecommendationParams = {
    weeks: number;
    days: number;
    trimester: 1 | 2 | 3;
    eddISO: string;
  };
  
  type AiResponse = {
    recommendationText: string;
  };
  
  const API_URL = process.env.EXPO_PUBLIC_AI_API_URL;
  const API_KEY = process.env.EXPO_PUBLIC_AI_API_KEY;
  
  export async function fetchAiRecommendation(params: AiRecommendationParams): Promise<AiResponse> {
    if (!API_URL) {
      return {
        recommendationText:
          "Подключи EXPO_PUBLIC_AI_API_URL, чтобы получать персональные рекомендации через нейросеть.",
      };
    }
  
    const res = await fetch(API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(API_KEY ? { Authorization: `Bearer ${API_KEY}` } : {}),
      },
      body: JSON.stringify({
        gestationalAge: { weeks: params.weeks, days: params.days },
        trimester: params.trimester,
        estimatedDueDate: params.eddISO,
        language: "ru",
        style: "friendly_medical_safe",
      }),
    });
  
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      throw new Error(`AI API error ${res.status}: ${text}`.slice(0, 220));
    }
  
    const data = (await res.json()) as Partial<AiResponse>;
    if (!data.recommendationText) {
      throw new Error("AI API response has no recommendationText");
    }
    return { recommendationText: data.recommendationText };
  }
  