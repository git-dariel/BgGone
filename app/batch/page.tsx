import type { Metadata } from "next";
import { Layers3 } from "lucide-react";
// import { ArrowUpRight } from "lucide-react";
// import BatchWorkspace from "@/components/batch-workspace";

export const metadata: Metadata = {
  title: "Batch processing — Coming soon",
  description: "Batch background removal is coming soon to BgGone.",
};

export default function BatchPage() {
  return (
    <main className="page-shell flex min-h-[70vh] flex-col justify-center py-10 md:py-16">
      <div className="border-t border-ink pt-4">
        <div className="flex items-center gap-2 text-[11px] font-extrabold tracking-[0.16em] text-lime-700">
          <Layers3 size={16} /> BATCH STUDIO / 02
        </div>
        <h1 className="mt-7 text-[clamp(46px,6vw,86px)] font-semibold leading-[1.02] tracking-[-0.07em]">
          Coming <span className="font-serif font-normal italic text-[#789462]">soon.</span>
        </h1>
        <p className="mt-5 max-w-[560px] text-base text-muted">
          Batch background removal is on its way. You can still edit images one at a time in the studio.
        </p>
      </div>
    </main>
  );

  /* Previous batch upload page, kept here for when the feature returns.
  return (
    <main className="page-shell py-10 md:py-16">
      <div className="mb-10 border-t border-ink pt-4">
        <div className="flex items-center gap-2 text-[11px] font-extrabold tracking-[0.16em] text-lime-700">
          <Layers3 size={16} /> BATCH STUDIO / 02
        </div>
        <div className="mt-6 flex flex-col justify-between gap-6 md:flex-row md:items-end">
          <div>
            <h1 className="max-w-[900px] text-[clamp(45px,6vw,86px)] leading-[1.02] font-semibold tracking-[-0.07em]">
              Many images.
              <br />
              <span className="font-serif font-normal italic text-[#789462]">One clean finish.</span>
            </h1>
            <p className="mt-5 max-w-[560px] text-base text-muted">
              Build a queue, let the worker process each photo, and take the finished set in one ZIP.
            </p>
          </div>
          <span className="flex items-center gap-2 text-xs font-bold text-muted">
            ASYNC / ZIP EXPORT <ArrowUpRight size={15} />
          </span>
        </div>
      </div>
      <BatchWorkspace />
    </main>
  );
  */
}
