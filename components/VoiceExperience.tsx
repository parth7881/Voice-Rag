"use client";

import {
  useEffect,
  useRef,
  useState,
} from "react";

import {
  ArrowIcon,
  CheckIcon,
  MicIcon,
} from "./Icons";

import {
  askRag,
  type RagResponse,
} from "@/lib/rag-api";

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

const examples = [
  "રશેલ કાર્સને શા માટે સહન કરવાની જવાબદારી લખી?",
  "કોર્પોરેશન શું છે?",
  "Explain solar energy",
];

function ragLanguageCode(
  language: string
): string | undefined {
  if (language === "Gujarati") return "gu";
  if (language === "Hindi") return "hi";
  if (language === "English") return "en";
  return undefined;
}

function sttLanguageCode(
  language: string
): string {
  if (language === "Gujarati") return "gu-IN";
  if (language === "Hindi") return "hi-IN";
  if (language === "English") return "en-IN";
  return "unknown";
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
  if (
    stage === "retrieving" ||
    stage === "verifying" ||
    stage === "answering"
  ) {
    return "Finding your answer";
  }
  return "Tap to speak";
}

function helperText(stage: Stage): string {
  if (stage === "listening") {
    return "Tap again when you finish speaking";
  }

  if (
    stage === "transcribing" ||
    stage === "retrieving" ||
    stage === "verifying" ||
    stage === "answering"
  ) {
    return "Please wait a moment";
  }

  if (stage === "complete") {
    return "Ready for your next question";
  }

  return "Voice powered by Sarvam AI";
}

