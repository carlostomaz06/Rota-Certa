import React from 'react';

interface ChartProps {
  ok: number;
  atencao: number;
  atrasada: number;
  nunca: number;
}

export default function DashboardChart({ ok, atencao, atrasada, nunca }: ChartProps) {
  const total = ok + atencao + atrasada + nunca;

  if (total === 0) {
    return (
      <div className="flex items-center justify-center h-full text-ink-soft text-sm">
        Nenhum dado disponível
      </div>
    );
  }

  const data = [
    { label: 'Em dia', value: ok, color: 'var(--green)', class: 'bg-brand-green' },
    { label: 'Atenção', value: atencao, color: 'var(--amber)', class: 'bg-brand-amber' },
    { label: 'Atrasada', value: atrasada, color: 'var(--red)', class: 'bg-brand-red' },
    { label: 'Nunca visitada', value: nunca, color: 'var(--accent)', class: 'bg-brand-accent' },
  ];

  // SVG parameters
  const r = 50;
  const strokeWidth = 14;
  const circumference = 2 * Math.PI * r; // ~314.16

  let accumulatedPercent = 0;

  return (
    <div className="flex flex-col md:flex-row items-center justify-center gap-6 h-full p-2">
      {/* Chart Canvas */}
      <div className="relative w-40 h-40 flex-shrink-0 animate-fade-in">
        <svg viewBox="0 0 120 120" className="w-full h-full -rotate-90">
          <circle
            cx="60"
            cy="60"
            r={r}
            fill="transparent"
            stroke="var(--line)"
            strokeWidth={strokeWidth}
            className="opacity-20"
          />
          {data.map((item, index) => {
            if (item.value === 0) return null;
            const percentage = item.value / total;
            const strokeLength = percentage * circumference;
            const strokeOffset = circumference - (accumulatedPercent / total) * circumference;
            accumulatedPercent += item.value;

            return (
              <circle
                key={index}
                cx="60"
                cy="60"
                r={r}
                fill="transparent"
                stroke={item.color}
                strokeWidth={strokeWidth}
                strokeDasharray={`${strokeLength} ${circumference}`}
                strokeDashoffset={strokeOffset}
                strokeLinecap="round"
                className="transition-all duration-500 ease-out hover:stroke-[16px] cursor-pointer"
                title={`${item.label}: ${item.value}`}
              />
            );
          })}
        </svg>

        {/* Center Text */}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="font-condensed text-4xl font-extrabold text-ink leading-none">
            {total}
          </span>
          <span className="text-[10px] uppercase tracking-wider text-ink-soft font-semibold">
            Lojas
          </span>
        </div>
      </div>

      {/* Legend Grid */}
      <div className="grid grid-cols-2 md:grid-cols-1 gap-x-4 gap-y-2 w-full max-w-xs md:max-w-[180px]">
        {data.map((item, index) => {
          const percent = total > 0 ? Math.round((item.value / total) * 100) : 0;
          return (
            <div key={index} className="flex items-center gap-2 text-xs">
              <span className={`w-3 h-3 rounded-full flex-shrink-0`} style={{ backgroundColor: item.color }} />
              <div className="flex-1 min-w-0">
                <div className="font-semibold text-ink truncate">{item.label}</div>
                <div className="text-[10px] text-ink-soft">
                  {item.value} {item.value === 1 ? 'loja' : 'lojas'} ({percent}%)
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
