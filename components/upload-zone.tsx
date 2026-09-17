"use client";

import { ArrowUpRight, ImagePlus, UploadCloud } from "lucide-react";
import { useRef, useState } from "react";
import type { ChangeEvent, DragEvent } from "react";

export function UploadZone({
  onFiles,
  multiple = false,
  compact = false,
}: {
  onFiles: (files: File[]) => void;
  multiple?: boolean;
  compact?: boolean;
}) {
  const input = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const handle = (files: FileList | null) => {
    if (files?.length) onFiles(Array.from(files));
  };
  const onDrop = (event: DragEvent<HTMLElement>) => {
    event.preventDefault();
    setDragging(false);
    handle(event.dataTransfer.files);
  };
  const onChange = (event: ChangeEvent<HTMLInputElement>) => {
    handle(event.target.files);
    event.target.value = "";
  };
  return (
    <div
      className={`upload-zone ${compact ? "upload-zone-compact" : ""} ${dragging ? "dragging" : ""}`}
      onDragOver={(event) => {
        event.preventDefault();
        setDragging(true);
      }}
      onDragLeave={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node)) setDragging(false);
      }}
      onDrop={onDrop}
    >
      <input
        ref={input}
        className="sr-only"
        type="file"
        accept="image/jpeg,image/png,image/webp"
        multiple={multiple}
        aria-label={multiple ? "Select images" : "Select an image"}
        onChange={onChange}
      />
      <div className="upload-icon">
        <ImagePlus size={30} strokeWidth={1.7} />
        <span className="upload-icon-corner">
          <ArrowUpRight size={13} />
        </span>
      </div>
      <h3>{multiple ? "Bring the whole set." : "Drop your image here."}</h3>
      <p>
        {multiple
          ? "Drag in a group of images or select them from your device."
          : "Or choose a file and watch the background disappear."}
      </p>
      <button className="button button-accent" type="button" onClick={() => input.current?.click()}>
        <UploadCloud size={17} />
        {multiple ? "Choose images" : "Choose an image"}
        <ArrowUpRight size={16} />
      </button>
      <small>
        JPG, PNG, WebP <span>•</span> Up to 12 MB per image
      </small>
    </div>
  );
}
