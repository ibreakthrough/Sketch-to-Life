import React, { useState, useRef, useCallback } from 'react';
import DrawingCanvas, { DrawingCanvasRef } from './components/DrawingCanvas';
import { generateImageFromSketch } from './services/geminiService';
import { 
  PencilIcon, 
  EraserIcon, 
  TrashIcon, 
  SparklesIcon, 
  DownloadIcon, 
  ImageIcon,
  CloseIcon,
  UndoIcon
} from './components/Icons';

function App() {
  // --- State ---
  const [prompt, setPrompt] = useState<string>('');
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Drawing tools state
  const [tool, setTool] = useState<'pencil' | 'eraser'>('pencil');
  const [color, setColor] = useState<string>('#000000');
  const [brushSize, setBrushSize] = useState<number>(4);

  // Refs
  const canvasRef = useRef<DrawingCanvasRef>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // --- Handlers ---

  const handleGenerate = async () => {
    if (!canvasRef.current) return;
    
    setIsGenerating(true);
    setError(null);
    setGeneratedImage(null);

    try {
      const imageData = canvasRef.current.getDataURL();
      const base64Data = imageData.split(',')[1]; // Remove header
      
      if (!base64Data) {
          throw new Error("Canvas is empty or invalid.");
      }

      const resultImage = await generateImageFromSketch(prompt, base64Data);
      setGeneratedImage(resultImage);
    } catch (err: any) {
      setError(err.message || "Something went wrong during generation.");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleClear = () => {
    if (confirm("Clear the entire canvas?")) {
        canvasRef.current?.clear();
    }
  };

  const handleDownload = () => {
    if (generatedImage) {
      const link = document.createElement('a');
      link.href = generatedImage;
      link.download = `sketch-to-life-${Date.now()}.png`;
      link.click();
    }
  };
  
  const handleUseAsBase = () => {
      if (generatedImage && canvasRef.current) {
          if (confirm("Use this generated image as your new base sketch? This will replace your current drawing.")) {
              canvasRef.current.loadDataURL(generatedImage);
              setGeneratedImage(null);
          }
      }
  };

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = (event) => {
            if (canvasRef.current && typeof event.target?.result === 'string') {
                canvasRef.current.loadDataURL(event.target.result);
            }
        };
        reader.readAsDataURL(file);
    }
    // Reset input so same file can be selected again if needed
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // Define preset colors
  const colors = ['#000000', '#FF0000', '#00FF00', '#0000FF', '#FFFF00', '#FF00FF', '#00FFFF', '#FFFFFF'];

  return (
    <div className="flex flex-col h-screen max-h-screen bg-zinc-950 text-zinc-100 overflow-hidden font-sans">
      
      {/* Header */}
      <header className="flex-none h-16 border-b border-zinc-800 flex items-center justify-between px-6 bg-zinc-900/50 backdrop-blur-md z-10">
        <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-lg flex items-center justify-center">
                <PencilIcon className="text-zinc-900 w-5 h-5" />
            </div>
            <h1 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-yellow-200 to-yellow-500">
                Sketch-to-Life
            </h1>
        </div>
        <div className="hidden md:flex text-xs text-zinc-500 gap-4">
            <span>Powered by iBreakthrough</span>
            <span>Drag & Drop Enabled</span>
        </div>
      </header>

      {/* Main Workspace */}
      <main className="flex-1 flex flex-col md:flex-row overflow-hidden relative">
        
        {/* Sidebar Controls */}
        <aside className="w-full md:w-80 flex-none bg-zinc-900 border-r border-zinc-800 p-4 flex flex-col gap-6 overflow-y-auto z-20">
            
            {/* Prompt Section */}
            <div className="flex flex-col gap-2">
                <label className="text-sm font-medium text-zinc-400">Instruction</label>
                <textarea 
                    className="w-full h-24 bg-zinc-950 border border-zinc-700 rounded-lg p-3 text-sm focus:ring-2 focus:ring-yellow-500 focus:outline-none resize-none placeholder-zinc-600"
                    placeholder="Describe your change or creation...&#10;e.g. 'Add a retro filter', 'Remove the person', or 'A futuristic city'"
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                />
            </div>

            {/* Drawing Tools */}
            <div className="flex flex-col gap-3">
                <label className="text-sm font-medium text-zinc-400">Tools</label>
                <div className="grid grid-cols-4 gap-2 bg-zinc-950 p-1 rounded-lg border border-zinc-800">
                    <button 
                        onClick={() => setTool('pencil')}
                        className={`flex items-center justify-center py-2 rounded-md transition-colors ${tool === 'pencil' ? 'bg-zinc-800 text-yellow-400' : 'text-zinc-500 hover:text-zinc-300'}`}
                        title="Pencil"
                    >
                        <PencilIcon className="w-5 h-5" />
                    </button>
                    <button 
                        onClick={() => setTool('eraser')}
                        className={`flex items-center justify-center py-2 rounded-md transition-colors ${tool === 'eraser' ? 'bg-zinc-800 text-yellow-400' : 'text-zinc-500 hover:text-zinc-300'}`}
                        title="Eraser"
                    >
                        <EraserIcon className="w-5 h-5" />
                    </button>
                    <button 
                        onClick={handleUploadClick}
                        className="flex items-center justify-center py-2 rounded-md text-zinc-500 hover:bg-zinc-800 hover:text-zinc-300 transition-colors"
                        title="Upload Image to Canvas"
                    >
                        <ImageIcon className="w-5 h-5" />
                    </button>
                    <button 
                        onClick={handleClear}
                        className="flex items-center justify-center py-2 rounded-md text-red-500 hover:bg-red-950/30 transition-colors"
                        title="Clear Canvas"
                    >
                        <TrashIcon className="w-5 h-5" />
                    </button>
                </div>
                <input 
                    type="file" 
                    ref={fileInputRef} 
                    onChange={handleFileChange} 
                    className="hidden" 
                    accept="image/*"
                />

                {/* Brush Size */}
                <div className="space-y-2">
                    <div className="flex justify-between text-xs text-zinc-500">
                        <span>Brush Size</span>
                        <span>{brushSize}px</span>
                    </div>
                    <input 
                        type="range" 
                        min="1" 
                        max="50" 
                        value={brushSize} 
                        onChange={(e) => setBrushSize(Number(e.target.value))}
                        className="w-full h-1 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-yellow-500"
                    />
                </div>

                {/* Colors */}
                <div className="grid grid-cols-4 gap-2">
                    {colors.map(c => (
                        <button
                            key={c}
                            onClick={() => { setTool('pencil'); setColor(c); }}
                            className={`w-full aspect-square rounded-full border-2 ${color === c && tool === 'pencil' ? 'border-yellow-500 scale-110' : 'border-zinc-700 hover:border-zinc-500'}`}
                            style={{ backgroundColor: c }}
                        />
                    ))}
                    {/* Color Picker */}
                     <label className={`relative w-full aspect-square rounded-full border-2 flex items-center justify-center cursor-pointer ${!colors.includes(color) && tool === 'pencil' ? 'border-yellow-500' : 'border-zinc-700'}`} style={{background: 'conic-gradient(from 0deg, red, yellow, lime, aqua, blue, magenta, red)'}}>
                        <input 
                            type="color" 
                            className="opacity-0 absolute inset-0 w-full h-full cursor-pointer"
                            value={color}
                            onChange={(e) => { setTool('pencil'); setColor(e.target.value); }}
                        />
                     </label>
                </div>
            </div>

            {/* Generate Action */}
            <div className="mt-auto">
                <button 
                    onClick={handleGenerate}
                    disabled={isGenerating}
                    className="w-full py-4 bg-gradient-to-r from-yellow-400 to-orange-500 text-zinc-950 font-bold rounded-xl hover:opacity-90 active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-lg shadow-orange-500/20"
                >
                    {isGenerating ? (
                        <>
                            <div className="w-5 h-5 border-2 border-zinc-900 border-t-transparent rounded-full animate-spin"></div>
                            Working...
                        </>
                    ) : (
                        <>
                            <SparklesIcon className="w-5 h-5" />
                            Generate / Edit
                        </>
                    )}
                </button>
            </div>
        </aside>

        {/* Canvas Area */}
        <div className="flex-1 bg-zinc-800 p-4 md:p-8 flex items-center justify-center relative overflow-hidden">
             {/* Background Grid Pattern */}
            <div className="absolute inset-0 opacity-10 pointer-events-none" 
                 style={{ 
                     backgroundImage: 'radial-gradient(#ffffff 1px, transparent 1px)', 
                     backgroundSize: '20px 20px' 
                 }} 
            />
            
            <div className="w-full h-full max-w-4xl max-h-[800px] shadow-2xl relative">
                <DrawingCanvas 
                    ref={canvasRef} 
                    color={color} 
                    brushSize={brushSize} 
                    tool={tool}
                    onCanvasChange={() => { /* Auto-save or state updates if needed */ }}
                />
                
                {/* Floating Hint */}
                <div className="absolute top-4 left-4 pointer-events-none bg-zinc-900/80 backdrop-blur px-3 py-1.5 rounded-full text-xs text-zinc-400 border border-zinc-700/50">
                    Draw, drop, or upload an image
                </div>
            </div>
        </div>

        {/* Generated Result Modal/Overlay */}
        {generatedImage && (
            <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
                <div className="bg-zinc-900 border border-zinc-700 rounded-2xl p-4 max-w-4xl w-full max-h-[90vh] flex flex-col shadow-2xl">
                    <div className="flex justify-between items-center mb-4">
                        <h2 className="text-lg font-bold text-white flex items-center gap-2">
                            <SparklesIcon className="text-yellow-400" />
                            Result
                        </h2>
                        <button onClick={() => setGeneratedImage(null)} className="text-zinc-400 hover:text-white p-2">
                            <CloseIcon className="w-6 h-6" />
                        </button>
                    </div>
                    
                    <div className="flex-1 overflow-hidden bg-black/50 rounded-lg flex items-center justify-center border border-zinc-800 relative">
                        <img src={generatedImage} alt="Generated" className="max-w-full max-h-full object-contain" />
                    </div>

                    <div className="flex gap-3 mt-4 justify-end">
                         <button 
                            onClick={handleUseAsBase}
                            className="px-4 py-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 flex items-center gap-2 text-sm font-medium transition-colors"
                        >
                            <UndoIcon className="w-4 h-4" />
                            Use as Base
                        </button>
                        <button 
                            onClick={handleDownload}
                            className="px-4 py-2 rounded-lg bg-yellow-500 hover:bg-yellow-400 text-zinc-900 flex items-center gap-2 text-sm font-bold transition-colors"
                        >
                            <DownloadIcon className="w-4 h-4" />
                            Download
                        </button>
                    </div>
                </div>
            </div>
        )}

        {/* Error Toast */}
        {error && (
            <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-50 bg-red-500/90 text-white px-6 py-3 rounded-full shadow-lg backdrop-blur flex items-center gap-3 animate-in slide-in-from-bottom-5">
                <span>⚠️ {error}</span>
                <button onClick={() => setError(null)} className="hover:bg-red-600 rounded-full p-1">
                    <CloseIcon className="w-4 h-4" />
                </button>
            </div>
        )}

      </main>
    </div>
  );
}

export default App;