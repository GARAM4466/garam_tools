import { useState, useRef, useCallback, useEffect } from 'react';
import { ArrowLeft, Upload, Film, Loader2, Download, AlertCircle, Zap, Sliders, X, ChevronLeft, ChevronRight } from 'lucide-react';
import JSZip from 'jszip';

const MAX_FILE_SIZE = 200 * 1024 * 1024; // 200MB
const SAMPLE_INTERVAL = 1 / 15;          // 15fps 간격으로 샘플링
const DIFF_WIDTH = 80;   // diff 계산 전용 축소 해상도 (A: 36배 빠름)
const DIFF_HEIGHT = 45;

// 루미넌스 기반 정규화 픽셀 차이값 계산 (C: 조명/색상 노이즈에 강건)
const computePixelDiff = (prev, curr) => {
    const d1 = prev.data;
    const d2 = curr.data;
    let total = 0;
    const pixelCount = d1.length / 4;
    for (let i = 0; i < d1.length; i += 4) {
        const lum1 = 0.299 * d1[i] + 0.587 * d1[i + 1] + 0.114 * d1[i + 2];
        const lum2 = 0.299 * d2[i] + 0.587 * d2[i + 1] + 0.114 * d2[i + 2];
        total += Math.abs(lum1 - lum2);
    }
    return total / (pixelCount * 255);
};

