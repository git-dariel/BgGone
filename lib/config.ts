export const DEFAULT_API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:5000/v1";
export const MAX_UPLOAD_MB = Number(process.env.NEXT_PUBLIC_MAX_UPLOAD_MB || 12);
export const MAX_IMAGE_PIXELS = Number(process.env.NEXT_PUBLIC_MAX_IMAGE_PIXELS || 25_000_000);
export const MAX_BATCH_SIZE = Number(process.env.NEXT_PUBLIC_MAX_BATCH_SIZE || 10);
export const GITHUB_REPO_URL = process.env.NEXT_PUBLIC_GITHUB_REPO_URL || "https://github.com/git-dariel/BgGone";

export function getApiBase(): string {
  if (typeof window === "undefined") return DEFAULT_API_BASE.replace(/\/$/, "");
  return (
    window.localStorage.getItem("bggone:api-base") ||
    window.localStorage.getItem("removebg:api-base") ||
    DEFAULT_API_BASE
  ).replace(/\/$/, "");
}

export function setApiBase(value: string): void {
  const url = new URL(value);
  if (!["http:", "https:"].includes(url.protocol)) throw new Error("Use an http or https URL.");
  if (!url.pathname.replace(/\/$/, "").endsWith("/v1")) throw new Error("The API URL must end with /v1.");
  window.localStorage.setItem("bggone:api-base", value.replace(/\/$/, ""));
  window.dispatchEvent(new Event("bggone:api-base-changed"));
}
