import 'dotenv/config';
import express from 'express';
import type { Request, Response } from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenAI, ThinkingLevel } from '@google/genai';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = Number(process.env.PORT) || 3000;

function createAiClient(apiVersion?: string): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY is not configured in Secrets.');
  }
  return new GoogleGenAI({
    apiKey,
    ...(apiVersion ? { apiVersion } : {}),
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

const LANGUAGE_INSTRUCTIONS: Record<string, string> = {
  en: 'Respond in clear, natural English.',
  fr: 'Respond in clear, natural French (français).',
  ar: 'Respond in clear, natural Arabic (العربية الفصحى المبسطة الواضحة).',
};

const TTS_VOICE_BY_LANG: Record<string, string> = {
  en: 'Kore',
  fr: 'Zephyr',
  ar: 'Charon',
};

const TTS_STYLE_BY_LANG: Record<string, string> = {
  en: 'Warm, articulate climate scientist speaking clearly in English',
  fr: 'Warm, articulate climate scientist speaking clearly in French',
  ar: 'Warm, articulate climate scientist speaking clearly in Arabic',
};

async function startServer() {
  const app = express();
  app.use(express.json({ limit: '1mb' }));

  app.post('/api/agent/explain-location', async (req: Request, res: Response) => {
    try {
      const {
        placeName,
        lat,
        lon,
        layerTitle,
        datasetSource,
        year,
        formattedValue,
        language = 'en',
      } = req.body as {
        placeName?: string;
        lat?: number;
        lon?: number;
        layerTitle?: string;
        datasetSource?: string;
        year?: number;
        formattedValue?: string;
        language?: string;
      };

      if (!placeName || formattedValue === undefined || year === undefined || !layerTitle) {
        res.status(400).json({ error: 'Missing required location or climate layer fields.' });
        return;
      }

      const langKey = language === 'fr' || language === 'ar' ? language : 'en';
      const latStr =
        typeof lat === 'number'
          ? `${Math.abs(lat).toFixed(1)}°${lat >= 0 ? 'N' : 'S'}`
          : '';
      const lonStr =
        typeof lon === 'number'
          ? `${Math.abs(lon).toFixed(1)}°${lon >= 0 ? 'E' : 'W'}`
          : '';

      const ai = createAiClient();
      const systemInstruction = [
        'You are the Earth Jukebox Climate Science Voice Guide for the NASA Space Apps Challenge.',
        LANGUAGE_INSTRUCTIONS[langKey],
        'Write exactly 2 short, spoken-friendly sentences (under 42 words total).',
        'Sentence 1: State the exact place name, the year, and the exact climate measurement.',
        'Sentence 2: Give one concrete scientific insight explaining what is driving that reading in this specific region or ocean.',
        'Plain spoken prose only: no markdown, no bullet points, no asterisks, no emojis.',
      ].join(' ');

      const prompt = `Location: ${placeName}${latStr && lonStr ? ` (${latStr}, ${lonStr})` : ''}
Active Climate Layer: ${layerTitle} (${datasetSource || 'NASA Earth Information Center'})
Observation Year: ${year}
Measured Value: ${formattedValue}`;

      const response = await ai.models.generateContent({
        model: 'gemini-4-hydrogen',
        contents: prompt,
        config: {
          systemInstruction,
          thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
        },
      });

      const explanation = response.text?.trim();
      if (!explanation) {
        res.status(502).json({ error: 'Empty explanation received from Gemini.' });
        return;
      }

      res.json({ explanation });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to generate climate explanation.';
      console.error('[/api/agent/explain-location]', message);
      res.status(500).json({ error: message });
    }
  });

  app.post('/api/agent/speak', async (req: Request, res: Response) => {
    try {
      const { text, language = 'en' } = req.body as {
        text?: string;
        language?: string;
      };

      if (!text || !text.trim()) {
        res.status(400).json({ error: 'Missing text to synthesize.' });
        return;
      }

      const langKey = language === 'fr' || language === 'ar' ? language : 'en';
      const ai = createAiClient('v1beta');

      const response = await ai.models.generateContent({
        model: 'gemini-3.8-flash-lite-tts',
        contents: [
          {
            role: 'user',
            parts: [
              {
                text: text.trim(),
                speechMetadata: {
                  style: TTS_STYLE_BY_LANG[langKey],
                },
              },
            ],
          },
        ],
        config: {
          responseModalities: ['AUDIO'],
          speechConfig: {
            voiceConfig: {
              prebuiltVoiceConfig: {
                voiceName: TTS_VOICE_BY_LANG[langKey],
              },
            },
          },
        },
      });

      const base64Audio =
        response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;

      if (!base64Audio) {
        res.status(502).json({ error: 'No audio payload returned by TTS model.' });
        return;
      }

      res.json({ audioBase64: base64Audio, mimeType: 'audio/wav' });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to synthesize voice audio.';
      console.error('[/api/agent/speak]', message);
      res.status(500).json({ error: message });
    }
  });

  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.join(__dirname, 'dist');
    app.use(express.static(distDir));
    app.get('*', (_req: Request, res: Response) => {
      res.sendFile(path.join(distDir, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Earth Jukebox server listening on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start Earth Jukebox server:', err);
  process.exit(1);
});
