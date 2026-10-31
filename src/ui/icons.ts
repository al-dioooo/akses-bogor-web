// Path ikon dari Tabler Icons 3.46.0 (https://tabler.io/icons), lisensi MIT,
// Copyright (c) 2020-2026 Paweł Kuna. Satu ikon adalah daftar atribut `d` untuk path di kanvas 24 × 24;
// ikon baru cukup disalin dari berkas SVG Tabler. Titik yang di Tabler berisi warna (kepala di
// IconAccessible) cukup digambar dengan garis. Ikon dipakai lewat komponen `Icon`.

export type Glyph = readonly string[];

// Status lokasi (ADR-0018)
export const IconCircleCheck: Glyph = ["M3 12a9 9 0 1 0 18 0a9 9 0 1 0 -18 0", "M9 12l2 2l4 -4"];
export const IconCircleHalf2: Glyph = ["M3 12a9 9 0 1 0 18 0a9 9 0 1 0 -18 0", "M12 3v18", "M12 14l7 -7", "M12 19l8.5 -8.5", "M12 9l4.5 -4.5"];
export const IconCircleX: Glyph = ["M3 12a9 9 0 1 0 18 0a9 9 0 1 0 -18 0", "M10 10l4 4m0 -4l-4 4"];
export const IconHelpCircle: Glyph = ["M3 12a9 9 0 1 0 18 0a9 9 0 0 0 -18 0", "M12 16v.01", "M12 13a2 2 0 0 0 .914 -3.782a1.98 1.98 0 0 0 -2.414 .483"];

// Jawaban fasilitas (ADR-0017)
export const IconCircleMinus: Glyph = ["M3 12a9 9 0 1 0 18 0a9 9 0 1 0 -18 0", "M9 12l6 0"];

// Kategori (ADR-0004)
export const IconSchool: Glyph = ["M22 9l-10 -4l-10 4l10 4l10 -4v6", "M6 10.6v5.4a6 3 0 0 0 12 0v-5.4"];
export const IconBuildingMosque: Glyph = ["M3 21h7v-2a2 2 0 1 1 4 0v2h7", "M4 21v-10", "M20 21v-10", "M4 16h3v-3h10v3h3", "M17 13a5 5 0 0 0 -10 0", "M21 10.5c0 -.329 -.077 -.653 -.224 -.947l-.776 -1.553l-.776 1.553a2.118 2.118 0 0 0 -.224 .947a.5 .5 0 0 0 .5 .5h1a.5 .5 0 0 0 .5 -.5", "M5 10.5c0 -.329 -.077 -.653 -.224 -.947l-.776 -1.553l-.776 1.553a2.118 2.118 0 0 0 -.224 .947a.5 .5 0 0 0 .5 .5h1a.5 .5 0 0 0 .5 -.5", "M12 2a2 2 0 1 0 2 2", "M12 6v2"];
export const IconBusStop: Glyph = ["M3 4a1 1 0 0 1 1 -1h2a1 1 0 0 1 1 1v4a1 1 0 0 1 -1 1h-2a1 1 0 0 1 -1 -1l0 -4", "M16 17a2 2 0 1 0 4 0a2 2 0 1 0 -4 0", "M10 5h7c2.761 0 5 3.134 5 7v5h-2", "M16 17h-8", "M16 5l1.5 7h4.5", "M9.5 10h7.5", "M12 5v5", "M5 9v11"];
export const IconBuildingHospital: Glyph = ["M3 21l18 0", "M5 21v-16a2 2 0 0 1 2 -2h10a2 2 0 0 1 2 2v16", "M9 21v-4a2 2 0 0 1 2 -2h2a2 2 0 0 1 2 2v4", "M10 9l4 0", "M12 7l0 4"];

