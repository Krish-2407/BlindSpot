# Implementation Plan: AI Summarization & Voice Input for Topic Explanations

This plan details how to implement two premium features on the BlindSpot Homepage:
1. **Interactive AI Summarization (Hybrid Flow):** Allows users to paste up to 10,000 characters, but locks submission above 2,000 characters and offers an interactive "Summarize with AI" button powered by Groq's fast `llama-3.1-8b-instant` model.
2. **Native Voice Input:** Integrates the browser's built-in Web Speech API to provide real-time, zero-cost, speech-to-text dictation directly into the topic description box.

---

## 📋 Architectural Overview

### 1. AI Summarization Flow
```
[ User inputs 2,000+ chars ] ──► Disable Submit button & Show "Summarize with AI"
                                           │
[ User clicks "Summarize with AI" ] ───────┼──► POST /api/summarize { text }
                                           │
[ Backend (Llama 8B) ] ────────────────────┼──► Condenses explanation to < 2,000 chars
                                           │
[ Frontend updates textbox ] ──────────────┴──► Re-enable Submit button
```

### 2. Native Voice Input Flow
```
[ User clicks Mic button ] ──► Request Mic Permission ──► Start Browser WebSpeech API
                                                                  │
[ User Speaks ] ◄─────────────────────────────────────────────────┼──► Real-time translation
                                                                  │
[ Textarea updates word-by-word ] ◄───────────────────────────────┘
```

---

## 📂 Affected Files

1. **[New Backend Route]** `backend/routes/summarize.js` — Compresses explanation text.
2. **[Backend Server Entry]** `backend/server.js` — Mounts the summarizer route.
3. **[Frontend Homepage]** `frontend/src/pages/Home.jsx` — Instantiates voice recognition, UI logic for summarization, warning badges, and button layout.

---

## 🛠️ Step 1: Backend Implementation

### 1. Create `backend/routes/summarize.js`
This route accepts the long explanation text and uses Groq's fast `llama-3.1-8b-instant` model to condense it down to under 2,000 characters.

Write this code to `backend/routes/summarize.js`:
```javascript
const express = require('express');
const router = express.Router();
const groq = require('../config/groq');

// POST /api/summarize
router.post('/', async (req, res) => {
  try {
    const { text } = req.body;

    if (!text || typeof text !== 'string' || !text.trim()) {
      return res.status(400).json({ error: 'Missing or invalid explanation text' });
    }

    // Call Groq using the ultra-fast Llama-3.1 8B model
    const chatCompletion = await groq.chat.completions.create({
      messages: [
        {
          role: 'system',
          content: 'You are a professional Socratic knowledge compressor. Summarize the user\'s explanation of what they understand about a topic in under 2,000 characters. Keep their core terminology, but compress the explanation so it is extremely dense, readable, and clean. Respond ONLY with the clean summarized text. Do NOT include conversational filler, introductory remarks, markdown formatting, or quotes.'
        },
        {
          role: 'user',
          content: text.trim()
        }
      ],
      model: 'llama-3.1-8b-instant',
      temperature: 0.3,
      max_tokens: 600
    });

    const summary = chatCompletion.choices[0]?.message?.content?.trim();

    if (!summary) {
      return res.status(500).json({ error: 'Failed to generate summary from AI model' });
    }

    return res.status(200).json({ summary });

  } catch (error) {
    console.error('Error during AI summarization:', error);
    return res.status(500).json({
      error: 'Internal server error during summarization',
      message: error.message
    });
  }
});

module.exports = router;
```

### 2. Mount Route in `backend/server.js`
Import and register the router inside `backend/server.js`.

**Diff:**
```diff
 const agent3Router = require('./routes/agent3');
 const agent4Router = require('./routes/agent4');
 const sessionRouter = require('./routes/session');
+const summarizeRouter = require('./routes/summarize');
 
 const app = express();
...
 app.use('/api/agent3', agent3Router);
 app.use('/api/agent4', agent4Router);
 app.use('/api/session', sessionRouter);
+app.use('/api/summarize', summarizeRouter);
```

---

## 🛠️ Step 2: Frontend Implementation (`Home.jsx`)

We will update `frontend/src/pages/Home.jsx` to support:
1. Extended character limit (10,000 characters).
2. AI Summarization trigger logic.
3. Native Speech Recognition.

### 1. Speech Recognition Setup
Add state variables to manage voice listening status:
```javascript
const [isListening, setIsListening] = useState(false);
const [speechSupported, setSpeechSupported] = useState(false);
const [recognition, setRecognition] = useState(null);

// Initialize Speech Recognition on Mount
useEffect(() => {
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (SpeechRecognition) {
    setSpeechSupported(true);
    const rec = new SpeechRecognition();
    rec.continuous = true;
    rec.interimResults = false;
    rec.lang = 'en-US';

    rec.onresult = (event) => {
      const transcript = event.results[event.results.length - 1][0].transcript;
      setExplanation((prev) => {
        const separator = prev.trim() === '' ? '' : ' ';
        const updated = prev + separator + transcript;
        return updated.slice(0, 10000); // Cap at max limit
      });
    };

    rec.onerror = (event) => {
      console.error('Speech recognition error:', event.error);
      setIsListening(false);
    };

    rec.onend = () => {
      setIsListening(false);
    };

    setRecognition(rec);
  }
}, []);
```

