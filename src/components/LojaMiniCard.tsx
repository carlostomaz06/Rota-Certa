import React from 'react';
import { Loja, Visita } from '../types';
import { MapPin, Calendar } from 'lucide-react';

interface LojaMiniCardProps {
  key?: string;
  loja: Loja;
  statusInfo: {
    status: 'ok' | 'atencao' | 'atrasada' | 'nunca';
    diasRestantes: number | null;
    ultimaVisita: string | null;
    proxima: string | null;
  };
  onClick: () => void;
}

const STATUS_LABELS = {
  ok: 'Em dia',
  atencao: 'Atenção',
  atrasada: 'Atrasada',
  nunca: 'Nunca visitada',
};

const STATUS_COLORS = {
  ok: 'border-l-4 border-l-brand-green bg-brand-green-soft text-brand-green',
  atencao: 'border-l-4 border-l-brand-amber bg-brand-brand-amber-soft text-brand-amber',
  atrasada: 'border-l-4 border-l-brand-red bg-brand-red-soft text-brand-red',
  nunca: 'border-l-4 border-l-brand-accent bg-brand-accent-soft text-brand-accent',
};

export default function LojaMiniCard({ loja, statusInfo, onClick }: LojaMiniCardProps) {
  const { status, diasRestantes } = statusInfo;
  const prazo = loja.prazo || 15; // default 15 days

  // Calculate route line progress percentage
  let percentage = 50;
  let colorClass = 'bg-brand-green';
  let dotClass = 'border-brand-green bg-brand-green';

  if (status === 'nunca') {
    percentage = 0;
    colorClass = 'bg-brand-accent';
    dotClass = 'border-brand-accent bg-brand-accent';
  } else {
    const elapsed = prazo - (diasRestantes || 0);
    percentage = Math.max(3, Math.min(100, (elapsed / prazo) * 100));

    if (status === 'atrasada') {
      colorClass = 'bg-brand-red';
      dotClass = 'border-brand-red bg-brand-red';
    } else if (status === 'atencao') {
      colorClass = 'bg-brand-amber';
      dotClass = 'border-brand-amber bg-brand-amber';
    } else {
      colorClass = 'bg-brand-green';
      dotClass = 'border-brand-green bg-brand-green';
    }
  }

  return (
    <div
      onClick={onClick}
      className="bg-card border border-line rounded-lg p-4 shadow-xs hover:border-brand-accent hover:-translate-y-0.5 transition-all cursor-pointer flex flex-col justify-between"
    >
      <div className="flex justify-between items-start gap-2">
        <div>
          <h4 className="font-bold text-ink text-base line-clamp-1">{loja.nome}</h4>
          <p className="text-xs text-ink-soft flex items-center gap-1 mt-0.5">
            <MapPin className="w-3.5 h-3.5 text-ink-faint flex-shrink-0" />
            <span className="truncate">{loja.bairro || 'Sem bairro'}</span>
            <span className="text-ink-faint font-mono text-[10.5px]">· {loja.codigo}</span>
          </p>
        </div>
        <span className="bg-brand-navy-3 text-white text-[10.5px] font-extrabold px-2 py-0.5 rounded-sm flex-shrink-0 uppercase tracking-wide">
          REG {loja.regional}
        </span>
      </div>

      {/* Interactive route line progress track */}
      <div className="relative h-1.5 my-3 rounded-full routeline-bg overflow-visible">
        <div className="absolute inset-0 bg-line/50 rounded-full" />
        <div
          style={{ width: `${percentage}%` }}
          className={`absolute left-0 top-0 bottom-0 rounded-full transition-all duration-500 ${colorClass}`}
        />
        <div
          style={{ left: `${percentage}%` }}
          className={`absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-3.5 h-3.5 rounded-full border-3 border-card shadow-sm transition-all duration-500 ${dotClass}`}
        />
      </div>

      <div className="flex justify-between items-center gap-2 mt-1">
        {/* Customized tag styles per status */}
        <span
          className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wider ${
            status === 'ok'
              ? 'bg-brand-green-soft text-brand-green'
              : status === 'atencao'
              ? 'bg-brand-amber-soft text-brand-amber'
              : status === 'atrasada'
              ? 'bg-brand-red-soft text-brand-red'
              : 'bg-brand-accent-soft text-brand-accent'
          }`}
        >
          <span
            className={`w-1.5 h-1.5 rounded-full ${
              status === 'ok'
                ? 'bg-brand-green'
                : status === 'atencao'
                ? 'bg-brand-amber'
                : status === 'atrasada'
                ? 'bg-brand-red'
                : 'bg-brand-accent'
            }`}
          />
          {STATUS_LABELS[status]}
        </span>

        <span className="font-mono text-xs text-ink-faint">
          {status === 'nunca'
            ? 'Pendente'
            : diasRestantes !== null && diasRestantes < 0
            ? `${Math.abs(diasRestantes)}d atraso`
            : `retorno em ${diasRestantes}d`}
        </span>
      </div>

      {statusInfo.proxima && (
        <div className="mt-2.5 pt-2 border-t border-line/40 flex items-center justify-between text-[11px]">
          <span className="text-ink-soft flex items-center gap-1 font-semibold">
            <Calendar className="w-3 h-3 text-brand-accent" />
            <span>Próximo Retorno Agendado:</span>
          </span>
          <span className="font-extrabold text-brand-accent font-mono">
            {(() => {
              const parts = statusInfo.proxima.split('-');
              if (parts.length === 3) {
                return `${parts[2]}/${parts[1]}/${parts[0]}`;
              }
              return statusInfo.proxima;
            })()}
          </span>
        </div>
      )}
    </div>
  );
}
