/**
 * Judul bagian (ADR-0027): label bernomor, judul dua ketukan dengan satu kata aksen, dan satu kalimat
 * pengantar di kolom kanan pada layar lebar.
 */
export function SectionHeading({
  id,
  label,
  title,
  accent,
  intro,
  level = 2,
}: {
  id: string;
  label: string;
  title: string;
  accent?: string;
  intro?: string;
  level?: 1 | 2;
}) {
  const Heading = level === 1 ? "h1" : "h2";
  return (
    <div className={`${level === 2 ? "reveal " : ""}grid items-end gap-x-16 gap-y-5 lg:grid-cols-[1.1fr_1fr]`}>
      <div className="flex flex-col items-start gap-4">
        <p className="lbl">{label}</p>
        <Heading id={id} className="display text-[clamp(2.25rem,1.4rem+2.6vw,3.75rem)] leading-none">
          {title}
          {accent && <span className="accent"> {accent}</span>}
        </Heading>
      </div>
      {intro && <p className="max-w-md text-lg text-text-secondary lg:justify-self-end">{intro}</p>}
    </div>
  );
}
