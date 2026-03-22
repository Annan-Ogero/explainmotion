export type ElementType = 'text' | 'table' | 'diagram' | 'image' | 'shape' | 'code' | 'video';

export type AnimationType = 
  | 'none'
  | 'typewriter' 
  | 'word-reveal' 
  | 'fade-in' 
  | 'slide-in' 
  | 'scale-in' 
  | 'draw-stroke' 
  | 'row-by-row';

export interface AnimationConfig {
  type: AnimationType;
  duration: number;
  delay: number;
  stagger?: number;
}

export interface BaseElement {
  id: string;
  type: ElementType;
  x: number;
  y: number;
  width: number;
  height: number;
  animation: AnimationConfig;
  backgroundColor?: string;
  style?: Record<string, any>;
  locked?: boolean;
}

export interface TextElement extends BaseElement {
  type: 'text';
  content: string;
  fontSize: number;
  fontWeight: string;
  fontFamily?: string;
  fontStyle?: 'normal' | 'italic';
  color: string;
  textAlign: 'left' | 'center' | 'right';
}

export interface TableElement extends BaseElement {
  type: 'table';
  rows: string[][];
  headers: string[];
}

export interface CodeElement extends BaseElement {
  type: 'code';
  code: string;
  language: string;
}

export interface ImageElement extends BaseElement {
  type: 'image';
  src: string;
  alt: string;
  objectFit?: 'cover' | 'contain' | 'fill';
}

export interface VideoFileElement extends BaseElement {
  type: 'video';
  src: string;
  muted: boolean;
  loop: boolean;
  autoplay: boolean;
  objectFit?: 'cover' | 'contain' | 'fill';
}

export interface ShapeElement extends BaseElement {
  type: 'shape';
  shapeType: 'rect' | 'circle' | 'arrow' | 'triangle' | 'star' | 'pentagon';
  fill: string;
  stroke: string;
  strokeWidth: number;
  strokeStyle: 'solid' | 'dashed' | 'dotted';
  borderRadius?: number;
  text?: string;
  fontSize?: number;
  fontWeight?: string;
  fontFamily?: string;
  fontStyle?: 'normal' | 'italic';
  color?: string;
  textAlign?: 'left' | 'center' | 'right';
}

export interface DiagramNode {
  id: string;
  label: string;
  x: number;
  y: number;
}

export interface DiagramEdge {
  id: string;
  from: string;
  to: string;
}

export interface DrawingPath {
  id: string;
  points: { x: number; y: number }[];
  color: string;
  width: number;
  fill?: string;
  style?: 'pencil' | 'brush' | 'marker' | 'eraser';
}

export interface DiagramLayer {
  id: string;
  name: string;
  visible: boolean;
  locked: boolean;
  paths: DrawingPath[];
  nodes: DiagramNode[]; 
  edges: DiagramEdge[];
}

export interface DiagramFrame {
  id: string;
  layers: DiagramLayer[];
}

export interface DiagramElement extends BaseElement {
  type: 'diagram';
  frames: DiagramFrame[];
  currentFrameIndex: number;
  fps: number;
  loop: boolean;
  onionSkin?: boolean;
  gridVisible?: boolean;
  snapToGrid?: boolean;
  gridSize?: number;
}

export type VideoElement = 
  | TextElement 
  | TableElement 
  | CodeElement 
  | ImageElement 
  | ShapeElement 
  | DiagramElement
  | VideoFileElement;

export interface SceneAudio {
  src: string;         // public URL or base64 data URL
  volume: number;      // 0-1, default 1
  loop: boolean;       // default false
  startAt?: number;    // seconds offset into the audio file, default 0
}

export interface Scene {
  id: string;
  name: string;
  duration: number; // in seconds
  elements: VideoElement[];
  background: string;
  backgroundImage?: string;
  backgroundType?: 'color' | 'image';
  frame?: 'none' | 'modern' | 'classic' | 'retro' | 'cinematic';
  audio?: SceneAudio;  // optional voiceover/soundtrack per scene
}

export interface Episode {
  id: string;
  name: string;
  scenes: Scene[];
}

export type AspectRatio = '16:9' | '9:16' | '1:1';

export interface Project {
  id: string;
  name: string;
  aspectRatio: AspectRatio;
  episodes: Episode[];
  theme: {
    primary: string;
    secondary: string;
    background: string;
    text: string;
    accent: string;
  };
}
