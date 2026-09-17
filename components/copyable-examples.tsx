"use client";

import { Check, Copy } from "lucide-react";
import { useState, useSyncExternalStore } from "react";
import { DEFAULT_API_BASE, getApiBase } from "@/lib/config";
import { useToast } from "@/components/ui";

type Language = "cURL" | "JavaScript" | "Python";
const subscribe = (listener: () => void) => {
  window.addEventListener("bggone:api-base-changed", listener);
  return () => window.removeEventListener("bggone:api-base-changed", listener);
};

export default function CopyableExamples() {
  const toast = useToast();
  const [active, setActive] = useState<Language>("cURL");
  const [copied, setCopied] = useState(false);
  const base = useSyncExternalStore(subscribe, getApiBase, () => DEFAULT_API_BASE);
  const examples: Record<Language, string> = {
    cURL: `curl -F image=@portrait.jpg ${base}/background/remove -o portrait-cutout.png`,
    JavaScript: `const form = new FormData();\nform.append("image", file);\n\nconst response = await fetch(\n  "${base}/background/remove",\n  { method: "POST", body: form }\n);\nif (!response.ok) throw new Error("Request failed");\nconst png = await response.blob();`,
    Python: `import requests\n\nwith open("portrait.jpg", "rb") as image:\n    response = requests.post(\n        "${base}/background/remove",\n        files={"image": image}, timeout=120\n    )\nresponse.raise_for_status()\nopen("portrait-cutout.png", "wb").write(response.content)`,
  };
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(examples[active]);
      setCopied(true);
      toast("Example copied.", "success");
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      toast("Could not copy this example.", "error");
    }
  };
  return (
    <div className="overflow-hidden rounded-xl border border-[#37433b] bg-[#1b241e] text-[#ecf3e8]">
      <div className="flex items-center justify-between border-b border-white/10 px-3 sm:px-4">
        <div role="tablist" aria-label="Code language" className="flex gap-1">
          {(["cURL", "JavaScript", "Python"] as const).map((name) => (
            <button
              type="button"
              role="tab"
              aria-selected={active === name}
              key={name}
              className={`border-b-2 px-3 py-3 text-xs font-bold ${active === name ? "border-accent text-white" : "border-transparent text-white/55 hover:text-white"}`}
              onClick={() => setActive(name)}
            >
              {name}
            </button>
          ))}
        </div>
        <button
          type="button"
          onClick={() => void copy()}
          aria-label="Copy code example"
          className="grid h-9 w-9 place-items-center rounded-md hover:bg-white/10"
        >
          {copied ? <Check size={17} /> : <Copy size={17} />}
        </button>
      </div>
      <pre className="overflow-x-auto p-5 font-mono text-[12px] leading-6 text-[#d6efce]">
        <code>{examples[active]}</code>
      </pre>
    </div>
  );
}
