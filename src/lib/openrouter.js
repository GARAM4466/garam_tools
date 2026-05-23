const KEY = import.meta.env.VITE_OPENROUTER_API_KEY;

const CHARACTER_SYSTEM_PROMPT = `You are an expert AI image prompt engineer specializing in character reference sheet generation.

OUTPUT STRUCTURE — follow this exact 5-block order every time:

① One-line intro
   A single sentence stating what is being created: art style + document type + subject.
   Example: "Create a highly detailed photorealistic K-pop idol concept profile board / character sheet for one original Korean female idol, designed like a professional entertainment company visual development page."

② Layout description paragraph (1–2 sentences before the section list)
   Describe the overall document feel. Use words like: premium agency planning document, editorial grid, structured design sheet. End with: "Do not make it look like a simple poster."

③ Section list  ("Include the following sections in a clean editorial layout:")
   Bullet points. Each item = 1–2 lines describing WHAT IS IN the section — content only.
   NEVER include quality keywords, camera specs, lighting, or texture inside section descriptions.

④ "The entire image should have:" block
   ALL quality, rendering, lighting, texture, atmosphere, and layout tone keywords go HERE and only here.
   Include: technical quality terms + tone/atmosphere expressions (elegant, premium agency feeling, editorial, magazine-quality, etc.) + consistency requirements (same face, same person) + typography/label notes.
   Typography requirements must also go here: Korean sans-serif font style (similar to Pretendard or Noto Sans KR), bold section headers with lighter body text, bilingual labels in Korean (Hangul) with small English romanization underneath, consistent label box style throughout the board, no garbled or broken Korean characters.
   Negative prompts also go here as plain lines: "no fantasy elements", "no cartoon style", "no illustration", etc.

⑤ "Character requirements:" block
   All physical attributes, hex color codes, proportions, makeup, styling descriptors — concentrated here.
   Write as if briefing a casting director or stylist.

⑥ "Important:" block
   Behavioral directives (avoid empty space, avoid poster-like simplicity, keep coherent alignment).
   The very last line must be a single comma-separated negative prompt line:
   Example: "no anime, no cartoon, no illustration, no 2D art, no cel-shading, no fantasy elements"

RULES:
- Do not repeat the same adjective or keyword more than once across the entire prompt. Especially avoid consecutive "realistic" / "photorealistic" repetition.
- Color hex codes and physical measurements go ONLY in block ⑤.
- Negative prompts appear in block ④ as plain lines AND as the final comma-separated line of block ⑥.
- Output only the final prompt text. No explanation, no preamble, no markdown.`;

