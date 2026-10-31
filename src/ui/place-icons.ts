import type { Answer, Category, Facility, Status } from "@/lib/api";
import {
  IconBlind,
  IconBuildingHospital,
  IconBuildingMosque,
  IconBusStop,
  IconCircleCheck,
  IconCircleHalf2,
  IconCircleMinus,
  IconCircleX,
  IconElevator,
  IconHelpCircle,
  IconSchool,
  IconToiletPaper,
  IconWheelchair,
  type Glyph,
} from "./icons";

export const STATUS_ICON: Record<Status, Glyph> = {
  aksesibel: IconCircleCheck,
  sebagian: IconCircleHalf2,
  tidak_aksesibel: IconCircleX,
  belum_diketahui: IconHelpCircle,
};

/** Warna teks dan latar status dari token (ADR-0027). */
export const STATUS_TONE: Record<Status, string> = {
  aksesibel: "bg-status-accessible-bg text-status-accessible-fg",
  sebagian: "bg-status-partial-bg text-status-partial-fg",
  tidak_aksesibel: "bg-status-inaccessible-bg text-status-inaccessible-fg",
  belum_diketahui: "bg-status-unknown-bg text-status-unknown-fg",
};

export const CATEGORY_ICON: Record<Category, Glyph> = {
  kampus: IconSchool,
  masjid: IconBuildingMosque,
  halte: IconBusStop,
  rumah_sakit: IconBuildingHospital,
};

export const FACILITY_ICON: Record<Facility, Glyph> = {
  ramp: IconWheelchair,
  toilet_difabel: IconToiletPaper,
  guiding_block: IconBlind,
  lift: IconElevator,
};

export const ANSWER_ICON: Record<Answer, Glyph> = {
  tersedia: IconCircleCheck,
  tidak_tersedia: IconCircleX,
  tidak_perlu: IconCircleMinus,
  belum_tahu: IconHelpCircle,
};
