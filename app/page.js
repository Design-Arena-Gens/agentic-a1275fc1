"use client";

import { useCallback, useMemo, useRef, useState } from "react";

const toneOptions = [
  "cinematic realism",
  "dynamic commercial",
  "documentary",
  "whimsical",
  "moody noir",
  "vibrant lifestyle"
];

const objectiveOptions = [
  "storyboard breakdown",
  "concept art brief",
  "shot list for directors",
  "narrative prompt",
  "style transfer prompt",
  "visual inspiration deck"
];

const stylePresets = [
  "hyper-detailed",
  "expressive and abstract",
  "grounded and minimalist",
  "high-energy montage",
  "slow cinematic drama",
  "immersive worldbuilding"
];

const focusOptions = [
  { id: "visuals", label: "Visual Style" },
  { id: "lighting", label: "Lighting" },
  { id: "narrative", label: "Narrative Beats" },
  { id: "motion", label: "Motion & Energy" },
  { id: "mood", label: "Mood & Atmosphere" },
  { id: "audio", label: "Audio / Sound" }
];

const maxSceneSamples = 10;

export default function Page() {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const [videoSource, setVideoSource] = useState(null);
  const [videoMeta, setVideoMeta] = useState(null);
  const [processing, setProcessing] = useState(false);
  const [status, setStatus] = useState("");
  const [granularity, setGranularity] = useState(4);
  const [tone, setTone] = useState(toneOptions[0]);
  const [objective, setObjective] = useState(objectiveOptions[0]);
  const [stylePreset, setStylePreset] = useState(stylePresets[0]);
  const [focusAreas, setFocusAreas] = useState(new Set(["visuals", "lighting", "narrative"]));
  const [projectTitle, setProjectTitle] = useState("");
  const [audienceNotes, setAudienceNotes] = useState("");
  const [customDirectives, setCustomDirectives] = useState("");
  const [scenePrompts, setScenePrompts] = useState([]);
  const [compiledPrompt, setCompiledPrompt] = useState("");
  const [pulse, setPulse] = useState(0);

  const toggleFocus = useCallback((id) => {
    setFocusAreas((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  const resetState = useCallback(() => {
    setScenePrompts([]);
    setCompiledPrompt("");
    setStatus("");
    setPulse((p) => p + 1);
  }, []);

  const handleFileChange = useCallback((event) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }
    if (!file.type.startsWith("video/")) {
      setStatus("Please choose a valid video file.");
      return;
    }
    const url = URL.createObjectURL(file);
    setVideoSource({ url, file });
    resetState();
  }, [resetState]);

  const handleVideoLoaded = useCallback(() => {
    const video = videoRef.current;
    if (video && video.duration) {
      setVideoMeta({
        duration: video.duration,
        width: video.videoWidth,
        height: video.videoHeight
      });
    }
  }, []);

  const sceneCount = useMemo(() => {
    if (!videoMeta) return 0;
    const duration = videoMeta.duration;
    const base = Math.max(3, Math.round((duration / 20) * (granularity + 1)));
    return Math.min(maxSceneSamples, base);
  }, [videoMeta, granularity]);

  const hasVideoReady = Boolean(videoSource && videoMeta && sceneCount > 0);

  const describeColor = (r, g, b) => {
    const [h, s, l] = rgbToHsl(r, g, b);

    const colorDescriptors = [
      { name: "crisp Arctic blue", match: h >= 200 && h < 240 && s > 0.2 },
      { name: "electric violet", match: h >= 260 && h < 300 && s > 0.35 },
      { name: "sunlit amber", match: h >= 30 && h < 60 && l > 0.55 },
      { name: "deep emerald", match: h >= 130 && h < 170 && s > 0.25 },
      { name: "moody indigo", match: h >= 210 && h < 250 && l < 0.45 },
      { name: "faded sepia", match: h >= 20 && h < 50 && s < 0.25 },
      { name: "soft rose", match: h >= 330 || h < 15 },
      { name: "graphite neutral", match: s < 0.12 }
    ];

    const found = colorDescriptors.find((descriptor) => descriptor.match);
    return found ? found.name : "balanced palette";
  };

  const analyzeFrame = (imageData, width, height) => {
    const data = imageData.data;
    const totalPixels = width * height;
    const stride = Math.max(4, Math.floor(totalPixels / 55000) * 4);

    let rSum = 0;
    let gSum = 0;
    let bSum = 0;
    let brightnessSum = 0;
    let minBrightness = 255;
    let maxBrightness = 0;
    let sampled = 0;

    for (let i = 0; i < data.length; i += stride) {
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];
      const brightness = 0.299 * r + 0.587 * g + 0.114 * b;

      rSum += r;
      gSum += g;
      bSum += b;
      brightnessSum += brightness;
      if (brightness < minBrightness) minBrightness = brightness;
      if (brightness > maxBrightness) maxBrightness = brightness;
      sampled += 1;
    }

    if (!sampled) {
      return {
        palette: "balanced palette",
        lighting: "neutral lighting",
        mood: "steady atmosphere",
        energy: "controlled pacing"
      };
    }

    const avgR = rSum / sampled;
    const avgG = gSum / sampled;
    const avgB = bSum / sampled;
    const avgBrightness = brightnessSum / sampled;
    const contrast = (maxBrightness - minBrightness) / 255;
    const [h, s, l] = rgbToHsl(avgR, avgG, avgB);

    const paletteDescriptor = describeColor(avgR, avgG, avgB);
    const lighting =
      avgBrightness > 200
        ? "high-key lighting"
        : avgBrightness > 150
        ? "well-lit scene"
        : avgBrightness > 100
        ? "balanced lighting"
        : avgBrightness > 60
        ? "low-key lighting"
        : "shadow-heavy lighting";

    const contrastDescriptor =
      contrast > 0.55
        ? "high contrast visuals"
        : contrast > 0.35
        ? "structured contrast"
        : "soft contrast";

    const saturationDescriptor =
      s > 0.6
        ? "vivid saturation"
        : s > 0.35
        ? "rich tones"
        : s > 0.2
        ? "muted palette"
        : "desaturated look";

    const moodDescriptor =
      l > 0.65
        ? "uplifting mood"
        : l > 0.45
        ? "balanced mood"
        : l > 0.28
        ? "introspective mood"
        : "brooding atmosphere";

    const energy =
      contrast > 0.55 && s > 0.35
        ? "kinetic energy"
        : contrast > 0.35
        ? "dynamic pacing"
        : "contemplative pacing";

    return {
      palette: paletteDescriptor,
      lighting,
      contrast: contrastDescriptor,
      saturation: saturationDescriptor,
      mood: moodDescriptor,
      energy
    };
  };

  const handleGeneratePrompts = useCallback(async () => {
    if (!videoSource || !videoMeta) {
      setStatus("Load a video first to extract scene moments.");
      return;
    }

    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) {
      setStatus("Video is not ready yet. Try again in a moment.");
      return;
    }

    try {
      setProcessing(true);
      setStatus("Analysing visual moments...");

      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const context = canvas.getContext("2d", { willReadFrequently: true });

      const capturePoints = buildCapturePoints(videoMeta.duration, sceneCount);
      const nextScenes = [];

      for (let i = 0; i < capturePoints.length; i += 1) {
        const time = capturePoints[i];
        await seekVideo(video, time);
        context.drawImage(video, 0, 0, canvas.width, canvas.height);
        const frameData = context.getImageData(0, 0, canvas.width, canvas.height);
        const analysis = analyzeFrame(frameData, canvas.width, canvas.height);

        const scenePrompt = buildScenePrompt({
          index: i,
          timestamp: time,
          analysis,
          focusAreas,
          tone,
          objective,
          stylePreset
        });

        nextScenes.push({
          index: i,
          timestamp: time,
          analysis,
          summary: scenePrompt
        });

        setStatus(`Captured scene ${i + 1} / ${capturePoints.length}`);
      }

      setScenePrompts(nextScenes);
      const prompt = buildMasterPrompt({
        scenes: nextScenes,
        projectTitle,
        audienceNotes,
        tone,
        objective,
        stylePreset,
        focusAreas,
        customDirectives
      });
      setCompiledPrompt(prompt);
      setStatus("Prompt ready. Refine or copy as needed.");
    } catch (error) {
      console.error(error);
      setStatus("Unable to analyse the video frames. Try another file or refresh.");
    } finally {
      setProcessing(false);
    }
  }, [
    videoSource,
    videoMeta,
    focusAreas,
    tone,
    objective,
    stylePreset,
    projectTitle,
    audienceNotes,
    customDirectives,
    sceneCount
  ]);

  const handleCopy = useCallback(async () => {
    if (!compiledPrompt) return;
    try {
      await navigator.clipboard.writeText(compiledPrompt);
      setStatus("Prompt copied to clipboard.");
    } catch (error) {
      console.error(error);
      setStatus("Clipboard permissions prevented copying.");
    }
  }, [compiledPrompt]);

  const showVideoHint = !videoSource && !status;

  return (
    <main className="app-shell">
      <div className="card">
        <h1 className="page-title">Video to Prompt Generator</h1>
        <p className="muted">
          Transform raw footage into ready-to-use AI prompts. Drop a clip, choose the
          creative direction, and we will convert its visual language into structured
          prompts for image, video, or story generation models.
        </p>

        <div className="grid">
          <section className="panel">
            <Uploader
              onFileChange={handleFileChange}
              videoSource={videoSource}
              videoMeta={videoMeta}
              processing={processing}
              showHint={showVideoHint}
            />

            <ConfigurationPanel
              tone={tone}
              setTone={setTone}
              objective={objective}
              setObjective={setObjective}
              stylePreset={stylePreset}
              setStylePreset={setStylePreset}
              focusAreas={focusAreas}
              toggleFocus={toggleFocus}
              granularity={granularity}
              setGranularity={setGranularity}
              projectTitle={projectTitle}
              setProjectTitle={setProjectTitle}
              audienceNotes={audienceNotes}
              setAudienceNotes={setAudienceNotes}
              customDirectives={customDirectives}
              setCustomDirectives={setCustomDirectives}
              sceneCount={sceneCount}
              videoMeta={videoMeta}
            />

            <div className="cta-row">
              <button
                type="button"
                className="cta-button"
                onClick={handleGeneratePrompts}
                disabled={!hasVideoReady || processing}
              >
                {processing ? "Analysing…" : "Generate Prompt"}
              </button>
              <button type="button" className="cta-alt" onClick={resetState}>
                Reset Results
              </button>
            </div>

            {status ? (
              <div className="status-banner" data-pulse={pulse}>
                <span className="banner-icon">⚡</span>
                <span>{status}</span>
              </div>
            ) : null}

            <HiddenVideoCanvas
              videoRef={videoRef}
              canvasRef={canvasRef}
              source={videoSource}
              onLoaded={handleVideoLoaded}
            />
          </section>

          <aside className="panel">
            <ResultsPanel
              scenePrompts={scenePrompts}
              compiledPrompt={compiledPrompt}
              onCopy={handleCopy}
            />
          </aside>
        </div>

        <footer className="footer">
          Build richer prompts by layering context, audience, and cinematic intent before
          passing it to your favourite generative model.
        </footer>
      </div>
    </main>
  );
}

