import React, { useState } from 'react';
import { ArrowLeft, Copy, Check, Loader2, X, Plus } from 'lucide-react';

const GENDER_OPTIONS = ['남성', '여성'];
const AGE_OPTIONS = ['아동', '10대', '20대', '30대', '중년', '노년'];
const HAIR_LENGTH_OPTIONS = ['숏', '미디엄', '롱', '매우 긴'];
const HAIR_STYLE_OPTIONS = ['스트레이트', '웨이브', '곱슬', '업스타일'];
const SKIN_OPTIONS = ['흰', '밝은', '중간', '어두운', '다크'];
const BODY_OPTIONS = ['슬림', '보통', '글래머', '근육질', '통통'];
const ART_STYLE_OPTIONS = ['애니메이션', '치비', '실사', '웹툰', '수채화'];
const EXPRESSION_OPTIONS = ['기본', '웃음', '화남', '슬픔', '놀람', '윙크'];

const GENDER_MAP = { '남성': 'male', '여성': 'female' };
const AGE_MAP = { '아동': 'child', '10대': 'teenager', '20대': 'young adult', '30대': 'adult', '중년': 'middle-aged', '노년': 'elderly' };
const HAIR_LENGTH_MAP = { '숏': 'short', '미디엄': 'medium length', '롱': 'long', '매우 긴': 'very long' };
const HAIR_STYLE_MAP = { '스트레이트': 'straight', '웨이브': 'wavy', '곱슬': 'curly', '업스타일': 'upstyle' };
const SKIN_MAP = { '흰': 'fair', '밝은': 'light', '중간': 'medium', '어두운': 'tan', '다크': 'dark' };
const BODY_MAP = { '슬림': 'slim', '보통': 'average', '글래머': 'curvy', '근육질': 'athletic', '통통': 'chubby' };
const ART_STYLE_MAP = { '애니메이션': 'anime style', '치비': 'chibi style', '실사': 'realistic', '웹툰': 'webtoon style', '수채화': 'watercolor illustration' };
const EXPRESSION_MAP = { '기본': 'neutral', '웃음': 'happy/smiling', '화남': 'angry', '슬픔': 'sad', '놀람': 'surprised', '윙크': 'winking' };

const SelectButtons = ({ options, value, onChange, multi = false }) => (
  <div className="flex flex-wrap gap-2">
    {options.map(opt => {
      const selected = multi ? value.includes(opt) : value === opt;
      return (
        <button
          key={opt}
          onClick={() => {
            if (multi) {
              onChange(selected ? value.filter(v => v !== opt) : [...value, opt]);
            } else {
              onChange(selected ? '' : opt);
            }
          }}
          className={`px-3 py-1.5 rounded-full text-sm font-semibold transition-colors ${
            selected
              ? 'bg-[#00ff41] text-black'
              : 'bg-neutral-800 hover:bg-neutral-700 border border-neutral-700 text-white'
          }`}
        >
          {opt}
        </button>
      );
    })}
  </div>
);

