"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const ITEMS = [
  { href: "/", label: "분석" },
  { href: "/hit-rate", label: "적중률" },
  { href: "/help", label: "사용법" },
];

export default function Nav() {
  const pathname = usePathname();
  return (
    <nav className="border-b border-zinc-800 bg-zinc-950/80 backdrop-blur sticky top-0 z-10">
      <div className="max-w-[1600px] mx-auto px-4 sm:px-6 py-3 flex items-center justify-between gap-2">
        <div className="text-sm font-semibold text-zinc-200 truncate">
          <span>우크당거스</span>
          <span className="hidden sm:inline"> 차트 분석기</span>
        </div>
        <div className="flex gap-1 shrink-0">
          {ITEMS.map((it) => {
            const active = pathname === it.href;
            return (
              <Link
                key={it.href}
                href={it.href}
                className={`px-3 sm:px-4 py-1.5 text-sm rounded ${
                  active
                    ? "bg-zinc-700 text-zinc-100"
                    : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800"
                }`}
              >
                {it.label}
              </Link>
            );
          })}
        </div>
      </div>
    </nav>
  );
}
