"use client";

import { useEffect, useRef, useState } from "react";
import { ArrowIcon, CheckIcon, MicIcon } from "./Icons";
import { askRag, type RagResponse } from "@/lib/rag-api";

type Stage =
  | "idle"
  | "listening"
  | "transcribing"
  | "retrieving"
  | "verifying"
  | "answering"
  | "complete";

type VoiceTranscriptionResponse = {
  status: string;
  transcript: string;
  language_code: string | null;
  provider_request_id: string | null;
  latency_ms: number;
};

type Language = "Gujarati" | "Hindi" | "English";

const examplesByLanguage: Record<Language, string[]> = {
  Gujarati: [
    "કોર્પોરેશન શું છે?",
    "રશેલ કાર્સન કોણ હતાં?",
    "સૌર ઊર્જા શા માટે મહત્વપૂર્ણ છે?",
  ],
  Hindi: [
    "कॉर्पोरेशन क्या है?",
    "रैचल कार्सन कौन थीं?",
    "सौर ऊर्जा क्यों महत्वपूर्ण है?",
  ],
  English: [
    "What is a corporation?",
    "Who was Rachel Carson?",
    "Why is solar energy important?",
  ],
};

function ragLanguageCode(language: Language): string {
  if (language === "Gujarati") return "gu";
  if (language === "Hindi") return "hi";
  return "en";
}

function sttLanguageCode(language: Language): string {
  if (language === "Gujarati") return "gu-IN";
  if (language === "Hindi") return "hi-IN";
  return "en-IN";
}

function getApiBaseUrl(): string {
  return (
    process.env.NEXT_PUBLIC_API_BASE_URL?.replace(/\/$/, "") ||
    "http://127.0.0.1:8000"
  );
}

function getRecorderMimeType(): string {
  const candidates = [
    "audio/webm;codecs=opus",
    "audio/webm",
    "audio/ogg;codecs=opus",
  ];

  for (const candidate of candidates) {
    if (
      typeof MediaRecorder !== "undefined" &&
      MediaRecorder.isTypeSupported(candidate)
    ) {
      return candidate;
    }
  }

  return "";
}

function statusText(stage: Stage): string {
  if (stage === "listening") return "Listening";
  if (stage === "transcribing") return "Understanding";
  if (stage === "retrieving" || stage === "verifying" || stage === "answering") {
    return "Finding your answer";
  }
  return "Tap to speak";
}

function helperText(stage: Stage): string {
  if (stage === "listening") return "Tap again when you finish speaking";
  if (stage === "transcribing" || stage === "retrieving" || stage === "verifying" || stage === "answering") {
    return "Please wait a moment";
  }
  if (stage === "complete") return "Ready for your next question";
  return "Voice powered by Sarvam AI";
}

