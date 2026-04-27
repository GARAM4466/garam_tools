const KEY = import.meta.env.VITE_OPENROUTER_API_KEY;

const SYSTEM_PROMPT = `
You are a professional AI image and video prompt engineer
specializing in cinematic, photographic, and artistic prompts.

You will receive:
- BASE: locked visual identity applied to all scenes (style, tone, color)
- TAGS: selected visual/camera tags grouped by category
- CUSTOM_TEXT: freeform scene description (may be in Korean)
- PLATFORM: target AI generation platform

Your tasks:
1. Translate CUSTOM_TEXT to English if it is in Korean
2. Weave CUSTOM_TEXT naturally into the prompt — do NOT just append it
3. Detect conflicting tags and resolve intelligently
   ex) backlight + softbox → keep both only if they complement,
       otherwise prioritize the more cinematic choice
4. Construct a prompt optimized for the target platform format
5. Always output BOTH Korean and English versions

Output format — return ONLY this, no explanations:
[KO]
(Korean prompt here)
[EN]
(English prompt here)
`;

function buildUserMessage({ base, tags, customText, platform }) {
    const platformGuide = {
        mj: `
PLATFORM: Midjourney V7
EN format rules:
- Comma-separated keywords, most impactful terms first
- Integrate scene description as vivid visual keywords
- End with: --ar 16:9 --v 7 --style raw
KO format rules:
- 동일한 내용을 한국어 키워드로, 파라미터 없이
`,
        flow: `
PLATFORM: Google Flow (Veo 3.1 + Nano Banana)
EN format rules:
- 3~5 natural language sentences, 100~150 words total
- Structure: [Scene/Subject] → [Camera] → [Lighting] → [Style + Mood]
- Describe subtle motion or atmosphere if relevant
- Do NOT add "--parameters"
KO format rules:
- 동일 구조로 자연스러운 한국어 문장 3~5개
`,
        gpt: `
PLATFORM: ChatGPT Images (GPT Image 2)
EN format rules:
- Start with style declaration: ex) "35mm cinematic film photography,"
- Then: subject + scene → camera + lens → lighting → mood + texture
- End with: "No watermark, no extra text."
KO format rules:
- 스타일 선언으로 시작하는 자연어 문단
- 마지막: "워터마크 없음, 텍스트 없음."
`,
        gen: `
PLATFORM: Universal
EN format rules:
- Clean keyword list, comma-separated
- Works on any platform (Sora, Runway, Kling, etc.)
KO format rules:
- [KO] 키워드 한글 나열
- [EN] 키워드 영문 나열
- 두 줄 구분해서 출력
`,
        json: `
PLATFORM: JSON
Output valid JSON only (no markdown backticks).
Both KO and EN fields inside the JSON:
{
  "base": "...",
  "scene_description_ko": "...",
  "scene_description_en": "...",
  "camera": {
    "angle": "",
    "composition": "",
    "lens": "",
    "dof": "",
    "shot_size": "",
    "special": ""
  },
  "lighting": [],
  "style": [],
  "mood": [],
  "custom_text_translated": "...",
  "final_prompt_ko": "...",
  "final_prompt_en": "..."
}
`,
    };

    const tagLines = Object.entries(tags || {})
        .filter(([, v]) => Array.isArray(v) && v.length > 0)
        .map(([cat, vals]) => `- ${cat}: ${vals.join(', ')}`)
        .join('\n');

    return `
BASE (locked visual identity):
${base || '없음'}

TAGS (selected by category):
${tagLines || '없음'}

CUSTOM_TEXT (freeform scene description):
${customText || '없음'}

${platformGuide[platform] || platformGuide.gen}
`;
}

export async function generatePrompt({ base, tags, customText, platform }) {
    if (!KEY) {
        throw new Error('VITE_OPENROUTER_API_KEY가 설정되지 않았습니다. .env.local 확인 후 dev 서버를 재시작하세요.');
    }

    const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${KEY}`,
            'Content-Type': 'application/json',
            'HTTP-Referer': 'https://garamtools.netlify.app',
            'X-Title': 'Garam Tools - Prompt Builder',
        },
        body: JSON.stringify({
            model: 'deepseek/deepseek-chat',
            max_tokens: 1000,
            messages: [
                { role: 'system', content: SYSTEM_PROMPT },
                { role: 'user', content: buildUserMessage({ base, tags, customText, platform }) },
            ],
        }),
    });

    if (!res.ok) {
        let message = `OpenRouter 요청 실패 (HTTP ${res.status})`;
        try {
            const err = await res.json();
            message = err.error?.message || message;
        } catch {
            try {
                const text = await res.text();
                if (text) message = text;
            } catch { /* ignore */ }
        }
        throw new Error(message);
    }

    const data = await res.json();
    const raw = data.choices?.[0]?.message?.content ?? '';

    if (platform === 'json') {
        return { ko: raw, en: raw };
    }

    const koMatch = raw.match(/\[KO\]\s*([\s\S]*?)(?=\[EN\]|$)/);
    const enMatch = raw.match(/\[EN\]\s*([\s\S]*)/);

    if (!koMatch || !enMatch) {
        console.warn('[openrouter] [KO]/[EN] 마커 파싱 실패. raw 반환.');
    }

    return {
        ko: koMatch?.[1]?.trim() || raw,
        en: enMatch?.[1]?.trim() || raw,
    };
}
