import { useState, useEffect, useMemo, useRef } from 'react';
import {
  ArrowLeft, LibraryBig, Search, Plus, Edit2, Trash2, Copy, Check, X,
  ImagePlus, Download, User, MapPin, Package, Palette,
} from 'lucide-react';
import {
  ASSET_TYPES, getAllAssets, putAsset, deleteAsset, newId, fileToImageRecord,
} from '../lib/refLibrary';

const EMPTY_FORM = { name: '', type: ASSET_TYPES[0], tagsInput: '', prompt: '', memo: '' };

const TYPE_ICON = { 인물: User, 공간: MapPin, 소품: Package, 스타일: Palette };

const ReferenceLibraryTool = ({ onBack }) => {
  const [assets, setAssets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('전체');
  const [selectedTags, setSelectedTags] = useState(new Set());

  const [modalOpen, setModalOpen] = useState(false);
  const [editingAsset, setEditingAsset] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [formImages, setFormImages] = useState([]);
  const [saving, setSaving] = useState(false);
  const [importing, setImporting] = useState(false);

  const [copiedId, setCopiedId] = useState(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState(null);
  const [lightbox, setLightbox] = useState(null); // { url, name }

  const fileInputRef = useRef(null);
  const urls = useRef(new Map()); // imageId|thumb|full -> objectURL

  useEffect(() => { load(); }, []);
  useEffect(() => () => { for (const u of urls.current.values()) URL.revokeObjectURL(u); }, []);

  const load = async () => {
    setLoading(true);
    try {
      setAssets(await getAllAssets());
    } catch (e) {
      console.error('라이브러리 불러오기 실패:', e);
    } finally {
      setLoading(false);
    }
  };

  const urlFor = (img, full = false) => {
    if (!img) return '';
    const key = `${img.id}|${full ? 'full' : 'thumb'}`;
    let u = urls.current.get(key);
    if (!u) {
      u = URL.createObjectURL(full ? img.blob : (img.thumb || img.blob));
      urls.current.set(key, u);
    }
    return u;
  };

  const revokeImageUrls = (img) => {
    for (const suffix of ['thumb', 'full']) {
      const key = `${img.id}|${suffix}`;
      const u = urls.current.get(key);
      if (u) { URL.revokeObjectURL(u); urls.current.delete(key); }
    }
  };

  const allTags = useMemo(
    () => [...new Set(assets.flatMap(a => a.tags || []))].sort(),
    [assets],
  );

  const filtered = useMemo(() => assets.filter(a => {
    const q = search.toLowerCase();
    const matchSearch = !q
      || a.name.toLowerCase().includes(q)
      || (a.prompt || '').toLowerCase().includes(q)
      || (a.tags || []).some(t => t.toLowerCase().includes(q));
    const matchType = typeFilter === '전체' || a.type === typeFilter;
    const matchTags = selectedTags.size === 0 || [...selectedTags].every(t => a.tags?.includes(t));
    return matchSearch && matchType && matchTags;
  }), [assets, search, typeFilter, selectedTags]);

  const typeCounts = useMemo(() => {
    const c = {};
    for (const a of assets) c[a.type] = (c[a.type] || 0) + 1;
    return c;
  }, [assets]);

  // --- modal ---

  const openAdd = () => {
    setEditingAsset(null);
    setForm(EMPTY_FORM);
    setFormImages([]);
    setModalOpen(true);
  };

  const openEdit = (a) => {
    setEditingAsset(a);
    setForm({
      name: a.name,
      type: a.type,
      tagsInput: (a.tags || []).join(', '),
      prompt: a.prompt || '',
      memo: a.memo || '',
    });
    setFormImages(a.images || []);
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setEditingAsset(null);
    setFormImages([]);
  };

  const updateForm = (key, val) => setForm(prev => ({ ...prev, [key]: val }));

  const addFiles = async (fileList) => {
    const files = [...fileList].filter(f => f.type.startsWith('image/'));
    if (!files.length) return;
    setImporting(true);
    try {
      const records = [];
      for (const f of files) records.push(await fileToImageRecord(f));
      setFormImages(prev => [...prev, ...records]);
    } catch (e) {
      console.error('이미지 처리 실패:', e);
    } finally {
      setImporting(false);
    }
  };

  const handleFileSelect = (e) => {
    if (e.target.files?.length) addFiles(e.target.files);
    e.target.value = '';
  };

  const handleDrop = (e) => {
    e.preventDefault();
    if (e.dataTransfer.files?.length) addFiles(e.dataTransfer.files);
  };

  const removeFormImage = (id) => setFormImages(prev => prev.filter(img => img.id !== id));

  const saveAsset = async () => {
    if (!form.name.trim()) return;
    setSaving(true);
    try {
      const now = Date.now();
      const tags = form.tagsInput.split(',').map(t => t.trim()).filter(Boolean);
      const asset = {
        id: editingAsset?.id ?? newId(),
        name: form.name.trim(),
        type: form.type,
        tags,
        prompt: form.prompt.trim(),
        memo: form.memo.trim(),
        images: formImages,
        createdAt: editingAsset?.createdAt ?? now,
        updatedAt: now,
      };
      await putAsset(asset);
      closeModal();
      await load();
    } catch (e) {
      console.error('저장 실패:', e);
    } finally {
      setSaving(false);
    }
  };

  const removeAsset = async (a) => {
    await deleteAsset(a.id);
    (a.images || []).forEach(revokeImageUrls);
    setDeleteConfirmId(null);
    await load();
  };

  const copyPrompt = async (a) => {
    if (!a.prompt) return;
    await navigator.clipboard.writeText(a.prompt);
    setCopiedId(a.id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const downloadImage = (img, assetName) => {
    const a = document.createElement('a');
    a.href = urlFor(img, true);
    const ext = (img.name?.split('.').pop() || 'png').toLowerCase();
    a.download = img.name || `${assetName || 'image'}.${ext}`;
    document.body.appendChild(a);
    a.click();
    a.remove();
  };

  const toggleTag = (tag) => {
    setSelectedTags(prev => {
      const next = new Set(prev);
      next.has(tag) ? next.delete(tag) : next.add(tag);
      return next;
    });
  };

  const TypeBadge = ({ type }) => {
    const Icon = TYPE_ICON[type] || Package;
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-neutral-800 border border-neutral-700 text-gray-300 text-xs rounded-full">
        <Icon className="w-3 h-3 text-brand" /> {type}
      </span>
    );
  };

  return (
    <div className="max-w-6xl mx-auto px-6 py-12 w-full font-sans">
      <button onClick={onBack} className="self-start flex items-center text-gray-400 hover:text-white transition-colors mb-8 group">
        <ArrowLeft className="w-5 h-5 mr-2 transform group-hover:-translate-x-1 transition-transform" />
        도구 모음으로 돌아가기
      </button>

      {/* 헤더 */}
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-extrabold tracking-tight mb-2 flex items-center gap-3">
            <LibraryBig className="w-9 h-9 text-brand" />
            레퍼런스 라이브러리
          </h1>
          <p className="text-gray-400">재사용할 인물·공간 정본을 모아두고, 영상 생성에 끌어다 쓰세요.</p>
        </div>
        <button onClick={openAdd} className="flex items-center gap-2 px-5 py-3 bg-brand text-black font-bold rounded-xl hover:bg-[#00cc33] transition-all hover:shadow-[0_0_20px_rgba(0,255,65,0.3)]">
          <Plus className="w-5 h-5" /> 에셋 추가
        </button>
      </div>

      {/* 종류 탭 */}
      <div className="flex flex-wrap gap-2 mb-4">
        {['전체', ...ASSET_TYPES].map(t => {
          const active = typeFilter === t;
          const count = t === '전체' ? assets.length : (typeCounts[t] || 0);
          return (
            <button key={t} onClick={() => setTypeFilter(t)}
              className={`px-4 py-1.5 rounded-full text-sm font-semibold border transition-all ${
                active ? 'bg-brand text-black border-brand'
                       : 'bg-transparent text-gray-400 border-neutral-700 hover:border-brand/50 hover:text-white'
              }`}>
              {t} <span className={active ? 'text-black/60' : 'text-gray-600'}>{count}</span>
            </button>
          );
        })}
      </div>

      {/* 검색 */}
      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
        <input
          type="text"
          placeholder="이름 · 프롬프트 · 태그 검색..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="w-full bg-neutral-900 border border-neutral-800 focus:border-brand rounded-xl pl-10 pr-4 py-3 text-white text-sm outline-none transition-colors"
        />
      </div>

      {/* 태그 필터 */}
      {allTags.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-8">
          {allTags.map(tag => (
            <button key={tag} onClick={() => toggleTag(tag)}
              className={`px-3 py-1 rounded-full text-xs font-semibold border transition-all ${
                selectedTags.has(tag)
                  ? 'bg-brand text-black border-brand'
                  : 'bg-transparent text-gray-400 border-neutral-700 hover:border-brand/50 hover:text-white'
              }`}>
              #{tag}
            </button>
          ))}
        </div>
      )}

      {/* 목록 */}
      {loading ? (
        <div className="flex justify-center py-24 text-gray-500">불러오는 중...</div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-gray-600">
          <LibraryBig className="w-12 h-12 mb-4 opacity-30" />
          <p className="font-medium">{assets.length === 0 ? '저장된 에셋이 없습니다.' : '검색 결과가 없습니다.'}</p>
          {assets.length === 0 && <button onClick={openAdd} className="mt-4 text-brand text-sm hover:underline">첫 에셋 추가하기</button>}
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {filtered.map(a => {
            const cover = a.images?.[0];
            return (
              <div key={a.id} className="group bg-cardBg border border-cardBorder hover:border-brand/30 rounded-2xl overflow-hidden flex flex-col transition-colors">
                <button
                  onClick={() => cover && setLightbox({ url: urlFor(cover, true), name: a.name })}
                  className="w-full aspect-square overflow-hidden bg-neutral-900 relative block"
                >
                  {cover ? (
                    <img src={urlFor(cover)} alt={a.name}
                      className="w-full h-full object-cover transform transition-transform duration-500 group-hover:scale-105" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-gray-700">
                      <ImagePlus className="w-8 h-8" />
                    </div>
                  )}
                  {a.images?.length > 1 && (
                    <span className="absolute top-2 right-2 px-1.5 py-0.5 rounded-md bg-black/60 backdrop-blur-sm text-white text-[10px] font-bold">
                      {a.images.length}장
                    </span>
                  )}
                </button>

                <div className="p-3 flex flex-col gap-2 flex-1">
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="font-bold text-white text-sm leading-snug line-clamp-1">{a.name}</h3>
                  </div>
                  <TypeBadge type={a.type} />
                  {a.tags?.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {a.tags.slice(0, 3).map(tag => (
                        <span key={tag} className="px-1.5 py-0.5 bg-neutral-800 border border-neutral-700 text-gray-400 text-[10px] rounded-full">#{tag}</span>
                      ))}
                    </div>
                  )}

                  <div className="mt-auto flex items-center gap-1 pt-1">
                    {a.prompt && (
                      <button onClick={() => copyPrompt(a)} className="flex-1 h-8 flex items-center justify-center gap-1 rounded-lg text-xs font-semibold text-gray-400 hover:text-brand hover:bg-brand/10 border border-neutral-700 transition-all" title="프롬프트 복사">
                        {copiedId === a.id ? <Check className="w-3.5 h-3.5 text-brand" /> : <Copy className="w-3.5 h-3.5" />}
                        {copiedId === a.id ? '복사됨' : '프롬프트'}
                      </button>
                    )}
                    <button onClick={() => openEdit(a)} className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-500 hover:text-white hover:bg-neutral-700 border border-neutral-700 transition-all" title="수정">
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    {deleteConfirmId === a.id ? (
                      <div className="flex items-center gap-1">
                        <button onClick={() => removeAsset(a)} className="px-2 h-8 text-xs font-bold bg-red-500/20 text-red-400 border border-red-500/30 rounded-lg hover:bg-red-500/30 transition-all">삭제</button>
                        <button onClick={() => setDeleteConfirmId(null)} className="w-6 h-8 flex items-center justify-center text-gray-500 hover:text-white"><X className="w-3 h-3" /></button>
                      </div>
                    ) : (
                      <button onClick={() => setDeleteConfirmId(a.id)} className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-500 hover:text-red-400 hover:bg-red-500/10 border border-neutral-700 transition-all" title="삭제">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* 라이트박스 */}
      {lightbox && (
        <div className="fixed inset-0 z-[60] bg-black/90 overflow-auto grid place-items-center p-4 cursor-zoom-out" onClick={() => setLightbox(null)}>
          <img src={lightbox.url} alt={lightbox.name} style={{ maxWidth: '95vw', maxHeight: '95vh' }} className="object-contain" />
        </div>
      )}

      {/* 추가/수정 모달 */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="w-full max-w-xl bg-neutral-900 border border-neutral-700 rounded-2xl shadow-2xl flex flex-col max-h-[90vh]">
            <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-800">
              <h2 className="font-bold text-white text-lg">{editingAsset ? '에셋 수정' : '에셋 추가'}</h2>
              <button onClick={closeModal} className="text-gray-500 hover:text-white transition-colors"><X className="w-5 h-5" /></button>
            </div>

            <div className="overflow-y-auto px-6 py-5 flex flex-col gap-4">
              {/* 이미지 */}
              <div>
                <label className="text-xs text-gray-400 font-semibold mb-1.5 block">레퍼런스 이미지</label>
                <input type="file" ref={fileInputRef} onChange={handleFileSelect} accept="image/*" multiple className="hidden" />
                <div className="grid grid-cols-4 gap-2">
                  {formImages.map(img => (
                    <div key={img.id} className="relative aspect-square rounded-lg overflow-hidden bg-neutral-800 group/img">
                      <img src={urlFor(img)} alt={img.name} className="w-full h-full object-cover" />
                      <button onClick={() => removeFormImage(img.id)}
                        className="absolute top-1 right-1 w-5 h-5 flex items-center justify-center rounded-md bg-black/70 text-white opacity-0 group-hover/img:opacity-100 hover:bg-red-500 transition-all">
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    onDrop={handleDrop}
                    onDragOver={e => e.preventDefault()}
                    className="aspect-square rounded-lg border-2 border-dashed border-neutral-700 hover:border-brand/50 bg-neutral-900/50 hover:bg-neutral-800/50 flex flex-col items-center justify-center gap-1 text-gray-500 hover:text-gray-300 transition-all"
                  >
                    <ImagePlus className="w-5 h-5" />
                    <span className="text-[10px] font-medium">{importing ? '처리 중...' : '추가'}</span>
                  </button>
                </div>
                <p className="text-[11px] text-gray-600 mt-1.5">클릭하거나 이미지를 끌어다 놓으세요 (여러 장 가능)</p>
              </div>

              {/* 이름 */}
              <div>
                <label className="text-xs text-gray-400 font-semibold mb-1.5 block">이름 *</label>
                <input type="text" value={form.name} onChange={e => updateForm('name', e.target.value)} placeholder="예: 주인공 지수 / ○○고 운동장"
                  className="w-full bg-black/50 border border-neutral-800 focus:border-brand rounded-xl px-4 py-2.5 text-white text-sm outline-none transition-colors" />
              </div>

              {/* 종류 */}
              <div>
                <label className="text-xs text-gray-400 font-semibold mb-1.5 block">종류</label>
                <div className="flex flex-wrap gap-2">
                  {ASSET_TYPES.map(t => {
                    const Icon = TYPE_ICON[t];
                    const active = form.type === t;
                    return (
                      <button key={t} onClick={() => updateForm('type', t)}
                        className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-semibold border transition-all ${
                          active ? 'bg-brand text-black border-brand'
                                 : 'bg-black/50 text-gray-400 border-neutral-800 hover:border-neutral-600 hover:text-white'
                        }`}>
                        <Icon className="w-4 h-4" /> {t}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* 프롬프트 */}
              <div>
                <label className="text-xs text-gray-400 font-semibold mb-1.5 block">프롬프트 (이 에셋을 묘사하는 문구)</label>
                <textarea value={form.prompt} onChange={e => updateForm('prompt', e.target.value)} placeholder="이미지/영상 생성 시 이 에셋을 설명할 프롬프트..." rows={4}
                  className="w-full bg-black/50 border border-neutral-800 focus:border-brand rounded-xl px-4 py-2.5 text-white text-sm outline-none transition-colors resize-none leading-relaxed" />
              </div>

              {/* 태그 */}
              <div>
                <label className="text-xs text-gray-400 font-semibold mb-1.5 block">태그 (쉼표 구분)</label>
                <input type="text" value={form.tagsInput} onChange={e => updateForm('tagsInput', e.target.value)} placeholder="예: 학교, 실내, 야간, 따뜻한톤"
                  className="w-full bg-black/50 border border-neutral-800 focus:border-brand rounded-xl px-4 py-2.5 text-white text-sm outline-none transition-colors" />
              </div>

              {/* 메모 */}
              <div>
                <label className="text-xs text-gray-400 font-semibold mb-1.5 block">메모</label>
                <input type="text" value={form.memo} onChange={e => updateForm('memo', e.target.value)} placeholder="생성 모델, 시드, 사용 팁 등..."
                  className="w-full bg-black/50 border border-neutral-800 focus:border-brand rounded-xl px-4 py-2.5 text-white text-sm outline-none transition-colors" />
              </div>

              {/* 다운로드 (수정 시) */}
              {editingAsset && formImages.length > 0 && (
                <div className="flex flex-wrap gap-2 border-t border-neutral-800 pt-3">
                  {formImages.map(img => (
                    <button key={img.id} onClick={() => downloadImage(img, form.name)}
                      className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-gray-400 hover:text-brand border border-neutral-700 hover:border-brand/40 rounded-lg transition-all">
                      <Download className="w-3.5 h-3.5" /> {img.name?.slice(0, 18) || '이미지'}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="flex gap-3 px-6 py-4 border-t border-neutral-800">
              <button onClick={closeModal} className="flex-1 py-2.5 rounded-xl border border-neutral-700 text-gray-400 hover:text-white hover:border-neutral-600 text-sm font-semibold transition-all">취소</button>
              <button onClick={saveAsset} disabled={saving || !form.name.trim()}
                className="flex-1 py-2.5 rounded-xl bg-brand text-black font-bold text-sm hover:bg-[#00cc33] transition-all disabled:opacity-40 disabled:cursor-not-allowed">
                {saving ? '저장 중...' : editingAsset ? '수정 완료' : '저장'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ReferenceLibraryTool;
