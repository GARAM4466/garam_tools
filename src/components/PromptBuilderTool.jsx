import { useState, useEffect, useRef, useCallback } from 'react';
import { ArrowLeft, Lock, Unlock, Copy, Plus, X, Upload, Sparkles, Check, Loader2, Zap } from 'lucide-react';
import { generatePrompt } from '../lib/openrouter';

const TAG_CATEGORIES = [
    { id: 'angle', label: '앵글', tags: [
        { ko: '하이앵글', en: 'high angle' },
        { ko: '로우앵글', en: 'low angle' },
        { ko: '아이레벨', en: 'eye level' },
        { ko: '버즈아이뷰', en: "bird's eye view" },
        { ko: '웜즈아이뷰', en: "worm's eye view" },
        { ko: '더치앵글', en: 'dutch angle' },
    ]},
    { id: 'composition', label: '구도', tags: [
        { ko: '룰오브써드', en: 'rule of thirds' },
        { ko: '중앙구도', en: 'centered composition' },
        { ko: '대각선구도', en: 'diagonal composition' },
        { ko: '시메트리', en: 'symmetrical' },
        { ko: '네거티브스페이스', en: 'negative space' },
        { ko: '리딩라인', en: 'leading lines' },
        { ko: '프레임인프레임', en: 'frame within frame' },
    ]},
    { id: 'lens', label: '렌즈', tags: [
        { ko: '광각', en: 'wide angle lens' },
        { ko: '35mm', en: '35mm lens' },
        { ko: '50mm', en: '50mm lens' },
        { ko: '망원', en: 'telephoto lens' },
        { ko: '어안렌즈', en: 'fisheye lens' },
        { ko: '매크로', en: 'macro lens' },
        { ko: 'CCTV', en: 'cctv footage' },
        { ko: '아나모픽', en: 'anamorphic lens' },
        { ko: '틸트시프트', en: 'tilt-shift lens' },
    ]},
    { id: 'dof', label: '심도', tags: [
        { ko: '얕은심도', en: 'shallow depth of field' },
        { ko: '깊은심도', en: 'deep depth of field' },
        { ko: '아웃오브포커스', en: 'out of focus' },
        { ko: '보케', en: 'bokeh' },
    ]},
    { id: 'shotSize', label: '샷사이즈', tags: [
        { ko: '익스트림CU', en: 'extreme close-up' },
        { ko: '클로즈업', en: 'close-up' },
        { ko: '미디엄샷', en: 'medium shot' },
        { ko: '풀샷', en: 'full shot' },
        { ko: '익스트림와이드', en: 'extreme wide shot' },
    ]},
    { id: 'special', label: '특수샷', tags: [
        { ko: 'POV', en: 'POV shot' },
        { ko: '오버숄더', en: 'over the shoulder' },
        { ko: '드론샷', en: 'drone shot' },
        { ko: '핸드헬드', en: 'handheld' },
        { ko: '실루엣', en: 'silhouette' },
        { ko: '리플렉션', en: 'reflection shot' },
    ]},
    { id: 'lighting', label: '조명', tags: [
        { ko: '자연광', en: 'natural light' },
        { ko: '골든아워', en: 'golden hour' },
        { ko: '블루아워', en: 'blue hour' },
        { ko: '역광', en: 'backlight' },
        { ko: '소프트박스', en: 'softbox lighting' },
        { ko: '시네마틱조명', en: 'cinematic lighting' },
        { ko: '무디조명', en: 'moody lighting' },
        { ko: '하이키', en: 'high key lighting' },
        { ko: '로우키', en: 'low key lighting' },
        { ko: '볼류메트릭', en: 'volumetric lighting' },
        { ko: '림라이팅', en: 'rim lighting' },
        { ko: '흑백', en: 'black and white' },
    ]},
    { id: 'style', label: '스타일', tags: [
        { ko: '시네마틱필름', en: 'cinematic film' },
        { ko: '다큐멘터리', en: 'documentary style' },
        { ko: '빈티지사진', en: 'vintage photo' },
        { ko: '8비트픽셀', en: '8-bit pixel art' },
        { ko: '연필스케치', en: 'pencil sketch' },
        { ko: '사이버펑크', en: 'cyberpunk' },
        { ko: '팝아트', en: 'pop art' },
        { ko: '유화', en: 'oil painting' },
        { ko: '수채화', en: 'watercolor' },
        { ko: '애니메이션', en: 'anime' },
        { ko: '지브리', en: 'ghibli style' },
        { ko: '3D렌더', en: '3D render' },
        { ko: '미니멀리즘', en: 'minimalism' },
        { ko: '신스웨이브', en: 'synthwave' },
    ]},
    { id: 'mood', label: '분위기', tags: [
        { ko: '드라마틱', en: 'dramatic' },
        { ko: '미스터리', en: 'mysterious' },
        { ko: '로맨틱', en: 'romantic' },
        { ko: '다크무드', en: 'dark mood' },
        { ko: '몽환적', en: 'dreamy' },
        { ko: '에너제틱', en: 'energetic' },
        { ko: '고요함', en: 'serene' },
        { ko: '긴장감', en: 'tense' },
        { ko: '노스탤직', en: 'nostalgic' },
    ]},
];

