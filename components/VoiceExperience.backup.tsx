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

const FLOW: Stage[] = [
  "listening",
  "transcribing",
  "retrieving",
  "verifying",
  "answering",
  "complete",
];

const UI_STAGES: Stage[] = [
  "transcribing",
  "retrieving",
  "verifying",
  "answering",
];

const LABELS: Record<Stage, string> = {
  idle: "Ready",
  listening: "Listening",
  transcribing: "Transcribe",
  retrieving: "Retrieve",
  verifying: "Verify",
  answering: "Answer",
  complete: "Complete",
};

const HELPERS: Record<Stage, string> = {
  idle: "Ready",
  listening: "Listening to your question",
  transcribing: "Sarvam STT",
  retrieving: "Hybrid search",
  verifying: "Evidence check",
  answering: "Grounded output",
  complete: "Complete",
};

const examples = [
  "રશેલ કાર્સને શા માટે સહન કરવાની જવાબદારી લખી?",
  "ભારતમાં સૌર ઊર્જા શું છે?",
  "Explain solar energy",
];

function ragLanguageCode(language: string): string | undefined {
  if (language === "Gujarati") return "gu";
  if (language === "Hindi") return "hi";
  if (language === "English") return "en";

  return undefined;
}

function sttLanguageCode(language: string): string {
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

export default function VoiceExperience() {
  const [stage, setStage] = useState<Stage>("idle");
  const [language, setLanguage] = useState("Gujarati");
  const [query, setQuery] = useState("");
  const [result, setResult] = useState<RagResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [sttLatency, setSttLatency] = useState<number | null>(null);

  const recorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const recordingTimeoutRef = useRef<number | null>(null);

  const running =
    stage !== "idle" &&
    stage !== "complete" &&
    stage !== "listening";

  const activeIndex = FLOW.indexOf(stage);

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

  async function transcribeAudio(blob: Blob): Promise<string> {
    setStage("transcribing");

    const formData = new FormData();

    const mimeType = blob.type || "audio/webm";

    let extension = "webm";

    if (mimeType.includes("ogg")) {
      extension = "ogg";
    } else if (mimeType.includes("wav")) {
      extension = "wav";
    }

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

    let body: VoiceTranscriptionResponse | { detail?: string };

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

    setSttLatency(transcription.latency_ms);

    return transcription.transcript.trim();
  }

  async function runRag(
    text: string,
    fromVoice = false
  ) {
    const normalized = text.trim();

    if (!normalized) {
      return;
    }

    setQuery(normalized);
    setResult(null);
    setError(null);
    setStage("retrieving");

    const verifyTimer = window.setTimeout(() => {
      setStage("verifying");
    }, 300);

    const answerTimer = window.setTimeout(() => {
      setStage("answering");
    }, 650);

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
            ? "Voice RAG request failed safely."
            : "RAG request failed safely."
      );
    } finally {
      window.clearTimeout(verifyTimer);
      window.clearTimeout(answerTimer);
    }
  }

  async function processRecordedAudio(blob: Blob) {
    try {
      const transcript = await transcribeAudio(blob);

      setQuery(transcript);

      await runRag(
        transcript,
        true
      );
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
      setSttLatency(null);

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
        ? new MediaRecorder(stream, {
            mimeType,
          })
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

        const blob = new Blob(
          chunks,
          {
            type:
              recorder.mimeType ||
              mimeType ||
              "audio/webm",
          }
        );

        void processRecordedAudio(blob);
      };

      recorder.start(250);

      setStage("listening");

      recordingTimeoutRef.current =
        window.setTimeout(() => {
          if (
            recorderRef.current &&
            recorderRef.current.state ===
              "recording"
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

    if (
      stage !== "idle" &&
      stage !== "complete"
    ) {
      return;
    }

    await startRecording();
  }

  async function submitText(value = query) {
    if (
      stage !== "idle" &&
      stage !== "complete"
    ) {
      return;
    }

    setSttLatency(null);

    await runRag(
      value,
      false
    );
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

            <h2>
              What would you like to know?
            </h2>
          </div>

          <label className="language-select">
            <span aria-hidden="true">
              ◉
            </span>

            <span className="sr-only">
              Select language
            </span>

            <select
              value={language}
              disabled={
                stage === "listening" ||
                running
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
            stage !== "idle" &&
            stage !== "complete"
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
            aria-pressed={
              stage === "listening"
            }
          >
            <span className="mic-cap">
              <MicIcon />
            </span>

            <strong>
              {stage === "idle"
                ? "Tap to speak"
                : stage === "complete"
                  ? "Ask another"
                  : stage === "listening"
                    ? "Tap to stop"
                    : LABELS[stage]}
            </strong>

            <small>
              {stage === "idle"
                ? "Voice powered by Sarvam AI"
                : stage === "complete"
                  ? "Ready for your next question"
                  : stage === "listening"
                    ? "Speak clearly • auto-stops after 15 sec"
                    : HELPERS[stage]}
            </small>
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
            disabled={
              stage === "listening" ||
              running
            }
          />

          <button
            type="button"
            onClick={() =>
              void submitText()
            }
            disabled={
              !query.trim() ||
              (stage !== "idle" &&
                stage !== "complete")
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
                onClick={() =>
                  void submitText(example)
                }
                disabled={
                  stage !== "idle" &&
                  stage !== "complete"
                }
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

        <div className="pipeline-wrap">
          <div className="pipeline-title">
            <span>LIVE PIPELINE</span>

            <strong>
              {stage === "idle"
                ? "READY"
                : LABELS[
                    stage
                  ].toUpperCase()}
            </strong>
          </div>

          <ol className="pipeline-steps">
            {UI_STAGES.map(
              (item, index) => {
                const itemIndex =
                  FLOW.indexOf(item);

                const done =
                  stage === "complete" ||
                  activeIndex >
                    itemIndex;

                const active =
                  stage === item;

                return (
                  <li
                    key={item}
                    className={`${
                      done ? "done" : ""
                    } ${
                      active ? "active" : ""
                    }`}
                  >
                    <span className="step-node">
                      {done ? (
                        <CheckIcon />
                      ) : (
                        index + 1
                      )}
                    </span>

                    <span className="step-copy">
                      <strong>
                        {LABELS[item]}
                      </strong>

                      <small>
                        {HELPERS[item]}
                      </small>
                    </span>
                  </li>
                );
              }
            )}
          </ol>
        </div>
      </section>

      {stage === "complete" &&
        result && (
          <section
            className="result-stack"
            aria-label="Grounded answer"
          >
            <article
              className={`answer-card ${
                result.status ===
                "refused"
                  ? "is-refused"
                  : ""
              }`}
            >
              <div className="answer-topline">
                <span className="mono-label">
                  {result.status ===
                  "answered"
                    ? "GROUNDED ANSWER"
                    : "SAFE REFUSAL"}
                </span>

                {result.grounded && (
                  <span className="grounded-badge">
                    <CheckIcon /> Grounded
                  </span>
                )}
              </div>

              <h3>
                {result.status ===
                "answered"
                  ? "Answer"
                  : "Insufficient evidence"}
              </h3>

              <p>{result.answer}</p>

              <div className="answer-stats">
                <span>
                  {result.language?.toUpperCase() ||
                    "AUTO"}
                </span>

                <span>
                  {Math.round(
                    result.grounding_score *
                      100
                  )}
                  % grounding
                </span>

                {sttLatency !== null && (
                  <span>
                    STT{" "}
                    {Math.round(
                      sttLatency
                    )}{" "}
                    ms
                  </span>
                )}

                <span>
                  RAG{" "}
                  {Math.round(
                    result.latency
                      .total_ms
                  )}{" "}
                  ms
                </span>
              </div>
            </article>

            {result.sources.length >
              0 && (
              <div className="evidence-grid">
                {result.sources
                  .slice(0, 3)
                  .map((source) => (
                    <article
                      className="evidence-card"
                      key={source.id}
                    >
                      <span>
                        {String(
                          source.rank
                        ).padStart(
                          2,
                          "0"
                        )}
                      </span>

                      <div>
                        <strong>
                          MSMARCO-XI ·{" "}
                          {source.strategy ||
                            "passage"}
                        </strong>

                        <small>
                          {source.text}
                        </small>
                      </div>

                      <span className="source-score">
                        {source.score.toFixed(
                          3
                        )}
                      </span>
                    </article>
                  ))}
              </div>
            )}

            <details className="trace-card">
              <summary>
                View pipeline details
              </summary>

              <dl>
                {sttLatency !== null && (
                  <div>
                    <dt>
                      Sarvam STT
                    </dt>

                    <dd>
                      {sttLatency.toFixed(
                        1
                      )}{" "}
                      ms
                    </dd>
                  </div>
                )}

                <div>
                  <dt>Input guard</dt>
                  <dd>
                    {result.latency.input_guard_ms.toFixed(
                      1
                    )}{" "}
                    ms
                  </dd>
                </div>

                <div>
                  <dt>
                    Hybrid retrieval
                  </dt>

                  <dd>
                    {result.latency.retrieval_ms.toFixed(
                      1
                    )}{" "}
                    ms
                  </dd>
                </div>

                <div>
                  <dt>Generation</dt>

                  <dd>
                    {result.latency.generation_ms.toFixed(
                      1
                    )}{" "}
                    ms
                  </dd>
                </div>

                <div>
                  <dt>
                    Output guard
                  </dt>

                  <dd>
                    {result.latency.output_guard_ms.toFixed(
                      1
                    )}{" "}
                    ms
                  </dd>
                </div>

                <div className="trace-total">
                  <dt>RAG total</dt>

                  <dd>
                    {result.latency.total_ms.toFixed(
                      1
                    )}{" "}
                    ms
                  </dd>
                </div>

                {sttLatency !== null && (
                  <div className="trace-total">
                    <dt>
                      Voice → Answer
                    </dt>

                    <dd>
                      {(
                        sttLatency +
                        result.latency
                          .total_ms
                      ).toFixed(1)}{" "}
                      ms
                    </dd>
                  </div>
                )}
              </dl>
            </details>
          </section>
        )}
    </div>
  );
}