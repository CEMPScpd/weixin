import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom/client';
// 🔴 修复点1：删掉了 Schema，只保留真正有用的 GoogleGenAI 和 Type
import { GoogleGenAI, Type } from "@google/genai";

// ==========================================
// 1. 配置区域
// ==========================================
// ⚠️⚠️⚠️ 别忘了把你的 Key 填在引号里 ⚠️⚠️⚠️
const API_KEY = "AIzaSyB57y6IZ1OOcD-bSg5QV675FBYcOjYtWoA"; 
const MODEL_NAME = "gemini-1.5-flash"; 

// ==========================================
// 2. 类型定义
// ==========================================
enum AppView { HOME = 'HOME', LIBRARY = 'LIBRARY', QUIZ = 'QUIZ', FAVORITES = 'FAVORITES' }
enum QuizType { GUESS_MEANING = 'GUESS_MEANING', GUESS_SOURCE = 'GUESS_SOURCE' }

interface Quote {
  id: string; content: string; author: string; source: string;
  translation: string; usage: string; tags: string[];
}

interface QuizQuestion {
  id: string; type: QuizType; question: string;
  options: string[]; correctIndex: number; explanation: string;
}

// ==========================================
// 3. API 服务
// ==========================================
const ai = new GoogleGenAI({ apiKey: API_KEY });

// 🔴 修复点2：去掉了 ": Schema" 类型标注，让它自动识别
const quoteSchema = {
  type: Type.ARRAY,
  items: {
    type: Type.OBJECT,
    properties: {
      content: { type: Type.STRING }, author: { type: Type.STRING },
      source: { type: Type.STRING }, translation: { type: Type.STRING },
      usage: { type: Type.STRING }, tags: { type: Type.ARRAY, items: { type: Type.STRING } }
    },
    required: ["content", "author", "source", "translation", "usage", "tags"]
  }
};

const quizSchema = {
  type: Type.OBJECT,
  properties: {
    question: { type: Type.STRING }, options: { type: Type.ARRAY, items: { type: Type.STRING } },
    correctIndex: { type: Type.INTEGER }, explanation: { type: Type.STRING }
  },
  required: ["question", "options", "correctIndex", "explanation"]
};

const fetchRandomQuotes = async (count: number = 5): Promise<Quote[]> => {
  try {
    const res = await ai.models.generateContent({
      model: MODEL_NAME,
      contents: `Generate ${count} profound Classical Chinese quotes. JSON format.`,
      config: { responseMimeType: "application/json", responseSchema: quoteSchema }
    });
    const text = res.text();
    if (!text) return [];
    const data = JSON.parse(text);
    return data.map((item: any) => ({ ...item, id: Math.random().toString(36).substr(2, 9) }));
  } catch (e) {
    console.error(e);
    return [];
  }
};

const generateQuizQuestion = async (): Promise<QuizQuestion | null> => {
  try {
    const type = Math.random() > 0.5 ? QuizType.GUESS_MEANING : QuizType.GUESS_SOURCE;
    const prompt = type === QuizType.GUESS_MEANING 
      ? "Generate a multiple-choice question: identify MODERN TRANSLATION of a classical sentence." 
      : "Generate a question: identify SOURCE/AUTHOR of a classical sentence.";
      
    const res = await ai.models.generateContent({
      model: MODEL_NAME,
      contents: prompt,
      config: { responseMimeType: "application/json", responseSchema: quizSchema }
    });
    const text = res.text();
    if (!text) return null;
    return { id: Math.random().toString(36).substr(2, 9), type, ...JSON.parse(text) };
  } catch (e) {
    console.error(e);
    return null;
  }
};

// ==========================================
// 4. 组件 (图标 & 卡片)
// ==========================================
const Icons = {
  Refresh: () => <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/><path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16"/><path d="M16 21h5v-5"/></svg>,
  Home: ({active}: {active:boolean}) => <svg className={`w-6 h-6 ${active?'stroke-2':'stroke-1'}`} viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>,
  Book: ({active}: {active:boolean}) => <svg className={`w-6 h-6 ${active?'stroke-2':'stroke-1'}`} viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/></svg>,
  Quiz: () => <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 10v6M2 10l10-5 10 5-10 5z"/><path d="M6 12v5c3 3 9 3 12 0v-5"/></svg>,
  Heart: ({active}: {active:boolean}) => <svg className={`w-6 h-6 ${active?'stroke-2':'stroke-1'}`} viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/></svg>
};

const QuoteCard: React.FC<{ quote: Quote, isFavorite: boolean, onToggle: (q: Quote) => void }> = ({ quote, isFavorite, onToggle }) => (
  <div className="bg-white p-6 rounded-sm shadow-lg border border-stone-200 relative overflow-hidden mb-4">
    <button onClick={() => onToggle(quote)} className={`absolute top-4 right-4 ${isFavorite ? 'text-red-800' : 'text-stone-300'}`}>
      <Icons.Heart active={isFavorite} />
    </button>
    <div className="text-2xl font-serif text-stone-900 leading-loose border-l-2 border-red-800 pl-4 py-2 mb-4">
      {quote.content}
    </div>
    <div className="text-right mb-4">
      <div className="font-bold font-serif">—— {quote.author}</div>
      <div className="text-xs italic text-stone-500">《{quote.source}》</div>
    </div>
    <div className="border-t border-stone-100 pt-3 space-y-2">
      <p className="text-sm text-stone-600">
        <span className="bg-stone-100 px-1 rounded mr-2 text-xs">译</span>{quote.translation}
      </p>
    </div>
  </div>
);

