import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence, useDragControls } from 'framer-motion';
import { 
  Plus, 
  Minus,
  Type, 
  Table as TableIcon, 
  Image as ImageIcon, 
  Square, 
  Code as CodeIcon, 
  Network, 
  Play, 
  Pause, 
  ChevronLeft, 
  ChevronRight, 
  Settings, 
  Download, 
  Sparkles, 
  Trash2, 
  Layers,
  Layout,
  Maximize2,
  Minimize2,
  Clock,
  Save,
  Share2,
  Terminal,
  Eye,
  X,
  PenTool,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Bold,
  Italic,
  Undo,
  Redo,
  Type as TypeIcon,
  EyeOff,
  Lock,
  Unlock,
  Grid,
  History,
  MousePointer2,
  Circle as CircleIcon,
  Eraser,
  Copy,
  Sun,
  Moon,
  Video,
  Music,
  Mic,
  Volume2,
  VolumeX,
  UploadCloud
} from 'lucide-react';
import LZString from 'lz-string';
import { Project, Scene, Episode, VideoElement, AspectRatio, ElementType, ImageElement, ShapeElement, DiagramElement, DrawingPath, CodeElement, DiagramLayer, DiagramFrame, AnimationConfig, SceneAudio } from './types';
import { cn } from './utils';
import { generateVideoStructure } from './geminiService';
import * as pdfjs from 'pdfjs-dist';

