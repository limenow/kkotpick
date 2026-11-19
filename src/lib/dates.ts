// 날짜는 전부 서울 기준 'YYYY-MM-DD' 문자열로 다룬다. (서버가 UTC여도 어긋나지 않게)

const seoulDate = new Intl.DateTimeFormat("en-CA", {
  timeZone: "Asia/Seoul",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

export function seoulToday(now = new Date()): string {
  return seoulDate.format(now);
}

export function addDays(ymd: string, days: number): string {
  const d = new Date(`${ymd}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

/** 0=일 … 6=토 */
export function weekday(ymd: string): number {
  return new Date(`${ymd}T00:00:00Z`).getUTCDay();
}

const WEEKDAYS = ["일", "월", "화", "수", "목", "금", "토"];

export function dateLabel(ymd: string): string {
  const [, m, d] = ymd.split("-").map(Number);
  return `${m}/${d} (${WEEKDAYS[weekday(ymd)]})`;
}

/** 예약 가능한 날짜 목록: 내일부터 maxDays일 뒤까지, 정기 휴무 요일 제외 */
export function reservationDates(today: string, maxDays: number, closedWeekdays: number[]) {
  const out: string[] = [];
  for (let i = 1; i <= maxDays; i++) {
    const day = addDays(today, i);
    if (!closedWeekdays.includes(weekday(day))) out.push(day);
  }
  return out;
}

const seoulTime = new Intl.DateTimeFormat("ko-KR", {
  timeZone: "Asia/Seoul",
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
});

export function timeLabel(iso: string): string {
  return seoulTime.format(new Date(iso));
}
