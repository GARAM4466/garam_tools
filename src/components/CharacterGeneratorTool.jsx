import React, { useState } from 'react';
import { ArrowLeft, Copy, Check, Loader2 } from 'lucide-react';
import { generateCharacterPrompt } from '../lib/openrouter';

const VISUAL_STYLE_OPTIONS = ['시네마틱', '광고', '애니메이션'];
const VISUAL_STYLE_MAP = {
  '시네마틱': 'cinematic',
  '광고': 'commercial',
  '애니메이션': 'animation',
};
const SLOTS = [
  {
    key: 'nationality',
    label: '국적 / 성별 / 연령대',
    placeholder: '예: Korean female, early 20s',
  },
  {
    key: 'faceImpression',
    label: '얼굴형 + 인상',
    placeholder: '예: 계란형, 청순하고 도도한 인상',
  },
  {
    key: 'facialFeatures',
    label: '눈 / 코 / 입 특징',
    placeholder: '예: 쌍꺼풀 없는 긴 눈, 오똑한 코, 도톰한 입술',
  },
  {
    key: 'hair',
    label: '헤어',
    placeholder: '예: 레이어드 롱 흑발, 자연스러운 웨이브',
  },
  {
    key: 'bodyShape',
    label: '체형',
    placeholder: '예: 168cm, 슬림한 비율, 긴 다리',
  },
  {
    key: 'personalColor',
    label: '퍼스널 컬러 / 무드',
    placeholder: '예: 쿨톤 시크, 차가운 블루 계열',
  },
  {
    key: 'position',
    label: '포지션 / 콘셉트',
    placeholder: '예: 메인보컬, 청량한 하이틴 콘셉트',
  },
  {
    key: 'styling',
    label: '스타일링 방향성',
    placeholder: '예: Y2K, 미니멀 시크, 하이틴 스쿨룩',
  },
];

const SectionLabel = ({ children }) => (
  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">{children}</p>
);