export default function VoiceExperience() {
  const [stage, setStage] = useState<Stage>("idle");
  const [language, setLanguage] = useState("Gujarati");
  const [query, setQuery] = useState("");
  const [result, setResult] =
    useState<RagResponse | null>(null);
  const [error, setError] =
    useState<string | null>(null);

  const recorderRef =
    useRef<MediaRecorder | null>(null);
  const streamRef =
    useRef<MediaStream | null>(null);
  const chunksRef =
    useRef<Blob[]>([]);
  const recordingTimeoutRef =
    useRef<number | null>(null);

  const busy =
    stage !== "idle" &&
    stage !== "complete" &&
    stage !== "listening";

  useEffect(() => {
    return () => {
      if (recordingTimeoutRef.current !== null) {
        window.clearTimeout(recordingTimeoutRef.current);
      }

      if (
        recorderRef.current &&
        recorderRef.current.state !== "inactive"
      ) {
        recorderRef.current.stop();
      }

      streamRef.current?.getTracks().forEach((track) => {
        track.stop();
      });
    };
  }, []);

  function cleanupRecording() {
    if (recordingTimeoutRef.current !== null) {
      window.clearTimeout(recordingTimeoutRef.current);
      recordingTimeoutRef.current = null;
    }

    streamRef.current?.getTracks().forEach((track) => {
      track.stop();
    });

    streamRef.current = null;
    recorderRef.current = null;
  }

  async function transcribeAudio(
    blob: Blob
  ): Promise<string> {
    setStage("transcribing");

    const formData = new FormData();
    const mimeType = blob.type || "audio/webm";

    let extension = "webm";
    if (mimeType.includes("ogg")) extension = "ogg";
    if (mimeType.includes("wav")) extension = "wav";

    formData.append(
      "file",
      blob,
      `recording.${extension}`
    );

    formData.append(
      "language_code",
      sttLanguageCode(language)
    );

    const response = await fetch(
      `${getApiBaseUrl()}/v1/voice/transcribe`,
      {
        method: "POST",
        body: formData,
      }
    );

    let body:
      | VoiceTranscriptionResponse
      | { detail?: string };

    try {
      body = await response.json();
    } catch {
      throw new Error(
        "Voice service returned an invalid response."
      );
    }

    if (!response.ok) {
      const detail =
        "detail" in body && typeof body.detail === "string"
          ? body.detail
          : "Voice transcription failed.";

      throw new Error(detail);
    }

    const transcription =
      body as VoiceTranscriptionResponse;

    if (!transcription.transcript?.trim()) {
      throw new Error(
        "No speech was detected. Please try again."
      );
    }

    return transcription.transcript.trim();
  }

  async function runRag(
    text: string,
    fromVoice = false
  ) {
    const normalized = text.trim();
    if (!normalized) return;

    setQuery(normalized);
    setResult(null);
    setError(null);
    setStage("retrieving");

    const verifyingTimer = window.setTimeout(() => {
      setStage("verifying");
    }, 320);

    const answeringTimer = window.setTimeout(() => {
      setStage("answering");
    }, 700);

    try {
      const response = await askRag(
        normalized,
        ragLanguageCode(language)
      );

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

      setError(
        cause instanceof Error
          ? cause.message
          : "Voice transcription failed."
      );
    } finally {
      cleanupRecording();
    }
  }

  async function startRecording() {
    if (
      typeof window === "undefined" ||
      !navigator.mediaDevices?.getUserMedia
    ) {
      setError(
        "Microphone access is not supported in this browser."
      );
      return;
    }

    if (typeof MediaRecorder === "undefined") {
      setError(
        "Audio recording is not supported in this browser."
      );
      return;
    }

    try {
      setError(null);
      setResult(null);

      const stream =
        await navigator.mediaDevices.getUserMedia({
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
        if (event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };

      recorder.onerror = () => {
        setError(
          "Microphone recording failed. Please try again."
        );
        setStage("idle");
        cleanupRecording();
      };

      recorder.onstop = () => {
        const chunks = chunksRef.current;
        chunksRef.current = [];

        if (chunks.length === 0) {
          setError(
            "No audio was captured. Please try again."
          );
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
        if (
          recorderRef.current &&
          recorderRef.current.state === "recording"
        ) {
          recorderRef.current.stop();
        }
      }, 15000);
    } catch (cause) {
      cleanupRecording();
      setStage("idle");

      if (
        cause instanceof DOMException &&
        cause.name === "NotAllowedError"
      ) {
        setError(
          "Microphone permission was denied. Allow microphone access and try again."
        );
        return;
      }

      setError(
        cause instanceof Error
          ? cause.message
          : "Unable to access the microphone."
      );
    }
  }

  function stopRecording() {
    if (
      recorderRef.current &&
      recorderRef.current.state === "recording"
    ) {
      recorderRef.current.stop();
    }
  }

  async function startVoice() {
    if (stage === "listening") {
      stopRecording();
      return;
    }

    if (stage !== "idle" && stage !== "complete") {
      return;
    }

    await startRecording();
  }

  async function submitText(value = query) {
    if (stage !== "idle" && stage !== "complete") {
      return;
    }

    await runRag(value, false);
  }

  return (
    <div className="voice-column">
      <section
        className="voice-card"
        aria-live="polite"
      >
        <div className="voice-card-head">
          <div>
            <span className="mono-label">
              VOICE SEARCH
            </span>
            <h2>What would you like to know?</h2>
          </div>

          <label className="language-select">
            <span aria-hidden="true">◉</span>
            <span className="sr-only">Select language</span>
            <select
              value={language}
              disabled={
                stage === "listening" || busy
              }
              onChange={(event) =>
                setLanguage(event.target.value)
              }
            >
              <option>Gujarati</option>
              <option>Hindi</option>
              <option>English</option>
            </select>
          </label>
        </div>

        <div
          className={`voice-orbit ${
            stage !== "idle" && stage !== "complete"
              ? "is-running"
              : ""
          }`}
        >
          <div className="orbit orbit-one" />
          <div className="orbit orbit-two" />

          <button
            type="button"
            className="sun-mic"
            onClick={() => void startVoice()}
            aria-label={
              stage === "listening"
                ? "Stop recording"
                : "Start voice input"
            }
          >
            <span className="mic-cap">
              <MicIcon />
            </span>

            <strong>
              {stage === "complete"
                ? "Ask another"
                : statusText(stage)}
            </strong>

            <small>{helperText(stage)}</small>
          </button>
        </div>

        <div className="search-field">
          <input
            value={query}
            onChange={(event) =>
              setQuery(event.target.value)
            }
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                void submitText();
              }
            }}
            placeholder="Or type your question…"
            aria-label="Type a question"
            disabled={stage === "listening" || busy}
          />

          <button
            type="button"
            onClick={() => void submitText()}
            disabled={
              !query.trim() ||
              (stage !== "idle" && stage !== "complete")
            }
            aria-label="Submit question"
          >
            <ArrowIcon />
          </button>
        </div>

        <div className="try-row">
          <span>TRY ASKING</span>
          <div>
            {examples.map((example) => (
              <button
                type="button"
                key={example}
                disabled={
                  stage !== "idle" && stage !== "complete"
                }
                onClick={() => void submitText(example)}
              >
                {example}
              </button>
            ))}
          </div>
        </div>

        {error && (
          <div
            className="rag-error"
            role="alert"
          >
            {error}
          </div>
        )}
      </section>

      <section
        className={`final-answer-box ${
          result ? "has-result" : "is-empty"
        } ${
          result?.status === "refused"
            ? "is-refused"
            : ""
        }`}
        aria-label="Answer area"
      >
        {!result ? (
          <div className="final-answer-empty">
            <div
              className="final-answer-icon"
              aria-hidden="true"
            >
              <CheckIcon />
            </div>

            <div>
              <span className="final-answer-eyebrow">
                ANSWER SPACE
              </span>
              <h3>Your answer will appear here</h3>
              <p>
                Ask using voice or text. A clear answer will
                appear here in a clean reading area.
              </p>
            </div>
          </div>
        ) : (
          <div className="final-answer-content">
            <span className="final-answer-eyebrow">
              {result.status === "answered"
                ? "ANSWER"
                : "SAFE RESPONSE"}
            </span>

            <h3>
              {result.status === "answered"
                ? "Answer"
                : "Insufficient evidence"}
            </h3>

            <p className="final-answer-text">
              {result.answer}
            </p>
          </div>
        )}
      </section>

      <style>{`
        .final-answer-box {
          position: relative;
          min-height: 190px;
          margin-top: 20px;
          padding: 30px;
          overflow: hidden;
          border: 1px solid rgba(0, 72, 52, 0.16);
          border-radius: 24px;
          background:
            linear-gradient(
              145deg,
              rgba(255,255,255,0.95) 0%,
              rgba(251,252,248,0.98) 100%
            );
          box-shadow:
            0 16px 42px rgba(0, 58, 42, 0.06);
        }

        .final-answer-box::before {
          content: "";
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 4px;
          background:
            linear-gradient(
              90deg,
              #004f3a 0%,
              #ffd91a 54%,
              #f20b78 100%
            );
        }

        .final-answer-box.is-refused {
          border-color: rgba(242, 11, 120, 0.22);
        }

        .final-answer-empty {
          min-height: 128px;
          display: flex;
          align-items: center;
          gap: 20px;
        }

        .final-answer-icon {
          width: 54px;
          height: 54px;
          flex: 0 0 54px;
          display: grid;
          place-items: center;
          border-radius: 16px;
          background: #ffd91a;
          color: #003e2d;
          box-shadow: 0 8px 0 rgba(0, 79, 58, 0.08);
        }

        .final-answer-icon svg {
          width: 22px;
          height: 22px;
        }

        .final-answer-eyebrow {
          display: block;
          margin-bottom: 8px;
          color: #007055;
          font-size: 10px;
          font-weight: 800;
          letter-spacing: 0.14em;
        }

        .final-answer-box h3 {
          margin: 0 0 12px;
          color: #003e2d;
          font-size: clamp(24px, 2vw, 30px);
          line-height: 1.14;
          letter-spacing: -0.02em;
        }

        .final-answer-empty p,
        .final-answer-text {
          max-width: 760px;
          margin: 0;
          color: #2c4b42;
          font-size: 16px;
          line-height: 1.82;
          letter-spacing: 0.002em;
        }

        .final-answer-content {
          display: block;
        }

        @media (max-width: 580px) {
          .final-answer-box {
            min-height: 168px;
            padding: 24px 20px;
            border-radius: 20px;
          }

          .final-answer-empty {
            align-items: flex-start;
          }

          .final-answer-icon {
            width: 44px;
            height: 44px;
            flex-basis: 44px;
          }

          .final-answer-empty p,
          .final-answer-text {
            font-size: 15px;
            line-height: 1.74;
          }
        }
      `}</style>
    </div>
  );
}