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

import { INITIAL_LOJAS } from './data';

export function matchLojaId(idA: string | null | undefined, idB: string | null | undefined): boolean {
  if (!idA || !idB) return false;
  if (idA === idB) return true;

  const strA = String(idA).trim().toLowerCase();
  const strB = String(idB).trim().toLowerCase();
  if (strA === strB) return true;

  const cleanA = strA.replace('loja_', '');
  const cleanB = strB.replace('loja_', '');
  if (cleanA === cleanB) return true;

  const numA = cleanA.split('-')[0].replace(/^0+/, '');
  const numB = cleanB.split('-')[0].replace(/^0+/, '');
  if (numA && numB && numA === numB && numA !== '') return true;

  const storeA = INITIAL_LOJAS.find(
    (l) =>
      l.id.toLowerCase() === strA ||
      l.id.toLowerCase().replace('loja_', '') === cleanA ||
      l.filial.toLowerCase() === cleanA ||
      l.codigo.toLowerCase() === strA ||
      l.codigo.toLowerCase() === cleanA ||
      l.nome.toLowerCase() === strA
  );
  const storeB = INITIAL_LOJAS.find(
    (l) =>
      l.id.toLowerCase() === strB ||
      l.id.toLowerCase().replace('loja_', '') === cleanB ||
      l.filial.toLowerCase() === cleanB ||
      l.codigo.toLowerCase() === strB ||
      l.codigo.toLowerCase() === cleanB ||
      l.nome.toLowerCase() === strB
  );

  if (storeA && storeB) return storeA.id === storeB.id;
  if (storeA) {
    return (
      storeA.id.toLowerCase() === strB ||
      storeA.id.toLowerCase().replace('loja_', '') === cleanB ||
      storeA.filial.toLowerCase() === cleanB ||
      storeA.codigo.toLowerCase() === strB ||
      storeA.codigo.toLowerCase() === cleanB ||
      storeA.nome.toLowerCase() === strB
    );
  }
  if (storeB) {
    return (
      storeB.id.toLowerCase() === strA ||
      storeB.id.toLowerCase().replace('loja_', '') === cleanA ||
      storeB.filial.toLowerCase() === cleanA ||
      storeB.codigo.toLowerCase() === strA ||
      storeB.codigo.toLowerCase() === cleanA ||
      storeB.nome.toLowerCase() === strA
    );
  }

  return false;
}

export function normalizeLojaId(lojaId: string | null | undefined): string {
  if (!lojaId) return '';
  const str = String(lojaId).trim().toLowerCase();
  const clean = str.replace('loja_', '');
  const found = INITIAL_LOJAS.find(
    (l) =>
      l.id.toLowerCase() === str ||
      l.id.toLowerCase().replace('loja_', '') === clean ||
      l.filial.toLowerCase() === clean ||
      l.codigo.toLowerCase() === str ||
      l.codigo.toLowerCase() === clean ||
      l.nome.toLowerCase() === str
  );
  if (found) return found.id;
  return `loja_${clean}`;
}