const STYLE_GUIDE = {
  'cinematic': {
    positive: 'photorealistic, hyperrealistic, studio photography quality, 8K DSLR, sharp focus, realistic skin texture with visible pores, realistic hair strands, realistic fabric folds and wrinkles, professional studio lighting, subsurface scattering on skin',
    negative: 'strictly NO anime, NO illustration, NO cartoon, NO 2D art, NO cel-shading, NO painting, NO artistic stylization of any kind — every section must render as photorealistic live-action humans only',
    layoutFeel: 'professional entertainment company visual development board, premium cinematic character planning document',
    instructions: `HOW TO WRITE EACH BLOCK for cinematic style:

BLOCK ①: Open with "Create a highly detailed photorealistic [subject] concept profile board / character sheet... designed like a professional entertainment company visual development page."

BLOCK ② (layout paragraph): Use language like "premium agency planning document", "character reference page combined with concept guide and styling board", "official character profile board". End: "Do not make it look like a simple poster."

BLOCK ③ (section list): Describe CONTENT ONLY per section — no lighting, no camera, no quality words inside.
  Good: "Large main portrait of the character."
  Bad: "Large main portrait shot on Canon EOS R5 with 85mm lens and beauty dish lighting."
  The CHARACTER MOOD REFERENCE must be described as the dominant section — 4 to 6 wide cinematic panels showing the character across varied environments, lighting, and emotional states. Frame it as: "wide cinematic panels — each panel a different real-world scene and lighting condition: daytime outdoor, night interior, dramatic backlit scene, soft natural light, crowd/action scene, intimate close-up."

BLOCK ④ (Overall aesthetic): Use these exact quality terms — each used ONCE:
  sharp focus, realistic skin texture, realistic hair, realistic fabric, studio lighting, photorealistic, high detail, magazine-quality layout, Korean typography style, premium planning board feeling, consistent face and identity across all sections, same person in every portrait, small tidy Korean labels throughout, professional visual hierarchy, modern elegant highly polished composition, white or light neutral background, clean grid-based editorial design, very dense and information-rich composition
  Typography (add after quality terms): minimal modern Korean sans-serif font similar to Pretendard or Noto Sans KR, clear hierarchy with bold section headers and lighter body text, bilingual labels in Korean (Hangul) with small English romanization underneath, crisp legible kerning, consistent label box style throughout the board, no garbled or broken Korean characters
  Then add negative lines: "no fantasy elements", "no cartoon style", "no illustration", "no text errors if possible", "no garbled Korean characters"

BLOCK ⑤ (Character requirements): Describe like a casting / styling brief — "camera-friendly face", "elegant stage presence". Put all hex colors here.

BLOCK ⑥ (Important): Write 4–5 directive sentences. Final line must be the comma-separated negative: "no anime, no cartoon, no illustration, no 2D art, no cel-shading, no fantasy elements"`,
  },

  'commercial': {
    positive: 'commercial photography aesthetic, magazine editorial quality, luxury brand visual guide, satin-skin finish, poreless appearance, subsurface scattering, healthy subtle glow, butterfly beauty lighting, softbox setup, high-key clean aesthetics, minimal shadows on face, crisp and well-pressed clothing, pristine tailored styling, polished grooming, clean color grading, vibrant and healthy tone, neutral-warm palette, ultra-sharp focus on eyes, 8K DSLR',
    negative: 'no cinematic grain, no dark moody tones, no heavy contrast, no raw realism, no visible skin imperfections, no gritty textures, no dramatic shadows, no anime, no illustration, no cartoon, no 2D art',
    layoutFeel: 'high-end commercial visual development board, luxury brand character planning guide, beauty campaign planning document',
    instructions: `HOW TO WRITE EACH BLOCK for commercial style:

IMPORTANT — VISUAL STYLE OVERRIDE RULE:
The commercial visual style takes absolute precedence over the Creative Direction.
If the creative direction contains ANY of the following conflicting terms, automatically substitute them with their commercial equivalents BEFORE writing any block. Do NOT carry over the original term even if rephrased:
  - "realistic skin / pores / skin texture / visible pores" → "satin-skin finish, poreless appearance"
  - "natural lighting / ambient light" → "butterfly beauty lighting, softbox setup"
  - "cinematic / film / gritty / raw / grainy" → "commercial photography aesthetic"
  - "realistic / hyperrealistic" → "magazine editorial quality"
  - "dark / moody / dramatic shadow / high contrast" → "high-key clean, minimal shadow"
  - "weathered / faded / distressed / natural hair / messy" → "crisp, pristine, polished grooming"

BLOCK ①: Open with "Create a high-end commercial visual development board / character planning guide for a professional production — designed like a luxury brand campaign planning document."

BLOCK ② (layout paragraph): Use language like "luxury brand campaign planning document", "commercial beauty editorial board", "high-end production character reference guide". End: "Do not make it look like a simple poster or a cinematic film frame."

BLOCK ③ (section list): Describe CONTENT ONLY per section — no lighting, no camera, no quality words inside.
  The CHARACTER MOOD REFERENCE must be described as: "wide commercial photography panels — each panel a different campaign shooting scenario showing the same character: bright outdoor lifestyle shoot, clean studio beauty shot, luxury brand product placement scene, editorial fashion shoot, soft window-light portrait, clean white background campaign shot."

BLOCK ④ (Overall aesthetic): Use these commercial quality terms — each used ONCE:
  commercial photography aesthetic, magazine editorial quality, luxury brand visual guide, satin-skin finish, butterfly beauty lighting, high-key clean aesthetics, vibrant and healthy tone, neutral-warm palette, ultra-sharp focus on eyes, clean color grading, white or very light neutral background, very dense and information-rich composition, consistent face and identity across all sections, same person in every panel, Korean typography style, small tidy Korean labels throughout, professional visual hierarchy, modern elegant highly polished composition
  Typography: minimal modern Korean sans-serif font similar to Pretendard or Noto Sans KR, bold section headers with lighter body text, bilingual labels in Korean (Hangul) with small English romanization underneath, crisp legible kerning, consistent label box style, no garbled or broken Korean characters
  Then add negative lines: "no cinematic grain", "no dark moody tones", "no raw realism", "no visible skin imperfections", "no gritty textures", "no cartoon style", "no illustration", "no text errors if possible"

BLOCK ⑤ (Character requirements): Describe like a beauty campaign casting brief — "camera-friendly face", "polished idol makeup", "pristine tailored styling", "elegant and well-groomed". Put all hex colors here.

BLOCK ⑥ (Important): Write 4–5 directive sentences emphasizing the commercial/beauty aesthetic. Final line must be the comma-separated negative: "no cinematic grain, no dark moody tones, no raw realism, no gritty textures, no anime, no cartoon, no illustration, no 2D art"`,
  },

  'animation': {
    positive: '3D CGI animation style, Pixar/DreamWorks quality character sheet, professional 3D render, clean ambient occlusion, stylized volumetric character design, vibrant animation color palette, smooth gradient shading, subsurface scattering on skin, high-quality CG lighting, character turnaround sheet',
    negative: 'no photorealism, no live-action photography aesthetic, no 2D flat illustration, no anime lineart, no sketch style',
    layoutFeel: 'professional 3D animation studio character design sheet, CG film character bible, animation production reference board',
    instructions: `HOW TO WRITE EACH BLOCK for animation (3D CGI) style:

BLOCK ①: Open with "Create a highly detailed 3D CGI animation style character design board / character bible for a professional animated production — designed like a Pixar or DreamWorks studio character reference document."

BLOCK ② (layout paragraph): Use language like "3D animation studio character bible", "CG film character reference document", "professional animated production design guide". End: "Do not make it look like a simple poster."

BLOCK ③ (section list): Describe CONTENT ONLY per section — no lighting, no camera, no quality words inside.
  The CHARACTER MOOD REFERENCE must be described as: "4 to 6 cinematic 3D rendered panels — each a different lighting environment and scene context showing the same character: warm interior scene, dramatic outdoor lighting, soft ambient studio render, expressive close-up render, action/dynamic pose render, stylized environmental context."

BLOCK ④ (Overall aesthetic): Use these 3D animation quality terms — each used ONCE:
  3D CGI animation style, Pixar/DreamWorks quality, professional 3D render, clean ambient occlusion, vibrant animation color palette, smooth gradient shading, subsurface scattering, stylized volumetric lighting, white or light neutral background, very dense and information-rich composition, consistent character identity across all panels, same character in every section, Korean typography style, small tidy Korean labels throughout, professional visual hierarchy, clean grid-based editorial design
  Typography: minimal modern Korean sans-serif font similar to Pretendard or Noto Sans KR, bold section headers with lighter body text, bilingual labels in Korean (Hangul) with small English romanization underneath, no garbled or broken Korean characters
  Then add negative lines: "no photorealism", "no live-action photography", "no 2D flat illustration", "no anime lineart", "no text errors if possible"

BLOCK ⑤ (Character requirements): Describe in terms of 3D character design — proportions, color values, stylization level. Put all hex colors here.

BLOCK ⑥ (Important): Write 4–5 directive sentences. Final line must be the comma-separated negative: "no photorealism, no live-action photography, no 2D flat illustration, no anime lineart, no sketch style"`,
  },
};

