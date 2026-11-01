import { Icon } from "@/ui/icon";
import { IconAccessible } from "@/ui/icons";

/** Logo: tanda ungu dan wordmark. Varian inverse untuk latar gelap seperti footer. */
export function Logo({ inverse = false }: { inverse?: boolean }) {
  return (
    <span className="inline-flex items-center gap-2.5">
      <span className="grid size-9 place-items-center rounded-xl bg-brand-fill text-text-on-brand">
        <Icon icon={IconAccessible} className="size-6" />
      </span>
      <span
        className={`font-heading text-xl font-extrabold tracking-[-0.03em] sm:text-[1.375rem] ${inverse ? "text-text-on-inverse" : "text-text-primary"}`}
      >
        AksesBogor
      </span>
    </span>
  );
}