### 2. Listening Toggle Handler
```javascript
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
```

### 3. Summarization Action
```javascript
const handleSummarize = async () => {
  if (explanation.length <= 2000) return;
  setLoading(true);
  setError('');
  setLoadingStep('diagnosing'); // Reuses the loading overlay spinner
  try {
    const response = await axios.post(`${API_URL}/api/summarize`, {
      text: explanation
    }, { timeout: 30000 });
    
    setExplanation(response.data.summary);
  } catch (err) {
    console.error(err);
    setError('Failed to summarize explanation. Please edit manually or try again.');
  } finally {
    setLoading(false);
    setLoadingStep('');
  }
};
```

### 4. UI Layout Updates
Adjust the explanation input area to show:
1. The Microphone button inside the text box.
2. A warning banner and a "Summarize with AI" button if characters > 2,000.

**Code block to replace explanation input in `Home.jsx`:**
```jsx
{/* Explanation Input */}
<div>
  <div className="flex justify-between items-center mb-1.5 ml-0.5">
    <label className="block text-[12px] font-bold text-gray-300 uppercase tracking-widest">
      Opening Explanation (Optional)
    </label>
    <span className={`text-[10px] font-semibold ${explanation.length > 2000 ? 'text-red-400 font-extrabold' : 'text-gray-500'}`}>
      {explanation.length} / 10,000
    </span>
  </div>
  <div className="relative glass-input rounded-xl p-1 flex flex-col">
    <textarea 
      rows="4"
      maxLength={10000}
      disabled={loading}
      value={explanation}
      onChange={(e) => setExplanation(e.target.value)}
      placeholder="Explain what you understand. (Optional, up to 10k chars. Speak or type)" 
      className="w-full bg-transparent border-none text-white placeholder-gray-500 focus:ring-0 text-sm resize-none p-1.5 leading-relaxed focus:outline-none pr-10"
    />
    {/* Voice Dictation Microphone Trigger */}
    {speechSupported && (
      <button
        type="button"
        onClick={toggleListening}
        className={`absolute bottom-3 right-3 w-8 h-8 rounded-full flex items-center justify-center transition-all ${
          isListening 
            ? 'bg-red-600/80 text-white animate-pulse shadow-[0_0_10px_rgba(220,38,38,0.5)]' 
            : 'bg-brand-card hover:bg-brand-border/40 text-gray-400 hover:text-white border border-brand-border/40'
        }`}
        title={isListening ? "Stop listening" : "Start speaking"}
      >
        <i className={`fa-solid ${isListening ? 'fa-microphone-slash text-xs' : 'fa-microphone text-xs'}`}></i>
      </button>
    )}
  </div>
  
  {/* AI Summarization Banner */}
  {explanation.length > 2000 && (
    <div className="mt-2.5 bg-brand-purple/10 border border-brand-purple/20 rounded-xl p-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 animate-fade-in">
      <div className="flex items-start gap-2">
        <i className="fa-solid fa-circle-info text-brand-purple-light mt-0.5"></i>
        <p className="text-[11px] text-gray-300 leading-relaxed max-w-[300px]">
          Your explanation is very detailed. Condense it below 2,000 characters for optimal AI mapping.
        </p>
      </div>
      <button
        type="button"
        onClick={handleSummarize}
        disabled={loading}
        className="self-end sm:self-center px-3 py-1.5 rounded-lg bg-brand-purple text-white text-xs font-bold transition-all hover:bg-brand-purple-light active:scale-95 disabled:opacity-50 whitespace-nowrap"
      >
        <i className="fa-solid fa-wand-magic-sparkles mr-1.5"></i>
        Summarize with AI
      </button>
    </div>
  )}
</div>
```

**Disable Main Submit on exceeding limit:**
Update the Submit button check to disable if text length > 2,000:
```javascript
disabled={loading || !topic.trim() || explanation.length > 2000}
```

---

## 🧪 Verification Plan

### Test Case 1: Browser Speech-to-Text
1. Click the microphone button in the input field.
2. Confirm the microphone permission prompt.
3. Speak clearly: *"I know about React props and state, but I struggle with closure stale state inside hooks."*
4. **Assertion:** The microphone button turns red and pulses. The spoken text appears word-by-word inside the textarea box in real-time.

### Test Case 2: AI Summarize Trigger
1. Paste a very long dummy text (e.g. 3,500 characters) into the explanation box.
2. **Assertion:** The text length indicator turns red. The "Reveal My Blind Spots" button is disabled. A warning card appears offering "Summarize with AI".
3. Click "Summarize with AI".
4. **Assertion:** The loading overlay displays. A request is sent to the backend. The textarea is successfully updated with a concise, formatted summary under 2,000 characters. The "Reveal My Blind Spots" button is now enabled.
