"use client";

import { ArrowRight, CircleAlert, Clock3, FileImage, RotateCcw, ShieldCheck, Sparkles, X } from "lucide-react";
import dynamic from "next/dynamic";
import { useCallback, useEffect, useRef, useState } from "react";
import { requestImage } from "@/lib/api";
import { MAX_UPLOAD_MB } from "@/lib/config";
import { validateImage } from "@/lib/files";
import { UploadZone } from "@/components/upload-zone";
import { Modal, Progress, useToast } from "@/components/ui";

const Editor = dynamic(() => import("@/components/editor"), {
  loading: () => <div className="skeleton skeleton-panel" />,
});

export type ImageAsset = { blob: Blob; durationMs: number };
type Source = { file: File; width: number; height: number };

export default function Workspace() {
  const toast = useToast();
  const [source, setSource] = useState<Source | null>(null);
  const [sourceUrl, setSourceUrl] = useState("");
  const [baseline, setBaseline] = useState<ImageAsset | null>(null);
  const [cutout, setCutout] = useState<ImageAsset | null>(null);
  const [current, setCurrent] = useState<ImageAsset | null>(null);
  const [currentUrl, setCurrentUrl] = useState("");
  const [phase, setPhase] = useState<"idle" | "uploading" | "processing" | "ready" | "error">("idle");
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState("");
  const [clearOpen, setClearOpen] = useState(false);
  const [recent, setRecent] = useState<string[]>([]);
  const controller = useRef<AbortController | null>(null);
  const sourceUrlRef = useRef("");
  const currentUrlRef = useRef("");

  useEffect(
    () => () => {
      controller.current?.abort();
      if (sourceUrlRef.current) URL.revokeObjectURL(sourceUrlRef.current);
      if (currentUrlRef.current) URL.revokeObjectURL(currentUrlRef.current);
    },
    [],
  );
  useEffect(() => {
    const saved = window.sessionStorage.getItem("bggone:recent") || window.sessionStorage.getItem("removebg:recent");
    if (!saved) return;
    try {
      const names = JSON.parse(saved);
      if (Array.isArray(names) && names.every((name) => typeof name === "string")) {
        const timer = window.setTimeout(() => setRecent(names.slice(0, 3)), 0);
        return () => window.clearTimeout(timer);
      }
    } catch {
      /* Ignore malformed data from an earlier session. */
    }
  }, []);
  const showSource = (file: File) => {
    if (sourceUrlRef.current) URL.revokeObjectURL(sourceUrlRef.current);
    sourceUrlRef.current = URL.createObjectURL(file);
    setSourceUrl(sourceUrlRef.current);
  };
  const showResult = (asset: ImageAsset) => {
    if (currentUrlRef.current) URL.revokeObjectURL(currentUrlRef.current);
    currentUrlRef.current = URL.createObjectURL(asset.blob);
    setCurrent(asset);
    setCurrentUrl(currentUrlRef.current);
  };

  const process = useCallback(
    async (file: File) => {
      controller.current?.abort();
      const next = new AbortController();
      controller.current = next;
      setProgress(0);
      setError("");
      setPhase("uploading");
      const data = new FormData();
      data.append("image", file);
      data.append("format", "png");
      try {
        const result = await requestImage("/background/remove", data, {
          signal: next.signal,
          onUploadProgress: (value) => {
            setProgress(value);
            if (value >= 100) setPhase("processing");
          },
        });
        if (controller.current !== next) return;
        const asset = { blob: result.blob, durationMs: result.durationMs };
        setBaseline(asset);
        setCutout(asset);
        showResult(asset);
        setPhase("ready");
        toast("Background removed. Your image is ready.", "success");
      } catch (cause) {
        if (controller.current !== next) return;
        if (cause instanceof DOMException && cause.name === "AbortError") {
          setPhase("idle");
          return;
        }
        setError(cause instanceof Error ? cause.message : "Could not process this image.");
        setPhase("error");
      } finally {
        if (controller.current === next) controller.current = null;
      }
    },
    [toast],
  );

  const choose = async (files: File[]) => {
    const file = files[0];
    if (!file) return;
    try {
      const dimensions = await validateImage(file);
      setSource({ file, ...dimensions });
      showSource(file);
      setBaseline(null);
      setCutout(null);
      setCurrent(null);
      if (currentUrlRef.current) URL.revokeObjectURL(currentUrlRef.current);
      currentUrlRef.current = "";
      setCurrentUrl("");
      const updated = [file.name, ...recent.filter((item) => item !== file.name)].slice(0, 3);
      setRecent(updated);
      window.sessionStorage.setItem("bggone:recent", JSON.stringify(updated));
      await process(file);
    } catch (cause) {
      toast(cause instanceof Error ? cause.message : "This image could not be opened.", "error");
    }
  };

  const clear = () => {
    controller.current?.abort();
    controller.current = null;
    if (sourceUrlRef.current) URL.revokeObjectURL(sourceUrlRef.current);
    if (currentUrlRef.current) URL.revokeObjectURL(currentUrlRef.current);
    sourceUrlRef.current = "";
    currentUrlRef.current = "";
    setSource(null);
    setSourceUrl("");
    setBaseline(null);
    setCutout(null);
    setCurrent(null);
    setCurrentUrl("");
    setError("");
    setPhase("idle");
    setClearOpen(false);
  };

  return (
    <section id="workspace" className="workspace-section" aria-labelledby="workspace-title">
      <div className="workspace-heading">
        <div>
          <span className="work-index">01 / THE STUDIO</span>
          <h2 id="workspace-title">
            Your image, <em>minus the noise.</em>
          </h2>
        </div>
        <p>Upload a photo. Keep what matters. Fine-tune the edges and finish the frame in one place.</p>
      </div>
      <div className="workspace-frame">
        <div className="workspace-topbar">
          <div className="workspace-topbar-left">
            <span className="live-dot" /> <span>WORKSPACE</span>
            <span className="topbar-divider" /> <span>{source ? source.file.name : "No image selected"}</span>
          </div>
          <div className="workspace-topbar-right">
            <ShieldCheck size={15} />
            <span>Private by default</span>
          </div>
        </div>
        {!source ? (
          <div className="workspace-empty">
            <div className="workspace-intro">
              <span className="mini-label">START HERE</span>
              <h3>
                Great work starts
                <br />
                with a clean cut.
              </h3>
              <p>Clear the scene in a few seconds. No account required.</p>
              <div className="workspace-stats">
                <span>
                  <strong>3</strong> formats
                </span>
                <span>
                  <strong>{MAX_UPLOAD_MB} MB</strong> max size
                </span>
                <span>
                  <strong>0</strong> images saved
                </span>
              </div>
            </div>
            <UploadZone onFiles={choose} />
          </div>
        ) : (
          <div className="workspace-active">
            <div className="file-strip">
              <div className="file-strip-icon">
                <FileImage size={20} />
              </div>
              <div className="file-strip-name">
                <strong>{source.file.name}</strong>
                <span>
                  {source.width} × {source.height} px · {(source.file.size / 1024 / 1024).toFixed(2)} MB
                </span>
              </div>
              <div className="file-strip-actions">
                <label className="button button-quiet file-replace">
                  Replace
                  <input
                    className="sr-only"
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    onChange={(event) => {
                      if (event.target.files?.length) void choose(Array.from(event.target.files));
                      event.target.value = "";
                    }}
                  />
                </label>
                <button
                  className="icon-button"
                  aria-label="Clear current image"
                  type="button"
                  onClick={() => setClearOpen(true)}
                >
                  <X size={18} />
                </button>
              </div>
            </div>
            {(phase === "uploading" || phase === "processing") && (
              <div className="processing-panel" role="status" aria-live="polite">
                <div className="processing-visual">
                  <div className="processing-sweep" />
                  <Sparkles size={38} />
                </div>
                <span className="mini-label">WORKING ON IT</span>
                <h3>{phase === "uploading" ? "Uploading your image" : "Finding the subject"}</h3>
                <p>
                  {phase === "processing"
                    ? "Separating the good part from the background. This can take a moment on CPU."
                    : "Sending your image to the API."}
                </p>
                {phase === "uploading" ? (
                  <Progress value={progress} label="Upload progress" />
                ) : (
                  <div className="indeterminate-track">
                    <span />
                  </div>
                )}
                <button type="button" className="text-button" onClick={() => controller.current?.abort()}>
                  Cancel processing
                </button>
              </div>
            )}
            {phase === "error" && (
              <div className="workspace-error" role="alert">
                <CircleAlert size={28} />
                <h3>That cut didn’t go through.</h3>
                <p>{error}</p>
                <button className="button button-dark" type="button" onClick={() => void process(source.file)}>
                  <RotateCcw size={17} /> Try again
                </button>
              </div>
            )}
            {phase === "ready" && baseline && cutout && current && sourceUrl && currentUrl && (
              <Editor
                key={`${source.file.name}-${source.file.lastModified}`}
                source={source.file}
                sourceUrl={sourceUrl}
                width={source.width}
                height={source.height}
                current={current}
                cutout={cutout}
                currentUrl={currentUrl}
                onResult={showResult}
                onCutout={(asset) => {
                  setCutout(asset);
                  showResult(asset);
                }}
                onReset={() => {
                  setCutout(baseline);
                  showResult(baseline);
                }}
                onRestoreCutout={() => showResult(cutout)}
              />
            )}
          </div>
        )}
        <div className="workspace-bottombar">
          <span>
            <Clock3 size={14} /> No sign-up. No fuss.
          </span>
          <span>
            Supported: JPG · PNG · WEBP <ArrowRight size={14} />
          </span>
        </div>
      </div>
      {recent.length > 0 && <p className="recent-note">This session: {recent.join(" · ")}</p>}
      {clearOpen && (
        <Modal title="Clear this workspace?" onClose={() => setClearOpen(false)}>
          <p className="modal-copy">The current image and edits will be removed from this browser tab.</p>
          <div className="modal-actions">
            <button className="button button-quiet" onClick={() => setClearOpen(false)}>
              Keep editing
            </button>
            <button className="button button-dark" onClick={clear}>
              Clear workspace
            </button>
          </div>
        </Modal>
      )}
    </section>
  );
}
