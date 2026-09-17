"use client";

import { RotateCcw } from "lucide-react";

export default function Error({ reset }: { error: Error; reset: () => void }) {
  return (
    <main className="error-page">
      <span className="eyebrow">Something went wrong</span>
      <h1>Let’s try that again.</h1>
      <p>The page hit an unexpected error. Your source image is still on your device.</p>
      <button className="button button-dark" onClick={reset}>
        <RotateCcw size={17} /> Retry
      </button>
    </main>
  );
}
