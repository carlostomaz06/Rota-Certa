export function pad(n: number): string {
  return String(n).padStart(2, '0');
}

export function todayISO(): string {
  const d = new Date();
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function nowTimeStr(): string {
  const d = new Date();
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function parseISO(s: string): Date {
  const [y, m, d] = s.split('-').map(Number);
  return new Date(y, m - 1, d);
}

export function addDaysISO(iso: string, n: number): string {
  const d = parseISO(iso);
  d.setDate(d.getDate() + n);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function daysBetweenISO(a: string, b: string): number {
  const da = parseISO(a);
  const db = parseISO(b);
  return Math.round((db.getTime() - da.getTime()) / 86400000);
}

export function fmtDateBR(iso: string | null | undefined): string {
  if (!iso) return '—';
  const [y, m, d] = iso.split('-');
  return `${d}/${m}/${y}`;
}

export function fmtDateShort(iso: string): string {
  const [y, m, d] = iso.split('-');
  const meses = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];
  return `${parseInt(d)} ${meses[parseInt(m) - 1]}`;
}

export function weekdayShort(iso: string): string {
  const days = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
  return days[parseISO(iso).getDay()];
}

export function startOfWeekISO(iso: string, offsetWeeks = 0): string {
  const d = parseISO(iso);
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day; // segunda-feira
  d.setDate(d.getDate() + diff + offsetWeeks * 7);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function weekDaysFrom(mondayISO: string): string[] {
  const out: string[] = [];
  for (let i = 0; i < 7; i++) {
    out.push(addDaysISO(mondayISO, i));
  }
  return out;
}

// Compression function for photos using canvas
export function fileToCompressedDataURL(file: File, maxW = 1100, quality = 0.62): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        let w = img.width;
        let h = img.height;
        if (w > maxW) {
          h = Math.round(h * (maxW / w));
          w = maxW;
        }
        const canvas = document.createElement('canvas');
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, w, h);
          resolve(canvas.toDataURL('image/jpeg', quality));
        } else {
          reject(new Error('Failed to get canvas 2d context'));
        }
      };
      img.onerror = reject;
      img.src = e.target?.result as string;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}
