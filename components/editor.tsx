"use client";

/* eslint-disable @next/next/no-img-element -- preview sources are local object URLs */
import {
  ArrowDownToLine,
  ArrowLeftRight,
  Check,
  ChevronDown,
  Expand,
  Image as ImageIcon,
  Layers,
  Maximize2,
  Minus,
  Move,
  Plus,
  RotateCcw,
  ScanLine,
  SlidersHorizontal,
  Sparkles,
  WandSparkles,
  X,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import type { PointerEvent } from "react";
import { requestImage, saveBlob } from "@/lib/api";
import { outputName, validateImage } from "@/lib/files";
import { applyMask, imageBlobToFormat } from "@/lib/image-compose";
import { useToast } from "@/components/ui";
import type { ImageAsset } from "@/components/workspace";

type Props = {
  source: File;
  sourceUrl: string;
  width: number;
  height: number;
  current: ImageAsset;
  cutout: ImageAsset;
  currentUrl: string;
  onResult: (asset: ImageAsset) => void;
  onCutout: (asset: ImageAsset) => void;
  onReset: () => void;
  onRestoreCutout: () => void;
};
type Background = "transparent" | "color" | "image" | "blur";
const COLORS = ["#f4f2e9", "#dfefdb", "#d4e4f7", "#f2c9ad", "#2d3d35", "#191d1b"];

export default function Editor({ source, sourceUrl, width, height, current, cutout, currentUrl, onResult, onCutout, onReset, onRestoreCutout }: Props) {
  const toast = useToast();
  const stage = useRef<HTMLDivElement>(null);
  const cache = useRef(new Map<string, ImageAsset>());
  const maskCache = useRef(new Map<string, Blob>());
  const controller = useRef<AbortController | null>(null);
  const panStart = useRef<{ x: number; y: number; originX: number; originY: number } | null>(null);
  const [tab, setTab] = useState<"background" | "edges">("background");
  const [background, setBackground] = useState<Background>("transparent");
  const [color, setColor] = useState("#f4f2e9");
  const [backgroundFile, setBackgroundFile] = useState<File | null>(null);
  const [intensity, setIntensity] = useState(14);
  const [brightness, setBrightness] = useState(1);
  const [opacity, setOpacity] = useState(1);
  const [threshold, setThreshold] = useState(0);
  const [feather, setFeather] = useState(0);
  const [smooth, setSmooth] = useState(0);
  const [mask, setMask] = useState<Blob | null>(null);
  const [maskUrl, setMaskUrl] = useState("");
  const [showMask, setShowMask] = useState(false);
  const [busy, setBusy] = useState<"edit" | "mask" | "download" | null>(null);
  const [error, setError] = useState("");
  const [position, setPosition] = useState(50);
  const [view, setView] = useState<"compare" | "original" | "result">("compare");
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [fullscreen, setFullscreen] = useState(false);
  const [format, setFormat] = useState<"png" | "webp">("png");
  const [quality, setQuality] = useState(90);
  const maskUrlRef = useRef("");

  useEffect(
    () => () => {
      controller.current?.abort();
      if (maskUrlRef.current) URL.revokeObjectURL(maskUrlRef.current);
    },
    [],
  );
  const clearMask = () => {
    if (maskUrlRef.current) URL.revokeObjectURL(maskUrlRef.current);
    maskUrlRef.current = "";
    setMaskUrl("");
    setMask(null);
    setShowMask(false);
  };
  const showMaskBlob = (blob: Blob) => {
    if (maskUrlRef.current) URL.revokeObjectURL(maskUrlRef.current);
    maskUrlRef.current = URL.createObjectURL(blob);
    setMaskUrl(maskUrlRef.current);
    setMask(blob);
    setShowMask(true);
  };
  useEffect(() => {
    const update = () => setFullscreen(document.fullscreenElement === stage.current);
    document.addEventListener("fullscreenchange", update);
    return () => document.removeEventListener("fullscreenchange", update);
  }, []);
  useEffect(() => {
    cache.current.clear();
  }, [cutout.blob]);
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.target instanceof HTMLElement && ["INPUT", "TEXTAREA", "SELECT"].includes(event.target.tagName)) return;
      if (event.key === "+" || event.key === "=") setZoom((value) => Math.min(3, Number((value + 0.25).toFixed(2))));
      if (event.key === "-") setZoom((value) => Math.max(1, Number((value - 0.25).toFixed(2))));
      if (event.key === "0") {
        setZoom(1);
        setPan({ x: 0, y: 0 });
      }
      if (event.key.toLowerCase() === "o") setView((value) => (value === "original" ? "compare" : "original"));
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const updatePosition = (clientX: number) => {
    const box = stage.current?.getBoundingClientRect();
    if (box) setPosition(Math.max(0, Math.min(100, ((clientX - box.left) / box.width) * 100)));
  };
  const onPanStart = (event: PointerEvent<HTMLDivElement>) => {
    if (zoom === 1) return;
    panStart.current = { x: event.clientX, y: event.clientY, originX: pan.x, originY: pan.y };
    event.currentTarget.setPointerCapture(event.pointerId);
  };
  const onPanMove = (event: PointerEvent<HTMLDivElement>) => {
    if (!panStart.current) return;
    setPan({
      x: panStart.current.originX + event.clientX - panStart.current.x,
      y: panStart.current.originY + event.clientY - panStart.current.y,
    });
  };
  const resetView = () => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
    setPosition(50);
    setView("compare");
  };

  const selectBackground = async (file: File | null) => {
    if (!file) return;
    try {
      await validateImage(file);
      setBackgroundFile(file);
      setBackground("image");
    } catch (cause) {
      toast(cause instanceof Error ? cause.message : "Invalid background image.", "error");
    }
  };

  const applyBackground = async () => {
    if (background === "transparent") {
      onRestoreCutout();
      setError("");
      toast("Transparent background restored.", "success");
      return;
    }
    if (background === "image" && !backgroundFile) {
      setError("Choose a background image first.");
      return;
    }
    const key = JSON.stringify({
      background,
      color,
      name: backgroundFile?.name,
      modified: backgroundFile?.lastModified,
      intensity,
      brightness,
      opacity,
    });
    const cached = cache.current.get(key);
    if (cached) {
      onResult(cached);
      setError("");
      toast("Saved edit restored.", "success");
      return;
    }
    const form = new FormData();
    form.append("image", source);
    form.append("cutout", cutout.blob, "cutout.png");
    form.append("format", "png");
    form.append("brightness", String(brightness));
    form.append("opacity", String(opacity));
    const path = background === "blur" ? "/background/blur" : "/background/replace";
    if (background === "blur") form.append("intensity", String(intensity));
    else {
      form.append("background", background);
      if (background === "color") form.append("color", color);
      if (backgroundFile && background === "image") form.append("background_image", backgroundFile);
    }
    controller.current?.abort();
    const next = new AbortController();
    controller.current = next;
    setBusy("edit");
    setError("");
    try {
      const result = await requestImage(path, form, { signal: next.signal });
      const asset = { blob: result.blob, durationMs: result.durationMs };
      cache.current.set(key, asset);
      onResult(asset);
      toast("Background updated.", "success");
    } catch (cause) {
      if (!(cause instanceof DOMException && cause.name === "AbortError"))
        setError(cause instanceof Error ? cause.message : "The edit failed.");
    } finally {
      if (controller.current === next) {
        controller.current = null;
        setBusy(null);
      }
    }
  };

  const previewMask = async () => {
    const key = `${threshold}:${feather}:${smooth}`;
    const cached = maskCache.current.get(key);
    if (cached) {
      showMaskBlob(cached);
      return;
    }
    const form = new FormData();
    form.append("image", source);
    form.append("threshold", String(threshold));
    form.append("feather", String(feather));
    form.append("smooth", String(smooth));
    controller.current?.abort();
    const next = new AbortController();
    controller.current = next;
    setBusy("mask");
    setError("");
    try {
      const result = await requestImage("/mask", form, { signal: next.signal });
      maskCache.current.set(key, result.blob);
      showMaskBlob(result.blob);
      toast("Mask ready to inspect.", "success");
    } catch (cause) {
      if (!(cause instanceof DOMException && cause.name === "AbortError"))
        setError(cause instanceof Error ? cause.message : "The mask request failed.");
    } finally {
      if (controller.current === next) {
        controller.current = null;
        setBusy(null);
      }
    }
  };

  const applyCurrentMask = async () => {
    if (!mask) return;
    setBusy("mask");
    setError("");
    try {
      const blob = await applyMask(source, mask);
      onCutout({ blob, durationMs: current.durationMs });
      setBackground("transparent");
      toast("Edge settings applied at full resolution.", "success");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not apply this mask.");
    } finally {
      setBusy(null);
    }
  };

  const download = async () => {
    setBusy("download");
    setError("");
    try {
      const blob = await imageBlobToFormat(current.blob, format, quality);
      saveBlob(blob, outputName(source.name, background === "transparent" ? "cutout" : "edited", format));
      toast(`${format.toUpperCase()} downloaded.`, "success");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Download failed.");
    } finally {
      setBusy(null);
    }
  };

  const comparison = view === "compare";
  return (
    <div className="editor-grid">
      <div className="editor-preview-column">
        <div className="editor-preview-header">
          <div>
            <span className="mini-label">LIVE PREVIEW</span>
            <strong>Every detail, intact.</strong>
          </div>
          <span className="dimension-pill">
            {width} × {height} px
          </span>
        </div>
        <div
          className={`preview-stage ${zoom > 1 ? "can-pan" : ""}`}
          ref={stage}
          onPointerDown={onPanStart}
          onPointerMove={onPanMove}
          onPointerUp={() => {
            panStart.current = null;
          }}
          onPointerCancel={() => {
            panStart.current = null;
          }}
        >
          {showMask && maskUrl && tab === "edges" ? (
            <div className="mask-side-by-side">
              <div className="preview-checker">
                <img src={currentUrl} alt="Background removed result" />
              </div>
              <div className="mask-image">
                <img src={maskUrl} alt="Grayscale subject mask" />
              </div>
              <span>RESULT</span>
              <span>MASK</span>
            </div>
          ) : (
            <div
              className="preview-canvas"
              style={{
                aspectRatio: `${width}/${height}`,
                transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
              }}
            >
              {view !== "original" && (
                <img src={currentUrl} alt="Edited result with background removed" draggable={false} />
              )}
              {view !== "result" && (
                <img
                  src={sourceUrl}
                  className={comparison ? "preview-original" : ""}
                  style={comparison ? { clipPath: `inset(0 ${100 - position}% 0 0)` } : undefined}
                  alt="Original uploaded image"
                  draggable={false}
                />
              )}
            </div>
          )}
          {comparison && !(showMask && tab === "edges") && (
            <div
              className="compare-handle"
              style={{ left: `${position}%` }}
              onPointerDown={(event) => {
                event.stopPropagation();
                event.currentTarget.setPointerCapture(event.pointerId);
                updatePosition(event.clientX);
              }}
              onPointerMove={(event) => {
                if (event.currentTarget.hasPointerCapture(event.pointerId)) updatePosition(event.clientX);
              }}
            >
              <div className="compare-line" />
              <span>
                <ArrowLeftRight size={18} />
              </span>
            </div>
          )}
          {!(showMask && tab === "edges") && (
            <div className="preview-labels">
              <span>ORIGINAL</span>
              <span>RESULT</span>
            </div>
          )}
        </div>
        <div className="preview-toolbar">
          <div className="view-switch" role="group" aria-label="Preview mode">
            <button type="button" className={view === "compare" ? "selected" : ""} onClick={() => setView("compare")}>
              Compare
            </button>
            <button type="button" className={view === "original" ? "selected" : ""} onClick={() => setView("original")}>
              Original
            </button>
            <button type="button" className={view === "result" ? "selected" : ""} onClick={() => setView("result")}>
              Result
            </button>
          </div>
          <div className="preview-tools">
            <button type="button" aria-label="Zoom out" onClick={() => setZoom(Math.max(1, zoom - 0.25))}>
              <Minus size={17} />
            </button>
            <span>{Math.round(zoom * 100)}%</span>
            <button type="button" aria-label="Zoom in" onClick={() => setZoom(Math.min(3, zoom + 0.25))}>
              <Plus size={17} />
            </button>
            <button
              type="button"
              title="Fit to screen"
              aria-label="Fit to screen"
              onClick={() => {
                setZoom(1);
                setPan({ x: 0, y: 0 });
              }}
            >
              <Maximize2 size={16} />
            </button>
            <button type="button" title="Reset view" aria-label="Reset view" onClick={resetView}>
              <RotateCcw size={16} />
            </button>
            <button
              type="button"
              title="Fullscreen"
              aria-label={fullscreen ? "Exit fullscreen" : "Fullscreen preview"}
              onClick={() => (fullscreen ? document.exitFullscreen() : stage.current?.requestFullscreen())}
            >
              <Expand size={16} />
            </button>
          </div>
        </div>
        {comparison && !(showMask && tab === "edges") && (
          <label className="compare-slider-label">
            Slide to compare{" "}
            <input
              type="range"
              min="0"
              max="100"
              value={position}
              onChange={(event) => setPosition(Number(event.target.value))}
              aria-label="Before and after comparison position"
            />
          </label>
        )}
        <p className="preview-hint">
          <Move size={14} /> Zoom in to pan · Press +/− to zoom · 0 to reset · O for original
        </p>
      </div>
      <aside className="editor-sidebar" aria-label="Image editing controls">
        <div className="sidebar-tabs" role="tablist" aria-label="Editing tools">
          <button
            type="button"
            role="tab"
            aria-selected={tab === "background"}
            className={tab === "background" ? "selected" : ""}
            onClick={() => {
              setTab("background");
              setShowMask(false);
            }}
          >
            <Layers size={17} /> Background
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={tab === "edges"}
            className={tab === "edges" ? "selected" : ""}
            onClick={() => setTab("edges")}
          >
            <ScanLine size={17} /> Edges
          </button>
        </div>
        {tab === "background" ? (
          <div className="sidebar-content">
            <div className="sidebar-intro">
              <span className="mini-label">SET THE SCENE</span>
              <h3>Background</h3>
              <p>Give your subject a new place to stand.</p>
            </div>
            <div className="background-options" role="group" aria-label="Background type">
              <button
                type="button"
                className={background === "transparent" ? "selected" : ""}
                onClick={() => {
                  setBackground("transparent");
                  onReset();
                }}
              >
                <span className="swatch swatch-transparent" /> Transparent
              </button>
              <button
                type="button"
                className={background === "color" ? "selected" : ""}
                onClick={() => setBackground("color")}
              >
                <span className="swatch swatch-color" /> Color
              </button>
              <button
                type="button"
                className={background === "image" ? "selected" : ""}
                onClick={() => setBackground("image")}
              >
                <ImageIcon size={19} /> Image
              </button>
              <button
                type="button"
                className={background === "blur" ? "selected" : ""}
                onClick={() => setBackground("blur")}
              >
                <Sparkles size={19} /> Blur
              </button>
            </div>
            {background === "color" && (
              <div className="control-block">
                <label htmlFor="bg-color">Pick a color</label>
                <div className="color-picker-row">
                  <input id="bg-color" type="color" value={color} onChange={(event) => setColor(event.target.value)} />
                  <input
                    className="field"
                    aria-label="Hex color"
                    value={color}
                    onChange={(event) => {
                      if (/^#[0-9a-fA-F]{0,6}$/.test(event.target.value)) setColor(event.target.value);
                    }}
                  />
                </div>
                <div className="color-presets" aria-label="Color presets">
                  {COLORS.map((preset) => (
                    <button
                      type="button"
                      key={preset}
                      style={{ background: preset }}
                      aria-label={`Use ${preset}`}
                      onClick={() => setColor(preset)}
                      className={color === preset ? "active" : ""}
                    >
                      {color === preset && <Check size={14} />}
                    </button>
                  ))}
                </div>
              </div>
            )}
            {background === "image" && (
              <div className="control-block">
                <label htmlFor="background-upload">Custom background</label>
                <label className="file-field">
                  <ImageIcon size={19} />
                  <span>{backgroundFile?.name || "Choose an image"}</span>
                  <ChevronDown size={16} />
                  <input
                    id="background-upload"
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    onChange={(event) => {
                      void selectBackground(event.target.files?.[0] || null);
                      event.target.value = "";
                    }}
                  />
                </label>
              </div>
            )}
            {background === "blur" && (
              <Range
                label="Blur intensity"
                value={intensity}
                min={0}
                max={80}
                step={1}
                display={`${intensity} px`}
                onChange={setIntensity}
              />
            )}
            {background !== "transparent" && (
              <>
                <Range
                  label="Brightness"
                  value={brightness}
                  min={0}
                  max={3}
                  step={0.1}
                  display={`${Math.round(brightness * 100)}%`}
                  onChange={setBrightness}
                />
                <Range
                  label="Opacity"
                  value={opacity}
                  min={0}
                  max={1}
                  step={0.05}
                  display={`${Math.round(opacity * 100)}%`}
                  onChange={setOpacity}
                />
                <button
                  type="button"
                  className="button button-dark sidebar-apply"
                  disabled={busy !== null}
                  onClick={() => void applyBackground()}
                >
                  <WandSparkles size={17} />
                  {busy === "edit" ? "Applying…" : "Apply background"}
                </button>
              </>
            )}
            <button
              type="button"
              className="text-button reset-background"
              onClick={() => {
                setBackground("transparent");
                setColor("#f4f2e9");
                setIntensity(14);
                setBrightness(1);
                setOpacity(1);
                setBackgroundFile(null);
                onReset();
              }}
            >
              <RotateCcw size={15} /> Reset background
            </button>
          </div>
        ) : (
          <div className="sidebar-content">
            <div className="sidebar-intro">
              <span className="mini-label">FINE DETAIL</span>
              <h3>Refine edges</h3>
              <p>Adjust the mask for a cleaner silhouette.</p>
            </div>
            <Range
              label="Threshold"
              value={threshold}
              min={0}
              max={1}
              step={0.05}
              display={threshold.toFixed(2)}
              onChange={setThreshold}
            />
            <Range
              label="Feather"
              value={feather}
              min={0}
              max={20}
              step={0.5}
              display={`${feather} px`}
              onChange={setFeather}
            />
            <Range
              label="Smoothing"
              value={smooth}
              min={0}
              max={5}
              step={1}
              display={`${smooth}`}
              onChange={setSmooth}
            />
            <button
              type="button"
              className="button button-dark sidebar-apply"
              disabled={busy !== null}
              onClick={() => void previewMask()}
            >
              <SlidersHorizontal size={17} />
              {busy === "mask" ? "Preparing…" : "Preview mask"}
            </button>
            {showMask && mask && (
              <button
                type="button"
                className="button button-outline sidebar-apply"
                disabled={busy !== null}
                onClick={() => void applyCurrentMask()}
              >
                <Check size={17} /> Apply mask to image
              </button>
            )}
            <button
              type="button"
              className="text-button reset-background"
              onClick={() => {
                setThreshold(0);
                setFeather(0);
                setSmooth(0);
                clearMask();
                onReset();
              }}
            >
              <RotateCcw size={15} /> Reset edge settings
            </button>
            <p className="control-note">
              Mask changes are applied to the original image at full resolution. Background edits reuse the current
              cutout.
            </p>
          </div>
        )}
        {error && (
          <p role="alert" className="inline-error">
            {error}{" "}
            <button type="button" onClick={() => setError("")} aria-label="Dismiss error">
              <X size={14} />
            </button>
          </p>
        )}
        <div className="download-panel">
          <div className="download-panel-head">
            <div>
              <span className="mini-label">READY WHEN YOU ARE</span>
              <h3>Export image</h3>
            </div>
            <ArrowDownToLine size={21} />
          </div>
          <div className="export-row">
            <label htmlFor="export-format">Format</label>
            <select
              id="export-format"
              className="field"
              value={format}
              onChange={(event) => setFormat(event.target.value as "png" | "webp")}
            >
              <option value="png">PNG · lossless</option>
              <option value="webp">WebP · smaller</option>
            </select>
          </div>
          {format === "webp" && (
            <Range
              label="Quality"
              value={quality}
              min={1}
              max={100}
              step={1}
              display={`${quality}%`}
              onChange={setQuality}
            />
          )}
          <button
            type="button"
            className="button button-accent download-button"
            onClick={() => void download()}
            disabled={busy !== null}
          >
            <ArrowDownToLine size={18} />
            {busy === "download" ? "Preparing file…" : "Download image"}
          </button>
          <p>
            Full resolution · {width} × {height} px · Last edit {current.durationMs} ms
          </p>
        </div>
      </aside>
    </div>
  );
}

function Range({
  label,
  value,
  min,
  max,
  step,
  display,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  display: string;
  onChange: (value: number) => void;
}) {
  const id = label.toLowerCase().replace(/\s+/g, "-");
  return (
    <div className="range-control">
      <div>
        <label htmlFor={id}>{label}</label>
        <output htmlFor={id}>{display}</output>
      </div>
      <input
        id={id}
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
      />
    </div>
  );
}
