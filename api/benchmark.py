"""Measure local CPU/GPU model inference with a representative image."""

import argparse
import statistics
import time

from PIL import Image

from removebg_api.models import BackgroundRemovalService


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("image")
    parser.add_argument(
        "--model",
        choices=[
            "u2net",
            "u2netp",
            "silueta",
            "isnet",
            "birefnet",
            "birefnet-lite",
            "birefnet-portrait",
        ],
        default="silueta",
    )
    parser.add_argument("--device", choices=["cpu", "gpu"], default="cpu")
    parser.add_argument("--runs", type=int, default=5)
    args = parser.parse_args()
    if args.runs < 1:
        parser.error("--runs must be positive")
    with Image.open(args.image) as opened:
        image = opened.convert("RGB")
    service = BackgroundRemovalService(args.model, args.device, 2048, 1)
    service.adapter.load()
    service.mask(image)  # Warm up before measuring.
    samples = []
    for _ in range(args.runs):
        start = time.perf_counter()
        _, inference = service.mask(image)
        samples.append((time.perf_counter() - start, inference))
    print(f"device={args.device} model={args.model} size={image.width}x{image.height} runs={args.runs}")
    print(f"end_to_end_median_ms={statistics.median(x[0] for x in samples) * 1000:.1f}")
    print(f"model_median_ms={statistics.median(x[1] for x in samples) * 1000:.1f}")


if __name__ == "__main__":
    main()
