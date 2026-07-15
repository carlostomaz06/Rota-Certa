import React from 'react';
import { Loja, Plano, User, Revisita } from '../types';
import {
  todayISO,
  startOfWeekISO,
  weekDaysFrom,
  fmtDateShort,
  weekdayShort,
} from '../utils';
import { Calendar, Plus, ChevronLeft, ChevronRight, Check, RefreshCw } from 'lucide-react';

interface PlanejamentoViewProps {
  planos: Plano[];
  revisitas?: Revisita[];
  lojas: Loja[];
  users: User[];
  onOpenVisitaModal: (lojaId: string, planoId: string) => void;
  onOpenRevisitaModal?: (revisita: Revisita) => void;
  onOpenPlanoForm: () => void;
  onExcluirPlano: (id: string) => void;
  planSemanaOffset: number;
  setPlanSemanaOffset: (offset: number) => void;
  canExcluir?: boolean;
}

export default function PlanejamentoView({
  planos,
  revisitas = [],
  lojas,
  users,
  onOpenVisitaModal,
  onOpenRevisitaModal,
  onOpenPlanoForm,
  onExcluirPlano,
  planSemanaOffset,
  setPlanSemanaOffset,
  canExcluir = false,
}: PlanejamentoViewProps) {
  const hoje = todayISO();
  const monday = startOfWeekISO(hoje, planSemanaOffset);
  const dias = weekDaysFrom(monday);

  return (
    <div className="space-y-5 animate-fade-in">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="font-condensed font-extrabold text-3xl text-ink tracking-tight uppercase leading-none">
            Planejamento Semanal
          </h1>
          <p className="text-sm text-ink-soft mt-1.5">
            Organize as visitas programadas para a equipe de supervisores e acompanhe as revisitas agendadas.
          </p>
        </div>
        <button
          onClick={onOpenPlanoForm}
          className="flex items-center justify-center gap-1.5 px-4.5 py-2.5 bg-brand-accent text-white font-semibold text-sm rounded-lg hover:bg-brand-accent/90 active:scale-95 transition-all shadow-md self-start sm:self-auto"
        >
          <Plus className="w-4 h-4 stroke-[2.5]" />
          Programar Visita
        </button>
      </div>

      {/* Week Navigator Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 bg-card border border-line rounded-xl shadow-xs">
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setPlanSemanaOffset(planSemanaOffset - 1)}
            className="flex items-center gap-1 px-3 py-1.5 border border-line rounded-lg text-xs font-semibold text-ink-soft bg-card hover:bg-paper hover:text-ink transition-colors cursor-pointer"
          >
            <ChevronLeft className="w-4 h-4" />
            Semana anterior
          </button>
          <button
            onClick={() => setPlanSemanaOffset(planSemanaOffset + 1)}
            className="flex items-center gap-1 px-3 py-1.5 border border-line rounded-lg text-xs font-semibold text-ink-soft bg-card hover:bg-paper hover:text-ink transition-colors cursor-pointer"
          >
            Próxima semana
            <ChevronRight className="w-4 h-4" />
          </button>
          {planSemanaOffset !== 0 && (
            <button
              onClick={() => setPlanSemanaOffset(0)}
              className="px-3.5 py-1.5 text-xs font-bold text-brand-accent border border-brand-accent/30 rounded-lg hover:bg-brand-accent-soft transition-colors cursor-pointer"
            >
              Voltar para hoje
            </button>
          )}
        </div>
        <div className="font-condensed text-lg font-bold text-ink uppercase tracking-wide">
          {fmtDateShort(dias[0])} – {fmtDateShort(dias[6])}
        </div>
      </div>

      {/* 7-Days Columns Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-7 gap-3">
        {dias.map((d) => {
          const diaPlanos = planos
            .filter((p) => p.data === d && !p.concluido)
            .sort((a, b) => a.usuario.localeCompare(b.usuario));
            
          const diaRevisitas = revisitas
            .filter((r) => r.dataPlanejada === d && !r.concluida)
            .sort((a, b) => a.usuario.localeCompare(b.usuario));

          const isToday = d === hoje;
          const temAgendamentos = diaPlanos.length > 0 || diaRevisitas.length > 0;

          return (
            <div
              key={d}
              className={`bg-card border rounded-xl p-3 flex flex-col min-h-[140px] space-y-2.5 transition-all ${
                isToday
                  ? 'border-brand-accent ring-2 ring-brand-accent-soft/30 shadow-md'
                  : 'border-line shadow-xs'
              }`}
            >
              {/* Day column header */}
              <h4 className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-ink pb-2 border-b border-line/60">
                <span className="truncate">{weekdayShort(d)}</span>
                <span className={isToday ? 'text-brand-accent font-extrabold' : 'text-ink-soft'}>
                  {fmtDateShort(d).split(' ')[0]}
                </span>
              </h4>

              {/* Day scheduled planned visits & revisits */}
              <div className="flex-1 space-y-2 max-h-[280px] overflow-y-auto pr-0.5">
                {temAgendamentos ? (
                  <>
                    {/* Standard Planned Visits */}
                    {diaPlanos.map((p) => {
                      const l = lojas.find((x) => x.id === p.lojaId);
                      return (
                        <div
                          key={p.id}
                          className="bg-paper/40 border border-line/70 rounded-lg p-2 text-xs space-y-1.5 shadow-2xs hover:border-line transition-all"
                        >
                          <div className="font-bold text-ink leading-tight truncate">
                            {l ? l.nome : 'Loja desconhecida'}
                          </div>
                          <div className="text-[10px] text-ink-soft flex items-center gap-1">
                            <span className="font-semibold truncate">{p.usuario}</span>
                            {p.concluido && (
                              <span className="flex items-center gap-0.5 text-brand-green font-bold">
                                · <Check className="w-2.5 h-2.5" /> Visita realizada
                              </span>
                            )}
                          </div>

                          {p.obs && (
                            <div className="text-[9.5px] italic text-ink-faint bg-paper p-1 rounded-sm line-clamp-2">
                              "{p.obs}"
                            </div>
                          )}

                          <div className="flex gap-2 pt-1 border-t border-line/40">
                            {!p.concluido && (
                              <button
                                onClick={() => onOpenVisitaModal(p.lojaId, p.id)}
                                className="text-[10.5px] font-bold text-brand-accent hover:underline cursor-pointer"
                              >
                                Registrar
                              </button>
                            )}
                            {canExcluir && (
                              <button
                                onClick={() => onExcluirPlano(p.id)}
                                className="text-[10.5px] font-bold text-brand-red hover:underline cursor-pointer ml-auto"
                              >
                                Remover
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}

                    {/* Scheduled Pending Revisits */}
                    {diaRevisitas.map((r) => {
                      const l = lojas.find((x) => x.id === r.lojaId);
                      return (
                        <div
                          key={r.id}
                          className="bg-indigo-50/40 border border-indigo-100 dark:bg-indigo-950/10 dark:border-indigo-900/40 rounded-lg p-2 text-xs space-y-1.5 shadow-2xs hover:border-indigo-200 dark:hover:border-indigo-800 transition-all"
                        >
                          <div className="flex items-start justify-between gap-1">
                            <div className="font-bold text-indigo-950 dark:text-indigo-200 leading-tight truncate flex-1">
                              {l ? l.nome : 'Loja desconhecida'}
                            </div>
                            <span className="text-[8px] bg-indigo-100 text-indigo-700 font-extrabold uppercase px-1 py-0.2 rounded flex-shrink-0">
                              Revisita
                            </span>
                          </div>
                          <div className="text-[10px] text-indigo-700 dark:text-indigo-300 flex items-center gap-1">
                            <span className="font-semibold truncate">{r.usuario}</span>
                          </div>

                          {r.pontosMelhoria.length > 0 && (
                            <div className="text-[9.5px] text-ink-soft bg-paper/70 p-1 rounded-md space-y-0.5 max-h-[60px] overflow-y-auto">
                              <span className="font-bold text-[8.5px] uppercase text-indigo-800 dark:text-indigo-400 block mb-0.5">Pendências:</span>
                              {r.pontosMelhoria.map((item, idx) => (
                                <div key={idx} className="truncate flex items-center gap-1">
                                  <span className="w-1 h-1 rounded-full bg-indigo-400 flex-shrink-0" />
                                  <span className="truncate">{item.descricao}</span>
                                </div>
                              ))}
                            </div>
                          )}

                          <div className="flex gap-2 pt-1 border-t border-indigo-100 dark:border-indigo-950">
                            {onOpenRevisitaModal && (
                              <button
                                onClick={() => onOpenRevisitaModal(r)}
                                className="text-[10.5px] font-bold text-indigo-700 hover:text-indigo-900 dark:text-indigo-400 dark:hover:text-indigo-300 hover:underline cursor-pointer flex items-center gap-0.5"
                              >
                                <RefreshCw className="w-2.5 h-2.5 animate-spin-slow" />
                                Registrar
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </>
                ) : (
                  <p className="text-[10.5px] text-ink-faint text-center py-4 italic">
                    Sem agendamentos
                  </p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
