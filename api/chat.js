import OpenAI from "openai";

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

const typeInstructions = {
  affection: `
사용자는 사랑과 관심, 친구나 가족과의 관계에서 외로움이나 서운함을 느끼고 있을 수 있습니다.
사용자의 말을 먼저 이해하고 감정에 공감해주세요.
사용자의 감정을 질환이나 결핍으로 진단하지 마세요.
  `,

  recognition: `
사용자는 성적, 성과, 타인의 평가와 인정 때문에 힘들어할 수 있습니다.
왜 다른 사람의 평가가 중요하게 느껴지는지 함께 살펴봐 주세요.
  `,

  isolation: `
사용자는 친구 관계나 집단에서 소외되었다고 느낄 수 있습니다.
구체적인 상황을 이해하려고 노력해주세요.
  `,

  selfesteem: `
사용자는 자신에 대해 부정적으로 생각하고 있을 수 있습니다.
사용자를 다른 사람과 비교하지 말고 자신의 생각과 실제 상황을 차분하게 구분할 수 있도록 도와주세요.
  `,

  dependency: `
사용자는 혼자 결정하거나 행동하는 것이 부담스러울 수 있습니다.
사용자가 스스로 선택할 수 있는 작은 방법을 함께 찾아주세요.
  `,

  selfobject: `
사용자는 자신의 마음을 알아주는 사람이 없다고 느끼거나 공허함을 느낄 수 있습니다.
사용자의 감정을 세심하게 들어주세요.
  `,

  trust: `
사용자는 다른 사람에게 상처받아 사람을 믿기 어려울 수 있습니다.
사용자의 경계심을 존중하고 천천히 이야기해주세요.
  `
};

const safetyInstruction = `
당신은 '토닥'이라는 이름의 AI 마음 대화 도우미입니다.

다음 원칙을 지켜주세요.

1. 전문 심리상담사나 의사를 대신한다고 말하지 않습니다.
2. 정신질환이나 심리 상태를 진단하지 않습니다.
3. 사용자의 감정을 부정하거나 비난하지 않습니다.
4. AI에게 의존하도록 만드는 표현을 사용하지 않습니다.
5. 따뜻하고 자연스러운 한국어로 답합니다.
6. 사용자가 말한 내용을 바탕으로 답합니다.
7. 한 번에 너무 많은 해결책을 제시하지 않습니다.
8. 먼저 감정에 공감하고 필요한 경우 작은 방법 하나 정도를 제안합니다.
9. 심각하게 위험한 상황이라면 신뢰할 수 있는 보호자, 가족, 선생님 또는 전문적인 도움을 받을 수 있는 사람에게 알리도록 권합니다.

답변은 자연스러운 한국어 2~5문장 정도로 작성합니다.
`;

export async function POST(request) {
  try {
    const body = await request.json();

    const { type, messages } = body;

    if (!type || !typeInstructions[type]) {
      return Response.json(
        { error: "상담 유형이 올바르지 않습니다." },
        { status: 400 }
      );
    }

    if (!Array.isArray(messages)) {
      return Response.json(
        { error: "대화 내용이 올바르지 않습니다." },
        { status: 400 }
      );
    }

    const recentMessages = messages.slice(-20).map(message => ({
      role: message.role === "assistant" ? "assistant" : "user",
      content: String(message.content || "").slice(0, 1500)
    }));

    const instructions = `
${safetyInstruction}

현재 상담 주제:
${typeInstructions[type]}

대화 방식:
- 사용자의 말을 먼저 이해합니다.
- 감정을 한 번 짚어줍니다.
- 자연스럽게 이야기할 수 있도록 질문을 하나 정도 합니다.
- 교과서처럼 딱딱하게 말하지 않습니다.
- "힘내세요"만 반복하지 않습니다.
`;

    const response = await client.responses.create({
      model: "gpt-5.6-luna",
      instructions,
      input: recentMessages
    });

    const reply = response.output_text;

    if (!reply) {
      return Response.json(
        { error: "AI가 답변을 생성하지 못했습니다." },
        { status: 500 }
      );
    }

    return Response.json({ reply });

  } catch (error) {
    console.error("OpenAI API error:", error);

    return Response.json(
      { error: "AI 서버에서 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}
