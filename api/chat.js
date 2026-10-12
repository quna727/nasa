import OpenAI from "openai";

// GroqCloud 연결
const client = new OpenAI({
  apiKey: process.env.GROQ_API_KEY,
  baseURL: "https://api.groq.com/openai/v1"
});

// 7가지 상담 유형
const typeInstructions = {
  affection: "사랑과 관심, 가족이나 친구 관계에서 느끼는 외로움과 서운함을 이해합니다.",
  recognition: "성적, 성과, 타인의 평가와 인정 때문에 느끼는 부담을 이해합니다.",
  isolation: "친구 관계나 집단에서 소외감을 느끼는 상황을 이해합니다.",
  selfesteem: "자신을 부정적으로 바라보는 마음을 이해하고 비교하거나 비난하지 않습니다.",
  dependency: "혼자 결정하거나 행동하는 데 느끼는 부담을 이해하고 스스로 선택하도록 돕습니다.",
  selfobject: "공허함이나 이해받지 못한다고 느끼는 마음을 세심하게 듣습니다.",
  trust: "다른 사람에게 상처받아 신뢰하기 어려운 마음을 존중합니다."
};

// 토닥 AI의 기본 대화 지침
const safetyInstruction = `
당신은 '토닥'이라는 AI 마음 대화 도우미입니다.

규칙:
1. 전문 심리상담사나 의사라고 주장하지 않습니다.
2. 정신질환이나 심리 상태를 진단하지 않습니다.
3. 사용자의 감정을 존중하고 따뜻하게 답합니다.
4. 사용자가 AI에게 의존하도록 유도하지 않습니다.
5. 자연스럽고 친근한 한국어를 사용합니다.
6. 사용자의 실제 상황을 먼저 이해합니다.
7. 해결책을 한꺼번에 많이 제시하지 않습니다.
8. 필요하다면 실천할 수 있는 작은 방법을 제안합니다.
9. 심각한 위험이나 위기 상황에서는 신뢰할 수 있는 어른이나 전문적인 도움을 권합니다.
10. 사용자가 위험한 행동을 하도록 돕지 않습니다.
11. AI와 나눈 대화가 전문적인 상담이나 치료를 대신하지 않는다는 점을 존중합니다.

답변은 2~5문장 정도로 작성합니다.
자연스럽게 공감하고, 필요한 경우 질문을 하나 합니다.
`;

export async function POST(request) {
  try {
    if (!process.env.GROQ_API_KEY) {
      console.error("GROQ_API_KEY is missing");
      return Response.json(
        { error: "AI 서버 설정을 확인해야 합니다." },
        { status: 503 }
      );
    }

    const body = await request.json();
    const { type, messages } = body;

    // 상담 유형 확인
    if (
      typeof type !== "string" ||
      !Object.prototype.hasOwnProperty.call(typeInstructions, type)
    ) {
      return Response.json(
        { error: "상담 유형이 올바르지 않습니다." },
        { status: 400 }
      );
    }

    // 메시지 확인
    if (!Array.isArray(messages) || messages.length === 0) {
      return Response.json(
        { error: "대화 내용이 올바르지 않습니다." },
        { status: 400 }
      );
    }

    // 무료 사용량 절약을 위해 최근 8개 메시지만 전달
    const recentMessages = messages.slice(-8).map(message => ({
      role: message.role === "assistant" ? "assistant" : "user",
      content: String(message.content || "").slice(0, 600)
    }));

    const instructions = `
${safetyInstruction}

현재 상담 주제:
${typeInstructions[type]}

대화 방식:
- 사용자의 감정을 먼저 이해합니다.
- 형식적인 위로를 반복하지 않습니다.
- 자연스럽고 따뜻하게 대화합니다.
- 질문은 한 번에 하나만 합니다.
`;

    // Groq AI 호출
    const response = await client.chat.completions.create({
      model: "openai/gpt-oss-20b",
      messages: [
        {
          role: "system",
          content: instructions
        },
        ...recentMessages
      ],
      max_completion_tokens: 350
    });

    const reply = response.choices?.[0]?.message?.content;

    if (!reply || !reply.trim()) {
      return Response.json(
        { error: "AI가 답변을 생성하지 못했습니다." },
        { status: 502 }
      );
    }

    return Response.json({ reply });

  } catch (error) {
    console.error(
      "Groq API error:",
      error.status || "unknown",
      error.message
    );

    if (error.status === 429) {
      return Response.json(
        { error: "무료 AI 사용량 제한에 도달했습니다. 잠시 후 다시 시도해 주세요." },
        { status: 429 }
      );
    }

    return Response.json(
      { error: "AI 서버에서 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}
