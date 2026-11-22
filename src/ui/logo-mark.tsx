import mark from "./logo-mark.json";

/**
 * Tanda AksesBogor: pin peta yang lubangnya pintu terbuka (issue #127). Bentuknya dari logo-mark.json, sumber yang
 * sama dengan favicon dan ikon aplikasi (scripts/ikon.mjs). Warna dari token, sama di mode terang dan gelap.
 */
export function LogoMark({ className = "size-9" }: { className?: string }) {
  const size = mark.viewBox;
  return (
    <svg viewBox={`0 0 ${size} ${size}`} aria-hidden="true" focusable="false" className={`shrink-0 ${className}`}>
      <rect width={size} height={size} rx={mark.cornerRadius} className="fill-brand-fill" />
      <path d={mark.pin} className="fill-text-on-brand" />
      <path d={mark.door} className="fill-brand-fill" />
      <path d={mark.leaf} className="fill-text-highlight" />
    </svg>
  );
}
