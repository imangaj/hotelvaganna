export const roomImage = (name = ""): string => {
  const value = name.toLowerCase();
  if (/singola|single/.test(value)) return "/singola.jpg";
  if (/tripola|tripla|triple/.test(value)) return "/tripola.jpg";
  if (/familiare|family/.test(value)) return "/familiare.jpg";
  if (/piccola|picola|small/.test(value)) return "/matrimoniale%20piccola.jpg";
  if (/matrimoniale|king/.test(value)) return "/matrimoniale.jpg";
  if (/dopia|doppia|double|twin/.test(value)) return "/dopia.jpg";
  return "/banner.png";
};
export const localDate = (offset = 0): string => {
  const date = new Date();
  date.setDate(date.getDate() + offset);
  return [date.getFullYear(), String(date.getMonth() + 1).padStart(2, "0"), String(date.getDate()).padStart(2, "0")].join("-");
};
export const safeReturnPath = (value: string | null): string | null =>
  value && /^\/booking(?:\?|$)/.test(value) ? value : null;
