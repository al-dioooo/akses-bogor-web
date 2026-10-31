// Kelas tombol dan tautan berbentuk tombol. Bentuknya mengikuti aksesin-web (record varian dan ukuran),
// dengan token AksesBogor: Primary ungu, Outline bergaris tinta, dan Ghost (ADR-0027).
export type ButtonVariant = "primary" | "outline" | "ghost";
export type ButtonSize = "sm" | "md" | "lg";

const BASE =
  "inline-flex items-center justify-center gap-2 rounded-full font-semibold whitespace-nowrap select-none " +
  "transition-[transform,background-color,box-shadow,color] duration-200 ease-out-expo active:scale-[.98]";

export const VARIANTS: Record<ButtonVariant, string> = {
  primary: "bg-brand-fill text-text-on-brand hover:bg-brand-fill-hover active:bg-brand-fill-pressed",
  outline: "border-2 border-border-strong text-text-primary hover:bg-surface-hover",
  ghost: "text-text-primary hover:bg-surface-hover",
};

// Target sentuh minimal 44 px (ADR-0021); tombol utama 48 px, ajakan besar 56 px.
export const SIZES: Record<ButtonSize, string> = {
  sm: "min-h-11 px-4 text-sm",
  md: "min-h-12 px-5 text-base",
  lg: "min-h-14 px-7 text-base",
};

export function buttonClass(variant: ButtonVariant = "primary", size: ButtonSize = "md", extra = "") {
  return `${BASE} ${VARIANTS[variant]} ${SIZES[size]} ${extra}`.trim();
}
