/** Pola judul bagian dari keluarga produk: label kecil, judul dua ketukan, dan satu kalimat pengantar. */
export function SectionHeading({
  id,
  eyebrow,
  title,
  intro,
  level = 2,
}: {
  id: string;
  eyebrow: string;
  title: string;
  intro?: string;
  level?: 1 | 2;
}) {
  const Heading = level === 1 ? "h1" : "h2";
  return (
    <div className="reveal flex max-w-2xl flex-col items-start gap-3">
      <span className="eyebrow glass">{eyebrow}</span>
      <Heading
        id={id}
        className="font-heading text-[clamp(1.75rem,1.25rem+2vw,2.5rem)] leading-[1.12] font-extrabold tracking-[-0.03em]"
      >
        {title}
      </Heading>
      {intro && <p className="text-lg text-text-secondary">{intro}</p>}
    </div>
  );
}
