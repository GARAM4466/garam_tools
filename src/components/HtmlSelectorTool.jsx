import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import JSZip from 'jszip';
import { ArrowLeft, MousePointerClick, FolderOpen, Download, Trash2, CheckSquare, Save, Loader2 } from 'lucide-react';
import {
  supportsFSAccess, saveHandle, loadHandle, verifyPermission, scanDirectory, filesToItems,
  getSubdirHandle, writeBlobToDirectory, writeJsonToDirectory,
} from '../lib/fileSystem';
import { GRID_MODES, cropFileToCells } from '../lib/imageGrid';

const HANDLE_KEY = 'last-folder';
const selKey = (folder, grid) => `html-selector:selection:${folder}:${grid}`;
const natCompare = (a, b) => a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' });
const sanitize = (s) => s.replace(/[^a-zA-Z0-9가-힣_.-]+/g, '_');
const cellId = (groupId, idx) => `${groupId}#${idx}`;

// One source file = one group; its grid cells = the selectable slices.
// The file is decoded + cropped only when the row scrolls into view.
function GroupRow({ group, rows, cols, cellCount, selectedSet, onToggle }) {
  const ref = useRef(null);
  const [urls, setUrls] = useState(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    let cancelled = false;
    let created = [];
    const io = new IntersectionObserver(async (entries) => {
      if (!entries[0].isIntersecting) return;
      io.disconnect();
      try {
        const file = await group.getFile();
        const blobs = await cropFileToCells(file, rows, cols, 'image/jpeg', 0.82);
        if (cancelled) return;
        created = blobs.map((b) => URL.createObjectURL(b));
        setUrls(created);
      } catch {
        if (!cancelled) setFailed(true);
      }
    }, { rootMargin: '400px' });
    io.observe(el);
    return () => { cancelled = true; io.disconnect(); created.forEach((u) => URL.revokeObjectURL(u)); };
  }, [group, rows, cols]);

  return (
    <div ref={ref} className="bg-cardBg border border-cardBorder rounded-xl p-3">
      <div className="text-xs text-gray-500 mb-2 truncate">{group.relativePath}</div>
      <div className="grid gap-2" style={{ gridTemplateColumns: `repeat(${cellCount}, minmax(0, 1fr))` }}>
        {Array.from({ length: cellCount }, (_, i) => {
          const idx = i + 1;
          const id = cellId(group.groupId, idx);
          const selected = selectedSet.has(id);
          return (
            <button
              key={id}
              onClick={() => onToggle(id)}
              title={`${group.name} · cell ${idx}`}
              className={`relative bg-black rounded-lg overflow-hidden border-4 transition-colors min-h-[80px] flex items-center justify-center ${
                selected ? 'border-yellow-400' : 'border-transparent hover:border-neutral-600'
              }`}
            >
              {urls ? (
                <img src={urls[i]} alt={`cell ${idx}`} className="w-full h-auto block" />
              ) : (
                <span className="py-6 text-neutral-700">
                  {failed ? '⚠' : <Loader2 className="w-5 h-5 animate-spin" />}
                </span>
              )}
              <span className="absolute top-1 left-1 px-1.5 py-0.5 rounded bg-black/70 text-[11px] font-bold text-white">
                {idx}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

const HtmlSelectorTool = ({ onBack }) => {
  const [dirHandle, setDirHandle] = useState(null);
  const [folderName, setFolderName] = useState('');
  const [items, setItems] = useState([]);
  const [selected, setSelected] = useState(() => new Set());
  const [activeTab, setActiveTab] = useState('All');
  const [gridMode, setGridMode] = useState('2x2');
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState('');
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');
  const [savedHandle, setSavedHandle] = useState(null);
  const fallbackInputRef = useRef(null);

  const fsSupported = supportsFSAccess();
  const { rows, cols } = GRID_MODES[gridMode];
  const cellCount = rows * cols;

  useEffect(() => {
    if (!fsSupported) return;
    loadHandle(HANDLE_KEY).then((h) => { if (h) setSavedHandle(h); }).catch(() => {});
  }, [fsSupported]);

  // Selection is scoped to folder + grid mode (cell ids differ between modes).
  useEffect(() => {
    if (!folderName) return;
    try {
      const raw = localStorage.getItem(selKey(folderName, gridMode));
      setSelected(new Set(raw ? JSON.parse(raw) : []));
    } catch { setSelected(new Set()); }
  }, [folderName, gridMode]);

  useEffect(() => {
    if (!folderName) return;
    localStorage.setItem(selKey(folderName, gridMode), JSON.stringify([...selected]));
  }, [selected, folderName, gridMode]);

  const loadFromHandle = useCallback(async (handle) => {
    setLoading(true); setError('');
    try {
      if (!(await verifyPermission(handle, false))) { setError('폴더 접근 권한이 거부되었습니다.'); return; }
      const scanned = await scanDirectory(handle);
      if (!scanned.length) { setError('이미지를 찾을 수 없습니다. (jpg/png/webp 등)'); return; }
      setDirHandle(handle); setFolderName(handle.name); setItems(scanned); setActiveTab('All');
      await saveHandle(HANDLE_KEY, handle).catch(() => {});
      setSavedHandle(null);
    } catch (e) {
      setError(`폴더를 읽지 못했습니다: ${e.message}`);
    } finally { setLoading(false); }
  }, []);

  const pickFolder = useCallback(async () => {
    if (!fsSupported) { fallbackInputRef.current?.click(); return; }
    try {
      const handle = await window.showDirectoryPicker({ mode: 'readwrite' });
      await loadFromHandle(handle);
    } catch (e) {
      if (e.name !== 'AbortError') setError(`폴더 선택 실패: ${e.message}`);
    }
  }, [fsSupported, loadFromHandle]);

  const onFallbackInput = useCallback((e) => {
    const list = e.target.files;
    if (!list?.length) return;
    const scanned = filesToItems(list);
    if (!scanned.length) { setError('이미지를 찾을 수 없습니다.'); return; }
    const root = (list[0].webkitRelativePath || '').split('/')[0] || 'folder';
    setDirHandle(null); setFolderName(root); setItems(scanned); setActiveTab('All'); setError('');
  }, []);

  // Each file becomes a group, sorted naturally by path.
  const groups = useMemo(() => {
    return [...items]
      .sort((a, b) => natCompare(a.relativePath, b.relativePath))
      .map((it) => ({ ...it, groupId: it.relativePath }));
  }, [items]);

  const tabs = useMemo(() => {
    const set = new Set(items.map((it) => it.topFolder));
    return ['All', ...[...set].sort(natCompare)];
  }, [items]);

  const visibleGroups = useMemo(
    () => (activeTab === 'All' ? groups : groups.filter((g) => g.topFolder === activeTab)),
    [groups, activeTab]
  );

  const toggle = useCallback((id) => {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }, []);

  const selectAllVisible = useCallback(() => {
    setSelected((prev) => {
      const next = new Set(prev);
      for (const g of visibleGroups) for (let i = 1; i <= cellCount; i++) next.add(cellId(g.groupId, i));
      return next;
    });
  }, [visibleGroups, cellCount]);

  const clearAll = useCallback(() => setSelected(new Set()), []);

  // Collect selected cells grouped by source file so each file is cropped once at full res.
  const collectSelected = useCallback(() => {
    const out = [];
    for (const g of groups) {
      const indices = [];
      for (let i = 1; i <= cellCount; i++) if (selected.has(cellId(g.groupId, i))) indices.push(i);
      if (indices.length) out.push({ group: g, indices });
    }
    return out;
  }, [groups, selected, cellCount]);

  const buildManifest = useCallback((entries) => ({
    project_id: folderName,
    exported_at: new Date().toISOString(),
    grid: gridMode,
    total_files: items.length,
    total_cells: items.length * cellCount,
    total_selected: entries.reduce((n, e) => n + e.indices.length, 0),
    items: entries.flatMap(({ group, indices }) =>
      indices.map((idx) => ({
        id: cellId(group.groupId, idx),
        source_file: group.relativePath,
        source_folder: group.topFolder,
        cell_index: idx,
        grid: gridMode,
        output_file: `images/${sanitize(group.topFolder)}__${group.name.replace(/\.[^.]+$/, '')}_cell${idx}.png`,
      }))
    ),
  }), [folderName, gridMode, items.length, cellCount]);

  // Export 1: ZIP containing full-res PNG cells + selection.json (works everywhere).
  const exportZip = useCallback(async () => {
    const entries = collectSelected();
    if (!entries.length) { setError('선택된 컷이 없습니다.'); return; }
    setExporting('zip'); setError(''); setInfo('');
    try {
      const zip = new JSZip();
      const imgFolder = zip.folder('images');
      const manifest = buildManifest(entries);
      for (const { group, indices } of entries) {
        const file = await group.getFile();
        const blobs = await cropFileToCells(file, rows, cols, 'image/png');
        for (const idx of indices) {
          const name = `${sanitize(group.topFolder)}__${group.name.replace(/\.[^.]+$/, '')}_cell${idx}.png`;
          imgFolder.file(name, blobs[idx - 1]);
        }
      }
      zip.file('selection.json', JSON.stringify(manifest, null, 2));
      const content = await zip.generateAsync({ type: 'blob' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(content);
      a.download = 'selection.zip';
      document.body.appendChild(a); a.click(); a.remove();
      URL.revokeObjectURL(a.href);
      setInfo(`${manifest.total_selected}개 컷을 selection.zip으로 내보냈습니다.`);
    } catch (e) {
      setError(`Export 실패: ${e.message}`);
    } finally { setExporting(''); }
  }, [collectSelected, buildManifest, rows, cols]);

  // Export 2 (FS only): write PNG cells + selection.json into a _selected_<ts> subfolder.
  const exportToFolder = useCallback(async () => {
    if (!dirHandle) return;
    const entries = collectSelected();
    if (!entries.length) { setError('선택된 컷이 없습니다.'); return; }
    setExporting('folder'); setError(''); setInfo('');
    try {
      if (!(await verifyPermission(dirHandle, true))) { setError('쓰기 권한이 거부되었습니다.'); return; }
      const stamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
      const outDir = await getSubdirHandle(dirHandle, `_selected_${stamp}`);
      const imgDir = await getSubdirHandle(outDir, 'images');
      const manifest = buildManifest(entries);
      for (const { group, indices } of entries) {
        const file = await group.getFile();
        const blobs = await cropFileToCells(file, rows, cols, 'image/png');
        for (const idx of indices) {
          const name = `${sanitize(group.topFolder)}__${group.name.replace(/\.[^.]+$/, '')}_cell${idx}.png`;
          await writeBlobToDirectory(imgDir, name, blobs[idx - 1]);
        }
      }
      await writeJsonToDirectory(outDir, 'selection.json', manifest);
      setInfo(`${manifest.total_selected}개 컷을 _selected_${stamp}/ 폴더에 저장했습니다.`);
    } catch (e) {
      setError(`폴더 저장 실패: ${e.message}`);
    } finally { setExporting(''); }
  }, [dirHandle, collectSelected, buildManifest, rows, cols]);

  // --- Landing screen ---
  if (!items.length) {
    return (
      <div className="max-w-4xl mx-auto px-6 py-12 flex flex-col min-h-screen">
        <BackButton onBack={onBack} />
        <div className="mb-10 text-center max-w-2xl mx-auto">
          <h1 className="text-4xl font-extrabold tracking-tight mb-4 flex items-center justify-center gap-3">
            <MousePointerClick className="w-10 h-10 text-brand" />
            HTML 셀렉터
          </h1>
          <p className="text-lg text-gray-400 font-medium leading-relaxed">
            4분할 그리드 이미지가 든 폴더를 선택하면 각 컷을 분리해 보여줍니다.<br />
            좋은 컷만 클릭해 고르면, 잘린 PNG + selection.json으로 내보내 업스케일링에 넘깁니다.
          </p>
        </div>

        <div
          onClick={pickFolder}
          className="border-2 border-dashed border-neutral-700 bg-neutral-900/50 hover:bg-neutral-800/50 hover:border-brand/50 rounded-2xl h-72 flex flex-col items-center justify-center text-center p-6 transition-all cursor-pointer"
        >
          <div className="w-16 h-16 bg-neutral-800 rounded-full flex items-center justify-center mb-4 text-brand shadow-lg shadow-brand/10">
            {loading ? <Loader2 className="w-8 h-8 animate-spin" /> : <FolderOpen className="w-8 h-8" />}
          </div>
          <h3 className="text-lg font-semibold text-white mb-2">{loading ? '폴더를 읽는 중...' : '이미지 폴더 선택'}</h3>
          <p className="text-sm text-gray-400 max-w-md">
            {fsSupported
              ? '폴더를 한 번 지정하면 하위 폴더까지 자동 스캔합니다. (업로드 아님 — 로컬에서 바로 읽음)'
              : '이 브라우저는 폴더 선택 API 미지원 → 업로드 방식으로 동작합니다. (Chrome/Edge 권장)'}
          </p>
        </div>

        {savedHandle && (
          <button onClick={() => loadFromHandle(savedHandle)}
            className="mt-4 self-center px-5 py-2.5 rounded-xl bg-neutral-800 hover:bg-neutral-700 border border-neutral-700 hover:border-brand/50 text-sm font-semibold text-white flex items-center gap-2 transition-all">
            <FolderOpen className="w-4 h-4 text-brand" />
            이전 폴더 다시 열기: {savedHandle.name}
          </button>
        )}

        {error && <p className="mt-4 text-center text-red-400 text-sm">{error}</p>}

        <input ref={fallbackInputRef} type="file" webkitdirectory="" directory="" multiple className="hidden" onChange={onFallbackInput} />
      </div>
    );
  }

  // --- Main screen ---
  const busy = !!exporting;
  return (
    <div className="flex flex-col min-h-screen">
      <div className="max-w-7xl mx-auto w-full px-6 pt-8">
        <BackButton onBack={onBack} />
      </div>

      <div className="sticky top-16 z-40 glass-nav border-b border-white/5">
        <div className="max-w-7xl mx-auto px-6 py-3 flex flex-wrap items-center gap-3">
          <div className="text-sm text-gray-300 font-medium mr-auto">
            <span className="text-white font-bold">{folderName}</span>
            <span className="mx-2 text-neutral-600">|</span>
            Total <span className="text-white font-bold">{items.length * cellCount}</span> cells in{' '}
            <span className="text-white font-bold">{items.length}</span> files
            <span className="mx-2 text-neutral-600">|</span>
            Selected: <span className="text-yellow-400 font-bold">{selected.size}</span>
          </div>

          <div className="flex items-center gap-1 bg-neutral-900 rounded-lg p-1 border border-neutral-800">
            {Object.entries(GRID_MODES).map(([key, m]) => (
              <TabBtn key={key} active={gridMode === key} onClick={() => setGridMode(key)}>{m.label}</TabBtn>
            ))}
          </div>

          <button onClick={selectAllVisible} disabled={busy} className="ctrl-btn">
            <CheckSquare className="w-4 h-4 text-brand" /> 보이는 컷 전체 선택
          </button>
          <button onClick={clearAll} disabled={busy} className="ctrl-btn">
            <Trash2 className="w-4 h-4 text-red-400" /> 전체 해제
          </button>
          {dirHandle && (
            <button onClick={exportToFolder} disabled={busy} className="ctrl-btn">
              {exporting === 'folder' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4 text-brand" />} 폴더에 저장
            </button>
          )}
          <button onClick={exportZip} disabled={busy}
            className="px-4 py-2 rounded-lg bg-brand text-black text-sm font-bold flex items-center gap-2 hover:bg-[#00cc33] transition-colors disabled:opacity-60">
            {exporting === 'zip' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />} Export (PNG + JSON)
          </button>
        </div>

        <div className="max-w-7xl mx-auto px-6 pb-3 flex flex-wrap gap-2">
          {tabs.map((tab) => (
            <TabBtn key={tab} active={activeTab === tab} onClick={() => setActiveTab(tab)}>{tab}</TabBtn>
          ))}
        </div>
      </div>

      {(error || info) && (
        <p className={`max-w-7xl mx-auto w-full px-6 pt-3 text-sm ${error ? 'text-red-400' : 'text-brand'}`}>
          {error || info}
        </p>
      )}

      <div className="max-w-7xl mx-auto w-full px-6 py-6 space-y-5">
        {visibleGroups.map((g) => (
          <GroupRow
            key={g.groupId}
            group={g}
            rows={rows}
            cols={cols}
            cellCount={cellCount}
            selectedSet={selected}
            onToggle={toggle}
          />
        ))}
      </div>
    </div>
  );
};

const BackButton = ({ onBack }) => (
  <button onClick={onBack} className="self-start flex items-center text-gray-400 hover:text-white transition-colors mb-8 group">
    <ArrowLeft className="w-5 h-5 mr-2 transform group-hover:-translate-x-1 transition-transform" />
    도구 모음으로 돌아가기
  </button>
);

const TabBtn = ({ active, onClick, children }) => (
  <button onClick={onClick}
    className={`px-3 py-1.5 rounded-md text-sm font-semibold transition-colors ${
      active ? 'bg-brand text-black' : 'text-gray-300 hover:bg-neutral-800'
    }`}>
    {children}
  </button>
);

export default HtmlSelectorTool;
