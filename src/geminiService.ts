import { GoogleGenAI, Type } from "@google/genai";

const apiKey = process.env.GEMINI_API_KEY;

export async function generateVideoStructure(prompt: string): Promise<any> {
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY is not set. Add it to your .env.local file.");
  }

  const ai = new GoogleGenAI({ apiKey });

  const systemPrompt = `You are an expert educational explainer video producer and visual designer.

Your job is to generate a fully structured, production-ready video project JSON from the user's topic or content.

RULES:
1. Generate 3-6 scenes. Each scene should cover one clear idea or step.
2. Each scene must have 1-4 elements. Don't overcrowd.
3. Use a dark background (#0a0a0a or #050d0a) for most scenes for visual impact.
4. Coordinate system is 1280x720 (HD). Keep all elements within this space.
5. Use large, readable font sizes: titles 48-64px, subtitles 24-32px, body 18-24px.

ELEMENT PLACEMENT GUIDE (1280x720 canvas):
- Full-width title: x=80, y=280, width=1120, height=80
- Left column text: x=80, y=160, width=520, height=400
- Right column image/shape: x=680, y=120, width=520, height=480
- Centered content: x=140, y=180, width=1000, height=360
- Top title + body below: title at y=80, body at y=200

ANIMATION RULES:
- Text headlines: use 'typewriter', duration 1.2, delay 0.3
- Subtext / body: use 'word-reveal', duration 1, delay 0.8
- Tables: use 'row-by-row', duration 0.5, delay 0.5
- Images / shapes: use 'scale-in' or 'fade-in', duration 0.8, delay 0.4
- Code blocks: use 'fade-in', duration 0.6, delay 0.3

COLOR GUIDE:
- White text on dark bg: #ffffff
- Accent / highlight text: #10b981 (emerald)
- Muted secondary text: #a1a1aa
- Shape fills: use emerald #10b981, blue #3b82f6, amber #f59e0b, or red #ef4444

For TEXT elements, always include: content, fontSize, fontWeight, color, textAlign.
For TABLE elements, always include: headers (array of strings), rows (2D array of strings).
For CODE elements, always include: code (string), language (string).
For SHAPE elements, always include: shapeType (rect/circle/arrow/triangle), fill, stroke, strokeWidth.
For VIDEO elements, always include: src (use "https://storage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4" as a safe default), muted: true, loop: true, autoplay: true. Only suggest video when the topic genuinely benefits from motion footage.
For IMAGE elements, always include: src (use a descriptive Unsplash URL like "https://source.unsplash.com/800x600/?blockchain"), alt.

IMPORTANT: Return ONLY the raw JSON object. No markdown, no backticks, no explanation.`;

  const response = await ai.models.generateContent({
    model: "gemini-2.0-flash",
    contents: `${systemPrompt}\n\nGenerate a video project for this topic: "${prompt}"`,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          name: { type: Type.STRING },
          scenes: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                name: { type: Type.STRING },
                duration: { type: Type.NUMBER },
                background: { type: Type.STRING },
                elements: {
                  type: Type.ARRAY,
                  items: {
                    type: Type.OBJECT,
                    properties: {
                      type: {
                        type: Type.STRING,
                        enum: ['text', 'table', 'image', 'shape', 'code', 'video']
                      },
                      // Text fields
                      content: { type: Type.STRING },
                      fontSize: { type: Type.NUMBER },
                      fontWeight: { type: Type.STRING },
                      color: { type: Type.STRING },
                      textAlign: { type: Type.STRING },
                      // Table fields
                      headers: {
                        type: Type.ARRAY,
                        items: { type: Type.STRING }
                      },
                      rows: {
                        type: Type.ARRAY,
                        items: {
                          type: Type.ARRAY,
                          items: { type: Type.STRING }
                        }
                      },
                      // Code fields
                      code: { type: Type.STRING },
                      language: { type: Type.STRING },
                      // Image fields
                      src: { type: Type.STRING },
                      alt: { type: Type.STRING },
                      // Video fields
                      muted: { type: Type.BOOLEAN },
                      loop: { type: Type.BOOLEAN },
                      autoplay: { type: Type.BOOLEAN },
                      // Shape fields
                      shapeType: { type: Type.STRING },
                      fill: { type: Type.STRING },
                      stroke: { type: Type.STRING },
                      strokeWidth: { type: Type.NUMBER },
                      borderRadius: { type: Type.NUMBER },
                      text: { type: Type.STRING },
                      // Position & size (all elements)
                      x: { type: Type.NUMBER },
                      y: { type: Type.NUMBER },
                      width: { type: Type.NUMBER },
                      height: { type: Type.NUMBER },
                      // Animation
                      animation: {
                        type: Type.OBJECT,
                        properties: {
                          type: { type: Type.STRING },
                          duration: { type: Type.NUMBER },
                          delay: { type: Type.NUMBER }
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
    }
  });

  try {
    const raw = response.text || "{}";
    // Strip any accidental markdown fences
    const clean = raw.replace(/^```json\s*/i, '').replace(/```$/i, '').trim();
    const data = JSON.parse(clean);
    return data;
  } catch (e) {
    console.error("Failed to parse Gemini response:", e);
    console.error("Raw response:", response.text);
    return {};
  }
}