// Configure PDF.js worker
pdfjs.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.min.js`;

const extractTextFromPDF = async (file: File): Promise<string> => {
  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjs.getDocument({ data: arrayBuffer }).promise;
  let fullText = '';
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const textContent = await page.getTextContent();
    const pageText = textContent.items.map((item: any) => item.str).join(' ');
    fullText += pageText + '\n';
  }
  return fullText;
};

// --- Components ---

// ─── Toast Notification System ───────────────────────────────────────────────

type ToastType = 'success' | 'error' | 'info' | 'warning';
interface Toast { id: string; message: string; type: ToastType; }

const ToastContext = React.createContext<{
  showToast: (message: string, type?: ToastType) => void;
}>({ showToast: () => {} });

const useToast = () => React.useContext(ToastContext);

const ToastProvider = ({ children }: { children: React.ReactNode }) => {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const showToast = (message: string, type: ToastType = 'info') => {
    const id = Math.random().toString(36).substring(2, 11);
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 3500);
  };

  const icons: Record<ToastType, string> = {
    success: '✓', error: '✕', info: 'ℹ', warning: '⚠'
  };
  const colors: Record<ToastType, string> = {
    success: 'bg-emerald-500',
    error: 'bg-red-500',
    info: 'bg-zinc-700',
    warning: 'bg-amber-500'
  };

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[9999] flex flex-col items-center gap-2 pointer-events-none">
        <AnimatePresence>
          {toasts.map(toast => (
            <motion.div
              key={toast.id}
              initial={{ opacity: 0, y: 20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -10, scale: 0.95 }}
              className={cn(
                "flex items-center gap-3 px-4 py-2.5 rounded-xl shadow-2xl text-white text-sm font-medium max-w-sm pointer-events-auto",
                colors[toast.type]
              )}
            >
              <span className="font-bold text-base leading-none">{icons[toast.type]}</span>
              <span>{toast.message}</span>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
};

const Navbar = ({ 
  project, 
  setProject, 
  onExport, 
  onToggleAI,
  onTogglePreview,
  onToggleCode,
  hideTools,
  setHideTools,
  onUndo,
  onRedo,
  canUndo,
  canRedo,
  theme,
  setTheme,
  onShare,
  onDownload,
  isRecording,
  recordingProgress
}: { 
  project: Project; 
  setProject: React.Dispatch<React.SetStateAction<Project>>; 
  onExport: () => void;
  onToggleAI: () => void;
  onTogglePreview: () => void;
  onToggleCode: () => void;
  hideTools: boolean;
  setHideTools: (hide: boolean) => void;
  onUndo: () => void;
  onRedo: () => void;
  canUndo: boolean;
  canRedo: boolean;
  theme: 'light' | 'dark';
  setTheme: (theme: 'light' | 'dark') => void;
  onShare: () => void;
  onDownload: () => void;
  isRecording: boolean;
  recordingProgress: number;
  onOpenDiagramEditor?: () => void;
}) => {
  return (
    <nav className={cn(
      "h-14 border-b flex items-center justify-between px-4 z-50 transition-colors duration-300",
      theme === 'dark' ? "bg-zinc-950 border-white/10" : "bg-white border-zinc-200"
    )}>
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-emerald-500 flex items-center justify-center">
            <Layers className="text-black w-5 h-5" />
          </div>
          <span className={cn(
            "font-bold text-lg tracking-tight",
            theme === 'dark' ? "text-white" : "text-zinc-900"
          )}>ExplainMotion</span>
        </div>
        <div className={cn("h-6 w-[1px] mx-2", theme === 'dark' ? "bg-white/10" : "bg-zinc-200")} />
        <div className="flex items-center gap-1 mr-2">
          <button 
            onClick={onUndo}
            disabled={!canUndo}
            className={cn(
              "p-1.5 rounded transition-all",
              theme === 'dark' ? "hover:bg-white/5 text-zinc-400 hover:text-white" : "hover:bg-zinc-100 text-zinc-500 hover:text-zinc-900",
              "disabled:opacity-20 disabled:cursor-not-allowed"
            )}
            title="Undo (Ctrl+Z)"
          >
            <Undo className="w-4 h-4" />
          </button>
          <button 
            onClick={onRedo}
            disabled={!canRedo}
            className={cn(
              "p-1.5 rounded transition-all",
              theme === 'dark' ? "hover:bg-white/5 text-zinc-400 hover:text-white" : "hover:bg-zinc-100 text-zinc-500 hover:text-zinc-900",
              "disabled:opacity-20 disabled:cursor-not-allowed"
            )}
            title="Redo (Ctrl+Y)"
          >
            <Redo className="w-4 h-4" />
          </button>
        </div>
        <input 
          value={project.name}
          onChange={(e) => setProject(prev => ({ ...prev, name: e.target.value }))}
          className={cn(
            "bg-transparent border-none focus:ring-0 font-medium transition-colors",
            theme === 'dark' ? "text-zinc-400 hover:text-white" : "text-zinc-500 hover:text-zinc-900"
          )}
        />
      </div>

      <div className="flex items-center gap-3">
        <button 
          onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
          className={cn(
            "p-2 rounded-md transition-all",
            theme === 'dark' ? "hover:bg-white/5 text-zinc-400 hover:text-white" : "hover:bg-zinc-100 text-zinc-500 hover:text-zinc-900"
          )}
          title={theme === 'dark' ? "Switch to Light Mode" : "Switch to Night Mode"}
        >
          {theme === 'dark' ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
        </button>

        <button 
          onClick={() => setHideTools(!hideTools)}
          className={cn(
            "p-2 rounded-md transition-all",
            hideTools ? "bg-emerald-500 text-black" : (theme === 'dark' ? "hover:bg-white/5 text-zinc-400 hover:text-white" : "hover:bg-zinc-100 text-zinc-500 hover:text-zinc-900")
          )}
          title={hideTools ? "Show Tools" : "Hide Tools"}
        >
          {hideTools ? <Maximize2 className="w-5 h-5" /> : <Minimize2 className="w-5 h-5" />}
        </button>

        <button 
          onClick={onToggleCode}
          className={cn(
            "p-2 rounded-md transition-all",
            theme === 'dark' ? "hover:bg-white/5 text-zinc-400 hover:text-white" : "hover:bg-zinc-100 text-zinc-500 hover:text-zinc-900"
          )}
          title="Code Mode"
        >
          <Terminal className="w-5 h-5" />
        </button>
        
        <select 
          value={project.aspectRatio}
          onChange={(e) => setProject(prev => ({ ...prev, aspectRatio: e.target.value as AspectRatio }))}
          className={cn(
            "border rounded-md px-2 py-1 text-xs focus:outline-none transition-colors",
            theme === 'dark' ? "bg-zinc-900 border-white/10 text-zinc-300" : "bg-white border-zinc-200 text-zinc-700"
          )}
        >
          <option value="16:9">16:9 (YouTube)</option>
          <option value="9:16">9:16 (TikTok)</option>
          <option value="1:1">1:1 (Instagram)</option>
        </select>
        
        <button 
          onClick={onToggleAI}
          className="flex items-center gap-2 px-3 py-1.5 rounded-md bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/20 transition-all text-sm font-medium"
        >
          <Sparkles className="w-4 h-4" />
          AI Assistant
        </button>

        <button 
          onClick={onTogglePreview}
          className={cn(
            "flex items-center gap-2 px-3 py-1.5 rounded-md transition-all text-sm font-bold",
            theme === 'dark' ? "bg-zinc-800 text-white hover:bg-zinc-700" : "bg-zinc-100 text-zinc-900 hover:bg-zinc-200"
          )}
        >
          <Eye className="w-4 h-4" />
          Preview
        </button>

        <button 
          onClick={onShare}
          className={cn(
            "flex items-center gap-2 px-3 py-1.5 rounded-md transition-all text-sm font-bold",
            theme === 'dark' ? "bg-zinc-800 text-white hover:bg-zinc-700" : "bg-zinc-100 text-zinc-900 hover:bg-zinc-200"
          )}
          title="Share Link"
        >
          <Share2 className="w-4 h-4" />
          Share
        </button>

        <button 
          onClick={onDownload}
          disabled={isRecording}
          className="relative flex items-center gap-2 px-3 py-1.5 rounded-md bg-emerald-500 text-black hover:bg-emerald-400 disabled:opacity-80 disabled:cursor-wait transition-all text-sm font-bold overflow-hidden min-w-[130px] justify-center"
        >
          {isRecording && (
            <div
              className="absolute inset-0 bg-emerald-300 transition-all duration-300"
              style={{ width: `${recordingProgress}%` }}
            />
          )}
          <span className="relative flex items-center gap-2">
            {isRecording ? (
              <>
                <div className="w-3 h-3 rounded-full bg-red-600 animate-pulse" />
                Recording {recordingProgress}%
              </>
            ) : (
              <>
                <Download className="w-4 h-4" />
                Export Video
              </>
            )}
          </span>
        </button>
      </div>
    </nav>
  );
};

const Sidebar = ({ onAddElement, theme, onToggleCanvasSettings }: { onAddElement: (type: ElementType) => void, theme: 'light' | 'dark', onToggleCanvasSettings: () => void }) => {
  const elements = [
    { type: 'text', icon: TypeIcon, label: 'Text' },
    { type: 'table', icon: TableIcon, label: 'Table' },
    { type: 'diagram', icon: Network, label: 'Diagram' },
    { type: 'code', icon: Terminal, label: 'Code' },
    { type: 'image', icon: ImageIcon, label: 'Image' },
    { type: 'video', icon: Video, label: 'Video' },
    { type: 'shape', icon: Square, label: 'Shape' },
  ];

  return (
    <aside className={cn(
      "w-16 border-r flex flex-col items-center py-4 gap-6 transition-colors duration-300 overflow-y-auto",
      theme === 'dark' ? "bg-zinc-950 border-white/10" : "bg-white border-zinc-200"
    )}>
      {elements.map((el) => (
        <button
          key={el.type}
          onClick={() => onAddElement(el.type as ElementType)}
          className={cn(
            "group relative flex flex-col items-center gap-1 transition-colors",
            theme === 'dark' ? "text-zinc-500 hover:text-white" : "text-zinc-400 hover:text-zinc-900"
          )}
          title={el.label}
        >
          <div className={cn(
            "w-10 h-10 rounded-xl flex items-center justify-center transition-all border",
            theme === 'dark' 
              ? "bg-zinc-900 border-white/5 group-hover:bg-zinc-800 group-hover:border-white/20" 
              : "bg-zinc-50 border-zinc-200 group-hover:bg-zinc-100 group-hover:border-zinc-300"
          )}>
            <el.icon className="w-5 h-5" />
          </div>
          <span className="text-[10px] font-medium uppercase tracking-wider opacity-0 group-hover:opacity-100 transition-opacity">
            {el.label}
          </span>
        </button>
      ))}

      <div className="mt-auto pt-4 border-t border-white/5 w-full flex flex-col items-center gap-6">
        <button 
          onClick={onToggleCanvasSettings}
          className={cn(
            "group relative flex flex-col items-center gap-1 transition-colors",
            theme === 'dark' ? "text-zinc-500 hover:text-white" : "text-zinc-400 hover:text-zinc-900"
          )}
          title="Canvas Settings"
        >
          <div className={cn(
            "w-10 h-10 rounded-xl flex items-center justify-center transition-all border",
            theme === 'dark' 
              ? "bg-zinc-900 border-white/5 group-hover:bg-zinc-800 group-hover:border-white/20" 
              : "bg-zinc-50 border-zinc-200 group-hover:bg-zinc-100 group-hover:border-zinc-300"
          )}>
            <Settings className="w-5 h-5" />
          </div>
          <span className="text-[10px] font-medium uppercase tracking-wider opacity-0 group-hover:opacity-100 transition-opacity">
            Canvas
          </span>
        </button>
      </div>
    </aside>
  );
};

const ResizeHandle = ({ 
  onResize,
  onResizeEnd,
  position 
}: { 
  onResize: (dx: number, dy: number) => void;
  onResizeEnd?: () => void;
  position: 'nw' | 'ne' | 'sw' | 'se' | 'n' | 's' | 'e' | 'w' 
}) => {
  const handleMouseDown = (e: React.MouseEvent) => {
    e.stopPropagation();
    const startX = e.clientX;
    const startY = e.clientY;

    const onMouseMove = (moveEvent: MouseEvent) => {
      const dx = moveEvent.clientX - startX;
      const dy = moveEvent.clientY - startY;
      onResize(dx, dy);
    };

    const onMouseUp = () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
      onResizeEnd?.();
    };

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
  };

  const getPositionClass = () => {
    switch (position) {
      case 'nw': return '-top-1 -left-1 cursor-nw-resize';
      case 'ne': return '-top-1 -right-1 cursor-ne-resize';
      case 'sw': return '-bottom-1 -left-1 cursor-sw-resize';
      case 'se': return '-bottom-1 -right-1 cursor-se-resize';
      case 'n': return '-top-1 left-1/2 -translate-x-1/2 cursor-n-resize';
      case 's': return '-bottom-1 left-1/2 -translate-x-1/2 cursor-s-resize';
      case 'e': return 'top-1/2 -right-1 -translate-y-1/2 cursor-e-resize';
      case 'w': return 'top-1/2 -left-1 -translate-y-1/2 cursor-w-resize';
    }
  };

  return (
    <div 
      onMouseDown={handleMouseDown}
      className={cn(
        "absolute w-2.5 h-2.5 bg-white border border-emerald-500 rounded-sm z-[60] shadow-sm hover:scale-125 transition-transform",
        getPositionClass()
      )}
    />
  );
};

interface ElementRendererProps {
  element: VideoElement;
  isSelected: boolean;
  onSelect: () => void;
  onDragEnd: (x: number, y: number) => void;
  isDrawingMode?: boolean;
  onUpdate?: (updates: Partial<VideoElement>) => void;
  onResizeEnd?: () => void;
  onDoubleClick?: () => void;
  isPlaying?: boolean;
}

// Syncs video playback with the scene's isPlaying state
const VideoPlayer = ({
  element,
  isPlaying,
}: {
  element: any;
  isPlaying?: boolean;
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);

  // Play/pause in sync with the timeline
  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    if (isPlaying) {
      v.currentTime = 0;
      v.play().catch(() => {});
    } else {
      v.pause();
    }
  }, [isPlaying]);

  // Reset when src changes
  useEffect(() => {
    const v = videoRef.current;
    if (v) {
      v.load();
      if (isPlaying) v.play().catch(() => {});
    }
  }, [element.src]);

  return (
    <video
      ref={videoRef}
      src={element.src}
      className={cn(
        "w-full h-full rounded-lg pointer-events-none",
        element.objectFit === 'contain' ? 'object-contain' :
        element.objectFit === 'fill' ? 'object-fill' : 'object-cover'
      )}
      muted={element.muted ?? true}
      loop={element.loop ?? true}
      playsInline
    />
  );
};

// Plays scene-level audio in sync with the timeline. Invisible — no DOM footprint.
const SceneAudioPlayer = ({
  audio,
  isPlaying,
  sceneId,
}: {
  audio: { src: string; volume: number; loop: boolean; startAt?: number } | undefined;
  isPlaying: boolean;
  sceneId: string;
}) => {
  const audioRef = useRef<HTMLAudioElement>(null);

  // When scene changes, reset to startAt position
  useEffect(() => {
    const a = audioRef.current;
    if (!a || !audio?.src) return;
    a.currentTime = audio.startAt ?? 0;
    if (isPlaying) a.play().catch(() => {});
    else a.pause();
  }, [sceneId]);

  // Sync with play/pause
  useEffect(() => {
    const a = audioRef.current;
    if (!a || !audio?.src) return;
    if (isPlaying) {
      a.play().catch(() => {});
    } else {
      a.pause();
    }
  }, [isPlaying]);

  // Sync volume and loop when they change
  useEffect(() => {
    const a = audioRef.current;
    if (!a || !audio) return;
    a.volume = audio.volume ?? 1;
    a.loop = audio.loop ?? false;
  }, [audio?.volume, audio?.loop]);

  if (!audio?.src) return null;

  return (
    <audio
      ref={audioRef}
      src={audio.src}
      loop={audio.loop ?? false}
      style={{ display: 'none' }}
    />
  );
};

const DiagramLayerRenderer = ({ layer, animation }: { layer: DiagramLayer, animation: any, key?: string }) => {
  return (
    <div className="absolute inset-0 pointer-events-none">
      <svg className="absolute inset-0 w-full h-full" viewBox="0 0 1000 1000">
        {layer.paths?.map((path) => (
          <motion.path
            key={path.id}
            d={`M ${path.points.map(p => `${p.x},${p.y}`).join(' L ')}`}
            stroke={path.color}
            strokeWidth={path.width}
            fill="none"
            strokeLinecap="round"
            strokeLinejoin="round"
            initial={{ pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ duration: 1, delay: animation.delay }}
          />
        ))}
        {layer.edges?.map((edge, i) => {
          const from = layer.nodes.find(n => n.id === edge.from);
          const to = layer.nodes.find(n => n.id === edge.to);
          if (!from || !to) return null;
          return (
            <motion.line
              key={edge.id}
              x1={from.x}
              y1={from.y}
              x2={to.x}
              y2={to.y}
              stroke="#10b981"
              strokeWidth="2"
              initial={{ pathLength: 0 }}
              animate={{ pathLength: 1 }}
              transition={{ delay: animation.delay + (i * 0.3) + 0.5, duration: 0.5 }}
            />
          );
        })}
      </svg>
      {layer.nodes?.map((node, i) => (
        <motion.div
          key={node.id}
          className="absolute bg-white text-black px-3 py-1 rounded-full text-[10px] font-bold border-2 border-emerald-500 shadow-lg shadow-emerald-500/20"
          style={{ left: node.x, top: node.y, transform: 'translate(-50%, -50%)' }}
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: animation.delay + (i * 0.3) }}
        >
          {node.label}
        </motion.div>
      ))}
    </div>
  );
};

const ElementRenderer: React.FC<ElementRendererProps> = ({ 
  element, 
  isSelected, 
  onSelect, 
  onDragEnd,
  isDrawingMode,
  onUpdate,
  onResizeEnd,
  onDoubleClick,
  isPlaying
}) => {
  const { animation } = element;
  const [diagramFrameIndex, setDiagramFrameIndex] = useState(0);

  useEffect(() => {
    if (element.type === 'diagram') {
      const diagram = element as DiagramElement;
      if (isPlaying && diagram.frames && diagram.frames.length > 1) {
        const interval = setInterval(() => {
          setDiagramFrameIndex(prev => {
            const next = prev + 1;
            if (next >= diagram.frames.length) {
              return diagram.loop ? 0 : prev;
            }
            return next;
          });
        }, 1000 / (diagram.fps || 12));
        return () => clearInterval(interval);
      } else if (!isPlaying) {
        setDiagramFrameIndex(diagram.currentFrameIndex || 0);
      }
    }
  }, [isPlaying, element]);
  
  const variants = {
    hidden: (type: string) => {
      switch (type) {
        case 'none': return { opacity: 1, scale: 1, x: 0, y: 0 };
        case 'scale-in': return { opacity: 0, scale: 0, y: 0 };
        case 'slide-in': return { opacity: 0, scale: 1, x: -100 };
        case 'fade-in': return { opacity: 0, scale: 1, y: 0 };
        default: return { opacity: 0, scale: 0.9, y: 20 };
      }
    },
    visible: (type: string) => ({ 
      opacity: 1, 
      scale: 1, 
      y: 0,
      x: 0,
      transition: {
        duration: type === 'none' ? 0 : animation.duration,
        delay: type === 'none' ? 0 : animation.delay,
        ease: "easeOut"
      }
    })
  };

  const renderContent = () => {
    switch (element.type) {
      case 'text':
        return (
          <div 
            style={{ 
              fontSize: element.fontSize, 
              fontWeight: element.fontWeight, 
              color: element.color,
              textAlign: element.textAlign,
              fontFamily: element.fontFamily || 'inherit',
              fontStyle: element.fontStyle || 'normal',
            }}
            className="select-none"
          >
            {element.animation.type === 'typewriter' ? (
              <motion.span
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.05, staggerChildren: 0.05 }}
              >
                {element.content.split('').map((char, i) => (
                  <motion.span 
                    key={i}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: animation.delay + (i * 0.03) }}
                  >
                    {char}
                  </motion.span>
                ))}
              </motion.span>
            ) : element.animation.type === 'word-reveal' ? (
              <motion.span
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.5, staggerChildren: 0.1 }}
              >
                {element.content.split(' ').map((word, i) => (
                  <motion.span 
                    key={i}
                    className="inline-block mr-[0.25em]"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: animation.delay + (i * 0.1) }}
                  >
                    {word}
                  </motion.span>
                ))}
              </motion.span>
            ) : element.content}
          </div>
        );
      case 'table':
        return (
          <table className="w-full border-collapse border border-white/20 text-white text-sm select-none">
            <thead>
              <tr>
                {element.headers.map((h, i) => (
                  <th key={i} className="border border-white/20 p-2 bg-white/5">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {element.rows.map((row, ri) => (
                <motion.tr 
                  key={ri}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: animation.delay + (ri * 0.2) }}
                >
                  {row.map((cell, ci) => (
                    <td key={ci} className="border border-white/20 p-2">{cell}</td>
                  ))}
                </motion.tr>
              ))}
            </tbody>
          </table>
        );
      case 'code':
        return (
          <div className="bg-zinc-900 rounded-lg p-4 font-mono text-sm border border-white/10 overflow-hidden select-none">
            <div className="flex gap-2 mb-2">
              <div className="w-3 h-3 rounded-full bg-red-500/50" />
              <div className="w-3 h-3 rounded-full bg-yellow-500/50" />
              <div className="w-3 h-3 rounded-full bg-green-500/50" />
            </div>
            <pre className="text-emerald-400">
              <code>{element.code}</code>
            </pre>
          </div>
        );
      case 'image':
        return (
          <img 
            src={element.src} 
            alt={element.alt} 
            className={cn(
              "w-full h-full rounded-lg pointer-events-none",
              element.objectFit === 'contain' ? 'object-contain' : 
              element.objectFit === 'fill' ? 'object-fill' : 'object-cover'
            )}
            referrerPolicy="no-referrer"
          />
        );
      case 'video':
        return (
          <VideoPlayer
            element={element}
            isPlaying={isPlaying}
          />
        );
      case 'diagram':
        const diagram = element as DiagramElement;
        const currentFrame = diagram.frames?.[diagramFrameIndex] || diagram.frames?.[0];
        
        if (!currentFrame) {
          // Fallback for legacy diagrams or empty frames
          return (
            <div className="relative w-full h-full select-none overflow-hidden">
              <svg className="absolute inset-0 w-full h-full pointer-events-none">
                {(element as any).paths?.map((path: any) => (
                  <motion.path
                    key={path.id}
                    d={`M ${path.points.map((p: any) => `${p.x},${p.y}`).join(' L ')}`}
                    stroke={path.color}
                    strokeWidth={path.width}
                    fill="none"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    initial={{ pathLength: 0 }}
                    animate={{ pathLength: 1 }}
                    transition={{ duration: 1, delay: animation.delay }}
                  />
                ))}
              </svg>
            </div>
          );
        }

        return (
          <div className="relative w-full h-full select-none overflow-hidden">
            {/* Onion Skin */}
            {diagram.onionSkin && diagramFrameIndex > 0 && (
              <div className="absolute inset-0 opacity-20 pointer-events-none">
                {diagram.frames[diagramFrameIndex - 1].layers.map(layer => layer.visible && (
                  <DiagramLayerRenderer key={layer.id} layer={layer} animation={animation} />
                ))}
              </div>
            )}
            {currentFrame.layers.map(layer => layer.visible && (
              <DiagramLayerRenderer key={layer.id} layer={layer} animation={animation} />
            ))}
          </div>
        );
      case 'shape':
        const shapeProps = {
          fill: element.fill,
          stroke: element.stroke,
          strokeWidth: element.strokeWidth,
          strokeDasharray: element.strokeStyle === 'dashed' ? '5,5' : element.strokeStyle === 'dotted' ? '2,2' : 'none',
          className: "w-full h-full"
        };
        
        const renderShape = () => {
          switch (element.shapeType) {
            case 'circle':
              return <circle cx="50%" cy="50%" r="45%" {...shapeProps} />;
            case 'triangle':
              return <polygon points="50,5 95,95 5,95" {...shapeProps} />;
            case 'star':
              return <polygon points="50,5 61,35 95,35 68,57 79,91 50,70 21,91 32,57 5,35 39,35" {...shapeProps} />;
            case 'pentagon':
              return <polygon points="50,5 95,35 78,95 22,95 5,35" {...shapeProps} />;
            case 'arrow':
              return <path d="M10,40 L70,40 L70,20 L95,50 L70,80 L70,60 L10,60 Z" {...shapeProps} />;
            default: // rect
              return <rect x="5%" y="5%" width="90%" height="90%" rx={element.borderRadius || 0} {...shapeProps} />;
          }
        };

        return (
          <div className="w-full h-full relative">
            <svg viewBox="0 0 100 100" className="w-full h-full overflow-visible">
              {renderShape()}
            </svg>
            {element.text && (
              <div 
                className="absolute inset-0 flex items-center justify-center pointer-events-none p-4"
                style={{
                  color: element.color || '#ffffff',
                  fontSize: element.fontSize || 16,
                  fontWeight: element.fontWeight || 'normal',
                  fontFamily: element.fontFamily || 'inherit',
                  fontStyle: element.fontStyle || 'normal',
                  textAlign: element.textAlign || 'center',
                  lineHeight: 1.2,
                  wordBreak: 'break-word'
                }}
              >
                {element.text}
              </div>
            )}
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <motion.div
      drag={!isDrawingMode && !element.locked}
      dragMomentum={false}
      onDragEnd={(_, info) => {
        if (element.locked) return;
        onDragEnd(element.x + info.offset.x, element.y + info.offset.y);
      }}
      onPointerDown={onSelect}
      onDoubleClick={(e) => {
        e.stopPropagation();
        if (element.locked) return;
        onDoubleClick?.();
      }}
      variants={variants}
      custom={animation.type}
      initial={animation.type === 'none' ? "visible" : "hidden"}
      animate="visible"
      className={cn(
        "absolute group",
        !element.locked && "cursor-move",
        element.locked && "cursor-default",
        isSelected && "z-50",
        isDrawingMode && !element.locked && "cursor-crosshair"
      )}
      style={{ 
        left: element.x, 
        top: element.y, 
        width: element.width, 
        height: element.height,
        backgroundColor: element.backgroundColor || 'transparent',
        borderRadius: '8px',
        padding: (element.type === 'text' || (element.type === 'diagram' && (!element.backgroundColor || element.backgroundColor === 'transparent'))) ? '0' : '8px'
      }}
    >
      {renderContent()}
      {isDrawingMode && isSelected && element.type === 'diagram' && onUpdate && !element.locked && (
        <DrawingCanvas 
          element={element as DiagramElement} 
          onUpdate={(updates) => onUpdate(updates)} 
        />
      )}
      {isSelected && !isDrawingMode && !element.locked && (
        <>
          <ResizeHandle position="nw" onResize={(dx, dy) => onUpdate?.({ x: element.x + dx, y: element.y + dy, width: element.width - dx, height: element.height - dy })} onResizeEnd={onResizeEnd} />
          <ResizeHandle position="ne" onResize={(dx, dy) => onUpdate?.({ y: element.y + dy, width: element.width + dx, height: element.height - dy })} onResizeEnd={onResizeEnd} />
          <ResizeHandle position="sw" onResize={(dx, dy) => onUpdate?.({ x: element.x + dx, width: element.width - dx, height: element.height + dy })} onResizeEnd={onResizeEnd} />
          <ResizeHandle position="se" onResize={(dx, dy) => onUpdate?.({ width: element.width + dx, height: element.height + dy })} onResizeEnd={onResizeEnd} />
          <ResizeHandle position="n" onResize={(_, dy) => onUpdate?.({ y: element.y + dy, height: element.height - dy })} onResizeEnd={onResizeEnd} />
          <ResizeHandle position="s" onResize={(_, dy) => onUpdate?.({ height: element.height + dy })} onResizeEnd={onResizeEnd} />
          <ResizeHandle position="e" onResize={(dx, _) => onUpdate?.({ width: element.width + dx })} onResizeEnd={onResizeEnd} />
          <ResizeHandle position="w" onResize={(dx, _) => onUpdate?.({ x: element.x + dx, width: element.width - dx })} onResizeEnd={onResizeEnd} />
        </>
      )}
      <div className={cn(
        "absolute -inset-2 border-2 rounded-lg transition-all pointer-events-none",
        isSelected ? "border-emerald-500" : "border-emerald-500/0 group-hover:border-emerald-500/30",
        element.locked && isSelected && "border-red-500/50"
      )} />
      {element.locked && (
        <div className="absolute top-1 right-1 p-1 bg-black/50 rounded-md backdrop-blur-sm">
          <Lock className="w-3 h-3 text-white/70" />
        </div>
      )}
    </motion.div>
  );
};

const Canvas = ({ 
  scene, 
  aspectRatio, 
  isPlaying, 
  selectedElementId,
  onSelectElement,
  onUpdateElement,
  onUpdateElementSilent,
  isDrawingMode,
  setIsDrawingMode,
  onOpenCodeEditor,
  onTogglePlay,
  onNextScene,
  onPrevScene,
  theme
}: { 
  scene: Scene; 
  aspectRatio: AspectRatio; 
  isPlaying: boolean;
  selectedElementId: string | null;
  onSelectElement: (id: string) => void;
  onUpdateElement: (id: string, updates: Partial<VideoElement>) => void;
  onUpdateElementSilent: (id: string, updates: Partial<VideoElement>) => void;
  isDrawingMode: boolean;
  setIsDrawingMode: (val: boolean) => void;
  onOpenCodeEditor?: () => void;
  onTogglePlay: () => void;
  onNextScene: () => void;
  onPrevScene: () => void;
  theme: 'light' | 'dark';
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  
  const getAspectClass = () => {
    switch (aspectRatio) {
      case '16:9': return 'aspect-video w-full max-w-4xl';
      case '9:16': return 'aspect-[9/16] h-full max-h-[80vh]';
      case '1:1': return 'aspect-square w-full max-w-2xl';
    }
  };

  return (
    <div 
      className={cn(
        "flex-1 flex items-center justify-center p-8 overflow-hidden relative transition-colors duration-300",
        theme === 'dark' ? "bg-zinc-900" : "bg-zinc-200"
      )} 
      onClick={() => onSelectElement('')}
    >
      <div 
        ref={containerRef}
        className={cn(
          "bg-black shadow-2xl relative overflow-hidden ring-1 transition-all",
          theme === 'dark' ? "ring-white/10" : "ring-black/5",
          getAspectClass(),
          scene.frame === 'modern' && "border-8 border-zinc-800 rounded-2xl",
          scene.frame === 'classic' && "border-[16px] border-amber-900 shadow-inner",
          scene.frame === 'retro' && "border-[12px] border-zinc-400 rounded-lg grayscale-[0.2]",
          scene.frame === 'cinematic' && "before:absolute before:inset-x-0 before:top-0 before:h-[10%] before:bg-black before:z-50 after:absolute after:inset-x-0 after:bottom-0 after:h-[10%] after:bg-black after:z-50"
        )}
        onClick={(e) => e.stopPropagation()}
        style={{ 
          backgroundColor: scene.background,
          backgroundImage: scene.backgroundType === 'image' && scene.backgroundImage ? `url(${scene.backgroundImage})` : 'none',
          backgroundSize: 'cover',
          backgroundPosition: 'center'
        }}
      >
        <AnimatePresence mode="wait">
          <motion.div 
            key={scene.id}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="w-full h-full relative"
          >
            {scene.elements.map((el) => (
              <ElementRenderer 
                key={el.id} 
                element={el} 
                isSelected={selectedElementId === el.id}
                onSelect={() => onSelectElement(el.id)}
                onDragEnd={(x, y) => { onUpdateElement(el.id, { x, y }); }}
                isDrawingMode={isDrawingMode}
                onUpdate={(updates) => onUpdateElementSilent(el.id, updates)}
                onResizeEnd={() => onUpdateElement(el.id, {})}
                onDoubleClick={() => {
                  if (el.type === 'code') {
                    onOpenCodeEditor?.();
                  }
                }}
                isPlaying={isPlaying}
              />
            ))}
          </motion.div>
        </AnimatePresence>
        {/* Scene audio — invisible, synced to isPlaying */}
        <SceneAudioPlayer audio={scene.audio} isPlaying={isPlaying} sceneId={scene.id} />
      </div>
      
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-4 bg-zinc-950/80 backdrop-blur border border-white/10 px-4 py-2 rounded-full">
        <button 
          onClick={(e) => { e.stopPropagation(); onPrevScene(); }}
          className="text-zinc-400 hover:text-white transition-colors"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>
        <button 
          onClick={(e) => { e.stopPropagation(); onTogglePlay(); }}
          className="w-10 h-10 rounded-full bg-white text-black flex items-center justify-center hover:bg-zinc-200 transition-all shadow-lg"
        >
          {isPlaying ? <Pause className="w-5 h-5 fill-current" /> : <Play className="w-5 h-5 fill-current ml-1" />}
        </button>
        <button 
          onClick={(e) => { e.stopPropagation(); onNextScene(); }}
          className="text-zinc-400 hover:text-white transition-colors"
        >
          <ChevronRight className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
};

const Timeline = ({ 
  project, 
  currentEpisodeIndex,
  setCurrentEpisodeIndex,
  currentSceneIndex, 
  setCurrentSceneIndex,
  onAddScene,
  onDeleteScene,
  onAddEpisode,
  onUpdateScene,
  theme
}: { 
  project: Project; 
  currentEpisodeIndex: number;
  setCurrentEpisodeIndex: (idx: number) => void;
  currentSceneIndex: number; 
  setCurrentSceneIndex: (idx: number) => void;
  onAddScene: () => void;
  onDeleteScene: (idx: number) => void;
  onAddEpisode: () => void;
  onUpdateScene: (index: number, updates: Partial<Scene>) => void;
  theme: 'light' | 'dark';
}) => {
  const currentEpisode = project.episodes[currentEpisodeIndex];

  return (
    <div className={cn(
      "h-48 border-t flex flex-col transition-colors duration-300",
      theme === 'dark' ? "bg-zinc-950 border-white/10" : "bg-white border-zinc-200"
    )}>
      <div className={cn("flex items-center justify-between px-4 py-2 border-b", theme === 'dark' ? "border-white/5" : "border-zinc-100")}>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 text-xs font-bold text-zinc-500 uppercase tracking-widest">
            <Clock className="w-3 h-3" />
            Timeline
          </div>
          <div className={cn("h-4 w-[1px]", theme === 'dark' ? "bg-white/10" : "bg-zinc-200")} />
          <div className="flex items-center gap-2">
            <span className="text-[10px] text-zinc-500 uppercase font-bold">Episode</span>
            <select 
              value={currentEpisodeIndex}
              onChange={(e) => {
                setCurrentEpisodeIndex(parseInt(e.target.value));
                setCurrentSceneIndex(0);
              }}
              className={cn(
                "border rounded px-2 py-0.5 text-[10px] focus:outline-none transition-colors",
                theme === 'dark' ? "bg-zinc-900 border-white/10 text-white" : "bg-white border-zinc-200 text-zinc-900"
              )}
            >
              {project.episodes.map((ep, i) => (
                <option key={ep.id} value={i}>{ep.name}</option>
              ))}
            </select>
            <button 
              onClick={onAddEpisode}
              className="p-1 rounded hover:bg-emerald-500/10 text-emerald-500"
              title="Add Episode"
            >
              <Plus className="w-3 h-3" />
            </button>
          </div>
        </div>
        <button 
          onClick={onAddScene}
          className="flex items-center gap-1.5 px-3 py-1 rounded-md bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/20 transition-all text-[10px] font-bold uppercase tracking-wider"
        >
          <Plus className="w-3 h-3" />
          Add Scene
        </button>
      </div>
      <div className="flex-1 flex gap-2 p-4 overflow-x-auto">
        {currentEpisode.scenes.map((scene, i) => (
          <div key={scene.id} className="relative group">
            <button
              onClick={() => setCurrentSceneIndex(i)}
              className={cn(
                "min-w-[160px] h-full rounded-lg border flex flex-col overflow-hidden transition-all relative",
                currentSceneIndex === i 
                  ? "border-emerald-500 bg-emerald-500/5 ring-1 ring-emerald-500 shadow-lg shadow-emerald-500/20" 
                  : (theme === 'dark' ? "border-white/10 bg-zinc-900 hover:border-white/20" : "border-zinc-200 bg-zinc-50 hover:border-zinc-300")
              )}
            >
              <div className={cn(
                "flex-1 flex items-center justify-center text-[10px] font-mono gap-1.5",
                theme === 'dark' ? "text-zinc-600" : "text-zinc-400"
              )}>
                SCENE {i + 1}
                {scene.audio?.src && (
                  <Music className="w-2.5 h-2.5 text-emerald-500" />
                )}
              </div>
              <div className={cn(
                "px-2 py-1 flex items-center justify-between",
                theme === 'dark' ? "bg-zinc-950" : "bg-zinc-100"
              )}>
                <span className={cn(
                  "text-[10px] font-medium truncate max-w-[100px]",
                  theme === 'dark' ? "text-zinc-400" : "text-zinc-600"
                )}>{scene.name}</span>
                <div className="flex items-center gap-1 group/dur">
                  <input 
                    type="number"
                    value={scene.duration}
                    onChange={(e) => {
                      e.stopPropagation();
                      onUpdateScene(i, { duration: Math.max(1, parseInt(e.target.value) || 1) });
                    }}
                    onClick={(e) => e.stopPropagation()}
                    className={cn(
                      "w-8 bg-transparent border-none text-[9px] focus:text-emerald-400 focus:outline-none text-right appearance-none",
                      theme === 'dark' ? "text-zinc-600" : "text-zinc-500"
                    )}
                  />
                  <span className={cn("text-[9px]", theme === 'dark' ? "text-zinc-700" : "text-zinc-400")}>s</span>
                </div>
              </div>
              {currentSceneIndex === i && (
                <div className="absolute top-1 right-1">
                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                </div>
              )}
            </button>
            {currentEpisode.scenes.length > 1 && (
              <button 
                onClick={(e) => {
                  e.stopPropagation();
                  onDeleteScene(i);
                }}
                className="absolute -top-2 -right-2 w-5 h-5 rounded-full bg-red-500 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all shadow-lg hover:bg-red-600 z-10"
              >
                <Trash2 className="w-3 h-3" />
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

const Ruler = ({ 
  orientation, 
  size, 
  gridSize = 20 
}: { 
  orientation: 'horizontal' | 'vertical'; 
  size: number; 
  gridSize?: number;
}) => {
  const ticks = [];
  for (let i = 0; i <= size; i += gridSize) {
    ticks.push(i);
  }

  return (
    <div 
      className={cn(
        "absolute bg-zinc-900/80 border-white/10 text-[8px] text-zinc-500 overflow-hidden pointer-events-none",
        orientation === 'horizontal' ? "top-0 left-0 right-0 h-4 border-b" : "top-0 left-0 bottom-0 w-4 border-r"
      )}
    >
      <div className={cn(
        "relative",
        orientation === 'horizontal' ? "w-full h-full" : "w-full h-full"
      )}>
        {ticks.map(tick => (
          <div 
            key={tick}
            className="absolute flex items-center justify-center"
            style={{ 
              left: orientation === 'horizontal' ? `${(tick / size) * 100}%` : 0,
              top: orientation === 'vertical' ? `${(tick / size) * 100}%` : 0,
              width: orientation === 'vertical' ? '100%' : 'auto',
              height: orientation === 'horizontal' ? '100%' : 'auto',
            }}
          >
            <div className={cn(
              "bg-zinc-700",
              orientation === 'horizontal' ? "w-[1px] h-1.5 self-end" : "h-[1px] w-1.5 self-end"
            )} />
            {tick % (gridSize * 5) === 0 && (
              <span className={cn(
                "absolute",
                orientation === 'horizontal' ? "bottom-2" : "right-2"
              )}>
                {tick}
              </span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

const DrawingCanvas = ({ 
  element, 
  onUpdate 
}: { 
  element: DiagramElement; 
  onUpdate: (updates: Partial<DiagramElement>) => void;
}) => {
  const [isDrawing, setIsDrawing] = useState(false);
  const [currentPath, setCurrentPath] = useState<{ x: number; y: number }[]>([]);
  const [color, setColor] = useState('#10b981');
  const [fillColor, setFillColor] = useState('transparent');
  const [width, setWidth] = useState(2);
  const [style, setStyle] = useState<'pencil' | 'brush' | 'marker' | 'eraser'>('pencil');
  const svgRef = useRef<SVGSVGElement>(null);

  const currentFrameIdx = element.currentFrameIndex || 0;
  const currentFrame = element.frames[currentFrameIdx];
  const currentLayer = currentFrame.layers[0];

  const updateCurrentLayer = (layerUpdates: Partial<DiagramLayer>) => {
    const newFrames = [...element.frames];
    const newLayers = [...newFrames[currentFrameIdx].layers];
    const layerIndex = 0; // Quick edit always uses first layer
    newLayers[layerIndex] = { ...newLayers[layerIndex], ...layerUpdates };
    newFrames[currentFrameIdx] = { ...newFrames[currentFrameIdx], layers: newLayers };
    onUpdate({ frames: newFrames });
  };

  const getPoint = (e: React.MouseEvent | React.TouchEvent) => {
    if (!svgRef.current) return { x: 0, y: 0 };
    const rect = svgRef.current.getBoundingClientRect();
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    
    let x = ((clientX - rect.left) / rect.width) * element.width;
    let y = ((clientY - rect.top) / rect.height) * element.height;

    if (element.snapToGrid && element.gridSize) {
      x = Math.round(x / element.gridSize) * element.gridSize;
      y = Math.round(y / element.gridSize) * element.gridSize;
    }

    return { x, y };
  };

  const handleStart = (e: React.MouseEvent | React.TouchEvent) => {
    setIsDrawing(true);
    const point = getPoint(e);
    setCurrentPath([point]);
  };

  const handleMove = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDrawing) return;
    const point = getPoint(e);
    setCurrentPath(prev => [...prev, point]);
  };

  const handleEnd = () => {
    if (!isDrawing) return;
    setIsDrawing(false);
    if (currentPath.length > 1) {
      const newPath: DrawingPath = {
        id: Math.random().toString(36).substring(2, 11),
        points: currentPath,
        color: style === 'eraser' ? 'transparent' : color,
        width: style === 'brush' ? width * 2 : style === 'marker' ? width * 1.5 : width,
        fill: fillColor,
        style
      };
      updateCurrentLayer({ paths: [...(currentLayer.paths || []), newPath] });
    }
    setCurrentPath([]);
  };

  return (
    <div className="absolute inset-0 z-50 bg-black/20 cursor-crosshair group">
      <Ruler orientation="horizontal" size={element.width} gridSize={element.gridSize} />
      <Ruler orientation="vertical" size={element.height} gridSize={element.gridSize} />
      {element.gridVisible && (
        <div 
          className="absolute inset-0 pointer-events-none opacity-20"
          style={{ 
            backgroundImage: `radial-gradient(circle, white 1px, transparent 1px)`,
            backgroundSize: `${element.gridSize || 20}px ${element.gridSize || 20}px`
          }}
        />
      )}
      <div className="absolute top-2 left-2 flex flex-wrap items-center gap-2 bg-zinc-900/90 backdrop-blur p-2 rounded-lg border border-white/10 opacity-0 group-hover:opacity-100 transition-opacity max-w-[200px]">
        <div className="flex items-center gap-1 w-full border-b border-white/5 pb-2 mb-2">
          {(['pencil', 'brush', 'marker', 'eraser'] as const).map((s) => (
            <button
              key={s}
              onClick={() => setStyle(s)}
              className={cn(
                "p-1.5 rounded transition-all",
                style === s ? "bg-emerald-500 text-black" : "text-zinc-400 hover:text-white"
              )}
              title={s.charAt(0).toUpperCase() + s.slice(1)}
            >
              {s === 'pencil' && <PenTool className="w-3.5 h-3.5" />}
              {s === 'brush' && <div className="w-3.5 h-3.5 rounded-full bg-current" />}
              {s === 'marker' && <div className="w-3.5 h-3.5 bg-current rotate-45" />}
              {s === 'eraser' && <X className="w-3.5 h-3.5" />}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2 w-full">
          <input 
            type="color" 
            value={color} 
            onChange={(e) => setColor(e.target.value)}
            className="w-6 h-6 rounded bg-transparent border-none p-0 cursor-pointer"
            title="Stroke Color"
          />
          <input 
            type="color" 
            value={fillColor === 'transparent' ? '#000000' : fillColor} 
            onChange={(e) => setFillColor(e.target.value)}
            className="w-6 h-6 rounded bg-transparent border-none p-0 cursor-pointer"
            title="Fill Color"
          />
          <button 
            onClick={() => setFillColor(fillColor === 'transparent' ? color : 'transparent')}
            className={cn(
              "p-1 rounded text-[10px] border",
              fillColor !== 'transparent' ? "bg-emerald-500/20 border-emerald-500 text-emerald-400" : "border-white/10 text-zinc-500"
            )}
          >
            Fill
          </button>
        </div>
        <input 
          type="range" 
          min="1" 
          max="20" 
          value={width} 
          onChange={(e) => setWidth(parseInt(e.target.value))}
          className="w-full h-1 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-emerald-500"
        />
        <div className="flex items-center justify-between w-full mt-1">
          <button 
            onClick={() => onUpdate({ gridVisible: !element.gridVisible })}
            className={cn(
              "p-1 rounded text-[9px] border",
              element.gridVisible ? "bg-emerald-500/20 border-emerald-500 text-emerald-400" : "border-white/10 text-zinc-500"
            )}
          >
            Grid
          </button>
          <button 
            onClick={() => onUpdate({ snapToGrid: !element.snapToGrid })}
            className={cn(
              "p-1 rounded text-[9px] border",
              element.snapToGrid ? "bg-emerald-500/20 border-emerald-500 text-emerald-400" : "border-white/10 text-zinc-500"
            )}
          >
            Snap
          </button>
          <button 
            onClick={() => updateCurrentLayer({ paths: [] })}
            className="p-1 hover:bg-white/10 rounded text-red-400"
            title="Clear All"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
      <svg 
        ref={svgRef}
        className="w-full h-full touch-none"
        onMouseDown={handleStart}
        onMouseMove={handleMove}
        onMouseUp={handleEnd}
        onMouseLeave={handleEnd}
        onTouchStart={handleStart}
        onTouchMove={handleMove}
        onTouchEnd={handleEnd}
      >
        {currentLayer.paths?.map((path) => (
          <path
            key={path.id}
            d={`M ${path.points.map(p => `${p.x},${p.y}`).join(' L ')} ${path.fill && path.fill !== 'transparent' ? 'Z' : ''}`}
            stroke={path.color}
            strokeWidth={path.width}
            fill={path.fill || 'none'}
            strokeLinecap="round"
            strokeLinejoin="round"
            style={{ 
              opacity: path.style === 'brush' ? 0.6 : path.style === 'marker' ? 0.4 : 1,
              mixBlendMode: path.style === 'marker' ? 'multiply' : 'normal'
            }}
          />
        ))}
        {currentPath.length > 1 && (
          <path
            d={`M ${currentPath.map(p => `${p.x},${p.y}`).join(' L ')} ${fillColor !== 'transparent' ? 'Z' : ''}`}
            stroke={style === 'eraser' ? 'rgba(255,255,255,0.2)' : color}
            strokeWidth={style === 'brush' ? width * 2 : style === 'marker' ? width * 1.5 : width}
            fill={fillColor}
            strokeLinecap="round"
            strokeLinejoin="round"
            style={{ 
              opacity: style === 'brush' ? 0.6 : style === 'marker' ? 0.4 : 1,
              mixBlendMode: style === 'marker' ? 'multiply' : 'normal'
            }}
          />
        )}
      </svg>
    </div>
  );
};

const CanvasSettings = ({ 
  scene, 
  onUpdateScene, 
  onApplyToAll,
  theme,
  onClose
}: { 
  scene: Scene; 
  onUpdateScene: (updates: Partial<Scene>) => void;
  onApplyToAll: (updates: Partial<Scene>) => void;
  theme: 'light' | 'dark';
  onClose: () => void;
}) => {
  const { showToast } = useToast();
  const [isImageSearchOpen, setIsImageSearchOpen] = useState(false);

  return (
    <aside className={cn(
      "w-72 border-r p-4 flex flex-col gap-6 overflow-y-auto transition-colors duration-300",
      theme === 'dark' ? "bg-zinc-950 border-white/10" : "bg-white border-zinc-200"
    )}>
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-bold text-zinc-500 uppercase tracking-widest">Canvas Settings</h3>
        <button onClick={onClose} className="text-zinc-500 hover:text-white transition-colors">
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="space-y-6">
        <div className="space-y-2">
          <label className="text-[10px] font-bold text-zinc-500 uppercase">Background Type</label>
          <div className="flex bg-zinc-900/50 rounded-lg p-1">
            <button 
              onClick={() => onUpdateScene({ backgroundType: 'color' })}
              className={cn(
                "flex-1 py-1.5 text-[10px] font-bold rounded-md transition-all",
                scene.backgroundType !== 'image' ? "bg-emerald-500 text-black" : "text-zinc-500 hover:text-zinc-300"
              )}
            >
              COLOR
            </button>
            <button 
              onClick={() => onUpdateScene({ backgroundType: 'image' })}
              className={cn(
                "flex-1 py-1.5 text-[10px] font-bold rounded-md transition-all",
                scene.backgroundType === 'image' ? "bg-emerald-500 text-black" : "text-zinc-500 hover:text-zinc-300"
              )}
            >
              IMAGE
            </button>
          </div>
        </div>

        {scene.backgroundType !== 'image' && (
          <div className="space-y-2">
            <label className="text-[10px] font-bold text-zinc-500 uppercase">Background Color</label>
            <div className="flex gap-2">
              <input 
                type="color" 
                value={scene.background}
                onChange={(e) => onUpdateScene({ background: e.target.value })}
                className="w-10 h-10 rounded-lg bg-transparent border-none p-0 cursor-pointer"
              />
              <input 
                type="text" 
                value={scene.background}
                onChange={(e) => onUpdateScene({ background: e.target.value })}
                className={cn(
                  "flex-1 border rounded-md px-3 py-2 text-sm focus:outline-none transition-colors",
                  theme === 'dark' ? "bg-zinc-900 border-white/10 text-white" : "bg-white border-zinc-200 text-zinc-900"
                )}
              />
            </div>
          </div>
        )}

        {scene.backgroundType === 'image' && (
          <div className="space-y-2">
            <label className="text-[10px] font-bold text-zinc-500 uppercase">Background Image</label>
            <div className="space-y-2">
              <input 
                type="text" 
                placeholder="Image URL..."
                value={scene.backgroundImage || ''}
                onChange={(e) => onUpdateScene({ backgroundImage: e.target.value })}
                className={cn(
                  "w-full border rounded-md px-3 py-2 text-sm focus:outline-none transition-colors",
                  theme === 'dark' ? "bg-zinc-900 border-white/10 text-white" : "bg-white border-zinc-200 text-zinc-900"
                )}
              />
              <button 
                onClick={() => setIsImageSearchOpen(true)}
                className="w-full py-2 bg-zinc-800 hover:bg-zinc-700 text-white text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-2"
              >
                <ImageIcon className="w-3.5 h-3.5" />
                Browse Online
              </button>
            </div>
          </div>
        )}

        <div className="space-y-2">
          <label className="text-[10px] font-bold text-zinc-500 uppercase">Canvas Frame</label>
          <select 
            value={scene.frame || 'none'}
            onChange={(e) => onUpdateScene({ frame: e.target.value as any })}
            className={cn(
              "w-full border rounded-md px-3 py-2 text-sm focus:outline-none transition-colors",
              theme === 'dark' ? "bg-zinc-900 border-white/10 text-white" : "bg-white border-zinc-200 text-zinc-900"
            )}
          >
            <option value="none">None</option>
            <option value="modern">Modern Border</option>
            <option value="classic">Classic Wood</option>
            <option value="retro">Retro TV</option>
            <option value="cinematic">Cinematic Bars</option>
          </select>
        </div>

        {/* ── Audio / Voiceover ─────────────────────── */}
        <div className="space-y-3 border-t border-white/5 pt-4">
          <div className="flex items-center justify-between">
            <label className="text-[10px] font-bold text-zinc-500 uppercase flex items-center gap-1.5">
              <Music className="w-3 h-3" /> Voiceover / Audio
            </label>
            {scene.audio?.src && (
              <button
                onClick={() => onUpdateScene({ audio: undefined })}
                className="text-[10px] text-red-400 hover:text-red-300 transition-colors"
              >
                Remove
              </button>
            )}
          </div>

          {/* URL input */}
          <input
            type="text"
            placeholder="Paste audio URL (.mp3, .wav, .ogg)..."
            value={scene.audio?.src && !scene.audio.src.startsWith('data:') ? scene.audio.src : ''}
            onChange={(e) => {
              const src = e.target.value.trim();
              if (!src) { onUpdateScene({ audio: undefined }); return; }
              onUpdateScene({ audio: { src, volume: scene.audio?.volume ?? 1, loop: scene.audio?.loop ?? false } });
            }}
            className={cn(
              "w-full border rounded-md px-3 py-2 text-xs focus:outline-none transition-colors",
              theme === 'dark' ? "bg-zinc-900 border-white/10 text-white placeholder:text-zinc-600" : "bg-white border-zinc-200 text-zinc-900 placeholder:text-zinc-400"
            )}
          />

          {/* File upload */}
          <div className="relative">
            <input
              type="file"
              accept="audio/*"
              id="audio-upload"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (!file) return;
                if (file.size > 4 * 1024 * 1024) {
                  showToast('File is over 4 MB — use a URL instead for large audio files.', 'warning');
                }
                const reader = new FileReader();
                reader.onloadend = () => {
                  onUpdateScene({ audio: { src: reader.result as string, volume: scene.audio?.volume ?? 1, loop: scene.audio?.loop ?? false } });
                  showToast('Audio uploaded.', 'success');
                };
                reader.readAsDataURL(file);
              }}
            />
            <label
              htmlFor="audio-upload"
              className={cn(
                "flex items-center justify-center gap-2 w-full border rounded-md px-3 py-2 text-xs cursor-pointer transition-colors",
                theme === 'dark' ? "bg-zinc-800 hover:bg-zinc-700 border-white/10 text-white" : "bg-zinc-100 hover:bg-zinc-200 border-zinc-200 text-zinc-900"
              )}
            >
              <UploadCloud className="w-3.5 h-3.5" />
              {scene.audio?.src && scene.audio.src.startsWith('data:') ? 'Replace uploaded file' : 'Upload audio file'}
            </label>
          </div>

          {/* Active audio controls */}
          {scene.audio?.src && (
            <div className="space-y-3 p-3 rounded-lg bg-emerald-500/5 border border-emerald-500/20">
              <div className="flex items-center gap-2">
                <Volume2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.05"
                  value={scene.audio.volume ?? 1}
                  onChange={(e) => onUpdateScene({ audio: { ...scene.audio!, volume: parseFloat(e.target.value) } })}
                  className="flex-1 accent-emerald-500"
                />
                <span className="text-[10px] font-mono text-zinc-400 w-8 text-right">
                  {Math.round((scene.audio.volume ?? 1) * 100)}%
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[10px] text-zinc-500">Loop audio</span>
                <button
                  onClick={() => onUpdateScene({ audio: { ...scene.audio!, loop: !scene.audio!.loop } })}
                  className={cn(
                    "px-3 py-1 rounded text-[10px] font-bold border transition-all",
                    scene.audio.loop
                      ? "bg-emerald-500/20 border-emerald-500 text-emerald-400"
                      : theme === 'dark' ? "bg-zinc-900 border-white/10 text-zinc-400" : "bg-white border-zinc-200 text-zinc-500"
                  )}
                >
                  {scene.audio.loop ? 'ON' : 'OFF'}
                </button>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[10px] text-zinc-500">Start at (seconds)</span>
                <input
                  type="number"
                  min="0"
                  step="0.5"
                  value={scene.audio.startAt ?? 0}
                  onChange={(e) => onUpdateScene({ audio: { ...scene.audio!, startAt: parseFloat(e.target.value) || 0 } })}
                  className={cn(
                    "w-16 border rounded px-2 py-1 text-[10px] text-right focus:outline-none transition-colors",
                    theme === 'dark' ? "bg-zinc-900 border-white/10 text-white" : "bg-white border-zinc-200 text-zinc-900"
                  )}
                />
              </div>
            </div>
          )}
        </div>

        <div className="pt-2 border-t border-white/5">
          <button 
            onClick={() => onApplyToAll({ 
              background: scene.background, 
              backgroundImage: scene.backgroundImage, 
              backgroundType: scene.backgroundType,
              frame: scene.frame 
            })}
            className="w-full py-2 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/20 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all"
          >
            Apply to All Scenes
          </button>
        </div>
      </div>

      <ImageSearchModal 
        isOpen={isImageSearchOpen} 
        onClose={() => setIsImageSearchOpen(false)} 
        onSelect={(url) => onUpdateScene({ backgroundImage: url, backgroundType: 'image' })} 
      />
    </aside>
  );
};

const ImageSearchModal = ({ 
  isOpen, 
  onClose, 
  onSelect 
}: { 
  isOpen: boolean; 
  onClose: () => void; 
  onSelect: (url: string) => void;
}) => {
  const [query, setQuery] = useState('');
  const [images, setImages] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  const handleSearch = async () => {
    if (!query.trim()) return;
    setLoading(true);
    try {
      // Unsplash Source API — no API key required, returns real photos
      const encoded = encodeURIComponent(query.trim());
      const results = Array.from({ length: 12 }, (_, i) =>
        `https://source.unsplash.com/800x600/?${encoded}&sig=${i}`
      );
      setImages(results);
    } catch (e) {
      console.error('Image search failed', e);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="bg-zinc-900 border border-white/10 rounded-xl w-full max-w-2xl overflow-hidden shadow-2xl"
      >
        <div className="p-4 border-b border-white/5 flex items-center justify-between">
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <ImageIcon className="w-4 h-4 text-emerald-400" />
            Browse Online Images
          </h3>
          <button onClick={onClose} className="text-zinc-500 hover:text-white transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <div className="p-4 space-y-4">
          <div className="flex gap-2">
            <input 
              type="text"
              placeholder="Search for images (e.g. nature, tech, abstract)..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              className="flex-1 bg-zinc-800 border border-white/10 rounded-lg px-4 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
            />
            <button 
              onClick={handleSearch}
              disabled={loading}
              className="px-6 py-2 bg-emerald-500 text-black rounded-lg text-sm font-bold hover:bg-emerald-400 disabled:opacity-50 transition-all"
            >
              {loading ? 'Searching...' : 'Search'}
            </button>
          </div>

          <div className="grid grid-cols-3 gap-3 max-h-[400px] overflow-y-auto p-1 custom-scrollbar">
            {images.map((url, i) => (
              <button 
                key={i}
                onClick={() => {
                  onSelect(url);
                  onClose();
                }}
                className="aspect-video rounded-lg overflow-hidden border border-white/5 hover:border-emerald-500/50 transition-all group relative"
              >
                <img src={url} alt={`Result ${i}`} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" referrerPolicy="no-referrer" />
                <div className="absolute inset-0 bg-emerald-500/0 group-hover:bg-emerald-500/10 transition-colors" />
              </button>
            ))}
            {images.length === 0 && !loading && (
              <div className="col-span-3 py-20 text-center text-zinc-500">
                <ImageIcon className="w-12 h-12 mx-auto mb-4 opacity-10" />
                <p className="text-sm">Search for something to browse images</p>
              </div>
            )}
          </div>
        </div>
      </motion.div>
    </div>
  );
};