export default function VoiceExperience() {
  const [stage, setStage] = useState<Stage>("idle");
  const [language, setLanguage] = useState<Language>("Gujarati");
  const [query, setQuery] = useState("");
  const [result, setResult] = useState<RagResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  const recorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const recordingTimeoutRef = useRef<number | null>(null);

  const busy = stage !== "idle" && stage !== "complete" && stage !== "listening";
  const examples = examplesByLanguage[language];

  useEffect(() => {
    return () => {
      if (recordingTimeoutRef.current !== null) {
        window.clearTimeout(recordingTimeoutRef.current);
      }
      if (recorderRef.current && recorderRef.current.state !== "inactive") {
        recorderRef.current.stop();
      }
      streamRef.current?.getTracks().forEach((track) => track.stop());
    };
  }, []);

  function cleanupRecording() {
    if (recordingTimeoutRef.current !== null) {
      window.clearTimeout(recordingTimeoutRef.current);
      recordingTimeoutRef.current = null;
    }
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    recorderRef.current = null;
  }

  async function transcribeAudio(blob: Blob): Promise<string> {
    setStage("transcribing");
    const formData = new FormData();
    const mimeType = blob.type || "audio/webm";
    let extension = "webm";
    if (mimeType.includes("ogg")) extension = "ogg";
    if (mimeType.includes("wav")) extension = "wav";

    formData.append("file", blob, `recording.${extension}`);
    formData.append("language_code", sttLanguageCode(language));

    const response = await fetch(`${getApiBaseUrl()}/v1/voice/transcribe`, {
      method: "POST",
      body: formData,
    });

    let body: VoiceTranscriptionResponse | { detail?: string };
    try {
      body = await response.json();
    } catch {
      throw new Error("Voice service returned an invalid response.");
    }

    if (!response.ok) {
      const detail =
        "detail" in body && typeof body.detail === "string"
          ? body.detail
          : "Voice transcription failed.";
      throw new Error(detail);
    }

    const transcription = body as VoiceTranscriptionResponse;
    if (!transcription.transcript?.trim()) {
      throw new Error("No speech was detected. Please try again.");
    }
    return transcription.transcript.trim();
  }

  async function runRag(text: string, fromVoice = false) {
    const normalized = text.trim();
    if (!normalized) return;

    setQuery(normalized);
    setResult(null);
    setError(null);
    setStage("retrieving");

    const verifyingTimer = window.setTimeout(() => setStage("verifying"), 320);
    const answeringTimer = window.setTimeout(() => setStage("answering"), 700);

    try {
      const response = await askRag(normalized, ragLanguageCode(language));
      setResult(response);
      setStage("complete");
    } catch (cause) {
      setStage("idle");
      setError(
        cause instanceof Error
          ? cause.message
          : fromVoice
            ? "Voice request failed."
            : "Request failed."
      );
    } finally {
      window.clearTimeout(verifyingTimer);
      window.clearTimeout(answeringTimer);
    }
  }

  async function processRecordedAudio(blob: Blob) {
    try {
      const transcript = await transcribeAudio(blob);
      setQuery(transcript);
      await runRag(transcript, true);
    } catch (cause) {
      setStage("idle");
      setError(cause instanceof Error ? cause.message : "Voice transcription failed.");
    } finally {
      cleanupRecording();
    }
  }

  async function startRecording() {
    if (typeof window === "undefined" || !navigator.mediaDevices?.getUserMedia) {
      setError("Microphone access is not supported in this browser.");
      return;
    }
    if (typeof MediaRecorder === "undefined") {
      setError("Audio recording is not supported in this browser.");
      return;
    }

    try {
      setError(null);
      setResult(null);
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });

      streamRef.current = stream;
      chunksRef.current = [];
      const mimeType = getRecorderMimeType();
      const recorder = mimeType
        ? new MediaRecorder(stream, { mimeType })
        : new MediaRecorder(stream);
      recorderRef.current = recorder;

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) chunksRef.current.push(event.data);
      };

      recorder.onerror = () => {
        setError("Microphone recording failed. Please try again.");
        setStage("idle");
        cleanupRecording();
      };

      recorder.onstop = () => {
        const chunks = chunksRef.current;
        chunksRef.current = [];
        if (chunks.length === 0) {
          setError("No audio was captured. Please try again.");
          setStage("idle");
          cleanupRecording();
          return;
        }
        const blob = new Blob(chunks, {
          type: recorder.mimeType || mimeType || "audio/webm",
        });
        void processRecordedAudio(blob);
      };

      recorder.start(250);
      setStage("listening");
      recordingTimeoutRef.current = window.setTimeout(() => {
        if (recorderRef.current?.state === "recording") recorderRef.current.stop();
      }, 15000);
    } catch (cause) {
      cleanupRecording();
      setStage("idle");
      if (cause instanceof DOMException && cause.name === "NotAllowedError") {
        setError("Microphone permission was denied. Allow microphone access and try again.");
        return;
      }
      setError(cause instanceof Error ? cause.message : "Unable to access the microphone.");
    }
  }

  function stopRecording() {
    if (recorderRef.current?.state === "recording") recorderRef.current.stop();
  }

  async function startVoice() {
    if (stage === "listening") {
      stopRecording();
      return;
    }
    if (stage !== "idle" && stage !== "complete") return;
    await startRecording();
  }

  async function submitText(value = query) {
    if (stage !== "idle" && stage !== "complete") return;
    await runRag(value, false);
  }

  return (
    <div className="voice-column">
      <section className="voice-card" aria-live="polite">
        <div className="voice-card-head">
          <div>
            <span className="mono-label">VOICE SEARCH</span>
            <h2>What would you like to know?</h2>
          </div>

          <label className="language-select">
            <span className="language-dot" aria-hidden="true" />
            <span className="sr-only">Select language</span>
            <select
              value={language}
              disabled={stage === "listening" || busy}
              onChange={(event) => {
                setLanguage(event.target.value as Language);
                setQuery("");
                setResult(null);
                setError(null);
              }}
            >
              <option>Gujarati</option>
              <option>Hindi</option>
              <option>English</option>
            </select>
          </label>
        </div>

        <div className={`voice-orbit ${busy || stage === "listening" ? "is-running" : ""}`}>
          <div className="orbit orbit-one" />
          <div className="orbit orbit-two" />
          <button
            type="button"
            className="sun-mic"
            onClick={() => void startVoice()}
            aria-label={stage === "listening" ? "Stop recording" : "Start voice input"}
          >
            <span className="mic-cap"><MicIcon /></span>
            <strong>{stage === "complete" ? "Ask another" : statusText(stage)}</strong>
            <small>{helperText(stage)}</small>
          </button>
        </div>

        <div className="search-field">
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") void submitText();
            }}
            placeholder="Or type your question…"
            aria-label="Type a question"
            disabled={stage === "listening" || busy}
          />
          <button
            type="button"
            onClick={() => void submitText()}
            disabled={!query.trim() || (stage !== "idle" && stage !== "complete")}
            aria-label="Submit question"
          >
            <ArrowIcon />
          </button>
        </div>

        <div className="try-row">
          <span className="try-label">Try asking</span>
          <div className="suggestion-list">
            {examples.map((example) => (
              <button
                type="button"
                key={example}
                disabled={stage !== "idle" && stage !== "complete"}
                onClick={() => void submitText(example)}
              >
                {example}
              </button>
            ))}
          </div>
        </div>

        {error && <div className="rag-error" role="alert">{error}</div>}
      </section>

      <section
        className={`final-answer-box ${result ? "has-result" : "is-empty"} ${result?.status === "refused" ? "is-refused" : ""}`}
        aria-label="Answer area"
      >
        {!result ? (
          <div className="final-answer-empty">
            <div className="final-answer-icon" aria-hidden="true"><CheckIcon /></div>
            <div>
              <span className="final-answer-eyebrow">ANSWER SPACE</span>
              <h3>Your answer will appear here</h3>
              <p>Ask using voice or text. A clear answer will appear here in a clean reading area.</p>
            </div>
          </div>
        ) : (
          <div className="final-answer-content">
            <span className="final-answer-eyebrow">
              {result.status === "answered" ? "ANSWER" : "SAFE RESPONSE"}
            </span>
            <h3>{result.status === "answered" ? "Answer" : "Insufficient evidence"}</h3>
            <p className="final-answer-text">{result.answer}</p>
          </div>
        )}
      </section>

      <style>{`
        .voice-column { min-width: 0; }
        .voice-card {
          background: #fff;
          border: 1px solid rgba(31, 41, 55, .12);
          border-radius: 24px;
          box-shadow: 0 1px 2px rgba(0,0,0,.04), 0 10px 30px rgba(4,54,41,.07);
          padding: 32px 34px 28px;
        }
        .voice-card-head { display:flex; justify-content:space-between; align-items:flex-start; gap:20px; }
        .mono-label {
          color:#176b57;
          font:700 10px/1.2 Inter, ui-sans-serif, sans-serif;
          letter-spacing:.12em;
          text-transform:uppercase;
        }
        .voice-card-head h2 { margin:8px 0 0; max-width:330px; color:#043629; font-size:26px; line-height:1.08; letter-spacing:-.035em; }
        .language-select {
          min-width:126px; height:42px; padding:0 12px;
          display:flex; align-items:center; gap:8px;
          border:1px solid rgba(31,41,55,.14); border-radius:14px;
          background:#fff; box-shadow:0 1px 2px rgba(0,0,0,.03);
        }
        .language-dot { width:8px; height:8px; border-radius:50%; background:#0f9460; box-shadow:0 0 0 3px rgba(15,148,96,.10); }
        .language-select select { border:0; outline:0; background:transparent; color:#043629; font-size:12px; font-weight:700; cursor:pointer; }
        .voice-orbit { width:220px; height:220px; margin:10px auto 8px; position:relative; display:grid; place-items:center; }
        .orbit { position:absolute; border-radius:50%; pointer-events:none; }
        .orbit-one { inset:12px; border:1px solid rgba(4,54,41,.08); }
        .orbit-two { inset:28px; border:1px dashed rgba(4,54,41,.13); }
        .voice-orbit::after { content:""; position:absolute; width:162px; height:162px; border-radius:50%; background:#ffd91f; box-shadow:0 10px 24px rgba(255,217,31,.18); }
        .voice-orbit.is-running .orbit-one { animation:spin 5s linear infinite; border-style:dashed; }
        .voice-orbit.is-running .orbit-two { animation:spinReverse 7s linear infinite; }
        .sun-mic { position:relative; z-index:2; width:154px; height:154px; border:0; border-radius:50%; background:transparent; display:grid; place-items:center; align-content:center; gap:7px; cursor:pointer; color:#043629; }
        .sun-mic strong { font-size:13px; font-weight:800; }
        .sun-mic small { max-width:128px; color:#66756f; font-size:9px; line-height:1.35; }
        .mic-cap { width:62px; height:62px; border-radius:50%; display:grid; place-items:center; background:#043629; color:#fff; box-shadow:0 8px 20px rgba(4,54,41,.16); }
        .search-field { min-height:50px; display:grid; grid-template-columns:1fr 46px; border:1px solid rgba(31,41,55,.14); border-radius:16px; background:#fff; box-shadow:0 1px 2px rgba(0,0,0,.03); overflow:hidden; }
        .search-field:focus-within { border-color:rgba(8,102,60,.48); box-shadow:0 0 0 3px rgba(8,102,60,.08); }
        .search-field input { width:100%; border:0; outline:0; background:transparent; padding:0 15px; color:#163c34; font-size:13px; }
        .search-field button { margin:4px; border:0; border-radius:12px; display:grid; place-items:center; background:#075747; color:#fff; cursor:pointer; }
        .search-field button:disabled { background:#b8c7c1; cursor:not-allowed; }
        .try-row { margin-top:14px; display:grid; grid-template-columns:auto 1fr; align-items:center; gap:12px; }
        .try-label { color:#5b6b65; font-size:11px; font-weight:750; letter-spacing:.01em; white-space:nowrap; }
        .suggestion-list { display:flex; flex-wrap:wrap; gap:7px; }
        .suggestion-list button { min-height:32px; padding:7px 11px; border:1px solid rgba(31,41,55,.12); border-radius:999px; background:#f8faf9; color:#244a40; font-size:11px; font-weight:650; cursor:pointer; box-shadow:0 1px 1px rgba(0,0,0,.02); }
        .suggestion-list button:hover:not(:disabled) { background:#f1f6f3; border-color:rgba(8,102,60,.24); }
        .rag-error { margin-top:14px; padding:11px 13px; border-radius:12px; background:#fff4f4; color:#8d2e2e; font-size:12px; }
        .final-answer-box { margin-top:20px; min-height:170px; padding:28px 30px; border:1px solid rgba(31,41,55,.10); border-radius:22px; background:#fff; box-shadow:0 1px 2px rgba(0,0,0,.03), 0 8px 24px rgba(4,54,41,.05); }
        .final-answer-empty { min-height:112px; display:grid; grid-template-columns:52px 1fr; align-items:center; gap:18px; }
        .final-answer-icon { width:50px; height:50px; border-radius:15px; display:grid; place-items:center; background:#ffd91f; color:#043629; box-shadow:0 6px 14px rgba(255,217,31,.16); }
        .final-answer-eyebrow { color:#176b57; font-size:10px; font-weight:800; letter-spacing:.13em; }
        .final-answer-box h3 { margin:7px 0 0; color:#043629; font-size:25px; line-height:1.15; letter-spacing:-.03em; }
        .final-answer-box p { margin:10px 0 0; color:#526a61; font-size:13px; line-height:1.65; }
        .final-answer-text { white-space:pre-wrap; }
        @keyframes spin { to { transform:rotate(360deg); } }
        @keyframes spinReverse { to { transform:rotate(-360deg); } }

        @media (max-width: 640px) {
          .voice-card { padding:24px 20px 22px; border-radius:20px; }
          .voice-card-head { gap:12px; }
          .voice-card-head h2 { font-size:22px; max-width:230px; }
          .language-select { min-width:116px; height:40px; }
          .voice-orbit { width:184px; height:184px; margin:4px auto 6px; }
          .voice-orbit::after { width:140px; height:140px; }
          .orbit-one { inset:8px; }
          .orbit-two { inset:22px; }
          .sun-mic { width:134px; height:134px; gap:6px; }
          .mic-cap { width:54px; height:54px; }
          .sun-mic strong { font-size:12px; }
          .sun-mic small { font-size:8.5px; }
          .try-row { grid-template-columns:1fr; gap:8px; }
          .try-label { font-size:12px; font-weight:800; }
          .suggestion-list { gap:6px; }
          .suggestion-list button { font-size:11px; min-height:34px; }
          .final-answer-box { padding:22px 20px; border-radius:18px; }
          .final-answer-empty { grid-template-columns:44px 1fr; gap:14px; }
          .final-answer-icon { width:44px; height:44px; border-radius:13px; }
          .final-answer-box h3 { font-size:21px; }
        }

        @media (max-width: 420px) {
          .voice-card-head { align-items:flex-start; }
          .voice-card-head h2 { font-size:20px; max-width:180px; }
          .language-select { min-width:108px; padding:0 9px; }
          .language-select select { font-size:11px; }
          .voice-orbit { width:174px; height:174px; }
          .voice-orbit::after { width:132px; height:132px; }
          .sun-mic { width:126px; height:126px; }
          .mic-cap { width:50px; height:50px; }
        }
      `}</style>
    </div>
  );
}
