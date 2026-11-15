import { useEffect, useRef, useState } from 'react'
import { Send, LoaderCircle, AlertCircle, Info, Play, Pause, Volume2, VolumeX } from 'lucide-react'
import { explainTemperature } from '../services/api'

/**
 * ChatAI — AI Explanation Component
 *
 * Connects the frontend to POST /api/v1/ai/explain on the Spring Boot backend.
 * The backend retrieves NASA GISTEMP data, builds a scientific context, and
 * generates a TTS-ready explanation using OpenAI (gpt-4o-mini).
 *
 * The OpenAI API key is never exposed to the frontend. All AI calls go through
 * the backend endpoint.
 *
 * Supports multilingual explanations (English, French, Arabic) and voice
 * narration using the browser's native Web Speech API.
 */
export default function ChatAI() {
  const [inputValue, setInputValue] = useState('')
  const [messages, setMessages] = useState([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState(null)
  const [language, setLanguage] = useState('en')
  const [isSpeaking, setIsSpeaking] = useState(false)
  const [voiceError, setVoiceError] = useState(null)
  const inputRef = useRef(null)
  const utteranceRef = useRef(null)

  const LANGUAGE_OPTIONS = [
    { code: 'en', label: 'English' },
    { code: 'fr', label: 'Français' },
    { code: 'ar', label: 'العربية' },
  ]

  const LANGUAGE_LABELS = {
    en: 'English',
    fr: 'Français',
    ar: 'العربية',
  }

  // Parse a year (and optional month) from the user's question
  function extractYearAndMonth(text) {
    const yearMatch = text.match(/\b(18\d\d|19\d\d|20\d\d|21\d\d)\b/)
    const year = yearMatch ? Number(yearMatch[0]) : null

    let month = null
    const monthNames = {
      january: 1, february: 2, march: 3, april: 4,
      may: 5, june: 6, july: 7, august: 8,
      september: 9, october: 10, november: 11, december: 12,
    }
    const monthMatch = text.match(/\b(january|february|march|april|may|june|july|august|september|october|november|december)\b/i)
    if (monthMatch) {
      month = monthNames[monthMatch[0].toLowerCase()]
    }

    return { year, month }
  }

  async function handleSubmit(event) {
    event.preventDefault()

    const text = inputValue.trim()
    if (!text || isLoading) return

    setError(null)
    setVoiceError(null)

    const userMessage = { id: Date.now(), type: 'user', text }
    setMessages((prev) => [...prev, userMessage])
    setInputValue('')

    const { year, month } = extractYearAndMonth(text)

    if (!year) {
      const noYearMessage = {
        id: Date.now() + 1,
        type: 'ai',
        text: language === 'fr'
          ? "Je peux expliquer les anomalies de température de la NASA pour une année donnée. Veuillez inclure une année (par exemple, 'Expliquez 2023' ou 'Que s'est-il passé en janvier 2023 ?') dans votre question."
          : language === 'ar'
            ? "يمكنني شرح بيانات شذوذ درجات الحرارة من وكالة ناسا لسنة معينة. يرجى تضمين سنة (مثل 'اشرح سنة 2023' أو 'ماذا حدث في يناير 2023؟') في سؤالك."
            : "I can explain NASA temperature anomaly data for a specific year. Please include a year (e.g., 'Explain 2023' or 'What happened in January 2023?') in your question.",
      }
      setMessages((prev) => [...prev, noYearMessage])
      return
    }

    setIsLoading(true)

    try {
      const response = await explainTemperature(year, month, language)

      const aiMessage = {
        id: Date.now() + 1,
        type: 'ai',
        text: response.explanation,
        metadata: {
          datasetSource: response.datasetSource,
          yearsCovered: response.yearsCovered,
          unit: response.unit,
          validationStatus: response.validationStatus,
          limitations: response.limitations,
          retrievedData: response.retrievedData,
          language: response.language || language,
        },
      }
      setMessages((prev) => [...prev, aiMessage])
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Failed to get explanation from the backend.',
      )
    } finally {
      setIsLoading(false)
    }
  }

  // Voice playback
  async function handlePlay() {
    if (!('speechSynthesis' in window)) {
      setVoiceError('Your browser does not support speech synthesis.')
      return
    }

    const lastAiMessage = [...messages].reverse().find((m) => m.type === 'ai')
    if (!lastAiMessage) {
      setVoiceError('No explanation available to read.')
      return
    }

    const text = lastAiMessage.text
    const languageCode = lastAiMessage.metadata?.language || language

    setVoiceError(null)

    // Cancel any ongoing speech
    window.speechSynthesis.cancel()

    const utterance = new SpeechSynthesisUtterance(text)
    utterance.lang = languageCode

    // Find a voice matching the language
    const voices = window.speechSynthesis.getVoices()
    const voice = voices.find((v) => v.lang.startsWith(languageCode)) || voices.find((v) => v.lang.startsWith(language.split('-')[0]))

    if (voice) {
      utterance.voice = voice
    } else {
      setVoiceError(`No ${language === 'ar' ? 'Arabic' : language === 'fr' ? 'French' : 'English'} voice available on this device.`)
    }

    utterance.onend = () => {
      setIsSpeaking(false)
      utteranceRef.current = null
    }
    utterance.onerror = (event) => {
      setIsSpeaking(false)
      utteranceRef.current = null
      setVoiceError('Speech synthesis error: ' + event.error)
    }

    utteranceRef.current = utterance
    setIsSpeaking(true)
    window.speechSynthesis.speak(utterance)
  }

  function handleStop() {
    if (utteranceRef.current) {
      window.speechSynthesis.cancel()
      setIsSpeaking(false)
      utteranceRef.current = null
    }
  }

  // Language names for display
  const languageDisplay = LANGUAGE_OPTIONS.find((l) => l.code === language)?.label || language

  return (
    <section className="panel ai-panel" aria-label="AI scientific explanation">
      <div className="panel-heading">
        <div>
          <p className="eyebrow">AI Scientific Explanation</p>
          <h2 id="ai-heading">Ask Earth Jukebox AI</h2>
        </div>
        <div className="ai-language-selector">
          <label htmlFor="language-select" className="language-label">
            Language:
          </label>
          <select
            id="language-select"
            value={language}
            onChange={(e) => setLanguage(e.target.value)}
            aria-label="Select explanation language"
          >
            {LANGUAGE_OPTIONS.map((lang) => (
              <option key={lang.code} value={lang.code}>
                {lang.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="ai-messages" role="region" aria-label="AI conversation">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`ai-message ai-message--${msg.type}`}
            dir={msg.metadata?.language === 'ar' ? 'rtl' : 'ltr'}
          >
            <span className="ai-message-avatar" aria-hidden="true">
              {msg.type === 'user' ? 'You' : 'AI'}
            </span>
            <div className="ai-message-content">{msg.text}</div>
            {msg.metadata && (
              <div className="ai-message-meta">
                <span className="ai-meta-source">
                  {msg.metadata.datasetSource}
                </span>
                <span className="ai-meta-years">{msg.metadata.yearsCovered}</span>
                <span className="ai-meta-unit">{msg.metadata.unit}</span>
                <span className={`ai-meta-status ${msg.metadata.validationStatus.toLowerCase()}`}>
                  {msg.metadata.validationStatus}
                </span>
                <span className="ai-meta-language">
                  {msg.metadata.language}
                </span>
              </div>
            )}
          </div>
        ))}
        {error && (
          <div className="ai-message ai-message--error">
            <span className="ai-message-avatar" aria-hidden="true">
              <AlertCircle size={18} />
            </span>
            <div className="ai-message-content">{error}</div>
          </div>
        )}
        {voiceError && (
          <div className="ai-message ai-message--error">
            <span className="ai-message-avatar" aria-hidden="true">
              <AlertCircle size={18} />
            </span>
            <div className="ai-message-content">{voiceError}</div>
          </div>
        )}
        {isLoading && (
          <div className="ai-message ai-message--loading">
            <span className="ai-message-avatar" aria-hidden="true">
              AI
            </span>
            <div className="ai-message-content">
              <LoaderCircle className="spin" size={16} aria-hidden="true" />
              <span>Generating explanation...</span>
            </div>
          </div>
        )}
      </div>

      <div className="ai-input-area">
        <form onSubmit={handleSubmit} className="ai-input-form">
          <input
            ref={inputRef}
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            placeholder="Ask about a year or month (e.g., 'Explain 2023' or 'What happened in January 2023?')"
            disabled={isLoading}
            aria-label="Ask about NASA temperature data"
          />
          <button
            type="submit"
            disabled={isLoading || !inputValue.trim()}
            aria-label={isLoading ? 'Generating explanation...' : 'Send explanation request'}
          >
            <Send size={18} aria-hidden="true" />
          </button>
        </form>

        {inputValue.trim() && !isLoading && (
          <button
            type="button"
            onClick={() => setInputValue('')}
            aria-label="Clear input"
          >
            ✕
          </button>
        )}
      </div>

      {/* Voice playback controls */}
      <div className="ai-voice-controls">
        <div className="voice-controls-header">
          <span className="voice-label">Voice Narration</span>
          <span className={`voice-status ${isSpeaking ? 'playing' : 'idle'}`}>
            {isSpeaking ? 'Playing' : voiceError ? 'Error' : 'Ready'}
          </span>
        </div>
        <div className="voice-controls-group">
          <button
            type="button"
            className="voice-button"
            onClick={handlePlay}
            disabled={isLoading || isSpeaking || !messages.some((m) => m.type === 'ai')}
            aria-label="Play explanation audio"
          >
            {isSpeaking ? <Pause size={18} aria-hidden="true" /> : <Play size={18} aria-hidden="true" />}
            {isSpeaking ? 'Pause' : 'Play'}
          </button>
          <button
            type="button"
            className="voice-button"
            onClick={handleStop}
            disabled={!isSpeaking}
            aria-label="Stop narration"
          >
            <Square size={16} aria-hidden="true" />
            Stop
          </button>
        </div>
      </div>

      <div className="ai-hint">
        <Info size={16} aria-hidden="true" />
        <span>
          Ask about any year from 1880 to 2026. Example: "Explain 2023" or "What happened in January 2023?"
        </span>
      </div>
    </section>
  )
}
