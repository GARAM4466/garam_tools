import React, { useState } from 'react';
import { Layout, Grid, Camera, Film, ArrowRight, Sparkles } from 'lucide-react';
import ImageSplitterTool from './components/ImageSplitterTool';
import VideoReferenceCollector from './components/VideoReferenceCollector';

// --- Data ---
const tools = [
  { id: 1, title: 'AI 스토리보드', description: '텍스트나 아이디어를 입력하면 AI가 자동으로 씬을 구분해 스토리보드 스케치를 생성합니다.' },
  { id: 5, title: '이미지 그리드 분할기', description: 'Midjourney 등에서 생성된 2x2, 3x3 이미지 그리드를 개별 이미지로 빠르고 깔끔하게 분할 및 저장합니다.' },
  { id: 7, title: '카메라 스튜디오', description: '다양한 카메라 구도, 렌즈 특성, 조명 세팅에 대한 레퍼런스를 검색하고 시뮬레이션 할 수 있습니다.' },
  { id: 8, title: '비디오 레퍼런스 수집기', description: '창의적인 영상 제작을 위해 고품질 비디오 레퍼런스를 장르, 무드, 색감별로 빠르게 수집하고 관리하세요.' },
];

// --- Components ---

const Header = () => {
  return (
    <header className="fixed top-0 left-0 right-0 z-50 glass-nav">
      <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-center">
        <a href="#" className="text-xl font-bold tracking-tight">
          깨럼스
        </a>
      </div>
    </header>
  );
};

const Hero = () => {
  return (
    <section className="pt-32 pb-16 px-6 text-center max-w-4xl mx-auto">
      <div className="inline-block mb-4 px-3 py-1 rounded-full border border-brand/30 bg-brand/5 text-brand text-xs font-semibold tracking-wide uppercase">
        Platform Tools
      </div>
      <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight mb-6">
        가람 도구 모음
      </h1>
      <p className="text-lg md:text-xl text-gray-400 max-w-2xl mx-auto font-medium">
        생산성을 높이고 창의력을 발휘할 수 있는<br className="hidden sm:block" /> 다양한 AI 도구를 제공합니다.
      </p>
    </section>
  );
};

const ToolCard = ({ tool, onClick }) => {
  const getIcon = (id) => {
    switch (id) {
      case 1: return <Layout className="w-6 h-6 text-gray-300 group-hover:text-brand transition-colors" />;
      case 5: return <Grid className="w-6 h-6 text-gray-300 group-hover:text-brand transition-colors" />;
      case 7: return <Camera className="w-6 h-6 text-gray-300 group-hover:text-brand transition-colors" />;
      case 8: return <Film className="w-6 h-6 text-gray-300 group-hover:text-brand transition-colors" />;
      default: return <Layout className="w-6 h-6 text-gray-300 group-hover:text-brand transition-colors" />;
    }
  };

  return (
    <a href="#" onClick={(e) => { e.preventDefault(); onClick(); }} className="group block h-full card-hover bg-cardBg border border-cardBorder rounded-2xl p-6 relative overflow-hidden flex flex-col justify-between">
      <div className="absolute top-0 right-0 w-32 h-32 bg-brand/5 rounded-full blur-3xl -mr-10 -mt-10 transition-opacity group-hover:bg-brand/10"></div>

      <div className="relative z-10 flex flex-col h-full">
        <div>
          <div className="w-12 h-12 rounded-xl bg-neutral-800/80 border border-neutral-700 flex items-center justify-center mb-5 group-hover:border-brand/40 transition-colors">
            {getIcon(tool.id)}
          </div>
          <h3 className="text-xl font-bold mb-3 text-white group-hover:text-brand transition-colors line-clamp-1">{tool.title}</h3>
          <p className="text-sm text-gray-400 leading-relaxed mb-6 line-clamp-3">
            {tool.description}
          </p>
        </div>

        <div className="mt-auto flex items-center font-semibold text-sm text-brand/80 group-hover:text-brand transition-colors">
          시작하기 <ArrowRight className="w-4 h-4 ml-1 transform group-hover:translate-x-1 transition-transform" />
        </div>
      </div>
    </a>
  );
};

const ToolGrid = ({ onToolClick }) => {
  return (
    <section className="px-6 pb-24 max-w-7xl mx-auto w-full flex-grow">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {tools.map(tool => (
          <ToolCard key={tool.id} tool={tool} onClick={() => onToolClick(tool.id)} />
        ))}
      </div>
    </section>
  );
};

const Footer = () => {
  return (
    <footer className="py-12 flex justify-center items-center mt-auto border-t border-white/5">
      <div className="flex items-center gap-2 px-6 py-3 rounded-full bg-neutral-900 border border-neutral-800 shadow-sm text-sm text-gray-400 font-medium hover:border-brand/30 transition-colors cursor-pointer">
        <Sparkles className="w-4 h-4 text-brand" />
        더 많은 도구가 곧 추가됩니다
      </div>
    </footer>
  );
};

const App = () => {
  const [currentTool, setCurrentTool] = useState(null);

  return (
    <div className="antialiased min-h-screen flex flex-col font-sans">
      <Header />
      <main className="flex-grow flex flex-col mt-16">
        {currentTool === 5 ? (
          <ImageSplitterTool onBack={() => setCurrentTool(null)} />
        ) : currentTool === 8 ? (
          <VideoReferenceCollector onBack={() => setCurrentTool(null)} />
        ) : (
          <>
            <Hero />
            <ToolGrid onToolClick={setCurrentTool} />
          </>
        )}
      </main>
      <Footer />
    </div>
  );
};

export default App;
