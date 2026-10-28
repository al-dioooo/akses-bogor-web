import { Icon } from "@/ui/icon";
import { IconAccessible } from "@/ui/icons";

/** Logo: tanda ungu berkilap dan wordmark. Varian inverse untuk latar gelap seperti footer. */
export function Logo({ inverse = false }: { inverse?: boolean }) {
  return (
    <span className="inline-flex items-center gap-2.5">
      <span className="btn-gloss grid size-9 place-items-center rounded-xl text-text-on-brand">
        <Icon icon={IconAccessible} className="size-6" />
      </span>
      <span
        className={`font-heading text-xl font-extrabold tracking-[-0.035em] ${inverse ? "text-text-on-inverse" : "text-text-primary"}`}
      >
        Akses<span className={inverse ? "text-text-on-inverse-secondary" : "text-text-brand"}>Bogor</span>
      </span>
    </span>
  );
}