// ==========================================
// 5. 主程序
// ==========================================
const App = () => {
  const [view, setView] = useState<AppView>(AppView.HOME);
  const [favorites, setFavorites] = useState<Quote[]>(() => {
    try { return JSON.parse(localStorage.getItem('favs') || '[]'); } catch { return []; }
  });
  const [dailyQ, setDailyQ] = useState<Quote | null>(null);
  const [libQ, setLibQ] = useState<Quote[]>([]);
  const [quizQ, setQuizQ] = useState<QuizQuestion | null>(null);
  const [loading, setLoading] = useState(false);
  const [score, setScore] = useState(0);

  const toggleFav = (q: Quote) => {
    const newFavs = favorites.find(f => f.content === q.content) 
      ? favorites.filter(f => f.content !== q.content) 
      : [q, ...favorites];
    setFavorites(newFavs);
    localStorage.setItem('favs', JSON.stringify(newFavs));
  };

  useEffect(() => {
    const init = async () => {
      if (!dailyQ) {
        const res = await fetchRandomQuotes(1);
        if (res.length) setDailyQ(res[0]);
      }
    };
    init();
  }, []);

  const loadLib = async () => {
    setLoading(true);
    const newQuotes = await fetchRandomQuotes(5);
    setLibQ(prev => [...prev, ...newQuotes]); 
    setLoading(false);
  };

  const loadQuiz = async () => {
    setLoading(true);
    const q = await generateQuizQuestion();
    setQuizQ(q);
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-[#f5f5f4] pb-20 max-w-xl mx-auto relative font-serif text-stone-800">
      <main className="p-4 pt-10 min-h-[80vh]">
        {view === AppView.HOME && (
          <div className="text-center mt-10 space-y-6">
            <h1 className="text-5xl mb-2">文心</h1>
            <p className="text-xs tracking-[0.3em] text-stone-500 uppercase">Daily Wisdom</p>
            {dailyQ ? (
              <QuoteCard quote={dailyQ} isFavorite={favorites.some(f=>f.content===dailyQ.content)} onToggle={toggleFav} />
            ) : (
              <div className="animate-pulse">研磨中...</div>
            )}
            <button onClick={() => { setDailyQ(null); window.location.reload(); }} className="text-sm text-stone-500 flex items-center justify-center gap-2">
              <Icons.Refresh/>换一句
            </button>
          </div>
        )}
        
        {view === AppView.LIBRARY && (
          <div>
            <h2 className="text-2xl font-bold mb-6 border-l-4 border-red-800 pl-3">文库</h2>
            {libQ.map((q,i)=><QuoteCard key={i} quote={q} isFavorite={favorites.some(f=>f.content===q.content)} onToggle={toggleFav}/>)}
            <button onClick={loadLib} disabled={loading} className="w-full py-3 bg-stone-800 text-white mt-4">
              {loading?'...':'加载更多'}
            </button>
          </div>
        )}
        
        {view === AppView.QUIZ && (
          <div>
            <h2 className="text-2xl font-bold mb-6 border-l-4 border-red-800 pl-3">自测 (分: {score})</h2>
            {!quizQ && !loading && <button onClick={loadQuiz} className="w-full py-10 border-2 border-dashed">开始测试</button>}
            {loading && <div>出题中...</div>}
            {quizQ && !loading && (
              <div>
                <div className="bg-white p-6 mb-4 shadow"><h3 className="text-lg">{quizQ.question}</h3></div>
                {quizQ.options.map((o,i)=>(
                  <button key={i} onClick={()=>{
                    if(i===quizQ.correctIndex) setScore(s=>s+1); 
                    alert(i===quizQ.correctIndex?'正确':'错误'); 
                    loadQuiz();
                  }} className="w-full p-4 border mb-2 text-left bg-white">
                    {['A','B','C','D'][i]}. {o}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
        
        {view === AppView.FAVORITES && (
          <div>
            <h2 className="text-2xl font-bold mb-6 border-l-4 border-red-800 pl-3">收藏</h2>
            {favorites.map((q,i)=><QuoteCard key={i} quote={q} isFavorite={true} onToggle={toggleFav}/>)}
          </div>
        )}
      </main>
      
      <nav className="fixed bottom-0 w-full bg-[#fcfaf8] border-t h-16 flex justify-around items-center text-[10px] text-stone-400 max-w-xl">
        <button onClick={()=>setView(AppView.HOME)} className={`flex flex-col items-center ${view===AppView.HOME?'text-stone-900':''}`}>
          <Icons.Home active={view===AppView.HOME}/>每日
        </button>
        <button onClick={()=>{setView(AppView.LIBRARY);if(!libQ.length)loadLib()}} className={`flex flex-col items-center ${view===AppView.LIBRARY?'text-stone-900':''}`}>
          <Icons.Book active={view===AppView.LIBRARY}/>文库
        </button>
        <button onClick={()=>setView(AppView.QUIZ)} className={`flex flex-col items-center ${view===AppView.QUIZ?'text-stone-900':''}`}>
          <div className={`p-3 -mt-6 rounded-full border-4 border-[#f5f5f4] ${view===AppView.QUIZ?'bg-red-800 text-white':'bg-stone-800 text-stone-200'}`}>
            <Icons.Quiz/>
          </div>自测
        </button>
        <button onClick={()=>setView(AppView.FAVORITES)} className={`flex flex-col items-center ${view===AppView.FAVORITES?'text-stone-900':''}`}>
          <Icons.Heart active={view===AppView.FAVORITES}/>收藏
        </button>
      </nav>
    </div>
  );
};

// 渲染
ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);