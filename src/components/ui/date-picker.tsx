"use client";

import { useState } from "react";
import { weekday } from "@/lib/dates";

const WEEKDAYS = ["일", "월", "화", "수", "목", "금", "토"];

interface Props {
  /** 고를 수 있는 날짜 ('YYYY-MM-DD'). 나머지는 흐리게 보이고 누를 수 없다. */
  enabled: string[];
  value: string;
  onChange: (ymd: string) => void;
}

const ym = (ymd: string) => ymd.slice(0, 7);

function monthDays(month: string) {
  const [y, m] = month.split("-").map(Number);
  const count = new Date(Date.UTC(y, m, 0)).getUTCDate();
  const first = weekday(`${month}-01`);
  const cells: (string | null)[] = Array(first).fill(null);
  for (let d = 1; d <= count; d++) cells.push(`${month}-${String(d).padStart(2, "0")}`);
  return cells;
}

export function DatePicker({ enabled, value, onChange }: Props) {
  const months = [...new Set(enabled.map(ym))];
  const [index, setIndex] = useState(Math.max(0, months.indexOf(ym(value))));
  const month = months[index] ?? ym(value);
  const allowed = new Set(enabled);
  const [y, m] = month.split("-").map(Number);

  return (
    <div className="border-line bg-surface rounded-2xl border p-3">
      <div className="mb-2 flex items-center justify-between">
        <button
          type="button"
          aria-label="이전 달"
          disabled={index === 0}
          onClick={() => setIndex(index - 1)}
          className="flex size-11 items-center justify-center rounded-full disabled:opacity-30"
        >
          <svg
            aria-hidden
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
          >
            <path d="M15 6l-6 6 6 6" />
          </svg>
        </button>
        <span className="font-bold" aria-live="polite">
          {y}년 {m}월
        </span>
        <button
          type="button"
          aria-label="다음 달"
          disabled={index >= months.length - 1}
          onClick={() => setIndex(index + 1)}
          className="flex size-11 items-center justify-center rounded-full disabled:opacity-30"
        >
          <svg
            aria-hidden
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
          >
            <path d="M9 6l6 6-6 6" />
          </svg>
        </button>
      </div>

      <div className="grid grid-cols-7 gap-1 text-center">
        {WEEKDAYS.map((w, i) => (
          <span
            key={w}
            aria-hidden
            className={`py-1 text-xs ${i === 0 ? "text-rose" : "text-muted"}`}
          >
            {w}
          </span>
        ))}
        {monthDays(month).map((day, i) =>
          day ? (
            <button
              key={day}
              type="button"
              disabled={!allowed.has(day)}
              aria-pressed={day === value}
              aria-label={`${Number(day.slice(5, 7))}월 ${Number(day.slice(8))}일 ${WEEKDAYS[weekday(day)]}요일${
                allowed.has(day) ? "" : ", 주문할 수 없는 날"
              }`}
              onClick={() => onChange(day)}
              className={`aspect-square min-h-10 rounded-full text-[15px] disabled:text-[#C9BDB5] ${
                day === value
                  ? "bg-rose font-bold text-white"
                  : allowed.has(day)
                    ? "hover:bg-rose-soft"
                    : ""
              }`}
            >
              {Number(day.slice(8))}
            </button>
          ) : (
            <span key={`blank-${i}`} aria-hidden />
          ),
        )}
      </div>
    </div>
  );
}
