import React, { useState, useRef, useCallback } from 'react';
import { Upload, X, Download, Grid, Image as ImageIcon, ArchiveRestore, ArrowLeft } from 'lucide-react';
import JSZip from 'jszip';

const ImageSplitterTool = ({ onBack }) => {
    const [imageSrc, setImageSrc] = useState(null);
    const [fileName, setFileName] = useState('');
    const [gridSize, setGridSize] = useState({ rows: 2, cols: 2 });
    const [slices, setSlices] = useState([]);
    const [isProcessing, setIsProcessing] = useState(false);
    const fileInputRef = useRef(null);
    const canvasRef = useRef(null);

    const handleFileChange = (e) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setFileName(file.name);
        const reader = new FileReader();
        reader.onload = (event) => {
            setImageSrc(event.target.result);
            setSlices([]); // Reset slices when a new image is loaded
        };
        reader.readAsDataURL(file);
    };

    const handleDrop = useCallback((e) => {
        e.preventDefault();
        const file = e.dataTransfer.files?.[0];
        if (file && file.type.startsWith('image/')) {
            setFileName(file.name);
            const reader = new FileReader();
            reader.onload = (event) => {
                setImageSrc(event.target.result);
                setSlices([]);
            };
            reader.readAsDataURL(file);
        }
    }, []);

    const clearImage = () => {
        setImageSrc(null);
        setFileName('');
        setSlices([]);
        if (fileInputRef.current) fileInputRef.current.value = '';
    };

    const splitImage = () => {
        if (!imageSrc) return;
        setIsProcessing(true);

        const img = new Image();
        img.onload = () => {
            const { rows, cols } = gridSize;
            const sliceWidth = img.width / cols;
            const sliceHeight = img.height / rows;

            const newSlices = [];
            const tempCanvas = document.createElement('canvas');
            const ctx = tempCanvas.getContext('2d');
            tempCanvas.width = sliceWidth;
            tempCanvas.height = sliceHeight;

            let processedCount = 0;
            const totalSlices = rows * cols;

            for (let r = 0; r < rows; r++) {
                for (let c = 0; c < cols; c++) {
                    ctx.clearRect(0, 0, sliceWidth, sliceHeight);
                    ctx.drawImage(
                        img,
                        c * sliceWidth, r * sliceHeight, sliceWidth, sliceHeight, // Source
                        0, 0, sliceWidth, sliceHeight // Destination
                    );

                    // Convert to dataURL (high quality PNG or JPEG to save space)
                    const dataUrl = tempCanvas.toDataURL('image/png');
                    newSlices.push({
                        id: `${r}-${c}`,
                        dataUrl,
                        name: `${fileName.replace(/\.[^/.]+$/, '')}_part_${r + 1}_${c + 1}.png`
                    });

                    processedCount++;
                    if (processedCount === totalSlices) {
                        setSlices(newSlices);
                        setIsProcessing(false);
                    }
                }
            }
        };
        img.src = imageSrc;
    };

    const downloadSlice = (slice) => {
        const link = document.createElement('a');
        link.href = slice.dataUrl;
        link.download = slice.name;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const downloadAllZip = async () => {
        if (slices.length === 0) return;

        const zip = new JSZip();
        const folder = zip.folder("split_images");

        slices.forEach((slice) => {
            // dataUrl looks like "data:image/png;base64,iVBORw0KGgo..."
            const base64Data = slice.dataUrl.split(',')[1];
            folder.file(slice.name, base64Data, { base64: true });
        });

        const content = await zip.generateAsync({ type: "blob" });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(content);
        link.download = `${fileName.replace(/\.[^/.]+$/, '')}_all_splits.zip`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    // Define grid layout option styles dynamically based on selection
    const gridOptions = [
        { label: '2x2 (4장)', rows: 2, cols: 2 },
        { label: '2x3 (6장)', rows: 2, cols: 3 },
        { label: '3x2 (6장)', rows: 3, cols: 2 },
    ];

    return (
        <div className="max-w-6xl mx-auto px-6 py-12 flex flex-col min-h-screen">
            <button
                onClick={onBack}
                className="self-start flex items-center text-gray-400 hover:text-white transition-colors mb-8 group"
            >
                <ArrowLeft className="w-5 h-5 mr-2 transform group-hover:-translate-x-1 transition-transform" />
                도구 모음으로 돌아가기
            </button>

            <div className="mb-10 text-center max-w-2xl mx-auto">
                <h1 className="text-4xl font-extrabold tracking-tight mb-4 flex items-center justify-center gap-3">
                    <Grid className="w-10 h-10 text-brand" />
                    이미지 그리드 분할기
                </h1>
                <p className="text-lg text-gray-400 font-medium leading-relaxed">
                    Midjourney 등에서 생성된 그리드 이미지를 업로드하면,<br />
                    지정한 칸 수에 맞춰 개별 이미지로 빠르고 깔끔하게 잘라줍니다.
                </p>
            </div>

            <div className="grid lg:grid-cols-2 gap-8 flex-grow">
                {/* Left Column: Upload & Controls */}
                <div className="flex flex-col gap-6">
                    <div className="bg-cardBg border border-cardBorder rounded-3xl p-6 shadow-xl">
                        <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
                            <Upload className="w-5 h-5 text-brand" />
                            이미지 업로드
                        </h2>

                        {!imageSrc ? (
                            <div
                                className="border-2 border-dashed border-neutral-700 bg-neutral-900/50 hover:bg-neutral-800/50 hover:border-brand/50 rounded-2xl h-80 flex flex-col items-center justify-center text-center p-6 transition-all duration-300 cursor-pointer"
                                onDragOver={(e) => e.preventDefault()}
                                onDrop={handleDrop}
                                onClick={() => fileInputRef.current?.click()}
                            >
                                <div className="w-16 h-16 bg-neutral-800 rounded-full flex items-center justify-center mb-4 text-brand shadow-lg shadow-brand/10">
                                    <ImageIcon className="w-8 h-8" />
                                </div>
                                <h3 className="text-lg font-semibold text-white mb-2">클릭하거나 이미지를 드래그 앤 드롭하세요</h3>
                                <p className="text-sm text-gray-400 max-w-xs">PNG, JPG, WEBP 지원 (고해상도 이미지 권장)</p>
                                <input
                                    type="file"
                                    ref={fileInputRef}
                                    onChange={handleFileChange}
                                    accept="image/*"
                                    className="hidden"
                                />
                            </div>
                        ) : (
                            <div className="relative rounded-2xl overflow-hidden bg-black/50 border border-neutral-800 group h-80 flex items-center justify-center">
                                <img
                                    src={imageSrc}
                                    alt="Uploaded preview"
                                    className="max-h-full max-w-full object-contain"
                                />
                                <button
                                    onClick={clearImage}
                                    className="absolute top-4 right-4 bg-red-500/20 hover:bg-red-500 text-red-500 hover:text-white p-2 rounded-full backdrop-blur-md transition-all z-10"
                                    title="이미지 지우기"
                                >
                                    <X className="w-5 h-5" />
                                </button>
                            </div>
                        )}
                    </div>

                    <div className="bg-cardBg border border-cardBorder rounded-3xl p-6 shadow-xl opacity-100 flex-grow flex flex-col transition-all">
                        <h2 className="text-xl font-bold mb-5 text-white">행/열 설정</h2>

                        <div className="grid grid-cols-3 gap-3 mb-6">
                            {gridOptions.map((opt, idx) => {
                                const isSelected = gridSize.rows === opt.rows && gridSize.cols === opt.cols;
                                return (
                                    <button
                                        key={idx}
                                        onClick={() => setGridSize({ rows: opt.rows, cols: opt.cols })}
                                        className={`py-3 px-2 rounded-xl border text-sm font-semibold transition-all ${isSelected
                                            ? 'bg-brand/10 border-brand text-brand shadow-[0_0_15px_rgba(0,255,65,0.15)]'
                                            : 'bg-neutral-800 border-neutral-700 text-gray-300 hover:bg-neutral-700 hover:border-gray-500'
                                            }`}
                                    >
                                        {opt.label}
                                    </button>
                                );
                            })}
                        </div>

                        <button
                            onClick={splitImage}
                            disabled={!imageSrc || isProcessing}
                            className={`mt-auto w-full py-4 rounded-xl font-bold text-lg flex items-center justify-center gap-2 transition-all ${!imageSrc
                                ? 'bg-neutral-800 text-neutral-500 cursor-not-allowed'
                                : 'bg-brand text-black hover:bg-[#00cc33] hover:shadow-[0_0_20px_rgba(0,255,65,0.3)] transform hover:-translate-y-1'
                                }`}
                        >
                            {isProcessing ? (
                                <>처리 중...</>
                            ) : (
                                <>
                                    <Grid className="w-5 h-5" /> 분할하기
                                </>
                            )}
                        </button>
                    </div>
                </div>

                {/* Right Column: Results Grid */}
                <div className="bg-cardBg border border-cardBorder rounded-3xl p-6 shadow-xl min-h-[500px] flex flex-col">
                    <div className="flex items-center justify-between mb-6">
                        <h2 className="text-xl font-bold flex items-center gap-2">
                            <ArchiveRestore className="w-5 h-5 text-brand" />
                            결과물
                        </h2>

                        {slices.length > 0 && (
                            <button
                                onClick={downloadAllZip}
                                className="px-4 py-2 bg-neutral-800 hover:bg-neutral-700 border border-neutral-700 hover:border-brand/50 text-white rounded-lg text-sm font-semibold flex items-center gap-2 transition-all group"
                            >
                                <Download className="w-4 h-4 text-brand group-hover:scale-110 transition-transform" />
                                전체 다운로드 (ZIP)
                            </button>
                        )}
                    </div>

                    {!slices.length ? (
                        <div className="flex-grow border-2 border-dashed border-neutral-800 bg-neutral-900/30 rounded-2xl flex flex-col items-center justify-center text-center p-6 text-neutral-500">
                            <Grid className="w-16 h-16 mb-4 opacity-20" />
                            <p>이미지를 업로드하고 분할 버튼을 누르면<br />여기에 결과가 표시됩니다.</p>
                        </div>
                    ) : (
                        <div className="grid gap-4 overflow-y-auto pr-2 custom-scrollbar" style={{ gridTemplateColumns: `repeat(${gridSize.cols}, minmax(0, 1fr))` }}>
                            {slices.map((slice) => (
                                <div key={slice.id} className="relative group rounded-xl overflow-hidden border border-neutral-800 bg-black aspect-square flex items-center justify-center">
                                    <img src={slice.dataUrl} alt={`Slice ${slice.id}`} className="max-w-full max-h-full object-contain" />

                                    {/* Hover Overlay */}
                                    <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center backdrop-blur-sm">
                                        <button
                                            onClick={() => downloadSlice(slice)}
                                            className="bg-brand text-black px-4 py-2 rounded-full font-bold text-sm flex items-center gap-2 transform translate-y-4 group-hover:translate-y-0 transition-all duration-300 hover:scale-105 hover:bg-white"
                                        >
                                            <Download className="w-4 h-4" /> 다운로드
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* Hidden canvas for processing */}
            <canvas ref={canvasRef} style={{ display: 'none' }} />
        </div>
    );
};

export default ImageSplitterTool;
