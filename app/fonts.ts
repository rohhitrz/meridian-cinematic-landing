import { Archivo_Black, Caveat, Inter, Inter_Tight, Unbounded } from "next/font/google";

export const inter = Inter({ subsets: ["latin"], weight: ["400", "500"], variable: "--font-inter", display: "swap" });
export const interTight = Inter_Tight({ subsets: ["latin"], weight: ["300"], variable: "--font-inter-tight", display: "swap" });
export const unbounded = Unbounded({ subsets: ["latin"], weight: ["300", "500"], variable: "--font-unbounded", display: "swap" });
export const caveat = Caveat({ subsets: ["latin"], weight: ["500"], variable: "--font-caveat", display: "swap" });
export const archivoBlack = Archivo_Black({ subsets: ["latin"], weight: ["400"], variable: "--font-archivo-black", display: "swap" });

export const fontVariables = [inter, interTight, unbounded, caveat, archivoBlack].map((f) => f.variable).join(" ");