const ColorPickerField = ({ value, onChange }) => (
  <div className="flex items-center gap-2">
    <input
      type="color"
      value={value}
      onChange={e => onChange(e.target.value)}
      className="w-9 h-9 rounded cursor-pointer border-0 bg-transparent flex-shrink-0"
    />
    <input
      type="text"
      value={value}
      onChange={e => {
        const v = e.target.value;
        if (/^#[0-9a-fA-F]{0,6}$/.test(v)) onChange(v);
      }}
      maxLength={7}
      className="w-28 bg-neutral-800 border border-neutral-700 rounded-lg px-3 py-1.5 text-sm text-white font-mono focus:outline-none focus:border-[#00ff41]"
    />
  </div>
);

const SectionLabel = ({ children }) => (
  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">{children}</p>
);

export default function CharacterGeneratorTool({ onBack }) {
  const [gender, setGender] = useState('');
  const [ageGroup, setAgeGroup] = useState('');
  const [hairLength, setHairLength] = useState('');
  const [hairStyle, setHairStyle] = useState('');
  const [hairColor, setHairColor] = useState('#3b1f0a');
  const [eyeColor, setEyeColor] = useState('#3b5ea6');
  const [skinTone, setSkinTone] = useState('');
  const [bodyType, setBodyType] = useState('');
  const [outfit, setOutfit] = useState('');
  const [outfitColors, setOutfitColors] = useState(['#ffffff']);
  const [accessories, setAccessories] = useState('');
  const [artStyle, setArtStyle] = useState('');
  const [expressions, setExpressions] = useState([]);
  const [generatedPrompt, setGeneratedPrompt] = useState('');
  const [previewImage, setPreviewImage] = useState(null);
  const [isGeneratingPreview, setIsGeneratingPreview] = useState(false);
  const [error, setError] = useState(null);
  const [copied, setCopied] = useState(false);

  const buildPrompt = () => {
    const lines = [];
    if (gender) lines.push(`- Gender: ${GENDER_MAP[gender]}`);
    if (ageGroup) lines.push(`- Age: ${AGE_MAP[ageGroup]}`);

    const hairParts = [hairLength ? HAIR_LENGTH_MAP[hairLength] : '', hairStyle ? HAIR_STYLE_MAP[hairStyle] : ''].filter(Boolean).join(' ');
    if (hairParts) lines.push(`- Hair: ${hairParts}, color ${hairColor}`);
    else if (hairColor) lines.push(`- Hair color: ${hairColor}`);

    lines.push(`- Eyes: color ${eyeColor}`);
    if (skinTone) lines.push(`- Skin tone: ${SKIN_MAP[skinTone]}`);
    if (bodyType) lines.push(`- Body type: ${BODY_MAP[bodyType]}`);
    if (outfit) lines.push(`- Outfit: ${outfit}`);
    if (outfitColors.length > 0) lines.push(`- Outfit colors: ${outfitColors.join(', ')}`);
    if (accessories) lines.push(`- Props & accessories: ${accessories}`);

    const expressionList = expressions.map(e => EXPRESSION_MAP[e]).join(', ');
    const artStyleEn = artStyle ? ART_STYLE_MAP[artStyle] : 'anime style';

    return `Create a professional character reference sheet in official concept art style.

Character design:
${lines.join('\n')}

Sheet requirements:
- Three-view turnaround: front, side, and back views
- Facial expression variations: ${expressionList || 'neutral'}
- Detailed costume breakdown with labeled parts
- Color palette swatches with hex codes
- Art style: ${artStyleEn}
- Clean white background, organized layout
- Aspect ratio 16:9
- High resolution, professional concept art quality`;
  };

  const handleGeneratePrompt = () => {
    setPreviewImage(null);
    setError(null);
    setGeneratedPrompt(buildPrompt());
  };

  const handleGeneratePreview = async () => {
    const prompt = buildPrompt();
    setGeneratedPrompt(prompt);
    setPreviewImage(null);
    setError(null);
    setIsGeneratingPreview(true);

    try {
      const key = import.meta.env.VITE_OPENROUTER_API_KEY;
      if (!key) throw new Error('VITE_OPENROUTER_API_KEY가 설정되지 않았습니다. .env.local 확인 후 dev 서버를 재시작하세요.');

      const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${key}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': 'https://garamtools.netlify.app',
          'X-Title': 'Garam Tools - Character Generator',
        },
        body: JSON.stringify({
          model: 'bytedance-seed/seedream-4.5',
          messages: [{ role: 'user', content: prompt }],
          modalities: ['image'],
        }),
      });

      if (!res.ok) {
        let msg = `OpenRouter 요청 실패 (HTTP ${res.status})`;
        try { const err = await res.json(); msg = err.error?.message || msg; } catch { /* ignore */ }
        throw new Error(msg);
      }

      const data = await res.json();
      const content = data.choices?.[0]?.message?.content;
      const imageItem = Array.isArray(content) ? content.find(c => c.type === 'image_url') : null;
      if (!imageItem) throw new Error('응답에서 이미지를 찾을 수 없습니다. 모델 또는 API 응답 형식을 확인하세요.');
      setPreviewImage(imageItem.image_url.url);
    } catch (e) {
      setError(e.message);
    } finally {
      setIsGeneratingPreview(false);
    }
  };

  const handleCopy = () => {
    if (!generatedPrompt) return;
    navigator.clipboard.writeText(generatedPrompt);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const addOutfitColor = () => {
    if (outfitColors.length < 5) setOutfitColors([...outfitColors, '#ffffff']);
  };

  const removeOutfitColor = (idx) => {
    setOutfitColors(outfitColors.filter((_, i) => i !== idx));
  };

  const updateOutfitColor = (idx, val) => {
    setOutfitColors(outfitColors.map((c, i) => (i === idx ? val : c)));
  };

  return (
    <div className="max-w-[1400px] mx-auto px-6 py-8 flex flex-col min-h-screen w-full font-sans">
      <button
        onClick={onBack}
        className="self-start flex items-center text-gray-400 hover:text-white transition-colors mb-6 group"
      >
        <ArrowLeft className="w-5 h-5 mr-2 transform group-hover:-translate-x-1 transition-transform" />
        도구 모음으로 돌아가기
      </button>

      <h1 className="text-2xl font-bold text-white mb-6">캐릭터 생성기</h1>

      <div className="flex gap-6 flex-1 min-h-0">
        {/* 왼쪽 패널 */}
        <div className="w-[40%] flex-shrink-0 flex flex-col">
          <div className="flex-1 overflow-y-auto pr-2 space-y-6 pb-4">

            {/* 성별 */}
            <div className="bg-[#151515] border border-[#2a2a2a] rounded-2xl p-5">
              <SectionLabel>성별</SectionLabel>
              <SelectButtons options={GENDER_OPTIONS} value={gender} onChange={setGender} />
            </div>

            {/* 나이대 */}
            <div className="bg-[#151515] border border-[#2a2a2a] rounded-2xl p-5">
              <SectionLabel>나이대</SectionLabel>
              <SelectButtons options={AGE_OPTIONS} value={ageGroup} onChange={setAgeGroup} />
            </div>

            {/* 헤어 */}
            <div className="bg-[#151515] border border-[#2a2a2a] rounded-2xl p-5 space-y-4">
              <div>
                <SectionLabel>헤어 길이</SectionLabel>
                <SelectButtons options={HAIR_LENGTH_OPTIONS} value={hairLength} onChange={setHairLength} />
              </div>
              <div>
                <SectionLabel>헤어 스타일</SectionLabel>
                <SelectButtons options={HAIR_STYLE_OPTIONS} value={hairStyle} onChange={setHairStyle} />
              </div>
              <div>
                <SectionLabel>헤어 색상</SectionLabel>
                <ColorPickerField value={hairColor} onChange={setHairColor} />
              </div>
            </div>

            {/* 눈 색상 */}
            <div className="bg-[#151515] border border-[#2a2a2a] rounded-2xl p-5">
              <SectionLabel>눈 색상</SectionLabel>
              <ColorPickerField value={eyeColor} onChange={setEyeColor} />
            </div>

            {/* 피부톤 */}
            <div className="bg-[#151515] border border-[#2a2a2a] rounded-2xl p-5">
              <SectionLabel>피부톤</SectionLabel>
              <SelectButtons options={SKIN_OPTIONS} value={skinTone} onChange={setSkinTone} />
            </div>

            {/* 체형 */}
            <div className="bg-[#151515] border border-[#2a2a2a] rounded-2xl p-5">
              <SectionLabel>체형</SectionLabel>
              <SelectButtons options={BODY_OPTIONS} value={bodyType} onChange={setBodyType} />
            </div>

            {/* 의상 */}
            <div className="bg-[#151515] border border-[#2a2a2a] rounded-2xl p-5 space-y-4">
              <div>
                <SectionLabel>의상 설명</SectionLabel>
                <textarea
                  value={outfit}
                  onChange={e => setOutfit(e.target.value)}
                  placeholder="예: 흰색 블라우스에 청바지, 베이지 코트"
                  rows={3}
                  className="w-full bg-neutral-800 border border-neutral-700 rounded-xl px-3 py-2.5 text-sm text-white placeholder-gray-500 resize-none focus:outline-none focus:border-[#00ff41]"
                />
              </div>
              <div>
                <SectionLabel>의상 주요 색상</SectionLabel>
                <div className="space-y-2">
                  {outfitColors.map((color, idx) => (
                    <div key={idx} className="flex items-center gap-2">
                      <ColorPickerField value={color} onChange={val => updateOutfitColor(idx, val)} />
                      <button
                        onClick={() => removeOutfitColor(idx)}
                        className="p-1 text-gray-500 hover:text-red-400 transition-colors"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                  {outfitColors.length < 5 && (
                    <button
                      onClick={addOutfitColor}
                      className="flex items-center gap-1 text-xs text-gray-400 hover:text-[#00ff41] transition-colors mt-1"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      색상 추가
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* 소품/액세서리 */}
            <div className="bg-[#151515] border border-[#2a2a2a] rounded-2xl p-5">
              <SectionLabel>소품 / 액세서리</SectionLabel>
              <textarea
                value={accessories}
                onChange={e => setAccessories(e.target.value)}
                placeholder="예: 금속 귀걸이, 흰 운동화, 백팩"
                rows={2}
                className="w-full bg-neutral-800 border border-neutral-700 rounded-xl px-3 py-2.5 text-sm text-white placeholder-gray-500 resize-none focus:outline-none focus:border-[#00ff41]"
              />
            </div>

            {/* 아트 스타일 */}
            <div className="bg-[#151515] border border-[#2a2a2a] rounded-2xl p-5">
              <SectionLabel>아트 스타일</SectionLabel>
              <SelectButtons options={ART_STYLE_OPTIONS} value={artStyle} onChange={setArtStyle} />
            </div>

            {/* 표정 (다중 선택) */}
            <div className="bg-[#151515] border border-[#2a2a2a] rounded-2xl p-5">
              <SectionLabel>표정 종류 (복수 선택)</SectionLabel>
              <SelectButtons options={EXPRESSION_OPTIONS} value={expressions} onChange={setExpressions} multi />
            </div>
          </div>

          {/* 하단 버튼 */}
          <div className="flex gap-3 pt-4 border-t border-[#2a2a2a] mt-2">
            <button
              onClick={handleGeneratePrompt}
              className="flex-1 py-3 rounded-xl bg-[#00ff41] text-black font-bold text-sm hover:bg-[#00cc33] transition-colors"
            >
              프롬프트 생성
            </button>
            <button
              onClick={handleGeneratePreview}
              disabled={isGeneratingPreview}
              className="flex-1 py-3 rounded-xl bg-neutral-800 border border-[#00ff41] text-[#00ff41] font-bold text-sm hover:bg-neutral-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isGeneratingPreview ? '생성 중...' : '미리보기 생성'}
            </button>
          </div>
        </div>

        {/* 오른쪽 패널 */}
        <div className="flex-1 flex flex-col gap-5 min-w-0">
          {/* 프롬프트 출력 */}
          <div className="bg-[#151515] border border-[#2a2a2a] rounded-2xl p-5 flex flex-col">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-semibold text-gray-400 uppercase tracking-wider">생성된 프롬프트</span>
              <button
                onClick={handleCopy}
                disabled={!generatedPrompt}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                  generatedPrompt
                    ? copied
                      ? 'bg-[#00ff41]/10 text-[#00ff41]'
                      : 'bg-neutral-800 hover:bg-neutral-700 border border-neutral-700 text-gray-300'
                    : 'bg-neutral-900 border border-neutral-800 text-gray-600 cursor-not-allowed'
                }`}
              >
                {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                {copied ? '복사됨' : '복사'}
              </button>
            </div>
            <div className="bg-[#0f0f0f] border border-[#2a2a2a] rounded-xl p-4 min-h-[180px]">
              {generatedPrompt ? (
                <p className="text-sm text-gray-300 whitespace-pre-wrap leading-relaxed font-mono">{generatedPrompt}</p>
              ) : (
                <p className="text-sm text-gray-600 italic">왼쪽 옵션을 선택 후 "프롬프트 생성"을 눌러주세요.</p>
              )}
            </div>
          </div>

          {/* 미리보기 이미지 */}
          <div className="bg-[#151515] border border-[#2a2a2a] rounded-2xl p-5 flex-1 flex flex-col">
            <span className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-3">미리보기</span>

            {isGeneratingPreview && (
              <div className="flex-1 flex flex-col items-center justify-center gap-3">
                <Loader2 className="w-8 h-8 text-[#00ff41] animate-spin" />
                <p className="text-sm text-gray-400">생성 중...</p>
              </div>
            )}

            {!isGeneratingPreview && error && (
              <div className="bg-red-900/20 border border-red-700/40 rounded-xl p-4">
                <p className="text-sm text-red-400">{error}</p>
              </div>
            )}

            {!isGeneratingPreview && !error && previewImage && (
              <img
                src={previewImage}
                alt="캐릭터 미리보기"
                className="w-full rounded-xl object-contain"
              />
            )}

            {!isGeneratingPreview && !error && !previewImage && (
              <div className="flex-1 flex items-center justify-center">
                <p className="text-sm text-gray-600 italic">"미리보기 생성"을 누르면 이미지가 표시됩니다.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
