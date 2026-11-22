import { LogoMark } from "@/ui/logo-mark";

/** Logo: tanda pin dan pintu (sama dengan favicon) dan wordmark. Varian inverse untuk latar gelap seperti footer. */
export function Logo({ inverse = false }: { inverse?: boolean }) {
  return (
    <span className="inline-flex items-center gap-2.5">
      <LogoMark className="size-9" />
      <span
        className={`font-heading text-xl font-extrabold tracking-[-0.03em] sm:text-[1.375rem] ${inverse ? "text-text-on-inverse" : "text-text-primary"}`}
      >
        AksesBogor
      </span>
    </span>
  );
}
