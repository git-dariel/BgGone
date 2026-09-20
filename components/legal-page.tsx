type LegalSection = {
  title: string;
  paragraphs: React.ReactNode[];
};

export function LegalPage({
  eyebrow,
  title,
  intro,
  sections,
}: {
  eyebrow: string;
  title: string;
  intro: string;
  sections: LegalSection[];
}) {
  return (
    <main className="page-shell py-8 md:py-14">
      <header className="border-t border-ink pt-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <span className="work-index">LEGAL / {eyebrow}</span>
          <span className="rounded-full border border-line px-3 py-1.5 font-mono text-[10px] font-bold tracking-[0.12em] text-muted">
            UPDATED SEPTEMBER 20, 2026
          </span>
        </div>
        <div className="grid gap-7 py-10 md:grid-cols-[minmax(0,1fr)_minmax(260px,0.42fr)] md:items-end md:py-14">
          <h1 className="m-0 text-[clamp(48px,7vw,96px)] leading-[0.96] font-semibold tracking-[-0.07em]">{title}</h1>
          <p className="m-0 text-base leading-relaxed text-muted">{intro}</p>
        </div>
      </header>

      <div className="grid gap-10 border-t border-line py-12 lg:grid-cols-[260px_1fr] lg:py-16">
        <aside>
          <span className="mini-label">THE PLAIN-LANGUAGE VERSION</span>
          <p className="mt-4 max-w-[230px] text-sm leading-relaxed text-muted">
            Clear terms, no hidden account system, and a direct contact if something needs explaining.
          </p>
        </aside>
        <div className="border-t border-ink">
          {sections.map((section, index) => (
            <section
              className="grid gap-4 border-b border-line py-7 sm:grid-cols-[42px_minmax(180px,0.6fr)_1fr] sm:gap-6"
              key={section.title}
            >
              <span className="font-mono text-[11px] font-bold text-muted">
                {String(index + 1).padStart(2, "0")}
              </span>
              <h2 className="m-0 text-xl font-semibold tracking-tight">{section.title}</h2>
              <div className="space-y-3 text-sm leading-relaxed text-muted">
                {section.paragraphs.map((paragraph, paragraphIndex) => (
                  <p className="m-0" key={paragraphIndex}>
                    {paragraph}
                  </p>
                ))}
              </div>
            </section>
          ))}
        </div>
      </div>
    </main>
  );
}
