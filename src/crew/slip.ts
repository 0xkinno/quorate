import { toAmount } from "../paypal/types";

/**
 * Slip templates in English, Spanish and Vietnamese. Every number is injected by code. When the
 * Scribe model writes a friendlier version, numbersMatch() checks it carries only these numbers;
 * otherwise this template text is shown.
 */
export type SlipFacts = { child: string; capCents: number; minN: number; closeAt: string; school: string };

export function slipText(lang: "en" | "es" | "vi", f: SlipFacts) {
  const amt = `$${toAmount(f.capCents)}`;
  const date = new Date(f.closeAt).toISOString().slice(0, 10);
  const T = {
    en: {
      label: "Permission slip", title: "Science museum trip", who: `${f.child} · ${f.school}`, amount: `Held today: ${amt}`,
      promise: `Charged only if the trip runs, and less if more children go. Never more than ${amt}.`,
      when: `The trip runs if at least ${f.minN} children are going. Decision on ${date}.`,
      held: "HELD", guaranteed: "Guaranteed until", error: "PayPal could not place the hold",
    },
    es: {
      label: "Permiso escolar", title: "Excursión al museo de ciencias", who: `${f.child} · ${f.school}`, amount: `Retenido hoy: ${amt}`,
      promise: `Solo se cobra si la excursión se realiza, y menos si van más niños. Nunca más de ${amt}.`,
      when: `La excursión se realiza si van al menos ${f.minN} niños. Decisión el ${date}.`,
      held: "RETENIDO", guaranteed: "Garantizado hasta", error: "PayPal no pudo hacer la retención",
    },
    vi: {
      label: "Giấy phép đi tham quan", title: "Chuyến tham quan bảo tàng khoa học", who: `${f.child} · ${f.school}`, amount: `Tạm giữ hôm nay: ${amt}`,
      promise: `Chỉ bị trừ tiền nếu chuyến đi diễn ra, và ít hơn nếu có thêm học sinh tham gia. Không bao giờ quá ${amt}.`,
      when: `Chuyến đi diễn ra nếu có ít nhất ${f.minN} học sinh. Quyết định vào ngày ${date}.`,
      held: "ĐÃ GIỮ", guaranteed: "Được đảm bảo đến", error: "PayPal không thể tạm giữ",
    },
  } as const;
  return T[lang];
}

/** Every number in a model-written text must appear in the code-supplied facts. */
export function numbersMatch(text: string, allowed: string[]): boolean {
  const found = text.match(/\d+(?:[.,]\d+)?/g) ?? [];
  const ok = new Set(allowed.flatMap((a) => a.match(/\d+(?:[.,]\d+)?/g) ?? []));
  return found.every((n) => ok.has(n));
}
