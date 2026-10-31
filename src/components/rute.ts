import type { StaticImageData } from "next/image";
import guidingBlock from "@/assets/ilustrasi/rute-01-guiding-block.webp";
import ramp from "@/assets/ilustrasi/rute-02-ramp.webp";
import toilet from "@/assets/ilustrasi/rute-03-toilet.webp";
import lift from "@/assets/ilustrasi/rute-04-lift.webp";
import type { Facility } from "@/lib/api";

/**
 * Urutan fasilitas saat orang datang ke sebuah tempat, dengan close-up ilustrasinya (ADR-0027). Nomornya
 * sama dengan pin di hero Beranda, dan dipakai di Beranda dan Detail.
 */
export const ROUTE: { facility: Facility; image: StaticImageData }[] = [
  { facility: "guiding_block", image: guidingBlock },
  { facility: "ramp", image: ramp },
  { facility: "toilet_difabel", image: toilet },
  { facility: "lift", image: lift },
];

export const routeNumber = (index: number) => String(index + 1).padStart(2, "0");