const VideoReferenceCollector = ({ onBack }) => {
    const [videoFile, setVideoFile] = useState(null);
    const [videoUrl, setVideoUrl] = useState(null);
    const [threshold, setThreshold] = useState(0.15);

    const [status, setStatus] = useState('idle'); // idle, extracting, complete, error
    const [statusMessage, setStatusMessage] = useState('');
    const [progress, setProgress] = useState(0);
    const [frames, setFrames] = useState([]);
    const [isDraggingOver, setIsDraggingOver] = useState(false);
    const [lightboxIndex, setLightboxIndex] = useState(null);

    const fileInputRef = useRef(null);
    const videoElRef = useRef(null);     // 추출 전용 hidden video
    const canvasRef = useRef(null);      // 캡처용 full-size hidden canvas
    const diffCanvasRef = useRef(null);  // diff 계산 전용 소형 canvas (A)
    const abortRef = useRef(false);      // 추출 중단 플래그

    const handleFileChange = (e) => {
        const file = e.target.files?.[0];
        if (!file) return;
        processSelectedFile(file);
    };

    const handleDragOver = useCallback((e) => {
        e.preventDefault();
        setIsDraggingOver(true);
    }, []);

    const handleDragLeave = useCallback((e) => {
        if (!e.currentTarget.contains(e.relatedTarget)) {
            setIsDraggingOver(false);
        }
    }, []);

    const handleDrop = useCallback((e) => {
        e.preventDefault();
        setIsDraggingOver(false);
        const file = e.dataTransfer.files?.[0];
        if (file && file.type.startsWith('video/')) {
            processSelectedFile(file);
        }
    }, []);

    const processSelectedFile = (file) => {
        if (file.size > MAX_FILE_SIZE) {
            alert('파일 크기가 200MB를 초과합니다. 더 작은 파일을 선택해주세요.');
            return;
        }
        abortRef.current = true; // 진행 중인 추출 중단
        setVideoFile(file);
        if (videoUrl) URL.revokeObjectURL(videoUrl);
        setVideoUrl(URL.createObjectURL(file));
        setFrames([]);
        setStatus('idle');
        setStatusMessage('');
        setProgress(0);
    };

    const startExtraction = async () => {
        if (!videoFile || !videoElRef.current || !canvasRef.current || !diffCanvasRef.current) return;

        const capturedThreshold = threshold;
        abortRef.current = false;
        setStatus('extracting');
        setStatusMessage('프레임을 스캔하며 컷 변화를 감지하고 있습니다...');
        setProgress(0);
        setFrames([]);

        const video = videoElRef.current;
        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        const diffCanvas = diffCanvasRef.current;
        const diffCtx = diffCanvas.getContext('2d', { willReadFrequently: true });

        video.src = videoUrl;

        try {
            await new Promise((resolve, reject) => {
                video.onloadedmetadata = resolve;
                video.onerror = () => reject(new Error('영상 메타데이터를 불러오지 못했습니다.'));
            });
        } catch (err) {
            setStatus('error');
            setStatusMessage(err.message);
            return;
        }

        const duration = video.duration;
        if (!isFinite(duration) || duration <= 0) {
            setStatus('error');
            setStatusMessage('영상 길이를 인식할 수 없습니다. 로컬 MP4/WebM 파일을 사용해주세요.');
            return;
        }

        const outputWidth = video.videoWidth || 1920;
        const outputHeight = video.videoHeight || 1080;
        canvas.width = outputWidth;
        canvas.height = outputHeight;
        diffCanvas.width = DIFF_WIDTH;
        diffCanvas.height = DIFF_HEIGHT;

        const seekTo = (t) => new Promise((resolve) => {
            const handle = () => { video.removeEventListener('seeked', handle); resolve(); };
            video.addEventListener('seeked', handle);
            video.currentTime = t;
        });

        let cutCount = 0;

        const captureFrame = (t) => {
            ctx.drawImage(video, 0, 0, outputWidth, outputHeight);
            const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
            cutCount++;
            const fileName = `cut_${String(cutCount).padStart(3, '0')}_${t.toFixed(2)}s.jpg`;
            setFrames(prev => [...prev, { id: `${cutCount}_${t.toFixed(3)}`, fileName, dataUrl }]);
        };

        const settleThreshold = Math.min(capturedThreshold * 0.4, 0.08);
        const MAX_TRANSITION_FRAMES = Math.round(0.6 / SAMPLE_INTERVAL);

        let prevImageData = null;
        let inTransition = false;
        let transitionFrames = 0;
        let time = 0;

        try {
            await seekTo(0);
            diffCtx.drawImage(video, 0, 0, DIFF_WIDTH, DIFF_HEIGHT);
            prevImageData = diffCtx.getImageData(0, 0, DIFF_WIDTH, DIFF_HEIGHT);
            captureFrame(0);
            time = SAMPLE_INTERVAL;

            while (time <= duration) {
                if (abortRef.current) break;

                await seekTo(time);

                if (abortRef.current) break;

                diffCtx.drawImage(video, 0, 0, DIFF_WIDTH, DIFF_HEIGHT);
                const currentImageData = diffCtx.getImageData(0, 0, DIFF_WIDTH, DIFF_HEIGHT);
                const diff = computePixelDiff(prevImageData, currentImageData);

                if (!inTransition && diff > capturedThreshold) {
                    inTransition = true;
                    transitionFrames = 0;
                } else if (inTransition) {
                    transitionFrames++;
                    if (diff < settleThreshold || transitionFrames >= MAX_TRANSITION_FRAMES) {
                        captureFrame(time);
                        inTransition = false;
                        transitionFrames = 0;
                    }
                }

                prevImageData = currentImageData;
                time = parseFloat((time + SAMPLE_INTERVAL).toFixed(3));
                setProgress(Math.min(99, Math.round((time / duration) * 100)));
            }
        } catch (err) {
            console.error(err);
            setStatus('error');
            setStatusMessage('추출 중 오류가 발생했습니다: ' + err.message);
            return;
        }

        if (!abortRef.current) {
            setProgress(100);
            setStatus('complete');
            setStatusMessage(
                cutCount > 0
                    ? `총 ${cutCount}개의 컷이 감지되었습니다!`
                    : '컷 변화가 감지되지 않았습니다. 민감도 슬라이더를 낮춰서 다시 시도해보세요.'
            );
        }
    };

    const downloadAllZip = async () => {
        if (frames.length === 0) return;

        const zip = new JSZip();
        const folder = zip.folder("video_references");

        for (const frame of frames) {
            const res = await fetch(frame.dataUrl);
            const blob = await res.blob();
            folder.file(frame.fileName, blob);
        }

        const content = await zip.generateAsync({ type: "blob" });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(content);
        link.download = `references_${new Date().getTime()}.zip`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const downloadImage = (frame) => {
        const link = document.createElement('a');
        link.href = frame.dataUrl;
        link.download = frame.fileName;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    useEffect(() => {
        if (lightboxIndex === null) return;
        const handleKey = (e) => {
            if (e.key === 'ArrowRight') setLightboxIndex(i => Math.min(i + 1, frames.length - 1));
            else if (e.key === 'ArrowLeft') setLightboxIndex(i => Math.max(i - 1, 0));
            else if (e.key === 'Escape') setLightboxIndex(null);
        };
        window.addEventListener('keydown', handleKey);
        return () => window.removeEventListener('keydown', handleKey);
    }, [lightboxIndex, frames.length]);

    const isWorking = status === 'extracting';

    return (
        <div className="max-w-6xl mx-auto px-6 py-12 flex flex-col min-h-screen w-full font-sans">

            {/* 라이트박스 모달 */}
            {lightboxIndex !== null && frames[lightboxIndex] && (
                <div
                    className="fixed inset-0 z-50 bg-black/92 backdrop-blur-sm flex items-center justify-center"
                    onClick={() => setLightboxIndex(null)}
                >
                    {/* 닫기 */}
                    <button
                        className="absolute top-5 right-5 text-white/50 hover:text-white transition-colors z-10"
                        onClick={() => setLightboxIndex(null)}
                    >
                        <X className="w-7 h-7" />
                    </button>

                    {/* CUT 번호 */}
                    <div className="absolute top-5 left-1/2 -translate-x-1/2 text-white/50 text-sm font-semibold tracking-widest">
                        CUT #{lightboxIndex + 1} <span className="text-white/25">/ {frames.length}</span>
                    </div>

                    {/* 이전 버튼 */}
                    {lightboxIndex > 0 && (
                        <button
                            className="absolute left-5 top-1/2 -translate-y-1/2 text-white/50 hover:text-white transition-colors bg-white/5 hover:bg-white/10 rounded-full p-2"
                            onClick={(e) => { e.stopPropagation(); setLightboxIndex(i => i - 1); }}
                        >
                            <ChevronLeft className="w-8 h-8" />
                        </button>
                    )}

                    {/* 다음 버튼 */}
                    {lightboxIndex < frames.length - 1 && (
                        <button
                            className="absolute right-5 top-1/2 -translate-y-1/2 text-white/50 hover:text-white transition-colors bg-white/5 hover:bg-white/10 rounded-full p-2"
                            onClick={(e) => { e.stopPropagation(); setLightboxIndex(i => i + 1); }}
                        >
                            <ChevronRight className="w-8 h-8" />
                        </button>
                    )}

                    {/* 이미지 */}
                    <img
                        src={frames[lightboxIndex].dataUrl}
                        alt={`Cut ${lightboxIndex + 1}`}
                        className="max-w-[88vw] max-h-[82vh] object-contain rounded-xl shadow-2xl"
                        onClick={(e) => e.stopPropagation()}
                    />

                    {/* 다운로드 버튼 */}
                    <button
                        className="absolute bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-2 px-5 py-2.5 bg-brand text-black font-bold text-sm rounded-full hover:bg-[#00cc33] transition-colors shadow-lg"
                        onClick={(e) => { e.stopPropagation(); downloadImage(frames[lightboxIndex]); }}
                    >
                        <Download className="w-4 h-4" /> 다운로드
                    </button>
                </div>
            )}

            <video ref={videoElRef} className="hidden" muted playsInline crossOrigin="anonymous" />
            <canvas ref={canvasRef} className="hidden" />
            <canvas ref={diffCanvasRef} className="hidden" />

            <button
                onClick={onBack}
                className="self-start flex items-center text-gray-400 hover:text-white transition-colors mb-8 group"
            >
                <ArrowLeft className="w-5 h-5 mr-2 transform group-hover:-translate-x-1 transition-transform" />
                도구 모음으로 돌아가기
            </button>

            <div className="mb-12 text-center max-w-2xl mx-auto">
                <h1 className="text-4xl font-extrabold tracking-tight mb-4 flex items-center justify-center gap-3">
                    <Zap className="w-10 h-10 text-brand fill-brand/20" />
                    비디오 컷 추출기
                </h1>
                <p className="text-gray-400 font-medium">
                    Canvas 픽셀 차분 방식으로 연속 프레임 간 변화를 직접 감지하여<br />
                    영상의 주요 컷을 추출합니다. 모든 처리는 브라우저 내에서 실행됩니다.
                </p>
            </div>

            {/* 업로드 / 영상 미리보기 */}
            <div className="w-full mx-auto mb-10 transition-all duration-300">
                <div
                    className={`bg-cardBg border rounded-3xl p-8 shadow-2xl transition-colors duration-200 ${isDraggingOver ? 'border-brand/70 shadow-[0_0_30px_rgba(0,255,65,0.1)]' : 'border-cardBorder'}`}
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                >
                    <input
                        type="file"
                        ref={fileInputRef}
                        onChange={handleFileChange}
                        accept="video/mp4,video/webm"
                        className="hidden"
                    />
                    {!videoFile ? (
                        <div
                            className="border-2 border-dashed border-neutral-700 bg-neutral-900/60 hover:bg-neutral-800 hover:border-brand/70 rounded-2xl min-h-[300px] flex flex-col items-center justify-center text-center p-8 transition-all duration-300 cursor-pointer group"
                            onClick={() => fileInputRef.current?.click()}
                        >
                            <div className="w-20 h-20 bg-neutral-800 rounded-full flex items-center justify-center mb-6 text-brand shadow-xl shadow-brand/5 group-hover:scale-110 transition-transform">
                                <Upload className="w-8 h-8" />
                            </div>
                            <h3 className="text-2xl font-bold text-white mb-2">영상을 드롭하거나 클릭하여 업로드</h3>
                            <p className="text-gray-400 text-sm">MP4, WebM 포맷 지원 · 최대 200MB · 모든 처리는 브라우저에서 실행</p>
                        </div>
                    ) : (
                        <div className="flex flex-col md:flex-row gap-8 items-center">
                            <div className="w-full md:w-1/2 relative rounded-2xl overflow-hidden bg-black border border-neutral-800 aspect-video shadow-lg">
                                <video src={videoUrl} controls className="w-full h-full object-contain" />
                            </div>

                            <div className="w-full md:w-1/2 flex flex-col items-center md:items-start">
                                <div className="flex items-center gap-3 mb-1 max-w-full w-full">
                                    <h3 className="text-xl font-bold text-white truncate flex-1">{videoFile.name}</h3>
                                    <button
                                        onClick={() => fileInputRef.current?.click()}
                                        disabled={isWorking}
                                        className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 border border-neutral-700 hover:border-brand/50 text-gray-400 hover:text-white text-xs font-semibold transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                                    >
                                        <Upload className="w-3 h-3" /> 교체
                                    </button>
                                </div>
                                <p className="text-sm text-gray-500 mb-6">
                                    {(videoFile.size / 1024 / 1024).toFixed(1)}MB · 컷 추출 준비 완료
                                </p>

                                {/* 감도 슬라이더 */}
                                <div className="w-full mb-6 bg-neutral-900/60 border border-neutral-800 rounded-2xl p-4">
                                    <div className="flex items-center justify-between mb-2">
                                        <span className="text-sm text-gray-400 font-medium flex items-center gap-2">
                                            <Sliders className="w-4 h-4 text-brand" />
                                            컷 감지 민감도
                                        </span>
                                        <span className="text-base font-bold text-brand tabular-nums">
                                            {threshold.toFixed(2)}
                                        </span>
                                    </div>
                                    <input
                                        type="range"
                                        min="0.05"
                                        max="0.80"
                                        step="0.01"
                                        value={threshold}
                                        onChange={(e) => setThreshold(parseFloat(e.target.value))}
                                        disabled={isWorking}
                                        className="w-full accent-brand cursor-pointer disabled:opacity-40"
                                    />
                                    <div className="flex justify-between text-xs text-gray-600 mt-1">
                                        <span>민감 (컷 많이)</span>
                                        <span>둔감 (컷 적게)</span>
                                    </div>
                                </div>

                                <button
                                    onClick={startExtraction}
                                    disabled={isWorking}
                                    className={`w-full py-5 rounded-2xl font-bold text-xl flex items-center justify-center gap-3 transition-all ${
                                        isWorking
                                            ? 'bg-neutral-800 text-gray-400 cursor-not-allowed border border-neutral-700'
                                            : 'bg-brand text-black hover:bg-[#00cc33] hover:shadow-[0_0_30px_rgba(0,255,65,0.4)] transform hover:-translate-y-1'
                                    }`}
                                >
                                    {isWorking ? (
                                        <>
                                            <Loader2 className="w-6 h-6 animate-spin text-brand" />
                                            작업 진행 중...
                                        </>
                                    ) : (
                                        <>
                                            <Zap className="w-6 h-6" /> 컷 추출 시작
                                        </>
                                    )}
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* 진행 상태 피드백 */}
            {isWorking && (
                <div className="w-full mb-10 bg-brand/5 border border-brand/20 rounded-2xl p-6 flex flex-col items-center text-center shadow-[0_0_50px_rgba(0,255,65,0.05)]">
                    <Loader2 className="w-12 h-12 text-brand animate-spin mb-4" />
                    <h3 className="text-xl font-bold text-brand mb-2">{statusMessage}</h3>
                    {progress > 0 && (
                        <div className="w-full max-w-md bg-neutral-800 rounded-full h-3 mt-4 overflow-hidden border border-neutral-700">
                            <div
                                className="bg-brand h-full rounded-full transition-all duration-300 relative overflow-hidden"
                                style={{ width: `${progress}%` }}
                            >
                                <div className="absolute inset-0 bg-white/20 w-full animate-pulse"></div>
                            </div>
                        </div>
                    )}
                </div>
            )}

            {status === 'error' && (
                <div className="w-full mb-10 bg-red-500/10 border border-red-500/20 rounded-2xl p-6 flex flex-col items-center justify-center text-center">
                    <AlertCircle className="w-12 h-12 text-red-500 mb-4" />
                    <h3 className="text-xl font-bold text-red-500">{statusMessage}</h3>
                </div>
            )}

            {/* 추출된 프레임 그리드 */}
            {frames.length > 0 && (
                <div className="w-full mb-12">
                    <div className="flex items-center justify-between mb-6 px-2">
                        <h2 className="text-2xl font-bold flex items-center gap-3 text-white">
                            <Film className="w-6 h-6 text-brand" />
                            추출된 컷 한눈에 보기
                            <span className="text-sm font-medium text-gray-500 ml-1">{frames.length}개</span>
                        </h2>
                        <button
                            onClick={downloadAllZip}
                            className="px-6 py-3 bg-neutral-800 hover:bg-neutral-700 border border-neutral-700 text-white rounded-xl text-sm font-bold flex items-center gap-2 transition-all hover:border-brand/50"
                        >
                            <Download className="w-4 h-4 text-brand" /> 전체 다운로드
                        </button>
                    </div>

                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 auto-rows-max">
                        {frames.map((frame, i) => (
                            <div key={frame.id} onClick={() => setLightboxIndex(i)} className="group bg-neutral-900 border border-neutral-800 hover:border-brand/40 transition-colors rounded-xl overflow-hidden shadow-lg fade-in-up cursor-pointer">
                                <div className="relative bg-black w-full aspect-video flex items-center justify-center overflow-hidden">
                                    <img src={frame.dataUrl} alt={`Cut ${i + 1}`} className="w-full h-full object-cover transform transition-transform duration-500 group-hover:scale-105" />
                                    <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3 backdrop-blur-[2px]">
                                        <button
                                            onClick={(e) => { e.stopPropagation(); downloadImage(frame); }}
                                            className="bg-brand text-black w-10 h-10 rounded-full flex items-center justify-center transform translate-y-2 group-hover:translate-y-0 transition-all hover:scale-110"
                                        >
                                            <Download className="w-5 h-5" />
                                        </button>
                                    </div>
                                    <div className="absolute top-2 left-2 bg-black/70 text-brand text-xs font-bold px-2 py-1 rounded backdrop-blur-md border border-brand/20">
                                        CUT #{i + 1}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            <style dangerouslySetInnerHTML={{
                __html: `
                @keyframes fadeInUp {
                    from { opacity: 0; transform: translateY(10px); }
                    to { opacity: 1; transform: translateY(0); }
                }
                .fade-in-up { animation: fadeInUp 0.4s ease-out forwards; }
            `}} />
        </div>
    );
};

export default VideoReferenceCollector;
