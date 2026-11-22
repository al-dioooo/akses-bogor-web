import { cache } from "react";
import { getMyReports } from "@/lib/akun";

// Daftar dari API dimuat sekali per request walaupun dipakai beberapa bagian Ringkasan (ADR-0046). Hanya di server.

export const myReports = cache((token: string) => getMyReports(token));