// Fasilitas
export const IconWheelchair: Glyph = ["M3 16a5 5 0 1 0 10 0a5 5 0 1 0 -10 0", "M17 19a2 2 0 1 0 4 0a2 2 0 1 0 -4 0", "M19 17a3 3 0 0 0 -3 -3h-3.4", "M3 3h1a2 2 0 0 1 2 2v6", "M6 8h11", "M15 8v6"];
export const IconToiletPaper: Glyph = ["M3 10a3 7 0 1 0 6 0a3 7 0 1 0 -6 0", "M21 10c0 -3.866 -1.343 -7 -3 -7", "M6 3h12", "M21 10v10l-3 -1l-3 2l-3 -3l-3 2v-10", "M6 10h.01"];
export const IconBlind: Glyph = ["M9 4a1 1 0 1 0 2 0a1 1 0 0 0 -2 0", "M4 21l3 -4", "M13 21l-2 -4l-3 -3l1 -6", "M3 12l2 -3l4 -1l6 4", "M16.5 14l3.5 7"];
export const IconElevator: Glyph = ["M5 5a1 1 0 0 1 1 -1h12a1 1 0 0 1 1 1v14a1 1 0 0 1 -1 1h-12a1 1 0 0 1 -1 -1l0 -14", "M10 10l2 -2l2 2", "M10 14l2 2l2 -2"];

// Navigasi dan aksi
export const IconAccessible: Glyph = ["M3 12a9 9 0 1 0 18 0a9 9 0 1 0 -18 0", "M10 16.5l2 -3l2 3m-2 -3v-2l3 -1m-6 0l3 1", "M11.5 7.5a.5 .5 0 1 0 1 0a.5 .5 0 1 0 -1 0"];
export const IconHome: Glyph = ["M5 12l-2 0l9 -9l9 9l-2 0", "M5 12v7a2 2 0 0 0 2 2h10a2 2 0 0 0 2 -2v-7", "M9 21v-6a2 2 0 0 1 2 -2h2a2 2 0 0 1 2 2v6"];
export const IconCompass: Glyph = ["M8 16l2 -6l6 -2l-2 6l-6 2", "M3 12a9 9 0 1 0 18 0a9 9 0 1 0 -18 0", "M12 3l0 2", "M12 19l0 2", "M3 12l2 0", "M19 12l2 0"];
export const IconMap2: Glyph = ["M12 18.5l-3 -1.5l-6 3v-13l6 -3l6 3l6 -3v7.5", "M9 4v13", "M15 7v5.5", "M21.121 20.121a3 3 0 1 0 -4.242 0c.418 .419 1.125 1.045 2.121 1.879c1.051 -.89 1.759 -1.516 2.121 -1.879", "M19 18v.01"];
export const IconCirclePlus: Glyph = ["M3 12a9 9 0 1 0 18 0a9 9 0 0 0 -18 0", "M9 12h6", "M12 9v6"];
export const IconDots: Glyph = ["M4 12a1 1 0 1 0 2 0a1 1 0 1 0 -2 0", "M11 12a1 1 0 1 0 2 0a1 1 0 1 0 -2 0", "M18 12a1 1 0 1 0 2 0a1 1 0 1 0 -2 0"];
export const IconUser: Glyph = ["M8 7a4 4 0 1 0 8 0a4 4 0 0 0 -8 0", "M6 21v-2a4 4 0 0 1 4 -4h4a4 4 0 0 1 4 4v2"];
export const IconSearch: Glyph = ["M3 10a7 7 0 1 0 14 0a7 7 0 1 0 -14 0", "M21 21l-6 -6"];
export const IconAdjustmentsHorizontal: Glyph = ["M12 6a2 2 0 1 0 4 0a2 2 0 1 0 -4 0", "M4 6l8 0", "M16 6l4 0", "M6 12a2 2 0 1 0 4 0a2 2 0 1 0 -4 0", "M4 12l2 0", "M10 12l10 0", "M15 18a2 2 0 1 0 4 0a2 2 0 1 0 -4 0", "M4 18l11 0", "M19 18l1 0"];
export const IconX: Glyph = ["M18 6l-12 12", "M6 6l12 12"];
export const IconCheck: Glyph = ["M5 12l5 5l10 -10"];
export const IconChevronLeft: Glyph = ["M15 6l-6 6l6 6"];
export const IconChevronRight: Glyph = ["M9 6l6 6l-6 6"];
export const IconArrowLeft: Glyph = ["M5 12l14 0", "M5 12l6 6", "M5 12l6 -6"];
export const IconArrowRight: Glyph = ["M5 12l14 0", "M13 18l6 -6", "M13 6l6 6"];
export const IconArrowUp: Glyph = ["M12 5l0 14", "M18 11l-6 -6", "M6 11l6 -6"];
export const IconArrowUpRight: Glyph = ["M17 7l-10 10", "M8 7l9 0l0 9"];
export const IconSunMoon: Glyph = ["M9.173 14.83a4 4 0 1 1 5.657 -5.657", "M11.294 12.707l.174 .247a7.5 7.5 0 0 0 8.845 2.492a9 9 0 0 1 -14.671 2.914", "M3 12h1", "M12 3v1", "M5.6 5.6l.7 .7", "M3 21l18 -18"];

