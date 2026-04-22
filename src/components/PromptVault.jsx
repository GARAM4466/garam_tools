import { useState, useEffect, useMemo } from 'react';
import { ArrowLeft, BookMarked, Search, Plus, Edit2, Trash2, Copy, Check, X } from 'lucide-react';
import { supabase } from '../lib/supabase';

const EMPTY_FORM = { title: '', content: '', category: '', tagsInput: '', memo: '' };

const PromptVault = ({ onBack }) => {
    const [prompts, setPrompts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [selectedCategory, setSelectedCategory] = useState('');
    const [selectedTags, setSelectedTags] = useState(new Set());
    const [modalOpen, setModalOpen] = useState(false);
    const [editingPrompt, setEditingPrompt] = useState(null);
    const [form, setForm] = useState(EMPTY_FORM);
    const [saving, setSaving] = useState(false);
    const [copiedId, setCopiedId] = useState(null);
    const [deleteConfirmId, setDeleteConfirmId] = useState(null);

    useEffect(() => { fetchPrompts(); }, []);

    const fetchPrompts = async () => {
        setLoading(true);
        const { data } = await supabase.from('prompts').select('*').order('created_at', { ascending: false });
        setPrompts(data || []);
        setLoading(false);
    };

    const allCategories = useMemo(() =>
        [...new Set(prompts.map(p => p.category).filter(Boolean))].sort(), [prompts]);

    const allTags = useMemo(() =>
        [...new Set(prompts.flatMap(p => p.tags || []))].sort(), [prompts]);

    const filtered = useMemo(() => prompts.filter(p => {
        const q = search.toLowerCase();
        const matchSearch = !q || p.title.toLowerCase().includes(q) || p.content.toLowerCase().includes(q);
        const matchCategory = !selectedCategory || p.category === selectedCategory;
        const matchTags = selectedTags.size === 0 || [...selectedTags].every(t => p.tags?.includes(t));
        return matchSearch && matchCategory && matchTags;
    }), [prompts, search, selectedCategory, selectedTags]);

    const openAdd = () => { setEditingPrompt(null); setForm(EMPTY_FORM); setModalOpen(true); };
    const openEdit = (p) => {
        setEditingPrompt(p);
        setForm({ title: p.title, content: p.content, category: p.category || '', tagsInput: (p.tags || []).join(', '), memo: p.memo || '' });
        setModalOpen(true);
    };
    const closeModal = () => { setModalOpen(false); setEditingPrompt(null); };

    const savePrompt = async () => {
        if (!form.title.trim() || !form.content.trim()) return;
        setSaving(true);
        const tags = form.tagsInput.split(',').map(t => t.trim()).filter(Boolean);
        const payload = {
            title: form.title.trim(),
            content: form.content.trim(),
            category: form.category.trim() || null,
            tags: tags.length ? tags : null,
            memo: form.memo.trim() || null,
        };
        if (editingPrompt) {
            await supabase.from('prompts').update(payload).eq('id', editingPrompt.id);
        } else {
            await supabase.from('prompts').insert(payload);
        }
        setSaving(false);
        closeModal();
        fetchPrompts();
    };

    const deletePrompt = async (id) => {
        await supabase.from('prompts').delete().eq('id', id);
        setDeleteConfirmId(null);
        fetchPrompts();
    };

    const copyPrompt = async (p) => {
        await navigator.clipboard.writeText(p.content);
        setCopiedId(p.id);
        setTimeout(() => setCopiedId(null), 2000);
    };

    const toggleTag = (tag) => {
        setSelectedTags(prev => {
            const next = new Set(prev);
            next.has(tag) ? next.delete(tag) : next.add(tag);
            return next;
        });
    };

    const updateForm = (key, val) => setForm(prev => ({ ...prev, [key]: val }));

    return (
        <div className="max-w-6xl mx-auto px-6 py-12 w-full font-sans">
            <button onClick={onBack} className="self-start flex items-center text-gray-400 hover:text-white transition-colors mb-8 group">
                <ArrowLeft className="w-5 h-5 mr-2 transform group-hover:-translate-x-1 transition-transform" />
                도구 모음으로 돌아가기
            </button>

            {/* 헤더 */}
            <div className="mb-10 flex items-center justify-between">
                <div>
                    <h1 className="text-4xl font-extrabold tracking-tight mb-2 flex items-center gap-3">
                        <BookMarked className="w-9 h-9 text-brand" />
                        프롬프트 라이브러리
                    </h1>
                    <p className="text-gray-400">유용한 AI 프롬프트를 모아두고 빠르게 복사해서 사용하세요.</p>
                </div>
                <button
                    onClick={openAdd}
                    className="flex items-center gap-2 px-5 py-3 bg-brand text-black font-bold rounded-xl hover:bg-[#00cc33] transition-all hover:shadow-[0_0_20px_rgba(0,255,65,0.3)]"
                >
                    <Plus className="w-5 h-5" /> 추가
                </button>
            </div>

            {/* 검색 + 카테고리 필터 */}
            <div className="flex flex-col sm:flex-row gap-3 mb-4">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                    <input
                        type="text"
                        placeholder="제목 또는 내용 검색..."
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        className="w-full bg-neutral-900 border border-neutral-800 focus:border-brand rounded-xl pl-10 pr-4 py-3 text-white text-sm outline-none transition-colors"
                    />
                </div>
                <select
                    value={selectedCategory}
                    onChange={e => setSelectedCategory(e.target.value)}
                    className="bg-neutral-900 border border-neutral-800 focus:border-brand rounded-xl px-4 py-3 text-sm text-white outline-none transition-colors min-w-[160px]"
                >
                    <option value="">전체 카테고리</option>
                    {allCategories.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
            </div>

            {/* 태그 필터 */}
            {allTags.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-8">
                    {allTags.map(tag => (
                        <button
                            key={tag}
                            onClick={() => toggleTag(tag)}
                            className={`px-3 py-1 rounded-full text-xs font-semibold border transition-all ${
                                selectedTags.has(tag)
                                    ? 'bg-brand text-black border-brand'
                                    : 'bg-transparent text-gray-400 border-neutral-700 hover:border-brand/50 hover:text-white'
                            }`}
                        >
                            #{tag}
                        </button>
                    ))}
                </div>
            )}

            {/* 프롬프트 목록 */}
            {loading ? (
                <div className="flex justify-center py-24 text-gray-500">불러오는 중...</div>
            ) : filtered.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-24 text-gray-600">
                    <BookMarked className="w-12 h-12 mb-4 opacity-30" />
                    <p className="font-medium">{prompts.length === 0 ? '저장된 프롬프트가 없습니다.' : '검색 결과가 없습니다.'}</p>
                    {prompts.length === 0 && (
                        <button onClick={openAdd} className="mt-4 text-brand text-sm hover:underline">첫 프롬프트 추가하기</button>
                    )}
                </div>
            ) : (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    {filtered.map(p => (
                        <div key={p.id} className="group bg-cardBg border border-cardBorder hover:border-brand/30 rounded-2xl p-5 flex flex-col gap-3 transition-colors">
                            {/* 카드 헤더 */}
                            <div className="flex items-start justify-between gap-3">
                                <div className="flex-1 min-w-0">
                                    <h3 className="font-bold text-white text-base leading-snug truncate">{p.title}</h3>
                                    {p.category && (
                                        <span className="text-xs text-brand/70 font-medium mt-0.5 block">{p.category}</span>
                                    )}
                                </div>
                                <div className="flex items-center gap-1 shrink-0">
                                    <button
                                        onClick={() => copyPrompt(p)}
                                        className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-500 hover:text-brand hover:bg-brand/10 transition-all"
                                        title="복사"
                                    >
                                        {copiedId === p.id
                                            ? <Check className="w-4 h-4 text-brand" />
                                            : <Copy className="w-4 h-4" />}
                                    </button>
                                    <button
                                        onClick={() => openEdit(p)}
                                        className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-500 hover:text-white hover:bg-neutral-700 transition-all"
                                        title="수정"
                                    >
                                        <Edit2 className="w-4 h-4" />
                                    </button>
                                    {deleteConfirmId === p.id ? (
                                        <div className="flex items-center gap-1">
                                            <button
                                                onClick={() => deletePrompt(p.id)}
                                                className="px-2 py-1 text-xs font-bold bg-red-500/20 text-red-400 border border-red-500/30 rounded-lg hover:bg-red-500/30 transition-all"
                                            >삭제</button>
                                            <button
                                                onClick={() => setDeleteConfirmId(null)}
                                                className="w-6 h-6 flex items-center justify-center text-gray-500 hover:text-white"
                                            ><X className="w-3 h-3" /></button>
                                        </div>
                                    ) : (
                                        <button
                                            onClick={() => setDeleteConfirmId(p.id)}
                                            className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-500 hover:text-red-400 hover:bg-red-500/10 transition-all"
                                            title="삭제"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    )}
                                </div>
                            </div>

                            {/* 내용 미리보기 */}
                            <p className="text-sm text-gray-400 leading-relaxed line-clamp-3 whitespace-pre-wrap">{p.content}</p>

                            {/* 태그 */}
                            {p.tags?.length > 0 && (
                                <div className="flex flex-wrap gap-1.5">
                                    {p.tags.map(tag => (
                                        <span key={tag} className="px-2 py-0.5 bg-neutral-800 border border-neutral-700 text-gray-400 text-xs rounded-full">#{tag}</span>
                                    ))}
                                </div>
                            )}

                            {/* 메모 */}
                            {p.memo && (
                                <p className="text-xs text-gray-600 border-t border-neutral-800 pt-2">{p.memo}</p>
                            )}
                        </div>
                    ))}
                </div>
            )}

            {/* 모달 */}
            {modalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm" onClick={closeModal}>
                    <div className="w-full max-w-xl bg-neutral-900 border border-neutral-700 rounded-2xl shadow-2xl flex flex-col max-h-[90vh]" onClick={e => e.stopPropagation()}>
                        {/* 모달 헤더 */}
                        <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-800">
                            <h2 className="font-bold text-white text-lg">{editingPrompt ? '프롬프트 수정' : '프롬프트 추가'}</h2>
                            <button onClick={closeModal} className="text-gray-500 hover:text-white transition-colors">
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        {/* 모달 폼 */}
                        <div className="overflow-y-auto px-6 py-5 flex flex-col gap-4">
                            <div>
                                <label className="text-xs text-gray-400 font-semibold mb-1.5 block">제목 *</label>
                                <input
                                    type="text"
                                    value={form.title}
                                    onChange={e => updateForm('title', e.target.value)}
                                    placeholder="예: 옛날 사진 8K 업스케일 프롬프트"
                                    className="w-full bg-black/50 border border-neutral-800 focus:border-brand rounded-xl px-4 py-2.5 text-white text-sm outline-none transition-colors"
                                />
                            </div>
                            <div>
                                <label className="text-xs text-gray-400 font-semibold mb-1.5 block">프롬프트 내용 *</label>
                                <textarea
                                    value={form.content}
                                    onChange={e => updateForm('content', e.target.value)}
                                    placeholder="프롬프트 전체 내용을 입력하세요..."
                                    rows={6}
                                    className="w-full bg-black/50 border border-neutral-800 focus:border-brand rounded-xl px-4 py-2.5 text-white text-sm outline-none transition-colors resize-none leading-relaxed"
                                />
                            </div>
                            <div className="flex gap-3">
                                <div className="flex-1">
                                    <label className="text-xs text-gray-400 font-semibold mb-1.5 block">카테고리</label>
                                    <input
                                        type="text"
                                        value={form.category}
                                        onChange={e => updateForm('category', e.target.value)}
                                        placeholder="예: 이미지 생성"
                                        className="w-full bg-black/50 border border-neutral-800 focus:border-brand rounded-xl px-4 py-2.5 text-white text-sm outline-none transition-colors"
                                    />
                                </div>
                                <div className="flex-1">
                                    <label className="text-xs text-gray-400 font-semibold mb-1.5 block">태그 (쉼표 구분)</label>
                                    <input
                                        type="text"
                                        value={form.tagsInput}
                                        onChange={e => updateForm('tagsInput', e.target.value)}
                                        placeholder="예: 업스케일, 사진, SD"
                                        className="w-full bg-black/50 border border-neutral-800 focus:border-brand rounded-xl px-4 py-2.5 text-white text-sm outline-none transition-colors"
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="text-xs text-gray-400 font-semibold mb-1.5 block">메모</label>
                                <input
                                    type="text"
                                    value={form.memo}
                                    onChange={e => updateForm('memo', e.target.value)}
                                    placeholder="어디서 얻었는지, 사용 팁 등..."
                                    className="w-full bg-black/50 border border-neutral-800 focus:border-brand rounded-xl px-4 py-2.5 text-white text-sm outline-none transition-colors"
                                />
                            </div>
                        </div>

                        {/* 모달 푸터 */}
                        <div className="flex gap-3 px-6 py-4 border-t border-neutral-800">
                            <button onClick={closeModal} className="flex-1 py-2.5 rounded-xl border border-neutral-700 text-gray-400 hover:text-white hover:border-neutral-600 text-sm font-semibold transition-all">
                                취소
                            </button>
                            <button
                                onClick={savePrompt}
                                disabled={saving || !form.title.trim() || !form.content.trim()}
                                className="flex-1 py-2.5 rounded-xl bg-brand text-black font-bold text-sm hover:bg-[#00cc33] transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                            >
                                {saving ? '저장 중...' : editingPrompt ? '수정 완료' : '저장'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default PromptVault;