function Uploader({ onFileChange, videoSource, videoMeta, processing, showHint }) {
  return (
    <div className="panel video-panel">
      <div className="field-group">
        <label className="field-label">Video source</label>
        <p className="field-helper">
          Works best with 10s – 2min clips in mp4, mov, or webm. We only process frames in
          your browser.
        </p>
        <input
          type="file"
          accept="video/*"
          onChange={onFileChange}
          className="input"
          disabled={processing}
        />
      </div>

      {videoSource ? (
        <div className="video-preview">
          <video
            key={videoSource.url}
            src={videoSource.url}
            controls
            style={{ width: "100%", display: "block" }}
          />
          {videoMeta ? (
            <div className="stats-row">
              <span className="badge">duration {formatTime(videoMeta.duration)}</span>
              <span className="badge">
                resolution {videoMeta.width}×{videoMeta.height}
              </span>
            </div>
          ) : null}
        </div>
      ) : showHint ? (
        <div className="prompt-block empty">
          Drag a clip here to start. We will extract representative frames and craft
          prompt-ready scene descriptions tailored to your creative brief.
        </div>
      ) : null}
    </div>
  );
}

function ConfigurationPanel({
  tone,
  setTone,
  objective,
  setObjective,
  stylePreset,
  setStylePreset,
  focusAreas,
  toggleFocus,
  granularity,
  setGranularity,
  projectTitle,
  setProjectTitle,
  audienceNotes,
  setAudienceNotes,
  customDirectives,
  setCustomDirectives,
  sceneCount,
  videoMeta
}) {
  return (
    <div className="panel">
      <div className="field-group">
        <label className="field-label">Project title</label>
        <input
          value={projectTitle}
          onChange={(event) => setProjectTitle(event.target.value)}
          placeholder="e.g. Aurora | Brand Film Teaser"
          className="input"
        />
      </div>

      <div className="field-group">
        <label className="field-label">Audience or usage context</label>
        <textarea
          value={audienceNotes}
          onChange={(event) => setAudienceNotes(event.target.value)}
          placeholder="e.g. feed iterative Midjourney v6 prompts for print campaign; emphasise emotional beats for Gen-Z audience."
          className="textarea"
        />
      </div>

      <div className="field-group">
        <label className="field-label">Creative tone</label>
        <select
          value={tone}
          onChange={(event) => setTone(event.target.value)}
          className="select"
        >
          {toneOptions.map((option) => (
            <option key={option} value={option}>
              {capitalize(option)}
            </option>
          ))}
        </select>
      </div>

      <div className="field-group">
        <label className="field-label">Prompt objective</label>
        <select
          value={objective}
          onChange={(event) => setObjective(event.target.value)}
          className="select"
        >
          {objectiveOptions.map((option) => (
            <option key={option} value={option}>
              {capitalize(option)}
            </option>
          ))}
        </select>
      </div>

      <div className="field-group">
        <label className="field-label">Stylistic preset</label>
        <select
          value={stylePreset}
          onChange={(event) => setStylePreset(event.target.value)}
          className="select"
        >
          {stylePresets.map((option) => (
            <option key={option} value={option}>
              {capitalize(option)}
            </option>
          ))}
        </select>
      </div>

      <div className="field-group">
        <label className="field-label">Focus areas</label>
        <div className="pill-row">
          {focusOptions.map((option) => (
            <button
              key={option.id}
              type="button"
              className="pill"
              data-active={focusAreas.has(option.id)}
              onClick={() => toggleFocus(option.id)}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      <div className="field-group">
        <label className="field-label">
          Scene granularity{" "}
          <span className="field-helper">
            {videoMeta ? `${sceneCount} scene signatures` : "load a video first"}
          </span>
        </label>
        <input
          type="range"
          min={1}
          max={7}
          value={granularity}
          onChange={(event) => setGranularity(Number(event.target.value))}
        />
      </div>

      <div className="field-group">
        <label className="field-label">Custom directives</label>
        <textarea
          value={customDirectives}
          onChange={(event) => setCustomDirectives(event.target.value)}
          placeholder="e.g. mention lens selection, maintain continuity between frames, add emotional descriptors."
          className="textarea"
        />
      </div>
    </div>
  );
}

function ResultsPanel({ scenePrompts, compiledPrompt, onCopy }) {
  return (
    <div className="results-card">
      <div className="field-group">
        <label className="field-label">Scene signatures</label>
        {scenePrompts.length ? (
          <div className="scene-grid">
            {scenePrompts.map((scene) => (
              <article key={scene.index} className="scene-item">
                <h4>
                  Scene {scene.index + 1} · {formatTime(scene.timestamp)}
                </h4>
                <span className="scene-meta">
                  {scene.analysis.palette} · {scene.analysis.lighting} ·{" "}
                  {scene.analysis.energy}
                </span>
                <p className="prompt-text">{scene.summary}</p>
              </article>
            ))}
          </div>
        ) : (
          <div className="prompt-block empty">
            Scene-specific guidance appears here after analysis. We extract cinematic
            ingredients and translate them into prompt-ready language.
          </div>
        )}
      </div>

      <hr className="divider" />

      <div className="field-group">
        <label className="field-label">Compiled master prompt</label>
        {compiledPrompt ? (
          <div className="prompt-block">
            <div style={{ display: "flex", justifyContent: "space-between", gap: "1rem" }}>
              <h3>Prompt blueprint</h3>
              <button className="copy-button" type="button" onClick={onCopy}>
                Copy
              </button>
            </div>
            <pre className="prompt-text">{compiledPrompt}</pre>
          </div>
        ) : (
          <div className="prompt-block empty">
            Run the generator to get a cohesive prompt blueprint combining scene context,
            creative direction, and actionable instructions.
          </div>
        )}
      </div>
    </div>
  );
}

function HiddenVideoCanvas({ videoRef, canvasRef, source, onLoaded }) {
  return (
    <>
      <video
        ref={videoRef}
        src={source?.url}
        onLoadedMetadata={onLoaded}
        preload="metadata"
        style={{ display: "none" }}
        crossOrigin="anonymous"
      />
      <canvas ref={canvasRef} style={{ display: "none" }} />
    </>
  );
}

function buildCapturePoints(duration, sceneCount) {
  if (!duration || !sceneCount) return [];
  const points = [];
  const safeDuration = Math.max(duration - 0.5, duration);
  const step = safeDuration / (sceneCount + 1);
  for (let i = 1; i <= sceneCount; i += 1) {
    points.push(Math.min(duration - 0.1, step * i));
  }
  return points;
}

function buildScenePrompt({ index, timestamp, analysis, focusAreas, tone, objective, stylePreset }) {
  const focus = Array.from(focusAreas);
  const focusText = focus.length
    ? ` emphasise ${focus.map((id) => focusLabel(id)).join(", ")}`
    : "";
  const descriptors = [
    analysis.palette,
    analysis.lighting,
    analysis.saturation,
    analysis.contrast,
    analysis.mood,
    analysis.energy
  ]
    .filter(Boolean)
    .join("; ");

  return `Scene ${index + 1} (${formatTime(timestamp)}): ${capitalize(
    tone
  )} tone with ${descriptors}.${focusText}. Keep alignment with ${objective} in a ${stylePreset} approach.`;
}

function buildMasterPrompt({
  scenes,
  projectTitle,
  audienceNotes,
  tone,
  objective,
  stylePreset,
  focusAreas,
  customDirectives
}) {
  const focus = Array.from(focusAreas);
  const focusLine = focus.length
    ? `Prioritise ${focus.map((id) => focusLabel(id)).join(", ")}.`
    : "";

  const sceneLines = scenes
    .map(
      (scene) =>
        `- ${formatTime(scene.timestamp)} · ${scene.analysis.palette}, ${scene.analysis.lighting}, ${scene.analysis.energy}.`
    )
    .join("\n");

  const summaryLines = scenes.map((scene) => scene.summary).join("\n");

  return [
    projectTitle ? `Project: ${projectTitle}` : "Project: Untitled video prompt",
    `Objective: ${capitalize(objective)} for AI generation.`,
    `Creative tone: ${capitalize(tone)} blended with ${stylePreset}.`,
    focusLine,
    audienceNotes ? `Audience / usage: ${audienceNotes}` : "",
    "",
    "Scene ingredients:",
    sceneLines,
    "",
    "Detailed prompt instructions:",
    summaryLines,
    customDirectives ? `\nExtra directives: ${customDirectives}` : ""
  ]
    .filter(Boolean)
    .join("\n");
}

function formatTime(seconds) {
  if (!Number.isFinite(seconds)) return "00:00";
  const minutes = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  const ms = Math.floor((seconds - Math.floor(seconds)) * 1000);
  const pad = (value, length = 2) => value.toString().padStart(length, "0");
  return `${pad(minutes)}:${pad(secs)}.${pad(Math.floor(ms / 10))}`;
}

function rgbToHsl(r, g, b) {
  const rNorm = r / 255;
  const gNorm = g / 255;
  const bNorm = b / 255;

  const max = Math.max(rNorm, gNorm, bNorm);
  const min = Math.min(rNorm, gNorm, bNorm);
  const delta = max - min;

  let h = 0;
  if (delta !== 0) {
    if (max === rNorm) {
      h = ((gNorm - bNorm) / delta) % 6;
    } else if (max === gNorm) {
      h = (bNorm - rNorm) / delta + 2;
    } else {
      h = (rNorm - gNorm) / delta + 4;
    }
    h = Math.round(h * 60);
    if (h < 0) h += 360;
  }

  const l = (max + min) / 2;
  const s =
    delta === 0 ? 0 : delta / (1 - Math.abs(2 * l - 1));

  return [h, s, l];
}

function capitalize(value) {
  if (!value) return "";
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function focusLabel(id) {
  const option = focusOptions.find((item) => item.id === id);
  return option ? option.label.toLowerCase() : id;
}

function seekVideo(video, time) {
  return new Promise((resolve, reject) => {
    const handleSeeked = () => {
      cleanup();
      resolve();
    };
    const handleError = () => {
      cleanup();
      reject(new Error("seek failed"));
    };
    const cleanup = () => {
      video.removeEventListener("seeked", handleSeeked);
      video.removeEventListener("error", handleError);
    };
    video.addEventListener("seeked", handleSeeked, { once: true });
    video.addEventListener("error", handleError, { once: true });
    video.currentTime = time;
  });
}