// Konten
export const IconMapPin: Glyph = ["M9 11a3 3 0 1 0 6 0a3 3 0 0 0 -6 0", "M17.657 16.657l-4.243 4.243a2 2 0 0 1 -2.827 0l-4.244 -4.243a8 8 0 1 1 11.314 0"];
export const IconCalendarCheck: Glyph = ["M11.5 21h-5.5a2 2 0 0 1 -2 -2v-12a2 2 0 0 1 2 -2h12a2 2 0 0 1 2 2v6", "M16 3v4", "M8 3v4", "M4 11h16", "M15 19l2 2l4 -4"];
export const IconAlertTriangle: Glyph = ["M12 9v4", "M10.363 3.591l-8.106 13.534a1.914 1.914 0 0 0 1.636 2.871h16.214a1.914 1.914 0 0 0 1.636 -2.87l-8.106 -13.536a1.914 1.914 0 0 0 -3.274 0", "M12 16h.01"];
export const IconInfoCircle: Glyph = ["M3 12a9 9 0 1 0 18 0a9 9 0 0 0 -18 0", "M12 9h.01", "M11 12h1v4h1"];
export const IconPhotoOff: Glyph = ["M15 8h.01", "M7 3h11a3 3 0 0 1 3 3v11m-.856 3.099a2.991 2.991 0 0 1 -2.144 .901h-12a3 3 0 0 1 -3 -3v-12c0 -.845 .349 -1.608 .91 -2.153", "M3 16l5 -5c.928 -.893 2.072 -.893 3 0l5 5", "M16.33 12.338c.574 -.054 1.155 .166 1.67 .662l3 3", "M3 3l18 18"];
export const IconUsers: Glyph = ["M5 7a4 4 0 1 0 8 0a4 4 0 1 0 -8 0", "M3 21v-2a4 4 0 0 1 4 -4h4a4 4 0 0 1 4 4v2", "M16 3.13a4 4 0 0 1 0 7.75", "M21 21v-2a4 4 0 0 0 -3 -3.85"];
export const IconBuilding: Glyph = ["M3 21l18 0", "M9 8l1 0", "M9 12l1 0", "M9 16l1 0", "M14 8l1 0", "M14 12l1 0", "M14 16l1 0", "M5 21v-16a2 2 0 0 1 2 -2h10a2 2 0 0 1 2 2v16"];
export const IconPencil: Glyph = ["M4 20h4l10.5 -10.5a2.828 2.828 0 1 0 -4 -4l-10.5 10.5v4", "M13.5 6.5l4 4"];
export const IconMessageReport: Glyph = ["M18 4a3 3 0 0 1 3 3v8a3 3 0 0 1 -3 3h-5l-5 3v-3h-2a3 3 0 0 1 -3 -3v-8a3 3 0 0 1 3 -3h12", "M12 8v3", "M12 14v.01"];
