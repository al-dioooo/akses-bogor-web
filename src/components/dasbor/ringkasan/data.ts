import { cache } from "react";
import { getMyReports } from "@/lib/akun";
import { getQueue, getRecheck, getTeam, type QueueStatus } from "@/lib/verifikasi";

// Daftar dari API dimuat sekali per request walaupun dipakai beberapa bagian Ringkasan (ADR-0046). Hanya di server.
// Route verifikator dan admin tetap memeriksa peran di API; pemanggilnya hanya memanggil untuk peran itu.

export const myReports = cache((token: string) => getMyReports(token));

export const queue = cache((token: string, status: QueueStatus) => getQueue(token, status));

export const recheck = cache((token: string) => getRecheck(token));

export const team = cache((token: string) => getTeam(token));