const PLATFORMS = [
    { id: 'mj', label: 'Midjourney' },
    { id: 'flow', label: 'Google Flow' },
    { id: 'gpt', label: 'ChatGPT Images' },
    { id: 'gen', label: '범용' },
    { id: 'json', label: 'JSON' },
];

const STORAGE_KEY = 'prompt-builder-state-v1';

const countSelectedTags = (scene) => {
    let total = 0;
    for (const cat of TAG_CATEGORIES) {
        total += (scene.tags?.[cat.id] || []).length;
    }
    return total;
};

const PromptBuilderTool = ({ onBack }) => {
    const [base, setBase] = useState({ text: '', locked: false });
    const [scenes, setScenes] = useState([{ id: 1, name: '씬 01', tags: {}, customText: '' }]);
    const [activeSceneId, setActiveSceneId] = useState(1);
    const [activeTab, setActiveTab] = useState('angle');
    const [activePlatform, setActivePlatform] = useState('mj');
    const [referenceImage, setReferenceImage] = useState(null);
    const [copiedKey, setCopiedKey] = useState(null);
    const [isGenerating, setIsGenerating] = useState(false);
    const [generatedPrompt, setGeneratedPrompt] = useState({ ko: '', en: '' });
    const [error, setError] = useState(null);

    const fileInputRef = useRef(null);
    const loadedRef = useRef(false);

    useEffect(() => {
        try {
            const saved = localStorage.getItem(STORAGE_KEY);
            if (saved) {
                const data = JSON.parse(saved);
                if (data.base) setBase(data.base);
                if (Array.isArray(data.scenes) && data.scenes.length > 0) {
                    setScenes(data.scenes);
                    const validId = data.scenes.find(s => s.id === data.activeSceneId)?.id ?? data.scenes[0].id;
                    setActiveSceneId(validId);
                }
            }
        } catch (e) {
            console.warn('Failed to load prompt builder state:', e);
        }
        loadedRef.current = true;
    }, []);

    useEffect(() => {
        if (!loadedRef.current) return;
        const t = setTimeout(() => {
            try {
                localStorage.setItem(STORAGE_KEY, JSON.stringify({ base, scenes, activeSceneId }));
            } catch (e) {
                console.warn('Failed to save prompt builder state:', e);
            }
        }, 500);
        return () => clearTimeout(t);
    }, [base, scenes, activeSceneId]);

    useEffect(() => {
        return () => {
            if (referenceImage?.url) URL.revokeObjectURL(referenceImage.url);
        };
    }, [referenceImage?.url]);

    const activeScene = scenes.find(s => s.id === activeSceneId) || scenes[0];

    const updateActiveScene = (updater) => {
        setScenes(prev => prev.map(s => s.id === activeSceneId ? updater(s) : s));
    };

    const toggleTag = (categoryId, tagEn) => {
        updateActiveScene(scene => {
            const current = scene.tags?.[categoryId] || [];
            const next = current.includes(tagEn)
                ? current.filter(t => t !== tagEn)
                : [...current, tagEn];
            return { ...scene, tags: { ...scene.tags, [categoryId]: next } };
        });
    };

    const renameActiveScene = (name) => {
        updateActiveScene(scene => ({ ...scene, name }));
    };

    const updateCustomText = (text) => {
        updateActiveScene(scene => ({ ...scene, customText: text }));
    };

    const addScene = () => {
        const nextId = scenes.length > 0 ? Math.max(...scenes.map(s => s.id)) + 1 : 1;
        const nextName = `씬 ${String(scenes.length + 1).padStart(2, '0')}`;
        const newScene = { id: nextId, name: nextName, tags: {}, customText: '' };
        setScenes(prev => [...prev, newScene]);
        setActiveSceneId(nextId);
    };

    const deleteScene = (id) => {
        if (scenes.length <= 1) return;
        const remaining = scenes.filter(s => s.id !== id);
        setScenes(remaining);
        if (id === activeSceneId) setActiveSceneId(remaining[0].id);
    };

    const handleImageUpload = (file) => {
        if (!file || !file.type.startsWith('image/')) return;
        if (referenceImage?.url) URL.revokeObjectURL(referenceImage.url);
        setReferenceImage({ url: URL.createObjectURL(file), file });
    };

    const handleImageDrop = useCallback((e) => {
        e.preventDefault();
        const file = e.dataTransfer.files?.[0];
        if (file) handleImageUpload(file);
    }, [referenceImage]);

    const copyToClipboard = async (text, key) => {
        if (!text) return;
        try {
            await navigator.clipboard.writeText(text);
            setCopiedKey(key);
            setTimeout(() => setCopiedKey(null), 1500);
        } catch (e) {
            console.warn('Clipboard write failed:', e);
        }
    };

    const handleGenerate = async () => {
        if (!activeScene) return;
        setIsGenerating(true);
        setError(null);
        try {
            const result = await generatePrompt({
                base: base.text,
                tags: activeScene.tags || {},
                customText: activeScene.customText,
                platform: activePlatform,
            });
            setGeneratedPrompt(result);
        } catch (e) {
            setError(e.message);
        } finally {
            setIsGenerating(false);
        }
    };

    useEffect(() => {
        setGeneratedPrompt({ ko: '', en: '' });
        setError(null);
    }, [activeSceneId]);

    const koPrompt = generatedPrompt.ko;
    const enPrompt = generatedPrompt.en;
    const activeCat = TAG_CATEGORIES.find(c => c.id === activeTab);

    return (
        <div className="max-w-[1400px] mx-auto px-6 py-8 flex flex-col min-h-screen w-full font-sans">
            <button
                onClick={onBack}
                className="self-start flex items-center text-gray-400 hover:text-white transition-colors mb-6 group"
            >
                <ArrowLeft className="w-5 h-5 mr-2 transform group-hover:-translate-x-1 transition-transform" />
                도구 모음으로 돌아가기
            </button>

            <div className="flex gap-4 min-w-0">
                {/* 좌측 컬럼 */}
                <aside className="w-56 flex-shrink-0 flex flex-col gap-4">
                    <div className="bg-cardBg border border-cardBorder rounded-2xl p-4">
                        <h3 className="text-sm font-bold text-white mb-3">레퍼런스 이미지</h3>
                        <input
                            type="file"
                            ref={fileInputRef}
                            accept="image/*"
                            onChange={(e) => handleImageUpload(e.target.files?.[0])}
                            className="hidden"
                        />
                        {referenceImage ? (
                            <div
                                className="relative cursor-pointer group rounded-xl overflow-hidden"
                                onClick={() => fileInputRef.current?.click()}
                            >
                                <img src={referenceImage.url} alt="reference" className="w-full aspect-square object-cover" />
                                <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                    <span className="text-xs text-white font-semibold">이미지 교체</span>
                                </div>
                            </div>
                        ) : (
                            <div
                                onClick={() => fileInputRef.current?.click()}
                                onDragOver={(e) => e.preventDefault()}
                                onDrop={handleImageDrop}
                                className="border-2 border-dashed border-neutral-700 rounded-xl aspect-square flex flex-col items-center justify-center cursor-pointer hover:border-brand/50 hover:bg-neutral-900/50 transition-colors text-gray-500 hover:text-gray-300"
                            >
                                <Upload className="w-6 h-6 mb-2" />
                                <span className="text-xs">드롭 / 클릭</span>
                            </div>
                        )}
                        <button
                            disabled
                            title="Coming soon — Phase 2"
                            className="w-full mt-3 px-3 py-2 bg-neutral-800 border border-neutral-700 text-gray-500 text-xs font-semibold rounded-lg cursor-not-allowed flex items-center justify-center gap-1.5"
                        >
                            <Sparkles className="w-3.5 h-3.5" /> AI 분석
                        </button>
                    </div>

                    <div className="bg-cardBg border border-cardBorder rounded-2xl p-4">
                        <div className="flex items-center justify-between mb-1.5">
                            <span className="text-brand text-xs font-semibold">고정값 — 모든 씬 공통</span>
                            <button
                                onClick={() => setBase(b => ({ ...b, locked: !b.locked }))}
                                className={`transition-colors ${base.locked ? 'text-brand' : 'text-gray-500 hover:text-white'}`}
                                title={base.locked ? '잠금 해제' : '잠그기'}
                            >
                                {base.locked ? <Lock className="w-4 h-4" /> : <Unlock className="w-4 h-4" />}
                            </button>
                        </div>
                        <h3 className="text-sm font-bold text-white mb-3">BASE 프롬프트</h3>
                        <textarea
                            value={base.text}
                            onChange={(e) => setBase(b => ({ ...b, text: e.target.value }))}
                            readOnly={base.locked}
                            placeholder="모든 씬에 공통 적용..."
                            className={`w-full h-32 bg-neutral-900 border border-cardBorder rounded-lg px-3 py-2 text-xs text-gray-300 placeholder-gray-600 resize-none focus:outline-none focus:border-brand/50 transition-colors ${base.locked ? 'opacity-60 cursor-not-allowed' : ''}`}
                        />
                    </div>
                </aside>

                {/* 가운데 컬럼 */}
                <section className="flex-1 flex flex-col gap-4 min-w-0">
                    <div className="bg-cardBg border border-cardBorder rounded-2xl p-4">
                        <label className="text-xs text-gray-500 font-semibold mb-1 block">현재 씬</label>
                        <input
                            type="text"
                            value={activeScene?.name || ''}
                            onChange={(e) => renameActiveScene(e.target.value)}
                            className="w-full bg-transparent text-2xl font-bold text-white focus:outline-none focus:text-brand transition-colors"
                            placeholder="씬 이름..."
                        />
                    </div>

                    <div className="bg-cardBg border border-cardBorder rounded-2xl">
                        <div className="flex gap-1 px-2 pt-2 overflow-x-auto border-b border-cardBorder">
                            {TAG_CATEGORIES.map(cat => {
                                const count = (activeScene?.tags?.[cat.id] || []).length;
                                const isActive = activeTab === cat.id;
                                return (
                                    <button
                                        key={cat.id}
                                        onClick={() => setActiveTab(cat.id)}
                                        className={`px-4 py-2.5 text-sm font-semibold whitespace-nowrap transition-colors border-b-2 ${
                                            isActive
                                                ? 'text-brand border-brand'
                                                : 'text-gray-400 hover:text-white border-transparent'
                                        }`}
                                    >
                                        {cat.label}
                                        {count > 0 && (
                                            <span className={`ml-1.5 text-xs ${isActive ? 'text-brand' : 'text-gray-500'}`}>·{count}</span>
                                        )}
                                    </button>
                                );
                            })}
                        </div>

                        <div className="p-4 flex flex-wrap gap-2 min-h-[120px]">
                            {activeCat?.tags.map(tag => {
                                const isSelected = (activeScene?.tags?.[activeTab] || []).includes(tag.en);
                                return (
                                    <button
                                        key={tag.en}
                                        onClick={() => toggleTag(activeTab, tag.en)}
                                        className={`px-3.5 py-1.5 rounded-full text-sm font-medium transition-all ${
                                            isSelected
                                                ? 'bg-brand/10 border border-brand text-brand'
                                                : 'bg-neutral-800 border border-neutral-700 text-gray-300 hover:border-neutral-600'
                                        }`}
                                    >
                                        {tag.ko}
                                        <span className={`ml-1.5 text-xs ${isSelected ? 'text-brand/60' : 'text-gray-500'}`}>{tag.en}</span>
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    <div className="bg-cardBg border border-cardBorder rounded-2xl p-4">
                        <label className="text-xs text-gray-500 font-semibold mb-2 block">추가 설명</label>
                        <textarea
                            value={activeScene?.customText || ''}
                            onChange={(e) => updateCustomText(e.target.value)}
                            placeholder="추가 설명을 자유롭게 입력..."
                            className="w-full h-24 bg-neutral-900 border border-cardBorder rounded-lg px-3 py-2 text-sm text-gray-300 placeholder-gray-600 resize-none focus:outline-none focus:border-brand/50 transition-colors"
                        />
                    </div>
                </section>

                {/* 우측 컬럼 */}
                <aside className="w-64 flex-shrink-0 flex flex-col gap-4">
                    <div className="bg-cardBg border border-cardBorder rounded-2xl p-4">
                        <h3 className="text-sm font-bold text-white mb-3">씬 목록</h3>
                        <div className="space-y-1.5 max-h-64 overflow-y-auto pr-1 mb-3">
                            {scenes.map((scene, idx) => {
                                const isActive = scene.id === activeSceneId;
                                const tagCount = countSelectedTags(scene);
                                return (
                                    <div
                                        key={scene.id}
                                        onClick={() => setActiveSceneId(scene.id)}
                                        className={`group relative px-3 py-2 rounded-lg border cursor-pointer transition-colors ${
                                            isActive
                                                ? 'bg-brand/5 border-brand'
                                                : 'bg-neutral-900 border-neutral-800 hover:border-neutral-700'
                                        }`}
                                    >
                                        <div className="flex items-center justify-between gap-2">
                                            <div className="min-w-0 flex-1">
                                                <div className={`text-xs font-bold truncate ${isActive ? 'text-brand' : 'text-gray-200'}`}>
                                                    #{idx + 1} {scene.name}
                                                </div>
                                                <div className={`text-xs mt-0.5 ${isActive ? 'text-brand/70' : 'text-gray-500'}`}>
                                                    태그 {tagCount}개
                                                </div>
                                            </div>
                                            {scenes.length > 1 && (
                                                <button
                                                    onClick={(e) => { e.stopPropagation(); deleteScene(scene.id); }}
                                                    className="opacity-0 group-hover:opacity-100 text-gray-500 hover:text-red-400 transition-all flex-shrink-0"
                                                    title="삭제"
                                                >
                                                    <X className="w-3.5 h-3.5" />
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                        <button
                            onClick={addScene}
                            className="w-full px-3 py-2 bg-neutral-800 hover:bg-neutral-700 border border-neutral-700 hover:border-brand/40 text-white text-xs font-semibold rounded-lg flex items-center justify-center gap-1.5 transition-colors"
                        >
                            <Plus className="w-3.5 h-3.5" /> 씬 추가
                        </button>
                    </div>

                    <div className="bg-cardBg border border-cardBorder rounded-2xl p-4">
                        <h3 className="text-sm font-bold text-white mb-3">프롬프트 출력</h3>

                        <div className="flex flex-wrap gap-1.5 mb-3">
                            {PLATFORMS.map(p => (
                                <button
                                    key={p.id}
                                    onClick={() => setActivePlatform(p.id)}
                                    className={`px-3 py-1 rounded-full text-xs font-semibold transition-colors ${
                                        activePlatform === p.id
                                            ? 'bg-brand text-black'
                                            : 'bg-neutral-800 text-gray-400 hover:text-gray-200'
                                    }`}
                                >
                                    {p.label}
                                </button>
                            ))}
                        </div>

                        <button
                            onClick={handleGenerate}
                            disabled={isGenerating}
                            className="w-full py-2 mb-3 rounded-xl bg-brand text-black font-bold text-sm flex items-center justify-center gap-2 hover:bg-[#00cc33] hover:shadow-[0_0_30px_rgba(0,255,65,0.4)] transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:shadow-none disabled:hover:bg-brand"
                        >
                            {isGenerating ? (
                                <><Loader2 className="w-4 h-4 animate-spin" /> 생성 중...</>
                            ) : (
                                <><Zap className="w-4 h-4" /> 프롬프트 생성</>
                            )}
                        </button>

                        {error && (
                            <div className="text-red-400 text-xs mb-3 px-3 py-2 bg-red-500/10 border border-red-500/20 rounded-lg break-words">
                                {error}
                            </div>
                        )}

                        <div className="mb-4">
                            <div className="flex items-center justify-between mb-1.5">
                                <span className="text-brand text-xs font-bold tracking-wider">KO</span>
                                <button
                                    onClick={() => copyToClipboard(koPrompt, 'ko')}
                                    disabled={!koPrompt}
                                    className="text-gray-500 hover:text-brand transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                                    title="복사"
                                >
                                    {copiedKey === 'ko' ? <Check className="w-3.5 h-3.5 text-brand" /> : <Copy className="w-3.5 h-3.5" />}
                                </button>
                            </div>
                            {koPrompt ? (
                                <pre className="bg-neutral-900 rounded-xl p-3 text-xs text-gray-300 whitespace-pre-wrap break-words min-h-[80px] max-h-40 overflow-y-auto font-sans leading-relaxed">{koPrompt}</pre>
                            ) : (
                                <div className="bg-neutral-900 rounded-xl p-3 text-xs text-gray-600 italic min-h-[80px]">태그를 선택하고 생성 버튼을 누르세요</div>
                            )}
                        </div>

                        <div>
                            <div className="flex items-center justify-between mb-1.5">
                                <span className="text-brand text-xs font-bold tracking-wider">EN</span>
                                <button
                                    onClick={() => copyToClipboard(enPrompt, 'en')}
                                    disabled={!enPrompt}
                                    className="text-gray-500 hover:text-brand transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                                    title="복사"
                                >
                                    {copiedKey === 'en' ? <Check className="w-3.5 h-3.5 text-brand" /> : <Copy className="w-3.5 h-3.5" />}
                                </button>
                            </div>
                            {enPrompt ? (
                                <pre className="bg-neutral-900 rounded-xl p-3 text-xs text-gray-300 whitespace-pre-wrap break-words min-h-[80px] max-h-40 overflow-y-auto font-sans leading-relaxed">{enPrompt}</pre>
                            ) : (
                                <div className="bg-neutral-900 rounded-xl p-3 text-xs text-gray-600 italic min-h-[80px]">태그를 선택하고 생성 버튼을 누르세요</div>
                            )}
                        </div>
                    </div>
                </aside>
            </div>
        </div>
    );
};

export default PromptBuilderTool;