const TagButtons = ({ options, value, onChange, multi = false }) => (
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

export default function CharacterGeneratorTool({ onBack }) {
  const [slots, setSlots] = useState({
    nationality: '',
    faceImpression: '',
    facialFeatures: '',
    hair: '',
    bodyShape: '',
    personalColor: '',
    position: '',
    styling: '',
  });
  const [conceptNote, setConceptNote] = useState('');
  const [visualStyle, setVisualStyle] = useState('');

  const [generatedPrompt, setGeneratedPrompt] = useState('');
  const [previewImage, setPreviewImage] = useState(null);
  const [isGeneratingPrompt, setIsGeneratingPrompt] = useState(false);
  const [isGeneratingPreview, setIsGeneratingPreview] = useState(false);
  const [error, setError] = useState(null);
  const [copied, setCopied] = useState(false);

  const setSlot = (key, val) => setSlots(prev => ({ ...prev, [key]: val }));

  const buildAttrs = () => ({
    ...slots,
    conceptNote,
    visualStyle: visualStyle ? VISUAL_STYLE_MAP[visualStyle] : 'cinematic',
  });

  const handleGeneratePrompt = async () => {
    setPreviewImage(null);
    setError(null);
    setIsGeneratingPrompt(true);
    try {
      const prompt = await generateCharacterPrompt(buildAttrs());
      setGeneratedPrompt(prompt);
    } catch (e) {
      setError(e.message);
    } finally {
      setIsGeneratingPrompt(false);
    }
  };

  const handleGeneratePreview = async () => {
    setPreviewImage(null);
    setError(null);
    setIsGeneratingPrompt(true);
    let prompt;
    try {
      prompt = await generateCharacterPrompt(buildAttrs());
      setGeneratedPrompt(prompt);
    } catch (e) {
      setError(e.message);
      setIsGeneratingPrompt(false);
      return;
    }
    setIsGeneratingPrompt(false);
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
      const msg = data.choices?.[0]?.message;
      let imageUrl = null;

      if (Array.isArray(msg?.images)) {
        const item = msg.images.find(c => c.type === 'image_url') || msg.images[0];
        imageUrl = item?.image_url?.url ?? item?.url ?? null;
      }
      if (!imageUrl && Array.isArray(msg?.content)) {
        const item = msg.content.find(c => c.type === 'image_url') || msg.content.find(c => c.type === 'image');
        imageUrl = item?.image_url?.url ?? item?.url ?? null;
      }
      if (!imageUrl && typeof msg?.content === 'string' && (msg.content.startsWith('http') || msg.content.startsWith('data:image'))) {
        imageUrl = msg.content;
      }
      if (!imageUrl && data.data?.[0]) {
        imageUrl = data.data[0].url ?? (data.data[0].b64_json ? `data:image/png;base64,${data.data[0].b64_json}` : null);
      }

      if (!imageUrl) throw new Error('응답에서 이미지를 찾을 수 없습니다. 콘솔(F12)에서 실제 응답을 확인하세요.');
      setPreviewImage(imageUrl);
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

  const isBusy = isGeneratingPrompt || isGeneratingPreview;

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
        <div className="w-[42%] flex-shrink-0 flex flex-col">
          <div className="flex-1 overflow-y-auto pr-2 space-y-4 pb-4">

            {/* 8개 슬롯 */}
            <div className="bg-[#151515] border border-[#2a2a2a] rounded-2xl p-5 space-y-4">
              <p className="text-xs font-semibold text-[#00ff41] uppercase tracking-wider">Character Requirements</p>
              {SLOTS.map(({ key, label, placeholder }) => (
                <div key={key}>
                  <SectionLabel>{label}</SectionLabel>
                  <input
                    type="text"
                    value={slots[key]}
                    onChange={e => setSlot(key, e.target.value)}
                    placeholder={placeholder}
                    className="w-full bg-neutral-800 border border-neutral-700 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-[#00ff41]"
                  />
                </div>
              ))}
            </div>

            {/* 전체 분위기 / 컨셉 */}
            <div className="bg-[#151515] border border-[#2a2a2a] rounded-2xl p-5">
              <SectionLabel>전체 분위기 / 컨셉</SectionLabel>
              <textarea
                value={conceptNote}
                onChange={e => setConceptNote(e.target.value)}
                placeholder="예: 차갑고 신비로운 느낌. 어두운 밤의 숲과 어울리는 고풍스러운 분위기. 위협적이지만 우아한 인상."
                rows={3}
                className="w-full bg-neutral-800 border border-neutral-700 rounded-xl px-3 py-2.5 text-sm text-white placeholder-gray-500 resize-none focus:outline-none focus:border-[#00ff41]"
              />
            </div>

            {/* 영상 스타일 */}
            <div className="bg-[#151515] border border-[#2a2a2a] rounded-2xl p-5">
              <SectionLabel>영상 스타일</SectionLabel>
              <TagButtons options={VISUAL_STYLE_OPTIONS} value={visualStyle} onChange={setVisualStyle} />
            </div>


          </div>

          {/* 하단 버튼 */}
          <div className="flex gap-3 pt-4 border-t border-[#2a2a2a] mt-2">
            <button
              onClick={handleGeneratePrompt}
              disabled={isBusy}
              className="flex-1 py-3 rounded-xl bg-[#00ff41] text-black font-bold text-sm hover:bg-[#00cc33] transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {isGeneratingPrompt && !isGeneratingPreview && <Loader2 className="w-4 h-4 animate-spin" />}
              {isGeneratingPrompt && !isGeneratingPreview ? 'AI 생성 중...' : '프롬프트 생성'}
            </button>
            <button
              onClick={handleGeneratePreview}
              disabled={isBusy}
              className="flex-1 py-3 rounded-xl bg-neutral-800 border border-[#00ff41] text-[#00ff41] font-bold text-sm hover:bg-neutral-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {isBusy && <Loader2 className="w-4 h-4 animate-spin" />}
              {isGeneratingPreview ? '이미지 생성 중...' : isGeneratingPrompt ? '프롬프트 생성 중...' : '미리보기 생성'}
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
                <p className="text-sm text-gray-600 italic">슬롯을 채운 뒤 "프롬프트 생성"을 누르면 AI가 고품질 영어 프롬프트를 작성합니다.</p>
              )}
            </div>
          </div>

          {/* 미리보기 */}
          <div className="bg-[#151515] border border-[#2a2a2a] rounded-2xl p-5 flex-1 flex flex-col">
            <span className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-3">미리보기</span>

            {isBusy && (
              <div className="flex-1 flex flex-col items-center justify-center gap-3">
                <Loader2 className="w-8 h-8 text-[#00ff41] animate-spin" />
                <p className="text-sm text-gray-400">
                  {isGeneratingPreview ? '이미지 생성 중... (30~60초 소요)' : 'AI 프롬프트 생성 중...'}
                </p>
              </div>
            )}

            {!isBusy && error && (
              <div className="bg-red-900/20 border border-red-700/40 rounded-xl p-4">
                <p className="text-sm text-red-400">{error}</p>
              </div>
            )}

            {!isBusy && !error && previewImage && (
              <img
                src={previewImage}
                alt="캐릭터 미리보기"
                className="w-full rounded-xl object-contain"
              />
            )}

            {!isBusy && !error && !previewImage && (
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