const PropertiesPanel = ({ 
  selectedElement, 
  onUpdateElement,
  onDeleteElement,
  isDrawingMode,
  setIsDrawingMode,
  setIsElementCodeEditorOpen,
  setIsDiagramEditorOpen,
  theme
}: { 
  selectedElement: VideoElement | null; 
  onUpdateElement: (updates: Partial<VideoElement>) => void; 
  onDeleteElement: () => void;
  isDrawingMode: boolean;
  setIsDrawingMode: (val: boolean) => void;
  setIsElementCodeEditorOpen: (val: boolean) => void;
  setIsDiagramEditorOpen: (val: boolean) => void;
  theme: 'light' | 'dark';
}) => {
  const { showToast } = useToast();
  const [isImageSearchOpen, setIsImageSearchOpen] = useState(false);

  if (!selectedElement) {
    return (
      <aside className={cn(
        "w-72 border-l p-4 flex flex-col items-center justify-center transition-colors duration-300",
        theme === 'dark' ? "bg-zinc-950 border-white/10 text-zinc-600" : "bg-white border-zinc-200 text-zinc-400"
      )}>
        <Settings className="w-8 h-8 mb-2 opacity-20" />
        <p className="text-xs text-center font-medium">Select an element to edit properties</p>
      </aside>
    );
  }

  const handleAddRow = () => {
    if (selectedElement.type !== 'table') return;
    const newRow = new Array(selectedElement.headers.length).fill('New Cell');
    onUpdateElement({ rows: [...selectedElement.rows, newRow] });
  };

  const handleRemoveRow = () => {
    if (selectedElement.type !== 'table' || selectedElement.rows.length <= 1) return;
    onUpdateElement({ rows: selectedElement.rows.slice(0, -1) });
  };

  const handleAddColumn = () => {
    if (selectedElement.type !== 'table') return;
    onUpdateElement({ 
      headers: [...selectedElement.headers, `Col ${selectedElement.headers.length + 1}`],
      rows: selectedElement.rows.map(row => [...row, 'New Cell'])
    });
  };

  const handleRemoveColumn = () => {
    if (selectedElement.type !== 'table' || selectedElement.headers.length <= 1) return;
    onUpdateElement({ 
      headers: selectedElement.headers.slice(0, -1),
      rows: selectedElement.rows.map(row => row.slice(0, -1))
    });
  };

  return (
    <aside className={cn(
      "w-72 border-l p-4 flex flex-col gap-6 overflow-y-auto transition-colors duration-300",
      theme === 'dark' ? "bg-zinc-950 border-white/10" : "bg-white border-zinc-200"
    )}>
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-bold text-zinc-500 uppercase tracking-widest">Properties</h3>
        <div className="flex items-center gap-2">
          <button 
            onClick={() => onUpdateElement({ locked: !selectedElement.locked })}
            className={cn(
              "p-1.5 rounded transition-colors",
              selectedElement.locked ? "text-red-400 bg-red-400/10" : "text-zinc-500 hover:text-emerald-400"
            )}
            title={selectedElement.locked ? "Unlock Element" : "Lock Element"}
          >
            {selectedElement.locked ? <Lock className="w-4 h-4" /> : <Unlock className="w-4 h-4" />}
          </button>
          <button 
            onClick={onDeleteElement}
            className="p-1.5 rounded text-zinc-500 hover:text-red-400 transition-colors"
            title="Delete Element"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-2">
          <div className="space-y-2">
            <label className="text-[10px] font-bold text-zinc-500 uppercase">Position X</label>
            <input 
              type="number" 
              value={Math.round(selectedElement.x)}
              onChange={(e) => onUpdateElement({ x: parseInt(e.target.value) })}
              className={cn(
                "w-full border rounded-md px-3 py-2 text-sm focus:outline-none transition-colors",
                theme === 'dark' ? "bg-zinc-900 border-white/10 text-white" : "bg-white border-zinc-200 text-zinc-900"
              )}
            />
          </div>
          <div className="space-y-2">
            <label className="text-[10px] font-bold text-zinc-500 uppercase">Position Y</label>
            <input 
              type="number" 
              value={Math.round(selectedElement.y)}
              onChange={(e) => onUpdateElement({ y: parseInt(e.target.value) })}
              className={cn(
                "w-full border rounded-md px-3 py-2 text-sm focus:outline-none transition-colors",
                theme === 'dark' ? "bg-zinc-900 border-white/10 text-white" : "bg-white border-zinc-200 text-zinc-900"
              )}
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div className="space-y-2">
            <label className="text-[10px] font-bold text-zinc-500 uppercase">Width</label>
            <input 
              type="number" 
              value={Math.round(selectedElement.width)}
              onChange={(e) => onUpdateElement({ width: parseInt(e.target.value) })}
              className={cn(
                "w-full border rounded-md px-3 py-2 text-sm focus:outline-none transition-colors",
                theme === 'dark' ? "bg-zinc-900 border-white/10 text-white" : "bg-white border-zinc-200 text-zinc-900"
              )}
            />
          </div>
          <div className="space-y-2">
            <label className="text-[10px] font-bold text-zinc-500 uppercase">Height</label>
            <input 
              type="number" 
              value={Math.round(selectedElement.height)}
              onChange={(e) => onUpdateElement({ height: parseInt(e.target.value) })}
              className={cn(
                "w-full border rounded-md px-3 py-2 text-sm focus:outline-none transition-colors",
                theme === 'dark' ? "bg-zinc-900 border-white/10 text-white" : "bg-white border-zinc-200 text-zinc-900"
              )}
            />
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-[10px] font-bold text-zinc-500 uppercase">Animation</label>
          <select 
            value={selectedElement.animation.type}
            onChange={(e) => onUpdateElement({ animation: { ...selectedElement.animation, type: e.target.value as any } })}
            className={cn(
              "w-full border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500 transition-colors",
              theme === 'dark' ? "bg-zinc-900 border-white/10 text-white" : "bg-white border-zinc-200 text-zinc-900"
            )}
          >
            <option value="none">None (Static)</option>
            <option value="typewriter">Typewriter</option>
            <option value="word-reveal">Word Reveal</option>
            <option value="fade-in">Fade In</option>
            <option value="slide-in">Slide In</option>
            <option value="scale-in">Scale In</option>
            <option value="draw-stroke">Draw Stroke</option>
            <option value="row-by-row">Row by Row</option>
          </select>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div className="space-y-2">
            <label className="text-[10px] font-bold text-zinc-500 uppercase">Duration</label>
            <input 
              type="number" 
              step="0.1"
              value={selectedElement.animation.duration}
              onChange={(e) => onUpdateElement({ animation: { ...selectedElement.animation, duration: parseFloat(e.target.value) } })}
              className={cn(
                "w-full border rounded-md px-3 py-2 text-sm focus:outline-none transition-colors",
                theme === 'dark' ? "bg-zinc-900 border-white/10 text-white" : "bg-white border-zinc-200 text-zinc-900"
              )}
            />
          </div>
          <div className="space-y-2">
            <label className="text-[10px] font-bold text-zinc-500 uppercase">Delay</label>
            <input 
              type="number" 
              step="0.1"
              value={selectedElement.animation.delay}
              onChange={(e) => onUpdateElement({ animation: { ...selectedElement.animation, delay: parseFloat(e.target.value) } })}
              className={cn(
                "w-full border rounded-md px-3 py-2 text-sm focus:outline-none transition-colors",
                theme === 'dark' ? "bg-zinc-900 border-white/10 text-white" : "bg-white border-zinc-200 text-zinc-900"
              )}
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div className="space-y-2">
            <label className="text-[10px] font-bold text-zinc-500 uppercase">Bg Color</label>
            <div className="flex gap-2">
              <input 
                type="color" 
                value={selectedElement.backgroundColor || '#000000'}
                onChange={(e) => onUpdateElement({ backgroundColor: e.target.value })}
                className={cn(
                  "w-8 h-8 rounded-md border cursor-pointer overflow-hidden p-0 transition-colors",
                  theme === 'dark' ? "bg-zinc-900 border-white/10" : "bg-white border-zinc-200"
                )}
              />
              <input 
                type="text"
                value={selectedElement.backgroundColor || '#000000'}
                onChange={(e) => onUpdateElement({ backgroundColor: e.target.value })}
                className={cn(
                  "flex-1 border rounded-md px-2 py-1 text-[10px] focus:outline-none transition-colors",
                  theme === 'dark' ? "bg-zinc-900 border-white/10 text-white" : "bg-white border-zinc-200 text-zinc-900"
                )}
              />
            </div>
          </div>
          {selectedElement.type === 'text' && (
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-zinc-500 uppercase">Text Color</label>
              <div className="flex gap-2">
                <input 
                  type="color" 
                  value={(selectedElement as any).color || '#ffffff'}
                  onChange={(e) => onUpdateElement({ color: e.target.value })}
                  className={cn(
                    "w-8 h-8 rounded-md border cursor-pointer overflow-hidden p-0 transition-colors",
                    theme === 'dark' ? "bg-zinc-900 border-white/10" : "bg-white border-zinc-200"
                  )}
                />
                <input 
                  type="text"
                  value={(selectedElement as any).color || '#ffffff'}
                  onChange={(e) => onUpdateElement({ color: e.target.value })}
                  className={cn(
                    "flex-1 border rounded-md px-2 py-1 text-[10px] focus:outline-none transition-colors",
                    theme === 'dark' ? "bg-zinc-900 border-white/10 text-white" : "bg-white border-zinc-200 text-zinc-900"
                  )}
                />
              </div>
            </div>
          )}
        </div>

        <div className="h-[1px] bg-white/5" />

        {(selectedElement.type === 'text' || selectedElement.type === 'shape') && (
          <div className="space-y-4 border-t border-white/5 pt-4">
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-zinc-500 uppercase">Font Family</label>
              <select 
                value={(selectedElement as any).fontFamily || 'Inter'}
                onChange={(e) => onUpdateElement({ fontFamily: e.target.value })}
                className={cn(
                  "w-full border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500 transition-colors",
                  theme === 'dark' ? "bg-zinc-900 border-white/10 text-white" : "bg-white border-zinc-200 text-zinc-900"
                )}
              >
                <option value="Inter">Inter</option>
                <option value="Space Grotesk">Space Grotesk</option>
                <option value="Playfair Display">Playfair Display</option>
                <option value="JetBrains Mono">JetBrains Mono</option>
                <option value="Georgia">Georgia</option>
                <option value="Arial">Arial</option>
              </select>
            </div>

            <div className="flex items-center gap-2">
              <button 
                onClick={() => onUpdateElement({ fontWeight: (selectedElement as any).fontWeight === 'bold' ? 'normal' : 'bold' })}
                className={cn(
                  "flex-1 py-2 rounded border transition-all flex items-center justify-center",
                  (selectedElement as any).fontWeight === 'bold' 
                    ? "bg-emerald-500/20 border-emerald-500/50 text-emerald-400" 
                    : (theme === 'dark' ? "bg-zinc-900 border-white/10 text-zinc-400 hover:text-white" : "bg-white border-zinc-200 text-zinc-500 hover:text-zinc-900")
                )}
                title="Bold"
              >
                <Bold className="w-4 h-4" />
              </button>
              <button 
                onClick={() => onUpdateElement({ fontStyle: (selectedElement as any).fontStyle === 'italic' ? 'normal' : 'italic' })}
                className={cn(
                  "flex-1 py-2 rounded border transition-all flex items-center justify-center",
                  (selectedElement as any).fontStyle === 'italic' 
                    ? "bg-emerald-500/20 border-emerald-500/50 text-emerald-400" 
                    : "bg-zinc-900 border-white/10 text-zinc-400 hover:text-white"
                )}
                title="Italic"
              >
                <Italic className="w-4 h-4" />
              </button>
            </div>

            <div className="flex items-center gap-1 bg-zinc-900 p-1 rounded-md border border-white/10">
              <button 
                onClick={() => onUpdateElement({ textAlign: 'left' })}
                className={cn(
                  "flex-1 py-1.5 rounded transition-all flex items-center justify-center",
                  (selectedElement as any).textAlign === 'left' ? "bg-zinc-800 text-white" : "text-zinc-500 hover:text-zinc-300"
                )}
              >
                <AlignLeft className="w-4 h-4" />
              </button>
              <button 
                onClick={() => onUpdateElement({ textAlign: 'center' })}
                className={cn(
                  "flex-1 py-1.5 rounded transition-all flex items-center justify-center",
                  (selectedElement as any).textAlign === 'center' ? "bg-zinc-800 text-white" : "text-zinc-500 hover:text-zinc-300"
                )}
              >
                <AlignCenter className="w-4 h-4" />
              </button>
              <button 
                onClick={() => onUpdateElement({ textAlign: 'right' })}
                className={cn(
                  "flex-1 py-1.5 rounded transition-all flex items-center justify-center",
                  (selectedElement as any).textAlign === 'right' ? "bg-zinc-800 text-white" : "text-zinc-500 hover:text-zinc-300"
                )}
              >
                <AlignRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {selectedElement.type === 'diagram' && (
          <div className="space-y-4 border-t border-white/5 pt-4">
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-zinc-500 uppercase">Diagram Tools</label>
              <button 
                onClick={() => setIsDrawingMode(!isDrawingMode)}
                className={cn(
                  "w-full flex items-center justify-center gap-2 py-2 rounded-md text-xs font-bold transition-all",
                  isDrawingMode 
                    ? "bg-emerald-500 text-black" 
                    : (theme === 'dark' ? "bg-zinc-900 border border-white/10 text-white hover:bg-zinc-800" : "bg-zinc-100 border border-zinc-200 text-zinc-900 hover:bg-zinc-200")
                )}
              >
                <PenTool className="w-4 h-4" />
                {isDrawingMode ? 'Drawing Mode: ON' : 'Start Drawing'}
              </button>
            </div>
          </div>
        )}

        {selectedElement.type === 'image' && (
          <div className="space-y-4 border-t border-white/5 pt-4">
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-zinc-500 uppercase">Image Source</label>
              <div className="flex flex-col gap-2">
                <input 
                  type="text"
                  placeholder="Paste image URL..."
                  value={(selectedElement as ImageElement).src}
                  onChange={(e) => onUpdateElement({ src: e.target.value })}
                  className={cn(
                    "w-full border rounded-md px-3 py-2 text-xs focus:outline-none transition-colors",
                    theme === 'dark' ? "bg-zinc-900 border-white/10 text-white" : "bg-white border-zinc-200 text-zinc-900"
                  )}
                />
                <div className="flex gap-2">
                  <button 
                    onClick={() => setIsImageSearchOpen(true)}
                    className={cn(
                      "flex-1 flex items-center justify-center gap-2 border rounded-md px-3 py-2 text-xs transition-colors",
                      theme === 'dark' ? "bg-zinc-800 hover:bg-zinc-700 border-white/10 text-white" : "bg-zinc-100 hover:bg-zinc-200 border-zinc-200 text-zinc-900"
                    )}
                  >
                    <Eye className="w-3 h-3" />
                    Browse Online
                  </button>
                  <div className="relative flex-1">
                    <input 
                      type="file"
                      accept="image/*"
                      onChange={async (e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          const reader = new FileReader();
                          reader.onloadend = () => {
                            onUpdateElement({ src: reader.result as string });
                          };
                          reader.readAsDataURL(file);
                        }
                      }}
                      className="hidden"
                      id="image-upload"
                    />
                    <label 
                      htmlFor="image-upload"
                      className={cn(
                        "flex items-center justify-center gap-2 w-full border rounded-md px-3 py-2 text-xs cursor-pointer transition-colors",
                        theme === 'dark' ? "bg-zinc-800 hover:bg-zinc-700 border-white/10 text-white" : "bg-zinc-100 hover:bg-zinc-200 border-zinc-200 text-zinc-900"
                      )}
                    >
                      <Download className="w-3 h-3" />
                      Upload File
                    </label>
                  </div>
                </div>
              </div>
            </div>
            <ImageSearchModal 
              isOpen={isImageSearchOpen} 
              onClose={() => setIsImageSearchOpen(false)} 
              onSelect={(url) => onUpdateElement({ src: url })} 
            />
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-zinc-500 uppercase">Object Fit</label>
              <select 
                value={(selectedElement as ImageElement).objectFit || 'cover'}
                onChange={(e) => onUpdateElement({ objectFit: e.target.value as any })}
                className={cn(
                  "w-full border rounded-md px-3 py-2 text-sm focus:outline-none transition-colors",
                  theme === 'dark' ? "bg-zinc-900 border-white/10 text-white" : "bg-white border-zinc-200 text-zinc-900"
                )}
              >
                <option value="cover">Cover</option>
                <option value="contain">Contain</option>
                <option value="fill">Fill</option>
              </select>
            </div>
          </div>
        )}

        {selectedElement.type === 'video' && (
          <div className="space-y-4 border-t border-white/5 pt-4">
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-zinc-500 uppercase">Video Source</label>
              <div className="flex flex-col gap-2">
                <input 
                  type="text"
                  placeholder="Paste video URL..."
                  value={(selectedElement as any).src}
                  onChange={(e) => onUpdateElement({ src: e.target.value })}
                  className={cn(
                    "w-full border rounded-md px-3 py-2 text-xs focus:outline-none transition-colors",
                    theme === 'dark' ? "bg-zinc-900 border-white/10 text-white" : "bg-white border-zinc-200 text-zinc-900"
                  )}
                />
                <div className="flex items-center gap-2">
                  <input 
                    type="file" 
                    accept="video/*"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      // Convert to base64 so it persists in localStorage
                      const reader = new FileReader();
                      reader.onloadend = () => {
                        onUpdateElement({ src: reader.result as string });
                        showToast('Video uploaded. Tip: use a URL for large files — base64 can slow localStorage.', 'info');
                      };
                      reader.readAsDataURL(file);
                    }}
                    className="hidden"
                    id="video-upload"
                  />
                  <label 
                    htmlFor="video-upload"
                    className={cn(
                      "flex-1 flex items-center justify-center gap-2 border rounded-md px-3 py-2 text-xs transition-colors cursor-pointer",
                      theme === 'dark' ? "bg-zinc-800 hover:bg-zinc-700 border-white/10 text-white" : "bg-zinc-100 hover:bg-zinc-200 border-zinc-200 text-zinc-900"
                    )}
                  >
                    <Download className="w-3 h-3" />
                    Upload Video
                  </label>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <button 
                onClick={() => onUpdateElement({ muted: !(selectedElement as any).muted })}
                className={cn(
                  "py-2 rounded border transition-all text-[10px] font-bold",
                  (selectedElement as any).muted 
                    ? "bg-emerald-500/20 border-emerald-500 text-emerald-400" 
                    : (theme === 'dark' ? "bg-zinc-900 border-white/10 text-zinc-400" : "bg-white border-zinc-200 text-zinc-500")
                )}
              >
                { (selectedElement as any).muted ? 'MUTED' : 'UNMUTED' }
              </button>
              <button 
                onClick={() => onUpdateElement({ loop: !(selectedElement as any).loop })}
                className={cn(
                  "py-2 rounded border transition-all text-[10px] font-bold",
                  (selectedElement as any).loop 
                    ? "bg-emerald-500/20 border-emerald-500 text-emerald-400" 
                    : (theme === 'dark' ? "bg-zinc-900 border-white/10 text-zinc-400" : "bg-white border-zinc-200 text-zinc-500")
                )}
              >
                { (selectedElement as any).loop ? 'LOOP ON' : 'LOOP OFF' }
              </button>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-bold text-zinc-500 uppercase">Object Fit</label>
              <select 
                value={(selectedElement as any).objectFit || 'cover'}
                onChange={(e) => onUpdateElement({ objectFit: e.target.value as any })}
                className={cn(
                  "w-full border rounded-md px-3 py-2 text-sm focus:outline-none transition-colors",
                  theme === 'dark' ? "bg-zinc-900 border-white/10 text-white" : "bg-white border-zinc-200 text-zinc-900"
                )}
              >
                <option value="cover">Cover</option>
                <option value="contain">Contain</option>
                <option value="fill">Fill</option>
              </select>
            </div>
          </div>
        )}

        {selectedElement.type === 'shape' && (
          <div className="space-y-4 border-t border-white/5 pt-4">
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-zinc-500 uppercase">Shape Text</label>
              <textarea 
                value={(selectedElement as ShapeElement).text || ''}
                onChange={(e) => onUpdateElement({ text: e.target.value })}
                placeholder="Add text to shape..."
                className={cn(
                  "w-full border rounded-md px-3 py-2 text-xs focus:outline-none min-h-[60px] resize-none transition-colors",
                  theme === 'dark' ? "bg-zinc-900 border-white/10 text-white" : "bg-white border-zinc-200 text-zinc-900"
                )}
              />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-zinc-500 uppercase">Text Color</label>
              <div className="flex gap-2">
                <input 
                  type="color" 
                  value={(selectedElement as ShapeElement).color || '#ffffff'}
                  onChange={(e) => onUpdateElement({ color: e.target.value })}
                  className={cn(
                    "w-8 h-8 rounded-md border cursor-pointer overflow-hidden p-0 transition-colors",
                    theme === 'dark' ? "bg-zinc-900 border-white/10" : "bg-white border-zinc-200"
                  )}
                />
                <input 
                  type="text"
                  value={(selectedElement as ShapeElement).color || '#ffffff'}
                  onChange={(e) => onUpdateElement({ color: e.target.value })}
                  className={cn(
                    "flex-1 border rounded-md px-2 py-1 text-[10px] focus:outline-none transition-colors",
                    theme === 'dark' ? "bg-zinc-900 border-white/10 text-white" : "bg-white border-zinc-200 text-zinc-900"
                  )}
                />
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-zinc-500 uppercase">Font Size</label>
              <input 
                type="number" 
                value={(selectedElement as ShapeElement).fontSize || 16}
                onChange={(e) => onUpdateElement({ fontSize: parseInt(e.target.value) })}
                className="w-full bg-zinc-900 border border-white/10 rounded-md px-3 py-2 text-sm text-white focus:outline-none"
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <button 
                onClick={() => onUpdateElement({ fontWeight: (selectedElement as any).fontWeight === 'bold' ? 'normal' : 'bold' })}
                className={cn(
                  "flex-1 py-2 rounded border transition-all flex items-center justify-center",
                  (selectedElement as any).fontWeight === 'bold' 
                    ? "bg-emerald-500/20 border-emerald-500/50 text-emerald-400" 
                    : "bg-zinc-900 border-white/10 text-zinc-400 hover:text-white"
                )}
                title="Bold"
              >
                <Bold className="w-4 h-4" />
              </button>
              <button 
                onClick={() => onUpdateElement({ fontStyle: (selectedElement as any).fontStyle === 'italic' ? 'normal' : 'italic' })}
                className={cn(
                  "flex-1 py-2 rounded border transition-all flex items-center justify-center",
                  (selectedElement as any).fontStyle === 'italic' 
                    ? "bg-emerald-500/20 border-emerald-500/50 text-emerald-400" 
                    : "bg-zinc-900 border-white/10 text-zinc-400 hover:text-white"
                )}
                title="Italic"
              >
                <Italic className="w-4 h-4" />
              </button>
            </div>

            <div className="flex items-center gap-1 bg-zinc-900 p-1 rounded-md border border-white/10">
              <button 
                onClick={() => onUpdateElement({ textAlign: 'left' })}
                className={cn(
                  "flex-1 py-1.5 rounded transition-all flex items-center justify-center",
                  (selectedElement as any).textAlign === 'left' ? "bg-zinc-800 text-white" : "text-zinc-500 hover:text-zinc-300"
                )}
              >
                <AlignLeft className="w-4 h-4" />
              </button>
              <button 
                onClick={() => onUpdateElement({ textAlign: 'center' })}
                className={cn(
                  "flex-1 py-1.5 rounded transition-all flex items-center justify-center",
                  (selectedElement as any).textAlign === 'center' ? "bg-zinc-800 text-white" : "text-zinc-500 hover:text-zinc-300"
                )}
              >
                <AlignCenter className="w-4 h-4" />
              </button>
              <button 
                onClick={() => onUpdateElement({ textAlign: 'right' })}
                className={cn(
                  "flex-1 py-1.5 rounded transition-all flex items-center justify-center",
                  (selectedElement as any).textAlign === 'right' ? "bg-zinc-800 text-white" : "text-zinc-500 hover:text-zinc-300"
                )}
              >
                <AlignRight className="w-4 h-4" />
              </button>
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-zinc-500 uppercase">Shape Type</label>
              <select 
                value={(selectedElement as ShapeElement).shapeType}
                onChange={(e) => onUpdateElement({ shapeType: e.target.value as any })}
                className="w-full bg-zinc-900 border border-white/10 rounded-md px-3 py-2 text-sm text-white focus:outline-none"
              >
                <option value="rect">Rectangle</option>
                <option value="circle">Circle</option>
                <option value="triangle">Triangle</option>
                <option value="star">Star</option>
                <option value="pentagon">Pentagon</option>
                <option value="arrow">Arrow</option>
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-zinc-500 uppercase">Fill Color</label>
              <div className="flex gap-2">
                <input 
                  type="color" 
                  value={(selectedElement as ShapeElement).fill}
                  onChange={(e) => onUpdateElement({ fill: e.target.value })}
                  className="w-8 h-8 rounded-md bg-zinc-900 border border-white/10 cursor-pointer overflow-hidden p-0"
                />
                <input 
                  type="text"
                  value={(selectedElement as ShapeElement).fill}
                  onChange={(e) => onUpdateElement({ fill: e.target.value })}
                  className="flex-1 bg-zinc-900 border border-white/10 rounded-md px-2 py-1 text-[10px] text-white focus:outline-none"
                />
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-zinc-500 uppercase">Border</label>
              <div className="grid grid-cols-2 gap-2">
                <div className="flex gap-2">
                  <input 
                    type="color" 
                    value={(selectedElement as ShapeElement).stroke === 'none' ? '#000000' : (selectedElement as ShapeElement).stroke}
                    onChange={(e) => onUpdateElement({ stroke: e.target.value })}
                    className="w-8 h-8 rounded-md bg-zinc-900 border border-white/10 cursor-pointer overflow-hidden p-0"
                  />
                  <button 
                    onClick={() => onUpdateElement({ stroke: (selectedElement as ShapeElement).stroke === 'none' ? '#ffffff' : 'none' })}
                    className={cn(
                      "flex-1 text-[10px] rounded border transition-colors",
                      (selectedElement as ShapeElement).stroke === 'none' ? "bg-emerald-500/20 border-emerald-500 text-emerald-400" : "bg-zinc-900 border-white/10 text-zinc-400"
                    )}
                  >
                    {(selectedElement as ShapeElement).stroke === 'none' ? 'Disabled' : 'Enabled'}
                  </button>
                </div>
                <input 
                  type="number"
                  min="0"
                  max="20"
                  value={(selectedElement as ShapeElement).strokeWidth || 0}
                  onChange={(e) => onUpdateElement({ strokeWidth: parseInt(e.target.value) })}
                  className="w-full bg-zinc-900 border border-white/10 rounded-md px-3 py-2 text-sm text-white focus:outline-none"
                />
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-zinc-500 uppercase">Border Style</label>
              <select 
                value={(selectedElement as ShapeElement).strokeStyle || 'solid'}
                onChange={(e) => onUpdateElement({ strokeStyle: e.target.value as any })}
                className="w-full bg-zinc-900 border border-white/10 rounded-md px-3 py-2 text-sm text-white focus:outline-none"
              >
                <option value="solid">Solid</option>
                <option value="dashed">Dashed</option>
                <option value="dotted">Dotted</option>
              </select>
            </div>
            {(selectedElement as ShapeElement).shapeType === 'rect' && (
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-zinc-500 uppercase">Corner Radius</label>
                <input 
                  type="range"
                  min="0"
                  max="50"
                  value={(selectedElement as ShapeElement).borderRadius || 0}
                  onChange={(e) => onUpdateElement({ borderRadius: parseInt(e.target.value) })}
                  className="w-full"
                />
              </div>
            )}
          </div>
        )}

        {selectedElement.type === 'code' && (
          <div className="space-y-4 border-t border-white/5 pt-4">
            <div className="flex items-center justify-between">
              <label className="text-[10px] font-bold text-zinc-500 uppercase">Code Editor</label>
              <button 
                onClick={() => setIsElementCodeEditorOpen(true)}
                className="text-[10px] text-emerald-500 hover:text-emerald-400 font-bold uppercase flex items-center gap-1"
              >
                <Maximize2 className="w-3 h-3" />
                Full Editor
              </button>
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-zinc-500 uppercase">Language</label>
              <select 
                value={(selectedElement as any).language || 'javascript'}
                onChange={(e) => onUpdateElement({ language: e.target.value })}
                className="w-full bg-zinc-900 border border-white/10 rounded-md px-3 py-2 text-sm text-white focus:outline-none"
              >
                <option value="javascript">JavaScript</option>
                <option value="typescript">TypeScript</option>
                <option value="python">Python</option>
                <option value="html">HTML</option>
                <option value="css">CSS</option>
                <option value="json">JSON</option>
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-zinc-500 uppercase">Code Preview</label>
              <textarea 
                value={(selectedElement as any).code}
                onChange={(e) => onUpdateElement({ code: e.target.value })}
                className="w-full bg-zinc-900 border border-white/10 rounded-md px-3 py-2 text-sm font-mono text-emerald-400 focus:outline-none min-h-[150px] resize-none"
                spellCheck={false}
              />
            </div>
          </div>
        )}
        {selectedElement.type === 'text' && (
          <div className="space-y-4">
            <div className="space-y-2">
              <textarea 
                value={selectedElement.content}
                onChange={(e) => onUpdateElement({ content: e.target.value })}
                className="w-full bg-zinc-900 border border-white/10 rounded-md px-3 py-2 text-sm text-white focus:outline-none min-h-[100px]"
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-zinc-500 uppercase">Font Size</label>
                <input 
                  type="number" 
                  value={selectedElement.fontSize}
                  onChange={(e) => onUpdateElement({ fontSize: parseInt(e.target.value) })}
                  className="w-full bg-zinc-900 border border-white/10 rounded-md px-3 py-2 text-sm text-white focus:outline-none"
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-zinc-500 uppercase">Weight</label>
                <button 
                  onClick={() => onUpdateElement({ fontWeight: selectedElement.fontWeight === 'bold' || selectedElement.fontWeight === '800' ? '400' : '800' })}
                  className={cn(
                    "w-full h-9 rounded-md border flex items-center justify-center transition-all",
                    (selectedElement.fontWeight === 'bold' || selectedElement.fontWeight === '800') ? "bg-emerald-500/20 border-emerald-500 text-emerald-400" : "bg-zinc-900 border-white/10 text-zinc-400"
                  )}
                >
                  <Bold className="w-4 h-4" />
                </button>
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-zinc-500 uppercase">Alignment</label>
              <div className="flex bg-zinc-900 border border-white/10 rounded-md p-1">
                {(['left', 'center', 'right'] as const).map((align) => (
                  <button
                    key={align}
                    onClick={() => onUpdateElement({ textAlign: align })}
                    className={cn(
                      "flex-1 flex items-center justify-center py-1.5 rounded transition-all",
                      selectedElement.textAlign === align ? "bg-zinc-800 text-emerald-400" : "text-zinc-500 hover:text-zinc-300"
                    )}
                  >
                    {align === 'left' && <AlignLeft className="w-4 h-4" />}
                    {align === 'center' && <AlignCenter className="w-4 h-4" />}
                    {align === 'right' && <AlignRight className="w-4 h-4" />}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {selectedElement.type === 'diagram' && (
          <div className="space-y-4 border-t border-white/5 pt-4">
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-zinc-500 uppercase">Diagram Animation</label>
              <button 
                onClick={() => setIsDiagramEditorOpen(true)}
                className="w-full flex items-center justify-center gap-2 bg-emerald-500 hover:bg-emerald-400 text-black rounded-md px-3 py-2 text-xs font-bold transition-colors"
              >
                <Maximize2 className="w-3 h-3" />
                Open Animation Editor
              </button>
            </div>
            
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-zinc-500 uppercase">Background</label>
              <div className="flex items-center gap-2">
                <input 
                  type="color" 
                  value={selectedElement.backgroundColor && selectedElement.backgroundColor !== 'transparent' ? selectedElement.backgroundColor : '#000000'}
                  onChange={(e) => onUpdateElement({ backgroundColor: e.target.value })}
                  className="w-8 h-8 rounded bg-transparent border-none cursor-pointer"
                />
                <button 
                  onClick={() => onUpdateElement({ backgroundColor: selectedElement.backgroundColor === 'transparent' ? '#000000' : 'transparent' })}
                  className={cn(
                    "flex-1 h-8 rounded-md border text-[10px] font-bold transition-all",
                    (!selectedElement.backgroundColor || selectedElement.backgroundColor === 'transparent') ? "bg-emerald-500/20 border-emerald-500 text-emerald-400" : "bg-zinc-900 border-white/10 text-zinc-400"
                  )}
                >
                  {(!selectedElement.backgroundColor || selectedElement.backgroundColor === 'transparent') ? 'TRANSPARENT ON' : 'TRANSPARENT OFF'}
                </button>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-zinc-500 uppercase">FPS</label>
                <input 
                  type="number" 
                  value={(selectedElement as DiagramElement).fps || 12}
                  onChange={(e) => onUpdateElement({ fps: parseInt(e.target.value) })}
                  className="w-full bg-zinc-900 border border-white/10 rounded-md px-3 py-2 text-sm text-white focus:outline-none"
                />
              </div>
              <div className="space-y-2 flex flex-col justify-end">
                <button 
                  onClick={() => onUpdateElement({ loop: !(selectedElement as DiagramElement).loop })}
                  className={cn(
                    "h-9 rounded-md border flex items-center justify-center gap-2 transition-all text-[10px] font-bold",
                    (selectedElement as DiagramElement).loop ? "bg-emerald-500/20 border-emerald-500 text-emerald-400" : "bg-zinc-900 border-white/10 text-zinc-400"
                  )}
                >
                  <History className="w-3 h-3" />
                  { (selectedElement as DiagramElement).loop ? 'LOOP ON' : 'LOOP OFF' }
                </button>
              </div>
            </div>
          </div>
        )}

        {selectedElement.type === 'table' && (
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-zinc-500 uppercase">Rows</label>
              <div className="flex gap-2">
                <button 
                  onClick={handleAddRow}
                  className="flex-1 bg-zinc-900 border border-white/10 rounded-md py-2 text-xs hover:bg-zinc-800 flex items-center justify-center gap-1"
                >
                  <Plus className="w-3 h-3" /> Add
                </button>
                <button 
                  onClick={handleRemoveRow}
                  className="flex-1 bg-zinc-900 border border-white/10 rounded-md py-2 text-xs hover:bg-zinc-800 flex items-center justify-center gap-1 text-red-400"
                >
                  <Minus className="w-3 h-3" /> Remove
                </button>
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-zinc-500 uppercase">Columns</label>
              <div className="flex gap-2">
                <button 
                  onClick={handleAddColumn}
                  className="flex-1 bg-zinc-900 border border-white/10 rounded-md py-2 text-xs hover:bg-zinc-800 flex items-center justify-center gap-1"
                >
                  <Plus className="w-3 h-3" /> Add
                </button>
                <button 
                  onClick={handleRemoveColumn}
                  className="flex-1 bg-zinc-900 border border-white/10 rounded-md py-2 text-xs hover:bg-zinc-800 flex items-center justify-center gap-1 text-red-400"
                >
                  <Minus className="w-3 h-3" /> Remove
                </button>
              </div>
            </div>

            <div className="h-[1px] bg-white/5" />
            
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-zinc-500 uppercase">Edit Headers</label>
              <div className="space-y-2">
                {selectedElement.headers.map((header, i) => (
                  <input 
                    key={i}
                    value={header}
                    onChange={(e) => {
                      const newHeaders = [...selectedElement.headers];
                      newHeaders[i] = e.target.value;
                      onUpdateElement({ headers: newHeaders });
                    }}
                    className="w-full bg-zinc-900 border border-white/10 rounded-md px-3 py-1.5 text-xs text-white focus:outline-none"
                  />
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-bold text-zinc-500 uppercase">Edit Cells</label>
              <div className="space-y-2 max-h-48 overflow-y-auto pr-2">
                {selectedElement.rows.map((row, ri) => (
                  <div key={ri} className="flex gap-2">
                    {row.map((cell, ci) => (
                      <input 
                        key={ci}
                        value={cell}
                        onChange={(e) => {
                          const newRows = [...selectedElement.rows];
                          newRows[ri] = [...newRows[ri]];
                          newRows[ri][ci] = e.target.value;
                          onUpdateElement({ rows: newRows });
                        }}
                        className="flex-1 min-w-0 bg-zinc-900 border border-white/10 rounded-md px-2 py-1 text-[10px] text-white focus:outline-none"
                      />
                    ))}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </aside>
  );
};

const PreviewModal = ({ 
  project, 
  isOpen, 
  onClose 
}: { 
  project: Project; 
  isOpen: boolean; 
  onClose: () => void;
}) => {
  const [currentIdx, setCurrentIdx] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true);
  const allScenes = project.episodes.flatMap(ep => ep.scenes);

  useEffect(() => {
    if (!isPlaying || !isOpen) return;
    
    const timer = setTimeout(() => {
      if (currentIdx < allScenes.length - 1) {
        setCurrentIdx(prev => prev + 1);
      } else {
        setIsPlaying(false);
      }
    }, allScenes[currentIdx].duration * 1000);

    return () => clearTimeout(timer);
  }, [currentIdx, isPlaying, isOpen, allScenes]);

  if (!isOpen) return null;

  const currentScene = allScenes[currentIdx];

  return (
    <div className="fixed inset-0 z-[200] bg-black flex flex-col items-center justify-center">
      <button 
        onClick={onClose}
        className="absolute top-6 right-6 p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition-all"
      >
        <X className="w-6 h-6" />
      </button>

      <div className={cn(
        "video-preview-canvas bg-black relative overflow-hidden",
        project.aspectRatio === '16:9' ? 'aspect-video w-full max-w-6xl' : 
        project.aspectRatio === '9:16' ? 'aspect-[9/16] h-[90vh]' : 'aspect-square w-full max-w-3xl'
      )}>
        <AnimatePresence mode="wait">
          <motion.div 
            key={currentScene.id}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="w-full h-full relative"
          >
            {currentScene.elements.map((el) => (
              <ElementRenderer 
                key={el.id} 
                element={el} 
                isSelected={false}
                onSelect={() => {}}
                onDragEnd={() => {}}
                isDrawingMode={false}
                isPlaying={isPlaying}
              />
            ))}
          </motion.div>
        </AnimatePresence>
        <SceneAudioPlayer audio={currentScene.audio} isPlaying={isPlaying} sceneId={currentScene.id} />
      </div>

      <div className="mt-8 flex items-center gap-6">
        <div className="flex items-center gap-2">
          {allScenes.map((_, i) => (
            <div 
              key={i}
              className={cn(
                "h-1 rounded-full transition-all",
                i === currentIdx ? "w-8 bg-emerald-500" : "w-2 bg-white/20"
              )}
            />
          ))}
        </div>
        <button 
          onClick={() => setIsPlaying(!isPlaying)}
          className="w-12 h-12 rounded-full bg-white text-black flex items-center justify-center hover:scale-110 transition-all"
        >
          {isPlaying ? <Pause className="w-6 h-6 fill-current" /> : <Play className="w-6 h-6 fill-current ml-1" />}
        </button>
      </div>
    </div>
  );
};

const ElementCodeEditor = ({ 
  element, 
  onUpdate, 
  isOpen, 
  onClose 
}: { 
  element: CodeElement; 
  onUpdate: (updates: Partial<CodeElement>) => void; 
  isOpen: boolean; 
  onClose: () => void;
}) => {
  const [code, setCode] = useState(element.code);

  const handleSave = () => {
    onUpdate({ code });
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[200] bg-zinc-950/90 backdrop-blur-sm flex items-center justify-center p-12">
      <div className="bg-zinc-900 border border-white/10 rounded-2xl w-full max-w-4xl h-full flex flex-col overflow-hidden shadow-2xl">
        <div className="p-4 border-b border-white/10 flex items-center justify-between bg-zinc-950">
          <div className="flex items-center gap-2 font-mono text-sm text-zinc-400">
            <Terminal className="w-4 h-4" />
            {element.language || 'code'} editor
          </div>
          <div className="flex items-center gap-2">
            <button onClick={onClose} className="px-4 py-1.5 text-sm text-zinc-400 hover:text-white transition-colors">Cancel</button>
            <button onClick={handleSave} className="px-4 py-1.5 bg-emerald-500 text-black rounded-md text-sm font-bold hover:bg-emerald-400 transition-colors">Save Changes</button>
          </div>
        </div>
        <textarea 
          value={code}
          onChange={(e) => setCode(e.target.value)}
          className="flex-1 bg-transparent p-6 font-mono text-sm text-emerald-400 focus:outline-none resize-none"
          spellCheck={false}
          autoFocus
        />
      </div>
    </div>
  );
};

const DiagramAnimationEditor = ({ 
  element, 
  onUpdate, 
  isOpen, 
  onClose 
}: { 
  element: DiagramElement; 
  onUpdate: (updates: Partial<DiagramElement>) => void; 
  isOpen: boolean; 
  onClose: () => void;
}) => {
  const [diagram, setDiagram] = useState<DiagramElement>(JSON.parse(JSON.stringify(element)));
  const [currentFrameIdx, setCurrentFrameIdx] = useState(element.currentFrameIndex || 0);
  const [selectedLayerId, setSelectedLayerId] = useState(element.frames?.[0]?.layers?.[0]?.id || '');
  const [tool, setTool] = useState<'pen' | 'eraser' | 'select'>('pen');
  const [color, setColor] = useState('#10b981');
  const [strokeWidth, setStrokeWidth] = useState(3);
  const [isDrawing, setIsDrawing] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [showLayers, setShowLayers] = useState(false);
  
  const canvasRef = useRef<SVGSVGElement>(null);

  const currentFrame = diagram.frames[currentFrameIdx];
  const currentLayer = currentFrame.layers.find(l => l.id === selectedLayerId) || currentFrame.layers[0];

  useEffect(() => {
    let interval: any;
    if (isPlaying) {
      interval = setInterval(() => {
        setCurrentFrameIdx(prev => (prev + 1) % diagram.frames.length);
      }, 1000 / diagram.fps);
    }
    return () => clearInterval(interval);
  }, [isPlaying, diagram.frames.length, diagram.fps]);

  const handleMouseDown = (e: React.MouseEvent) => {
    if (tool === 'select' || currentLayer.locked) return;
    setIsDrawing(true);
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    
    // Scale coordinates based on SVG viewBox vs actual size
    const scaleX = 1000 / rect.width;
    const scaleY = 1000 / rect.height;
    const x = (e.clientX - rect.left) * scaleX;
    const y = (e.clientY - rect.top) * scaleY;
    
    const newPath: DrawingPath = {
      id: Math.random().toString(36).substring(2, 11),
      points: [{ x, y }],
      color: tool === 'eraser' ? '#000000' : color, // Eraser uses background color or transparent
      width: strokeWidth * scaleX,
      style: tool === 'eraser' ? 'eraser' : 'pencil'
    };

    updateCurrentLayer({ paths: [...currentLayer.paths, newPath] });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDrawing || currentLayer.locked) return;
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    
    const scaleX = 1000 / rect.width;
    const scaleY = 1000 / rect.height;
    const x = (e.clientX - rect.left) * scaleX;
    const y = (e.clientY - rect.top) * scaleY;

    const lastPath = currentLayer.paths[currentLayer.paths.length - 1];
    const updatedPath = { ...lastPath, points: [...lastPath.points, { x, y }] };
    
    const newPaths = [...currentLayer.paths];
    newPaths[newPaths.length - 1] = updatedPath;
    updateCurrentLayer({ paths: newPaths });
  };

  const handleMouseUp = () => setIsDrawing(false);

  const updateCurrentLayer = (updates: Partial<DiagramLayer>) => {
    setDiagram(prev => {
      const newFrames = [...prev.frames];
      const frame = { ...newFrames[currentFrameIdx] };
      frame.layers = frame.layers.map(l => l.id === selectedLayerId ? { ...l, ...updates } : l);
      newFrames[currentFrameIdx] = frame;
      return { ...prev, frames: newFrames };
    });
  };

  const addFrame = () => {
    const newFrame: DiagramFrame = {
      id: Math.random().toString(36).substring(2, 11),
      layers: diagram.frames[currentFrameIdx].layers.map(l => ({
        ...l,
        id: Math.random().toString(36).substring(2, 11),
        paths: [],
        nodes: [],
        edges: []
      }))
    };
    const newFrames = [...diagram.frames];
    newFrames.splice(currentFrameIdx + 1, 0, newFrame);
    setDiagram({ ...diagram, frames: newFrames });
    setCurrentFrameIdx(currentFrameIdx + 1);
  };

  const duplicateFrame = () => {
    const newFrame = JSON.parse(JSON.stringify(diagram.frames[currentFrameIdx]));
    newFrame.id = Math.random().toString(36).substring(2, 11);
    const newFrames = [...diagram.frames];
    newFrames.splice(currentFrameIdx + 1, 0, newFrame);
    setDiagram({ ...diagram, frames: newFrames });
    setCurrentFrameIdx(currentFrameIdx + 1);
  };

  const deleteFrame = () => {
    if (diagram.frames.length <= 1) return;
    const newFrames = diagram.frames.filter((_, i) => i !== currentFrameIdx);
    setDiagram({ ...diagram, frames: newFrames });
    setCurrentFrameIdx(Math.max(0, currentFrameIdx - 1));
  };

  const addLayer = () => {
    const newLayerId = Math.random().toString(36).substring(2, 11);
    setDiagram(prev => ({
      ...prev,
      frames: prev.frames.map(f => ({
        ...f,
        layers: [
          {
            id: newLayerId,
            name: `Layer ${f.layers.length + 1}`,
            visible: true,
            locked: false,
            paths: [],
            nodes: [],
            edges: []
          },
          ...f.layers
        ]
      }))
    }));
    setSelectedLayerId(newLayerId);
  };

  const handleSave = () => {
    onUpdate(diagram);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[400] bg-zinc-950 flex flex-col overflow-hidden">
      {/* Top Bar */}
      <div className="h-14 bg-zinc-900 border-b border-white/10 flex items-center justify-between px-4">
        <div className="flex items-center gap-4">
          <button onClick={onClose} className="p-2 hover:bg-white/5 rounded-full text-zinc-400 hover:text-white transition-colors">
            <X className="w-5 h-5" />
          </button>
          <div className="h-6 w-[1px] bg-white/10" />
          <div className="flex items-center gap-2">
            <History className="w-4 h-4 text-emerald-500" />
            <span className="text-sm font-bold text-white">Animation Editor</span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1 bg-zinc-950 rounded-lg p-1 border border-white/10">
            <button 
              onClick={() => setTool('pen')}
              className={cn("p-2 rounded-md transition-all", tool === 'pen' ? "bg-emerald-500 text-black" : "text-zinc-400 hover:text-white")}
            >
              <PenTool className="w-4 h-4" />
            </button>
            <button 
              onClick={() => setTool('eraser')}
              className={cn("p-2 rounded-md transition-all", tool === 'eraser' ? "bg-emerald-500 text-black" : "text-zinc-400 hover:text-white")}
            >
              <Eraser className="w-4 h-4" />
            </button>
            <button 
              onClick={() => setTool('select')}
              className={cn("p-2 rounded-md transition-all", tool === 'select' ? "bg-emerald-500 text-black" : "text-zinc-400 hover:text-white")}
            >
              <MousePointer2 className="w-4 h-4" />
            </button>
          </div>

          <div className="h-6 w-[1px] bg-white/10" />

          <div className="flex items-center gap-2">
            <div className="flex flex-col items-center">
              <label className="text-[8px] text-zinc-500 uppercase font-bold">Stroke</label>
              <input 
                type="color" 
                value={color}
                onChange={(e) => setColor(e.target.value)}
                className="w-6 h-6 rounded bg-transparent border-none cursor-pointer"
              />
            </div>
            <div className="flex flex-col items-center">
              <label className="text-[8px] text-zinc-500 uppercase font-bold">Bg</label>
              <input 
                type="color" 
                value={diagram.backgroundColor && diagram.backgroundColor !== 'transparent' ? diagram.backgroundColor : '#000000'}
                onChange={(e) => setDiagram({ ...diagram, backgroundColor: e.target.value })}
                className="w-6 h-6 rounded bg-transparent border-none cursor-pointer"
              />
            </div>
            <input 
              type="range"
              min="1"
              max="50"
              value={strokeWidth}
              onChange={(e) => setStrokeWidth(parseInt(e.target.value))}
              className="w-24 accent-emerald-500"
            />
          </div>

          <div className="h-6 w-[1px] bg-white/10" />

          <button onClick={handleSave} className="px-6 py-1.5 bg-emerald-500 text-black rounded-lg text-sm font-bold hover:bg-emerald-400 transition-all">
            Apply Changes
          </button>
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* Left Toolbar */}
        <div className="w-16 bg-zinc-900 border-r border-white/10 flex flex-col items-center py-4 gap-4">
          <button 
            onClick={() => setDiagram({ ...diagram, onionSkin: !diagram.onionSkin })}
            className={cn("p-3 rounded-xl transition-all", diagram.onionSkin ? "bg-emerald-500/20 text-emerald-400" : "text-zinc-500 hover:text-white")}
            title="Onion Skin"
          >
            <Layers className="w-6 h-6" />
          </button>
          <button 
            onClick={() => setDiagram({ ...diagram, gridVisible: !diagram.gridVisible })}
            className={cn("p-3 rounded-xl transition-all", diagram.gridVisible ? "bg-emerald-500/20 text-emerald-400" : "text-zinc-500 hover:text-white")}
            title="Toggle Grid"
          >
            <Grid className="w-6 h-6" />
          </button>
        </div>

        {/* Main Canvas Area */}
        <div className="flex-1 relative bg-zinc-950 flex items-center justify-center p-8">
          <div 
            className="w-full h-full max-w-4xl aspect-video rounded-lg shadow-2xl relative overflow-hidden ring-1 ring-white/10"
            style={{ 
              backgroundColor: diagram.backgroundColor || 'transparent',
              backgroundImage: (!diagram.backgroundColor || diagram.backgroundColor === 'transparent') 
                ? 'linear-gradient(45deg, #111 25%, transparent 25%), linear-gradient(-45deg, #111 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #111 75%), linear-gradient(-45deg, transparent 75%, #111 75%)' 
                : 'none',
              backgroundSize: '20px 20px',
              backgroundPosition: '0 0, 0 10px, 10px -10px, -10px 0px'
            }}
          >
            {diagram.gridVisible && (
              <div className="absolute inset-0 pointer-events-none opacity-10" style={{ 
                backgroundImage: 'radial-gradient(circle, white 1px, transparent 1px)',
                backgroundSize: '20px 20px'
              }} />
            )}
            
            <svg 
              ref={canvasRef}
              viewBox="0 0 1000 1000"
              className="w-full h-full touch-none"
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onMouseLeave={handleMouseUp}
            >
              {/* Onion Skin Previous Frame */}
              {diagram.onionSkin && currentFrameIdx > 0 && (
                <g opacity="0.2">
                  {diagram.frames[currentFrameIdx - 1].layers.map(layer => (
                    layer.visible && layer.paths.map(path => (
                      <path 
                        key={path.id}
                        d={`M ${path.points.map(p => `${p.x},${p.y}`).join(' L ')}`}
                        stroke={path.color}
                        strokeWidth={path.width}
                        fill="none"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    ))
                  ))}
                </g>
              )}

              {/* Current Frame Layers */}
              {currentFrame.layers.slice().reverse().map(layer => (
                layer.visible && (
                  <g key={layer.id} opacity={layer.locked ? 0.5 : 1}>
                    {layer.paths.map(path => (
                      <path 
                        key={path.id}
                        d={`M ${path.points.map(p => `${p.x},${p.y}`).join(' L ')}`}
                        stroke={path.style === 'eraser' ? '#000000' : path.color}
                        strokeWidth={path.width}
                        fill="none"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    ))}
                  </g>
                )
              ))}
            </svg>
          </div>

          {/* Layer Panel Overlay */}
          <AnimatePresence>
            {showLayers && (
              <motion.div 
                initial={{ x: 300 }}
                animate={{ x: 0 }}
                exit={{ x: 300 }}
                className="absolute top-0 right-0 bottom-0 w-72 bg-zinc-900 border-l border-white/10 shadow-2xl z-50 flex flex-col"
              >
                <div className="p-4 border-b border-white/10 flex items-center justify-between">
                  <h3 className="text-sm font-bold text-white">Layers</h3>
                  <button onClick={addLayer} className="p-1 hover:bg-white/5 rounded text-emerald-500">
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
                <div className="flex-1 overflow-y-auto p-2 space-y-1">
                  {currentFrame.layers.map(layer => (
                    <div 
                      key={layer.id}
                      onClick={() => setSelectedLayerId(layer.id)}
                      className={cn(
                        "flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-all group",
                        selectedLayerId === layer.id ? "bg-emerald-500/10 ring-1 ring-emerald-500/50" : "hover:bg-white/5"
                      )}
                    >
                      <div className="flex flex-col gap-1">
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            updateCurrentLayer({ visible: !layer.visible });
                          }}
                          className={cn("p-1 rounded", layer.visible ? "text-zinc-400" : "text-red-500")}
                        >
                          {layer.visible ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
                        </button>
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            updateCurrentLayer({ locked: !layer.locked });
                          }}
                          className={cn("p-1 rounded", layer.locked ? "text-emerald-500" : "text-zinc-400")}
                        >
                          {layer.locked ? <Lock className="w-3 h-3" /> : <Unlock className="w-3 h-3" />}
                        </button>
                      </div>
                      <span className={cn("text-xs flex-1", selectedLayerId === layer.id ? "text-white font-bold" : "text-zinc-400")}>
                        {layer.name}
                      </span>
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          const newLayers = currentFrame.layers.filter(l => l.id !== layer.id);
                          if (newLayers.length === 0) return;
                          setDiagram(prev => {
                            const newFrames = [...prev.frames];
                            newFrames[currentFrameIdx] = { ...newFrames[currentFrameIdx], layers: newLayers };
                            return { ...prev, frames: newFrames };
                          });
                          if (selectedLayerId === layer.id) setSelectedLayerId(newLayers[0].id);
                        }}
                        className="opacity-0 group-hover:opacity-100 p-1 hover:text-red-500 transition-all"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Bottom Timeline */}
      <div className="h-32 bg-zinc-900 border-t border-white/10 flex flex-col">
        <div className="h-10 border-b border-white/5 flex items-center px-4 justify-between">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1">
              <button onClick={() => setCurrentFrameIdx(Math.max(0, currentFrameIdx - 1))} className="p-1 hover:bg-white/5 rounded text-zinc-400">
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="text-[10px] font-mono text-emerald-500 w-12 text-center">
                {currentFrameIdx + 1} / {diagram.frames.length}
              </span>
              <button onClick={() => setCurrentFrameIdx(Math.min(diagram.frames.length - 1, currentFrameIdx + 1))} className="p-1 hover:bg-white/5 rounded text-zinc-400">
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
            <div className="h-4 w-[1px] bg-white/10" />
            <button 
              onClick={() => setIsPlaying(!isPlaying)}
              className={cn("flex items-center gap-2 px-3 py-1 rounded-full text-[10px] font-bold transition-all", isPlaying ? "bg-red-500 text-white" : "bg-emerald-500 text-black")}
            >
              {isPlaying ? <Pause className="w-3 h-3 fill-current" /> : <Play className="w-3 h-3 fill-current" />}
              {isPlaying ? 'STOP' : 'PLAY'}
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button onClick={addFrame} className="flex items-center gap-2 px-3 py-1 bg-zinc-800 hover:bg-zinc-700 text-white rounded-md text-[10px] font-bold transition-all">
              <Plus className="w-3 h-3" /> Add Frame
            </button>
            <button onClick={duplicateFrame} className="flex items-center gap-2 px-3 py-1 bg-zinc-800 hover:bg-zinc-700 text-white rounded-md text-[10px] font-bold transition-all">
              <Copy className="w-3 h-3" /> Duplicate
            </button>
            <button onClick={deleteFrame} className="flex items-center gap-2 px-3 py-1 bg-red-500/10 hover:bg-red-500/20 text-red-500 rounded-md text-[10px] font-bold transition-all">
              <Trash2 className="w-3 h-3" /> Delete
            </button>
            <div className="h-4 w-[1px] bg-white/10 mx-2" />
            <button 
              onClick={() => setShowLayers(!showLayers)}
              className={cn("flex items-center gap-2 px-3 py-1 rounded-md text-[10px] font-bold transition-all", showLayers ? "bg-emerald-500 text-black" : "bg-zinc-800 text-white")}
            >
              <Layers className="w-3 h-3" /> Layers
            </button>
          </div>
        </div>
        
        <div className="flex-1 overflow-x-auto flex items-center px-4 gap-2 scrollbar-hide">
          {diagram.frames.map((frame, i) => (
            <button 
              key={frame.id}
              onClick={() => setCurrentFrameIdx(i)}
              className={cn(
                "flex-shrink-0 w-20 h-14 rounded-md border-2 transition-all relative overflow-hidden bg-black group",
                currentFrameIdx === i ? "border-emerald-500 scale-105 shadow-lg shadow-emerald-500/20" : "border-white/10 hover:border-white/30"
              )}
            >
              <span className="absolute top-1 left-1 text-[8px] font-mono text-zinc-500 z-10">{i + 1}</span>
              <svg viewBox="0 0 1000 1000" className="w-full h-full opacity-50 group-hover:opacity-100 transition-opacity">
                {frame.layers.map(layer => layer.paths.map(path => (
                  <path 
                    key={path.id}
                    d={`M ${path.points.map(p => `${p.x},${p.y}`).join(' L ')}`}
                    stroke={path.color}
                    strokeWidth={path.width * 2}
                    fill="none"
                  />
                )))}
              </svg>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

// ─── Cheat Sheet data ────────────────────────────────────────────────────────

const CHEAT_SHEET_TABS = [
  { id: 'structure', label: 'Structure' },
  { id: 'elements', label: 'Elements' },
  { id: 'animations', label: 'Animations' },
  { id: 'theme', label: 'Theme' },
  { id: 'example', label: 'Example' },
];

const CHEAT_SHEET_CONTENT: Record<string, { title: string; desc: string; rows?: [string, string, string][]; code?: string }[]> = {
  structure: [
    { title: 'Project root', desc: 'Top-level object that wraps everything.', rows: [
      ['id', 'string', '"1"'],
      ['name', 'string', '"My Video"'],
      ['aspectRatio', '"16:9" | "9:16" | "1:1"', '"16:9"'],
      ['episodes', 'Episode[]', '[{ ... }]'],
      ['theme', 'Theme object', '{ primary: "#10b981" }'],
    ]},
    { title: 'Episode', desc: 'A chapter containing scenes.', rows: [
      ['id', 'string', '"ep1"'],
      ['name', 'string', '"Episode 1"'],
      ['scenes', 'Scene[]', '[{ ... }]'],
    ]},
    { title: 'Scene', desc: 'One screen of content with a background and elements.', rows: [
      ['id', 'string', '"s1"'],
      ['name', 'string', '"Intro"'],
      ['duration', 'number (seconds)', '5'],
      ['background', 'hex color', '"#0a0a0a"'],
      ['backgroundImage', 'url (optional)', '"https://..."'],
      ['backgroundType', '"color" | "image"', '"color"'],
      ['frame', '"none"|"modern"|"classic"|"retro"|"cinematic"', '"none"'],
      ['elements', 'Element[]', '[{ ... }]'],
      ['audio', 'SceneAudio (optional)', '{ src, volume, loop }'],
    ]},
    { title: 'SceneAudio', desc: 'Optional voiceover or soundtrack for a scene.', rows: [
      ['src', 'URL or base64 string', '"https://example.com/narration.mp3"'],
      ['volume', 'number 0-1', '1'],
      ['loop', 'boolean', 'false'],
      ['startAt', 'number (seconds, optional)', '0'],
    ]},
  ],
  elements: [
    { title: 'Shared fields (all elements)', desc: 'Every element type requires these.', rows: [
      ['id', 'string', '"e1"'],
      ['type', '"text"|"table"|"image"|"shape"|"code"|"video"|"diagram"', '"text"'],
      ['x', 'number (px from left)', '100'],
      ['y', 'number (px from top)', '200'],
      ['width', 'number (px)', '600'],
      ['height', 'number (px)', '80'],
      ['animation', 'AnimationConfig', '{ type: "fade-in", duration: 0.8, delay: 0 }'],
      ['backgroundColor', 'hex (optional)', '"transparent"'],
    ]},
    { title: 'text', desc: 'Displays styled text with animations.', rows: [
      ['content', 'string', '"Hello World"'],
      ['fontSize', 'number (px)', '48'],
      ['fontWeight', '"400"|"500"|"700"|"800"', '"800"'],
      ['color', 'hex', '"#ffffff"'],
      ['textAlign', '"left"|"center"|"right"', '"left"'],
      ['fontFamily', 'string (optional)', '"Inter"'],
      ['fontStyle', '"normal"|"italic"', '"normal"'],
    ]},
    { title: 'table', desc: 'Data table with animated row-by-row reveal.', rows: [
      ['headers', 'string[]', '["Name", "Value"]'],
      ['rows', 'string[][]', '[["Row1", "Data"]]'],
    ]},
    { title: 'image', desc: 'Photo or illustration.', rows: [
      ['src', 'url string', '"https://source.unsplash.com/800x600/?tech"'],
      ['alt', 'string', '"Description"'],
      ['objectFit', '"cover"|"contain"|"fill"', '"cover"'],
    ]},
    { title: 'video', desc: 'Embedded video clip.', rows: [
      ['src', 'url string', '"https://example.com/clip.mp4"'],
      ['muted', 'boolean', 'true'],
      ['loop', 'boolean', 'true'],
      ['autoplay', 'boolean', 'true'],
      ['objectFit', '"cover"|"contain"|"fill"', '"cover"'],
    ]},
    { title: 'shape', desc: 'SVG shape with optional label text.', rows: [
      ['shapeType', '"rect"|"circle"|"arrow"|"triangle"|"star"|"pentagon"', '"rect"'],
      ['fill', 'hex', '"#10b981"'],
      ['stroke', 'hex or "none"', '"none"'],
      ['strokeWidth', 'number', '2'],
      ['strokeStyle', '"solid"|"dashed"|"dotted"', '"solid"'],
      ['borderRadius', 'number (rect only)', '8'],
      ['text', 'string (optional label)', '"Click me"'],
      ['color', 'hex (text color)', '"#ffffff"'],
    ]},
    { title: 'code', desc: 'Syntax-highlighted code block.', rows: [
      ['code', 'string', '"console.log(\"Hello\")"'],
      ['language', '"javascript"|"typescript"|"python"|"html"|"css"|"json"', '"javascript"'],
    ]},
  ],
  animations: [
    { title: 'AnimationConfig fields', desc: 'Add this object to any element.', rows: [
      ['type', 'AnimationType (see below)', '"typewriter"'],
      ['duration', 'number (seconds)', '1.2'],
      ['delay', 'number (seconds)', '0.5'],
      ['stagger', 'number (optional)', '0.1'],
    ]},
    { title: 'Animation types', desc: 'Use these exact strings for the type field.', rows: [
      ['"none"', 'Element appears instantly', '—'],
      ['"typewriter"', 'Characters appear one by one', 'Best for: text headlines'],
      ['"word-reveal"', 'Words rise in one by one', 'Best for: body text'],
      ['"fade-in"', 'Fades from invisible to visible', 'Best for: images, shapes'],
      ['"slide-in"', 'Slides in from the left', 'Best for: text, cards'],
      ['"scale-in"', 'Scales up from zero', 'Best for: logos, images'],
      ['"draw-stroke"', 'Path draws itself', 'Best for: diagrams'],
      ['"row-by-row"', 'Table rows appear one by one', 'Best for: tables'],
    ]},
    { title: 'Timing tips', desc: '', rows: [
      ['delay', 'Seconds after scene start before animation begins', '0.5'],
      ['duration', 'Seconds to complete the animation', '1.2'],
      ['scene.duration', 'Must be ≥ delay + duration to fully show', '5'],
    ]},
  ],
  theme: [
    { title: 'Theme object', desc: 'Set once at the project level.', rows: [
      ['primary', 'hex — main accent color', '"#10b981"'],
      ['secondary', 'hex — supporting color', '"#064e3b"'],
      ['background', 'hex — default scene background', '"#0a0a0a"'],
      ['text', 'hex — default text color', '"#ffffff"'],
      ['accent', 'hex — highlight / pop color', '"#34d399"'],
    ]},
    { title: 'Canvas coordinates', desc: '1280×720 coordinate space (HD).', rows: [
      ['Full-width title', 'x:80  y:280  w:1120  h:80', ''],
      ['Left column', 'x:80  y:160  w:520  h:400', ''],
      ['Right column', 'x:680  y:120  w:520  h:480', ''],
      ['Centered block', 'x:140  y:180  w:1000  h:360', ''],
      ['Top title', 'x:80  y:80  w:1120  h:80', ''],
      ['Body below title', 'x:80  y:200  w:900  h:300', ''],
    ]},
    { title: 'Aspect ratios', desc: '', rows: [
      ['"16:9"', '1280×720 — YouTube, presentations', ''],
      ['"9:16"', '720×1280 — TikTok, Reels, Shorts', ''],
      ['"1:1"', '720×720 — Instagram square', ''],
    ]},
  ],
  example: [],
};

const EXAMPLE_JSON = `{
  "id": "1",
  "name": "How Blockchain Works",
  "aspectRatio": "16:9",
  "theme": {
    "primary": "#10b981",
    "secondary": "#064e3b",
    "background": "#0a0a0a",
    "text": "#ffffff",
    "accent": "#34d399"
  },
  "episodes": [{
    "id": "ep1",
    "name": "Episode 1",
    "scenes": [
      {
        "id": "s1",
        "name": "Title",
        "duration": 5,
        "background": "#0a0a0a",
        "elements": [
          {
            "id": "e1",
            "type": "text",
            "content": "How Blockchain Works",
            "x": 80, "y": 280,
            "width": 1120, "height": 80,
            "fontSize": 64,
            "fontWeight": "800",
            "color": "#ffffff",
            "textAlign": "left",
            "animation": {
              "type": "typewriter",
              "duration": 1.5,
              "delay": 0.3
            }
          },
          {
            "id": "e2",
            "type": "text",
            "content": "A decentralised ledger explained",
            "x": 80, "y": 380,
            "width": 800, "height": 50,
            "fontSize": 28,
            "fontWeight": "400",
            "color": "#10b981",
            "textAlign": "left",
            "animation": {
              "type": "word-reveal",
              "duration": 1,
              "delay": 1.2
            }
          }
        ]
      },
      {
        "id": "s2",
        "name": "Comparison",
        "duration": 7,
        "background": "#050d0a",
        "elements": [
          {
            "id": "e3",
            "type": "table",
            "x": 100, "y": 100,
            "width": 1080, "height": 400,
            "headers": ["Feature", "Traditional DB", "Blockchain"],
            "rows": [
              ["Control", "Centralised", "Decentralised"],
              ["Transparency", "Private", "Public"],
              ["Immutability", "Editable", "Permanent"]
            ],
            "animation": {
              "type": "row-by-row",
              "duration": 0.5,
              "delay": 0.5
            }
          }
        ]
      }
    ]
  }]
}`;

const CheatSheetPanel = ({ theme }: { theme: 'light' | 'dark' }) => {
  const [activeTab, setActiveTab] = useState('structure');
  const isDark = theme === 'dark';

  const rows = CHEAT_SHEET_CONTENT[activeTab];

  return (
    <div className={cn(
      "flex flex-col h-full border-l overflow-hidden",
      isDark ? "bg-zinc-950 border-white/10" : "bg-zinc-50 border-zinc-200"
    )}>
      {/* Tab bar */}
      <div className={cn(
        "flex gap-0.5 p-1.5 border-b shrink-0",
        isDark ? "bg-zinc-900 border-white/10" : "bg-white border-zinc-200"
      )}>
        {CHEAT_SHEET_TABS.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={cn(
              "flex-1 py-1 text-[10px] font-bold uppercase tracking-wider rounded transition-all",
              activeTab === tab.id
                ? "bg-emerald-500 text-black"
                : isDark ? "text-zinc-500 hover:text-white" : "text-zinc-400 hover:text-zinc-800"
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-3 space-y-4">
        {activeTab === 'example' ? (
          <div>
            <p className={cn("text-[10px] font-bold uppercase tracking-wider mb-2", isDark ? "text-zinc-500" : "text-zinc-400")}>
              Full working project
            </p>
            <pre className={cn(
              "text-[10px] font-mono rounded-lg p-3 overflow-x-auto leading-relaxed whitespace-pre-wrap",
              isDark ? "bg-zinc-900 text-emerald-400" : "bg-zinc-100 text-emerald-700"
            )}>
              {EXAMPLE_JSON}
            </pre>
          </div>
        ) : (
          rows.map((section, si) => (
            <div key={si}>
              <p className="text-[11px] font-bold text-emerald-500 mb-0.5">{section.title}</p>
              {section.desc && (
                <p className={cn("text-[10px] mb-1.5", isDark ? "text-zinc-500" : "text-zinc-400")}>{section.desc}</p>
              )}
              {section.rows && (
                <table className="w-full text-[10px]">
                  <tbody>
                    {section.rows.map(([field, type, example], ri) => (
                      <tr key={ri} className={cn(
                        "border-b",
                        isDark ? "border-white/5" : "border-zinc-200"
                      )}>
                        <td className="py-1 pr-2 font-mono text-sky-400 whitespace-nowrap">{field}</td>
                        <td className={cn("py-1 pr-2", isDark ? "text-zinc-400" : "text-zinc-500")}>{type}</td>
                        <td className="py-1 font-mono text-amber-400 whitespace-nowrap">{example}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
};

// ─── Code Editor ─────────────────────────────────────────────────────────────

const CodeEditor = ({ 
  project, 
  setProject, 
  isOpen, 
  onClose,
  theme
}: { 
  project: Project; 
  setProject: (p: Project) => void; 
  isOpen: boolean; 
  onClose: () => void;
  theme: 'light' | 'dark';
}) => {
  const [code, setCode] = useState(JSON.stringify(project, null, 2));
  const [showCheatSheet, setShowCheatSheet] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const isDark = theme === 'dark';

  // Keep textarea in sync when project changes externally
  useEffect(() => {
    if (isOpen) setCode(JSON.stringify(project, null, 2));
  }, [isOpen]);

  const handleSave = () => {
    try {
      const parsed = JSON.parse(code);
      setProject(parsed);
      setError(null);
      onClose();
    } catch (e: any) {
      setError(e.message);
    }
  };

  const handleChange = (val: string) => {
    setCode(val);
    try {
      JSON.parse(val);
      setError(null);
    } catch (e: any) {
      setError(e.message);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[200] bg-black/80 backdrop-blur-sm flex items-center justify-center p-6">
      <div className={cn(
        "border rounded-2xl w-full h-full flex flex-col overflow-hidden shadow-2xl",
        isDark ? "bg-zinc-900 border-white/10" : "bg-white border-zinc-200"
      )}>
        {/* Header */}
        <div className={cn(
          "h-12 px-4 border-b flex items-center justify-between shrink-0",
          isDark ? "bg-zinc-950 border-white/10" : "bg-zinc-100 border-zinc-200"
        )}>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 font-mono text-sm text-zinc-400">
              <Terminal className="w-4 h-4" />
              project.json
            </div>
            {error && (
              <span className="text-[10px] font-bold text-red-400 bg-red-500/10 px-2 py-0.5 rounded">
                JSON Error: {error}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowCheatSheet(s => !s)}
              className={cn(
                "flex items-center gap-1.5 px-3 py-1 rounded text-[10px] font-bold uppercase tracking-wider transition-all border",
                showCheatSheet
                  ? "bg-emerald-500/20 border-emerald-500/50 text-emerald-400"
                  : isDark ? "border-white/10 text-zinc-500 hover:text-white" : "border-zinc-200 text-zinc-400 hover:text-zinc-800"
              )}
            >
              <Layout className="w-3 h-3" />
              Cheat Sheet
            </button>
            <button onClick={onClose} className={cn(
              "px-3 py-1 text-sm transition-colors",
              isDark ? "text-zinc-400 hover:text-white" : "text-zinc-500 hover:text-zinc-900"
            )}>Cancel</button>
            <button
              onClick={handleSave}
              disabled={!!error}
              className="px-4 py-1 bg-emerald-500 text-black rounded text-sm font-bold hover:bg-emerald-400 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
            >
              Apply Changes
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 flex overflow-hidden">
          {/* JSON editor */}
          <textarea
            value={code}
            onChange={(e) => handleChange(e.target.value)}
            className={cn(
              "flex-1 p-5 font-mono text-sm focus:outline-none resize-none leading-relaxed",
              isDark ? "bg-zinc-900 text-emerald-400" : "bg-white text-emerald-700",
              error && "border-r-2 border-red-500"
            )}
            spellCheck={false}
            autoFocus
          />

          {/* Cheat sheet panel */}
          {showCheatSheet && (
            <div className="w-80 shrink-0">
              <CheatSheetPanel theme={theme} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const AIAssistant = ({ 
  isOpen, 
  onClose, 
  onGenerate,
  theme
}: { 
  isOpen: boolean; 
  onClose: () => void; 
  onGenerate: (prompt: string) => void;
  theme: 'light' | 'dark';
}) => {
  const { showToast } = useToast();
  const [prompt, setPrompt] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleGenerate = async () => {
    if (!prompt.trim()) return;
    setIsGenerating(true);
    await onGenerate(prompt);
    setIsGenerating(false);
    onClose();
  };

  const handleFileUpload = async (file: File) => {
    if (file.type !== 'application/pdf') {
      showToast('Please upload a PDF file.', 'warning');
      return;
    }

    setIsGenerating(true);
    try {
      const text = await extractTextFromPDF(file);
      setPrompt(`Generate a video structure based on this content: \n\n${text}`);
    } catch (error) {
      console.error('Failed to parse PDF', error);
      showToast('Failed to parse PDF. Please try again.', 'error');
    } finally {
      setIsGenerating(false);
    }
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFileUpload(file);
  };

  if (!isOpen) return null;

  return (
    <div className={cn(
      "fixed inset-0 z-[300] backdrop-blur-md flex items-center justify-center p-6 transition-colors duration-300",
      theme === 'dark' ? "bg-zinc-950/90" : "bg-white/80"
    )}>
      <motion.div 
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className={cn(
          "border rounded-3xl w-full max-w-2xl overflow-hidden shadow-2xl transition-colors duration-300",
          theme === 'dark' ? "bg-zinc-900 border-white/10" : "bg-white border-zinc-200"
        )}
      >
        <div className="p-8">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/20 flex items-center justify-center">
              <Sparkles className="w-6 h-6 text-emerald-400" />
            </div>
            <div>
              <h2 className={cn("text-2xl font-bold", theme === 'dark' ? "text-white" : "text-zinc-900")}>AI Video Assistant</h2>
              <p className={cn("text-sm", theme === 'dark' ? "text-zinc-400" : "text-zinc-500")}>Describe your video or drop a PDF to generate structure.</p>
            </div>
            <button onClick={onClose} className={cn("ml-auto p-2 rounded-full transition-colors", theme === 'dark' ? "hover:bg-white/5 text-zinc-400" : "hover:bg-zinc-100 text-zinc-500")}>
              <X className="w-5 h-5" />
            </button>
          </div>

          <div 
            onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={onDrop}
            className={cn(
              "w-full h-40 border-2 border-dashed rounded-2xl p-4 flex flex-col items-center justify-center transition-all mb-6 group cursor-pointer",
              isDragging ? "border-emerald-500 bg-emerald-500/5" : (theme === 'dark' ? "border-white/10 hover:border-white/20" : "border-zinc-200 hover:border-zinc-300"),
              theme === 'dark' ? "bg-zinc-950" : "bg-zinc-50"
            )}
            onClick={() => fileInputRef.current?.click()}
          >
            <input 
              type="file" 
              ref={fileInputRef} 
              className="hidden" 
              accept="application/pdf"
              onChange={(e) => e.target.files?.[0] && handleFileUpload(e.target.files[0])}
            />
            <Download className={cn("w-8 h-8 mb-2 transition-all", isDragging ? "text-emerald-400" : "text-zinc-600 group-hover:text-zinc-400")} />
            <p className={cn("text-sm font-medium", theme === 'dark' ? "text-zinc-400" : "text-zinc-600")}>Drag & Drop PDF or Click to Upload</p>
            <p className="text-[10px] text-zinc-600 mt-1 uppercase tracking-widest">AI will analyze content</p>
          </div>

          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="e.g., Create a 3-scene video explaining how a blockchain works..."
            className={cn(
              "w-full h-32 border rounded-2xl p-4 focus:outline-none focus:border-emerald-500/50 transition-all resize-none mb-6",
              theme === 'dark' ? "bg-zinc-950 border-white/10 text-white placeholder:text-zinc-600" : "bg-zinc-50 border-zinc-200 text-zinc-900 placeholder:text-zinc-400"
            )}
          />

          <div className="flex items-center justify-end gap-4">
            <button 
              onClick={onClose}
              className={cn("px-6 py-2 transition-colors", theme === 'dark' ? "text-zinc-400 hover:text-white" : "text-zinc-500 hover:text-zinc-900")}
            >
              Cancel
            </button>
            <button 
              onClick={handleGenerate}
              disabled={isGenerating || !prompt.trim()}
              className="px-8 py-2 bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 disabled:hover:bg-emerald-500 text-black font-bold rounded-xl flex items-center gap-2 transition-all shadow-lg shadow-emerald-500/20"
            >
              {isGenerating ? (
                <>
                  <div className="w-4 h-4 border-2 border-black/30 border-t-black rounded-full animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  <Sparkles className="w-5 h-5" />
                  Generate
                </>
              )}
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

// --- Main App ---

export default function App() {
  return (
    <ToastProvider>
      <AppInner />
    </ToastProvider>
  );
}

function AppInner() {
  const { showToast } = useToast();
  const [project, setProject] = useState<Project>({
    id: '1',
    name: 'Untitled Explainer',
    aspectRatio: '16:9',
    episodes: [
      {
        id: 'ep1',
        name: 'Episode 1',
        scenes: [
          {
            id: 's1',
            name: 'Introduction',
            duration: 5,
            background: '#000000',
            elements: [
              {
                id: 'e1',
                type: 'text',
                content: 'Welcome to ExplainMotion',
                x: 100,
                y: 100,
                width: 600,
                height: 100,
                fontSize: 48,
                fontWeight: '800',
                color: '#ffffff',
                textAlign: 'left',
                animation: { type: 'typewriter', duration: 1, delay: 0.5 }
              }
            ]
          }
        ]
      }
    ],
    theme: {
      primary: '#10b981',
      secondary: '#064e3b',
      background: '#000000',
      text: '#ffffff',
      accent: '#34d399'
    }
  });

  const [currentEpisodeIndex, setCurrentEpisodeIndex] = useState(0);
  const [currentSceneIndex, setCurrentSceneIndex] = useState(0);
  const [undoStack, setUndoStack] = useState<Project[]>([]);
  const [redoStack, setRedoStack] = useState<Project[]>([]);
  const [theme, setTheme] = useState<'light' | 'dark'>('light');

  useEffect(() => {
    const hash = window.location.hash.substring(1);
    if (hash) {
      try {
        const decompressed = LZString.decompressFromEncodedURIComponent(hash);
        if (decompressed) {
          const sharedProject = JSON.parse(decompressed);
          setProject(sharedProject);
          return; // Skip localStorage if hash is present
        }
      } catch (e) {
        console.error('Failed to load shared project', e);
      }
    }

    const saved = localStorage.getItem('explain-motion-project');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setProject(parsed);
      } catch (e) {
        console.error('Failed to load project from localStorage', e);
      }
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('explain-motion-project', JSON.stringify(project));
  }, [project]);

  const handleShare = () => {
    const compressed = LZString.compressToEncodedURIComponent(JSON.stringify(project));
    const url = `${window.location.origin}${window.location.pathname}#${compressed}`;
    navigator.clipboard.writeText(url);
    showToast('Share link copied! Anyone with this link can view your project.', 'success');
  };

  const handleDownloadMP4 = async () => {
    // Open preview first so the canvas element exists in the DOM
    setIsPreviewOpen(true);
    // Wait a frame for the preview to mount
    await new Promise(r => setTimeout(r, 300));

    const previewCanvas = document.querySelector('.video-preview-canvas') as HTMLElement;
    if (!previewCanvas) {
      showToast('Preview could not be opened. Please try again.', 'error');
      return;
    }

    // captureStream works on <canvas> and on elements in Chrome/Firefox
    const stream = (previewCanvas as any).captureStream?.(30);
    if (!stream) {
      showToast('Screen capture not supported. Please use Chrome or Firefox.', 'error');
      return;
    }

    const mimeType = MediaRecorder.isTypeSupported('video/webm;codecs=vp9')
      ? 'video/webm;codecs=vp9'
      : 'video/webm';

    const recorder = new MediaRecorder(stream, { mimeType });
    const chunks: Blob[] = [];

    recorder.ondataavailable = (e) => { if (e.data.size > 0) chunks.push(e.data); };

    recorder.onstop = () => {
      const blob = new Blob(chunks, { type: 'video/webm' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${project.name || 'explain-motion'}.webm`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      setIsRecording(false);
      setRecordingProgress(0);
    };

    const ep = project.episodes[currentEpisodeIndex];
    const totalDuration = ep.scenes.reduce((acc, s) => acc + s.duration, 0);

    // Reset to start then play
    setCurrentSceneIndex(0);
    setIsPlaying(true);
    setIsRecording(true);
    setRecordingProgress(0);
    recorder.start(100);

    // Update progress bar every 250ms
    const startTime = Date.now();
    const progressInterval = setInterval(() => {
      const elapsed = (Date.now() - startTime) / 1000;
      setRecordingProgress(Math.min(100, Math.round((elapsed / totalDuration) * 100)));
    }, 250);

    setTimeout(() => {
      clearInterval(progressInterval);
      setRecordingProgress(100);
      recorder.stop();
      setIsPlaying(false);
    }, totalDuration * 1000 + 500);
  };

  const pushToHistory = (p: Project) => {
    setUndoStack(prev => [...prev.slice(-49), p]);
    setRedoStack([]);
  };

  const handleUndo = () => {
    if (undoStack.length === 0) return;
    const prev = undoStack[undoStack.length - 1];
    setRedoStack(r => [...r, project]);
    setUndoStack(u => u.slice(0, -1));
    setProject(prev);
  };

  const handleRedo = () => {
    if (redoStack.length === 0) return;
    const next = redoStack[redoStack.length - 1];
    setUndoStack(u => [...u, project]);
    setRedoStack(r => r.slice(0, -1));
    setProject(next);
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'z') {
        e.preventDefault();
        if (e.shiftKey) {
          handleRedo();
        } else {
          handleUndo();
        }
      } else if ((e.ctrlKey || e.metaKey) && e.key === 'y') {
        e.preventDefault();
        handleRedo();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [project, undoStack, redoStack]);

  const [selectedElementId, setSelectedElementId] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isAIModalOpen, setIsAIModalOpen] = useState(false);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [isCodeOpen, setIsCodeOpen] = useState(false);
  const [isElementCodeEditorOpen, setIsElementCodeEditorOpen] = useState(false);
  const [isDiagramEditorOpen, setIsDiagramEditorOpen] = useState(false);
  const [hideTools, setHideTools] = useState(false);
  const [isDrawingMode, setIsDrawingMode] = useState(false);
  const [isCanvasSettingsOpen, setIsCanvasSettingsOpen] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingProgress, setRecordingProgress] = useState(0);

  const handleApplyToAllScenes = (updates: Partial<Scene>) => {
    pushToHistory(project);
    setProject(prev => {
      const newEpisodes = prev.episodes.map(ep => ({
        ...ep,
        scenes: ep.scenes.map(s => ({
          ...s,
          ...updates
        }))
      }));
      return { ...prev, episodes: newEpisodes };
    });
  };

  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (isPlaying) {
      const currentEpisode = project.episodes[currentEpisodeIndex];
      const currentScene = currentEpisode.scenes[currentSceneIndex];
      
      timer = setTimeout(() => {
        if (currentSceneIndex < currentEpisode.scenes.length - 1) {
          setCurrentSceneIndex(prev => prev + 1);
        } else if (currentEpisodeIndex < project.episodes.length - 1) {
          setCurrentEpisodeIndex(prev => prev + 1);
          setCurrentSceneIndex(0);
        } else {
          setCurrentEpisodeIndex(0);
          setCurrentSceneIndex(0);
        }
      }, currentScene.duration * 1000);
    }
    return () => clearTimeout(timer);
  }, [isPlaying, currentSceneIndex, currentEpisodeIndex, project.episodes]);

  const currentEpisode = project.episodes[currentEpisodeIndex];
  const currentScene = currentEpisode.scenes[currentSceneIndex];
  const selectedElement = currentScene.elements.find(el => el.id === selectedElementId) || null;

  const handleAddElement = (type: ElementType) => {
    pushToHistory(project);
    const newElement: VideoElement = {
      id: Math.random().toString(36).substring(2, 11),
      type,
      x: 100,
      y: 200,
      width: 400,
      height: type === 'text' ? 60 : 200,
      animation: { type: 'fade-in', duration: 0.5, delay: 0 },
      ...(type === 'text' && { content: 'New Text', fontSize: 24, fontWeight: '500', color: '#ffffff', textAlign: 'left' }),
      ...(type === 'table' && { headers: ['Col 1', 'Col 2'], rows: [['Data 1', 'Data 2'], ['Data 3', 'Data 4']] }),
      ...(type === 'code' && { code: 'console.log("Hello World");', language: 'javascript' }),
      ...(type === 'image' && { 
        src: 'https://source.unsplash.com/800x600/?technology',
        alt: 'Placeholder',
        objectFit: 'cover'
      }),
      ...(type === 'video' && { 
        src: 'https://storage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4', 
        muted: true,
        loop: true,
        autoplay: true,
        objectFit: 'cover'
      }),
      ...(type === 'diagram' && { 
        frames: [{
          id: Math.random().toString(36).substring(2, 11),
          layers: [{
            id: Math.random().toString(36).substring(2, 11),
            name: 'Layer 1',
            visible: true,
            locked: false,
            paths: [],
            nodes: [{ id: 'n1', label: 'Start', x: 50, y: 50 }, { id: 'n2', label: 'End', x: 200, y: 50 }], 
            edges: [{ id: 'l1', from: 'n1', to: 'n2' }],
          }]
        }],
        currentFrameIndex: 0,
        fps: 12,
        loop: true,
        gridVisible: true,
        snapToGrid: true,
        gridSize: 20,
        backgroundColor: 'transparent'
      }),
      ...(type === 'shape' && { 
        shapeType: 'rect', 
        fill: '#10b981', 
        stroke: 'none',
        strokeWidth: 2,
        strokeStyle: 'solid',
        borderRadius: 0
      }),
    } as VideoElement;

    setProject(prev => {
      const newEpisodes = [...prev.episodes];
      const episode = { ...newEpisodes[currentEpisodeIndex] };
      const newScenes = [...episode.scenes];
      newScenes[currentSceneIndex] = {
        ...newScenes[currentSceneIndex],
        elements: [...newScenes[currentSceneIndex].elements, newElement]
      };
      episode.scenes = newScenes;
      newEpisodes[currentEpisodeIndex] = episode;
      return { ...prev, episodes: newEpisodes };
    });
    setSelectedElementId(newElement.id);
  };

  const handleUpdateElementSilent = (id: string, updates: Partial<VideoElement>) => {
    setProject(prev => {
      const newEpisodes = [...prev.episodes];
      const episode = { ...newEpisodes[currentEpisodeIndex] };
      const newScenes = [...episode.scenes];
      const scene = { ...newScenes[currentSceneIndex] };
      scene.elements = scene.elements.map(el =>
        el.id === id ? { ...el, ...updates } as VideoElement : el
      );
      newScenes[currentSceneIndex] = scene;
      episode.scenes = newScenes;
      newEpisodes[currentEpisodeIndex] = episode;
      return { ...prev, episodes: newEpisodes };
    });
  };

  const handleUpdateElement = (id: string, updates: Partial<VideoElement>, silent = false) => {
    if (!silent) pushToHistory(project);
    setProject(prev => {
      const newEpisodes = [...prev.episodes];
      const episode = { ...newEpisodes[currentEpisodeIndex] };
      const newScenes = [...episode.scenes];
      const scene = { ...newScenes[currentSceneIndex] };
      scene.elements = scene.elements.map(el => 
        el.id === id ? { ...el, ...updates } as VideoElement : el
      );
      newScenes[currentSceneIndex] = scene;
      episode.scenes = newScenes;
      newEpisodes[currentEpisodeIndex] = episode;
      return { ...prev, episodes: newEpisodes };
    });
  };

  const handleDeleteElement = (id: string) => {
    pushToHistory(project);
    setProject(prev => {
      const newEpisodes = [...prev.episodes];
      const episode = { ...newEpisodes[currentEpisodeIndex] };
      const newScenes = [...episode.scenes];
      const scene = { ...newScenes[currentSceneIndex] };
      scene.elements = scene.elements.filter(el => el.id !== id);
      newScenes[currentSceneIndex] = scene;
      episode.scenes = newScenes;
      newEpisodes[currentEpisodeIndex] = episode;
      return { ...prev, episodes: newEpisodes };
    });
    setSelectedElementId(null);
  };

  const handleUpdateScene = (index: number, updates: Partial<Scene>) => {
    pushToHistory(project);
    setProject(prev => {
      const newEpisodes = [...prev.episodes];
      const episode = { ...newEpisodes[currentEpisodeIndex] };
      const newScenes = [...episode.scenes];
      newScenes[index] = { ...newScenes[index], ...updates };
      episode.scenes = newScenes;
      newEpisodes[currentEpisodeIndex] = episode;
      return { ...prev, episodes: newEpisodes };
    });
  };

  const handleAddScene = () => {
    if (currentEpisode.scenes.length >= 60) {
      showToast("Maximum 60 scenes reached. Add a new episode.", "warning");
      return;
    }
    pushToHistory(project);
    const newScene: Scene = {
      id: Math.random().toString(36).substring(2, 11),
      name: `Scene ${currentEpisode.scenes.length + 1}`,
      duration: 5,
      background: '#000000',
      elements: []
    };
    setProject(prev => {
      const newEpisodes = [...prev.episodes];
      const episode = { ...newEpisodes[currentEpisodeIndex] };
      episode.scenes = [...episode.scenes, newScene];
      newEpisodes[currentEpisodeIndex] = episode;
      return { ...prev, episodes: newEpisodes };
    });
    setCurrentSceneIndex(currentEpisode.scenes.length);
  };

  const handleDeleteScene = (index: number) => {
    if (currentEpisode.scenes.length <= 1) return;
    pushToHistory(project);
    setProject(prev => {
      const newEpisodes = [...prev.episodes];
      const episode = { ...newEpisodes[currentEpisodeIndex] };
      episode.scenes = episode.scenes.filter((_, i) => i !== index);
      newEpisodes[currentEpisodeIndex] = episode;
      return { ...prev, episodes: newEpisodes };
    });
    if (currentSceneIndex >= index && currentSceneIndex > 0) {
      setCurrentSceneIndex(currentSceneIndex - 1);
    }
  };

  const handleAddEpisode = () => {
    pushToHistory(project);
    const newEpisode: Episode = {
      id: Math.random().toString(36).substring(2, 11),
      name: `Episode ${project.episodes.length + 1}`,
      scenes: [
        {
          id: Math.random().toString(36).substring(2, 11),
          name: 'Scene 1',
          duration: 5,
          background: '#000000',
          elements: []
        }
      ]
    };
    setProject(prev => ({
      ...prev,
      episodes: [...prev.episodes, newEpisode]
    }));
    setCurrentEpisodeIndex(project.episodes.length);
    setCurrentSceneIndex(0);
  };

  const handleAIGenerate = async (prompt: string) => {
    try {
      const structure = await generateVideoStructure(prompt);
      if (!structure.scenes || structure.scenes.length === 0) {
        showToast('AI could not generate structure. Try a different prompt.', 'error');
        return;
      }

      const newScenes: Scene[] = structure.scenes.map((s: any) => ({
        id: Math.random().toString(36).substring(2, 11),
        name: s.name || 'New Scene',
        duration: s.duration || 5,
        background: s.background || '#0a0a0a',
        elements: (s.elements || []).map((el: any) => {
          const base = {
            id: Math.random().toString(36).substring(2, 11),
            x: el.x ?? 100,
            y: el.y ?? 100,
            width: el.width ?? 400,
            height: el.height ?? 200,
            animation: el.animation || { type: 'fade-in', duration: 0.5, delay: 0 },
          };

          // Merge all fields Gemini returns, then layer our base on top
          return { ...el, ...base };
        })
      }));

      pushToHistory(project);
      const oldSceneCount = currentEpisode.scenes.length;
      setProject(prev => {
        const newEpisodes = [...prev.episodes];
        const episode = { ...newEpisodes[currentEpisodeIndex] };
        episode.scenes = [...episode.scenes, ...newScenes];
        newEpisodes[currentEpisodeIndex] = episode;
        return {
          ...prev,
          name: structure.name || prev.name,
          episodes: newEpisodes
        };
      });
      setCurrentSceneIndex(oldSceneCount);
    } catch (error: any) {
      console.error("AI Generation failed:", error);
      showToast(`AI failed: ${error?.message || 'Unknown error'}. Check GEMINI_API_KEY.`, 'error');
    }
  };

  return (
    <div className={cn(
      "h-screen flex flex-col transition-colors duration-300",
      theme === 'dark' ? "bg-zinc-950 text-white" : "bg-zinc-50 text-zinc-900"
    )}>
      <Navbar 
        project={project} 
        setProject={setProject} 
        onExport={handleDownloadMP4} 
        onToggleAI={() => setIsAIModalOpen(true)}
        onTogglePreview={() => setIsPreviewOpen(true)}
        onToggleCode={() => setIsCodeOpen(true)}
        hideTools={hideTools}
        setHideTools={setHideTools}
        onUndo={handleUndo}
        onRedo={handleRedo}
        canUndo={undoStack.length > 0}
        canRedo={redoStack.length > 0}
        theme={theme}
        setTheme={setTheme}
        onShare={handleShare}
        onDownload={handleDownloadMP4}
        isRecording={isRecording}
        recordingProgress={recordingProgress}
      />

      <div className="flex-1 flex overflow-hidden">
        {!hideTools && (
          <Sidebar 
            onAddElement={handleAddElement} 
            theme={theme} 
            onToggleCanvasSettings={() => setIsCanvasSettingsOpen(!isCanvasSettingsOpen)} 
          />
        )}
        
        {isCanvasSettingsOpen && !hideTools && (
          <CanvasSettings 
            scene={currentScene} 
            onUpdateScene={(updates) => handleUpdateScene(currentSceneIndex, updates)}
            onApplyToAll={handleApplyToAllScenes}
            theme={theme}
            onClose={() => setIsCanvasSettingsOpen(false)}
          />
        )}
        
        <main className="flex-1 flex flex-col overflow-hidden relative">
          {/* Main Canvas */}
          <Canvas 
            scene={currentScene} 
            aspectRatio={project.aspectRatio} 
            isPlaying={isPlaying}
            selectedElementId={selectedElementId}
            onSelectElement={setSelectedElementId}
            onUpdateElement={handleUpdateElement}
            onUpdateElementSilent={handleUpdateElementSilent}
            isDrawingMode={isDrawingMode}
            setIsDrawingMode={setIsDrawingMode}
            onOpenCodeEditor={() => setIsElementCodeEditorOpen(true)}
            onTogglePlay={() => setIsPlaying(!isPlaying)}
            onNextScene={() => {
              if (currentSceneIndex < currentEpisode.scenes.length - 1) {
                setCurrentSceneIndex(prev => prev + 1);
              } else if (currentEpisodeIndex < project.episodes.length - 1) {
                setCurrentEpisodeIndex(prev => prev + 1);
                setCurrentSceneIndex(0);
              }
            }}
            onPrevScene={() => {
              if (currentSceneIndex > 0) {
                setCurrentSceneIndex(prev => prev - 1);
              } else if (currentEpisodeIndex > 0) {
                const prevEpisode = project.episodes[currentEpisodeIndex - 1];
                setCurrentEpisodeIndex(prev => prev - 1);
                setCurrentSceneIndex(prevEpisode.scenes.length - 1);
              }
            }}
            theme={theme}
          />
          {!hideTools && (
            <Timeline 
              project={project} 
              currentEpisodeIndex={currentEpisodeIndex}
              setCurrentEpisodeIndex={setCurrentEpisodeIndex}
              currentSceneIndex={currentSceneIndex} 
              setCurrentSceneIndex={setCurrentSceneIndex} 
              onAddScene={handleAddScene}
              onDeleteScene={handleDeleteScene}
              onAddEpisode={handleAddEpisode}
              onUpdateScene={handleUpdateScene}
              theme={theme}
            />
          )}
        </main>
        
        {!hideTools && (
          <PropertiesPanel 
            selectedElement={selectedElement} 
            onUpdateElement={(updates) => selectedElementId && handleUpdateElement(selectedElementId, updates)} 
            onDeleteElement={() => selectedElementId && handleDeleteElement(selectedElementId)}
            isDrawingMode={isDrawingMode}
            setIsDrawingMode={setIsDrawingMode}
            setIsElementCodeEditorOpen={setIsElementCodeEditorOpen}
            setIsDiagramEditorOpen={setIsDiagramEditorOpen}
            theme={theme}
          />
        )}
      </div>

      <AIAssistant 
        isOpen={isAIModalOpen} 
        onClose={() => setIsAIModalOpen(false)} 
        onGenerate={handleAIGenerate}
        theme={theme}
      />

      <PreviewModal 
        project={project} 
        isOpen={isPreviewOpen} 
        onClose={() => setIsPreviewOpen(false)} 
      />

      <CodeEditor 
        project={project} 
        setProject={setProject} 
        isOpen={isCodeOpen} 
        onClose={() => setIsCodeOpen(false)}
        theme={theme}
      />

      {selectedElement && selectedElement.type === 'diagram' && (
        <DiagramAnimationEditor 
          element={selectedElement as DiagramElement}
          onUpdate={(updates) => handleUpdateElement(selectedElement.id, updates)}
          isOpen={isDiagramEditorOpen}
          onClose={() => setIsDiagramEditorOpen(false)}
        />
      )}

      {selectedElement && selectedElement.type === 'code' && (
        <ElementCodeEditor 
          element={selectedElement}
          onUpdate={(updates) => handleUpdateElement(selectedElement.id, updates)}
          isOpen={isElementCodeEditorOpen}
          onClose={() => setIsElementCodeEditorOpen(false)}
        />
      )}
    </div>
  );
}
