import { useState, useEffect } from 'react';
import { transliterateDevanagari } from '../utils/transliterate';

export default function useSpeechRecognition({ onTranscript }) {
  const [isListening, setIsListening] = useState(false);
  const [speechSupported, setSpeechSupported] = useState(false);
  const [recognition, setRecognition] = useState(null);
  const [voiceLang, setVoiceLang] = useState('en-US');
  const [interimText, setInterimText] = useState('');

  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
      setSpeechSupported(true);
      const rec = new SpeechRecognition();
      rec.continuous = true;
      rec.interimResults = true;
      rec.lang = voiceLang;

      rec.onresult = (event) => {
        let finalTranscript = '';
        let interimTranscript = '';

        for (let i = event.resultIndex; i < event.results.length; ++i) {
          let text = event.results[i][0].transcript;
          if (voiceLang === 'hi-IN') {
            text = transliterateDevanagari(text);
          }
          
          if (event.results[i].isFinal) {
            finalTranscript += text;
          } else {
            interimTranscript += text;
          }
        }

        if (finalTranscript) {
          onTranscript(finalTranscript);
          setInterimText('');
        } else {
          setInterimText(interimTranscript);
        }
      };

      rec.onerror = (event) => {
        console.error('Speech recognition error:', event.error);
        setIsListening(false);
        setInterimText('');
      };

      rec.onend = () => {
        setIsListening(false);
        setInterimText('');
      };

      setRecognition(rec);

      return () => {
        try {
          rec.stop();
        } catch {
          // ignore if already stopped or not active
        }
      };
    }
  }, [voiceLang, onTranscript]);

  const toggleListening = () => {
    if (!recognition) return;
    if (isListening) {
      recognition.stop();
      setIsListening(false);
    } else {
      try {
        recognition.start();
        setIsListening(true);
      } catch (e) {
        console.error('Failed to start speech recognition:', e);
      }
    }
  };

  return {
    isListening,
    speechSupported,
    recognition,
    voiceLang,
    setVoiceLang,
    interimText,
    setInterimText,
    toggleListening
  };
}
