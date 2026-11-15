import { ClimateLayerId, CLIMATE_LAYERS } from '../data/climateLayers';
import { speakNarration, stopNarration } from './sonificationEngine';

export type AgentLanguage = 'en' | 'fr' | 'ar';

export interface ExplainLocationPayload {
  placeName: string;
  lat: number;
  lon: number;
  layerId: ClimateLayerId;
  year: number;
  formattedValue: string;
  language: AgentLanguage;
}

export function buildFallbackExplanation(payload: ExplainLocationPayload): string {
  const { placeName, layerId, year, formattedValue, language } = payload;

  if (language === 'fr') {
    if (layerId === 'temperature') {
      return `${placeName} en ${year} affiche une anomalie de température de ${formattedValue}. Ce réchauffement reflète l'évolution thermique régionale observée depuis la période de référence.`;
    }
    if (layerId === 'seaIce') {
      return `${placeName} en ${year} présente une couverture de glace estimée à ${formattedValue}. L'étendue polaire évolue directement sous l'effet du réchauffement océanique et atmosphérique.`;
    }
    if (layerId === 'oceanCurrents') {
      return `${placeName} en ${year} enregistre un flux thermique océanique de ${formattedValue}. Les courants marins redistribuent continuellement la chaleur à travers le globe.`;
    }
    return `${placeName} en ${year} atteint environ ${formattedValue} de concentration de carbone. Les émissions régionales et l'activité des incendies influencent cet équilibre atmosphérique.`;
  }

  if (language === 'ar') {
    if (layerId === 'temperature') {
      return `تسجّل منطقة ${placeName} في سنة ${year} شذوذاً حرارياً قدره ${formattedValue}. يعكس هذا المؤشر تغيّر حرارة السطح مقارنة بالمتوسط المناخي المرجعي.`;
    }
    if (layerId === 'seaIce') {
      return `تبلغ نسبة الغطاء الجليدي في ${placeName} خلال سنة ${year} حوالي ${formattedValue}. تتأثر المناطق القطبية بشكل مباشر بارتفاع حرارة المحيطات والغلاف الجوي.`;
    }
    if (layerId === 'oceanCurrents') {
      return `يسجّل التدفق الحراري للمحيط في ${placeName} سنة ${year} قيمة ${formattedValue}. تنقل التيارات البحرية الطاقة الحرارية باستمرار عبر كوكب الأرض.`;
    }
    return `يبلغ تركيز ثاني أكسيد الكربون في ${placeName} سنة ${year} نحو ${formattedValue}. تساهم الانبعاثات وحرائق الغابات الموسمية في تغيّر هذا المعدل الجوي.`;
  }

  // English fallback
  if (layerId === 'temperature') {
    return `In ${year}, ${placeName} records a surface temperature anomaly of ${formattedValue}. This reflects regional warming trends tracked against the 1951 to 1980 climate baseline.`;
  }
  if (layerId === 'seaIce') {
    return `In ${year}, ${placeName} shows approximately ${formattedValue}. Polar ice cover responds rapidly to shifting ocean heat and Arctic atmospheric amplification.`;
  }
  if (layerId === 'oceanCurrents') {
    return `In ${year}, ${placeName} shows an upper-ocean thermal flux of ${formattedValue}. Major ocean currents transport vast amounts of heat across Earth's climate basins.`;
  }
  return `In ${year}, ${placeName} registers an atmospheric carbon level near ${formattedValue}. Seasonal wildfire activity and global carbon emissions shape this regional reading.`;
}

export async function requestLocationExplanation(
  payload: ExplainLocationPayload,
  signal: AbortSignal
): Promise<string> {
  const layer = CLIMATE_LAYERS[payload.layerId];
  try {
    const res = await fetch('/api/agent/explain-location', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      signal,
      body: JSON.stringify({
        placeName: payload.placeName,
        lat: payload.lat,
        lon: payload.lon,
        layerTitle: layer.title,
        datasetSource: layer.datasetSource,
        year: payload.year,
        formattedValue: payload.formattedValue,
        language: payload.language,
      }),
    });

    if (!res.ok) {
      return buildFallbackExplanation(payload);
    }

    const data = (await res.json()) as { explanation?: string };
    return data.explanation?.trim() || buildFallbackExplanation(payload);
  } catch (err) {
    if (err instanceof DOMException && err.name === 'AbortError') {
      throw err;
    }
    return buildFallbackExplanation(payload);
  }
}

export class AgentAudioPlayer {
  private currentAudio: HTMLAudioElement | null = null;
  private currentUrl: string | null = null;

  public stop(): void {
    stopNarration();
    if (this.currentAudio) {
      try {
        this.currentAudio.onended = null;
        this.currentAudio.onerror = null;
        this.currentAudio.pause();
      } catch {
        // ignore
      }
      this.currentAudio = null;
    }
    if (this.currentUrl) {
      URL.revokeObjectURL(this.currentUrl);
      this.currentUrl = null;
    }
  }

  public async speak(
    text: string,
    language: AgentLanguage,
    signal: AbortSignal,
    callbacks: {
      onAudioStart: () => void;
      onAudioEnd: () => void;
    }
  ): Promise<void> {
    this.stop();
    if (signal.aborted) return;

    try {
      const res = await fetch('/api/agent/speak', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal,
        body: JSON.stringify({ text, language }),
      });

      if (!res.ok || signal.aborted) {
        if (!signal.aborted) {
          callbacks.onAudioStart();
          speakNarration(text, true, language, callbacks.onAudioEnd);
        }
        return;
      }

      const data = (await res.json()) as { audioBase64?: string; mimeType?: string };
      if (!data.audioBase64 || signal.aborted) {
        if (!signal.aborted) {
          callbacks.onAudioStart();
          speakNarration(text, true, language, callbacks.onAudioEnd);
        }
        return;
      }

      const binary = atob(data.audioBase64);
      const bytes = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i++) {
        bytes[i] = binary.charCodeAt(i);
      }

      const blob = new Blob([bytes], { type: data.mimeType || 'audio/wav' });
      const url = URL.createObjectURL(blob);
      const audio = new Audio(url);
      this.currentAudio = audio;
      this.currentUrl = url;

      const finish = () => {
        if (this.currentAudio === audio) {
          this.currentAudio = null;
        }
        if (this.currentUrl === url) {
          URL.revokeObjectURL(url);
          this.currentUrl = null;
        }
        callbacks.onAudioEnd();
      };

      audio.onended = finish;
      audio.onerror = () => {
        finish();
        if (!signal.aborted) {
          callbacks.onAudioStart();
          speakNarration(text, true, language, callbacks.onAudioEnd);
        }
      };

      callbacks.onAudioStart();
      await audio.play();
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') {
        return;
      }
      if (!signal.aborted) {
        callbacks.onAudioStart();
        speakNarration(text, true, language, callbacks.onAudioEnd);
      }
    }
  }
}
