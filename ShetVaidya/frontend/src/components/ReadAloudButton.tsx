import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';

type ReadAloudButtonProps = {
  text: string;
  className?: string;
  labelKey?: string;
};

const LANGUAGE_MAP: Record<string, string> = {
  mr: 'mr-IN',
  hi: 'hi-IN',
  en: 'en-IN',
};

const VOICE_HINTS: Record<string, string[]> = {
  mr: ['marathi', 'mr-in'],
  hi: ['hindi', 'hi-in'],
  en: ['english', 'en-in', 'en-us', 'en-gb'],
};

const chunkText = (text: string, maxChunkLength = 220) => {
  const normalized = text.replace(/\s+/g, ' ').trim();
  if (!normalized) {
    return [];
  }

  const sentenceChunks = normalized
    .split(/(?<=[.!?])\s+/)
    .map((chunk) => chunk.trim())
    .filter(Boolean);

  const finalChunks: string[] = [];
  for (const sentence of sentenceChunks) {
    if (sentence.length <= maxChunkLength) {
      finalChunks.push(sentence);
      continue;
    }

    const words = sentence.split(' ');
    let running = '';
    for (const word of words) {
      const candidate = running ? `${running} ${word}` : word;
      if (candidate.length <= maxChunkLength) {
        running = candidate;
        continue;
      }

      if (running) {
        finalChunks.push(running);
      }
      running = word;
    }

    if (running) {
      finalChunks.push(running);
    }
  }

  return finalChunks;
};

const selectVoice = (voices: SpeechSynthesisVoice[], baseLanguage: string, targetLanguage: string) => {
  const languageLower = targetLanguage.toLowerCase();
  const hints = VOICE_HINTS[baseLanguage] || [];

  return (
    voices.find((voice) => voice.lang.toLowerCase() === languageLower) ||
    voices.find((voice) => voice.lang.toLowerCase().startsWith(baseLanguage)) ||
    voices.find((voice) => {
      const lowerName = voice.name.toLowerCase();
      return hints.some((hint) => lowerName.includes(hint));
    }) ||
    voices[0]
  );
};

const ReadAloudButton = ({ text, className = '', labelKey = 'common.readAloud' }: ReadAloudButtonProps) => {
  const { i18n, t } = useTranslation();
  const [supported, setSupported] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const sessionRef = useRef(0);

  useEffect(() => {
    const available = typeof window !== 'undefined' && 'speechSynthesis' in window;
    setSupported(available);

    if (!available) {
      return;
    }

    const synth = window.speechSynthesis;
    const syncVoices = () => setVoices(synth.getVoices());
    syncVoices();
    synth.onvoiceschanged = syncVoices;

    return () => {
      if (available) {
        sessionRef.current += 1;
        synth.cancel();
        synth.onvoiceschanged = null;
      }
    };
  }, []);

  if (!supported || !text.trim()) {
    return null;
  }

  const stopSpeaking = () => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
      return;
    }
    sessionRef.current += 1;
    window.speechSynthesis.cancel();
    setSpeaking(false);
  };

  const speak = () => {
    const synth = window.speechSynthesis;

    if (!synth) {
      alert('Text to speech is not supported in this browser.');
      return;
    }

    if (synth.speaking || speaking) {
      stopSpeaking();
      return;
    }

    const baseLang = i18n.language.split('-')[0].toLowerCase();
    const targetLang = LANGUAGE_MAP[baseLang] || 'en-IN';
    const chunks = chunkText(text);

    if (!chunks.length) {
      return;
    }

    synth.cancel();

    const sessionId = sessionRef.current + 1;
    sessionRef.current = sessionId;
    setSpeaking(true);

    const speakWithVoices = () => {
      if (sessionRef.current !== sessionId) {
        return;
      }

      const availableVoices = synth.getVoices();
      const selectedVoice = selectVoice(availableVoices.length ? availableVoices : voices, baseLang, targetLang);

      let index = 0;
      const speakNextChunk = () => {
        if (sessionRef.current !== sessionId) {
          return;
        }

        const chunk = chunks[index];
        if (!chunk) {
          setSpeaking(false);
          return;
        }

        const utterance = new SpeechSynthesisUtterance(chunk);
        utterance.lang = targetLang;
        utterance.rate = 0.9;
        utterance.pitch = 1;
        utterance.volume = 1;
        if (selectedVoice) {
          utterance.voice = selectedVoice;
        }

        utterance.onend = () => {
          index += 1;
          speakNextChunk();
        };

        utterance.onerror = () => {
          if (sessionRef.current === sessionId) {
            setSpeaking(false);
          }
        };

        synth.speak(utterance);
      };

      speakNextChunk();
    };

    if (synth.getVoices().length === 0) {
      synth.addEventListener('voiceschanged', speakWithVoices, { once: true });
      window.setTimeout(() => {
        if (sessionRef.current === sessionId && !synth.speaking) {
          speakWithVoices();
        }
      }, 250);
    } else {
      speakWithVoices();
    }
  };

  return (
    <button
      type="button"
      className={`read-aloud-btn ${speaking ? 'active' : ''} ${className}`.trim()}
      onClick={speak}
    >
      <span className="read-aloud-btn__icon" aria-hidden>
        {speaking ? '🗣️' : '🔊'}
      </span>
      <span>{speaking ? t('common.stopReading') : t(labelKey)}</span>
    </button>
  );
};

export default ReadAloudButton;