export async function generateCharacterPrompt(attrs) {
  if (!KEY) throw new Error('VITE_OPENROUTER_API_KEY가 설정되지 않았습니다. .env.local 확인 후 dev 서버를 재시작하세요.');

  const styleKey = attrs.visualStyle || 'cinematic';
  const styleGuide = STYLE_GUIDE[styleKey] || STYLE_GUIDE['cinematic'];

  const userMessage = `Generate a prompt for a professional character reference sheet image.

=== VISUAL STYLE (HIGHEST PRIORITY) ===
Style: ${styleKey}
MUST include: ${styleGuide.positive}
MUST avoid: ${styleGuide.negative}
Document feel: ${styleGuide.layoutFeel}
Repeat the art style keyword multiple times throughout the prompt to strongly reinforce it.

${styleGuide.instructions ? `=== PROMPT WRITING INSTRUCTIONS FOR THIS STYLE ===
${styleGuide.instructions}
` : ''}

${attrs.conceptNote ? `=== CREATIVE DIRECTION ===
"${attrs.conceptNote}"
Use this as the core mood and personality — let it shape the character's expression, posture, styling tone, and overall atmosphere across every section.

` : ''}=== CHARACTER REQUIREMENTS (use these as the content of block ⑤) ===
- Nationality / Gender / Age: ${attrs.nationality || 'unspecified'}
- Face shape & impression: ${attrs.faceImpression || 'unspecified'}
- Facial features (eyes/nose/lips): ${attrs.facialFeatures || 'unspecified'}
- Hair: ${attrs.hair || 'unspecified'}
- Body shape & proportions: ${attrs.bodyShape || 'unspecified'}
- Personal color & mood: ${attrs.personalColor || 'unspecified'}
- Position & concept: ${attrs.position || 'unspecified'}
- Styling direction: ${attrs.styling || 'unspecified'}

=== SECTIONS TO INCLUDE ===
Use these as the content of the section list (block ③). Each must appear as a bullet point describing what the section SHOWS — no quality or camera language.

IMPORTANT LAYOUT PRIORITY:
The CHARACTER MOOD REFERENCE section must be the most visually dominant section on the sheet — allocate the largest area to it. It is the centerpiece of the document.

Sections (in layout order):
- Large main portrait of the character — close-up showing face and personality
- Profile information section with Korean text labels and neat typography, such as name, age, height, position, personality, charm points, hobbies, specialties, and short descriptive biography text
- Full-body three-view turnaround (front, side, back) in the same outfit
- Pose sheet with 2–3 full-body poses showing different gestures
- Outfit / styling breakdown with separated clothing parts and labeled accessories
- Props & accessories panel with small item cutouts related to the character concept
- Color / texture swatch section
- CHARACTER MOOD REFERENCE (largest section — wide strip or grid occupying at least 1/3 of the total sheet): 4 to 6 cinematic panels showing the SAME character in completely different environments, lighting conditions, and emotional contexts — for example: daytime outdoor scene, night interior scene, dramatic backlit scene, soft natural light scene, crowd/action scene, intimate close-up scene. Each panel shows how this specific character's face, costume, and presence read across varied real-world shooting conditions. Label each panel with its scene/lighting type.
- Small tidy labels throughout identifying each section`;

  const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${KEY}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': 'https://garamtools.netlify.app',
      'X-Title': 'Garam Tools - Character Generator',
    },
    body: JSON.stringify({
      model: 'anthropic/claude-sonnet-4-5',
      max_tokens: 1500,
      messages: [
        { role: 'system', content: CHARACTER_SYSTEM_PROMPT },
        { role: 'user', content: userMessage },
      ],
    }),
  });

  if (!res.ok) {
    let message = `OpenRouter 요청 실패 (HTTP ${res.status})`;
    try { const err = await res.json(); message = err.error?.message || message; } catch { /* ignore */ }
    throw new Error(message);
  }

  const data = await res.json();
  const generated = data.choices?.[0]?.message?.content?.trim() ?? '';

  const mandatory = `

REQUIRED SECTION (must be rendered regardless of layout above):
- Profile information section with Korean text labels and neat typography, such as name, age, height, position, personality, charm points, hobbies, specialties, and short descriptive biography text.

REQUIRED TYPOGRAPHY (apply to every label and text element in the entire image):
minimal modern Korean sans-serif font similar to Pretendard or Noto Sans KR, clear hierarchy with bold section headers and lighter body text, bilingual labels in Korean (Hangul) with small English romanization underneath, crisp legible kerning, consistent label box style throughout the board, no garbled or broken Korean characters, Korean typography style, small tidy Korean labels throughout, no text errors`;

  return generated + mandatory;
}

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
