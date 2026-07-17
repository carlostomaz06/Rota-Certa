import React from 'react';
import { Loja, Visita, Plano, Revisita } from '../types';
import { todayISO, startOfWeekISO, weekDaysFrom, fmtDateBR, fmtDateShort } from '../utils';
import DashboardChart from './DashboardChart';
import LojaMiniCard from './LojaMiniCard';
import { Store, Check, Clock, AlertTriangle, Calendar, Plus } from 'lucide-react';

interface DashboardViewProps {
  lojas: Loja[];
  visitas: Visita[];
  revisitas?: Revisita[];
  planos: Plano[];
  onNavigate: (view: string, param?: string) => void;
  onOpenVisitaModal: (lojaId?: string) => void;
}

export default function DashboardView({
  lojas,
  visitas,
  revisitas = [],
  planos,
  onNavigate,
  onOpenVisitaModal,
}: DashboardViewProps) {
  const hoje = todayISO();
  const monday = startOfWeekISO(hoje, 0);
  const weekDays = weekDaysFrom(monday);

  // Helper to compute status for each store
  const getStatusInfo = (loja: Loja) => {
    const standardVisits = visitas
      .filter((v) => v.lojaId === loja.id)
      .map((v) => ({ data: v.data, hora: v.hora }));

    const completedRevisitas = (revisitas || [])
      .filter((r) => r.lojaId === loja.id && r.concluida)
      .map((r) => ({ data: r.dataRealizada || r.dataPlanejada, hora: r.horaRealizada || '12:00' }));

    const allVisits = [...standardVisits, ...completedRevisitas].sort((a, b) =>
      (b.data + b.hora).localeCompare(a.data + a.hora)
    );

    const proximoPlano = planos
      .filter((p) => p.lojaId === loja.id && !p.concluido && p.data >= hoje)
      .sort((a, b) => a.data.localeCompare(b.data))[0];
    const proximaData = proximoPlano ? proximoPlano.data : null;

    if (allVisits.length === 0) {
      return { 
        status: 'nunca' as const, 
        diasRestantes: null, 
        ultimaVisita: null,
        proxima: proximaData 
      };
    }

    const ultima = allVisits[0];
    const prazo = loja.prazo || 15;
    const proximaDate = new Date(ultima.data);
    proximaDate.setDate(proximaDate.getDate() + prazo);
    
    // Calculate days between
    const tToday = new Date(hoje).getTime();
    const tProxima = proximaDate.getTime();
    const diffTime = tProxima - tToday;
    const dias = Math.round(diffTime / (1000 * 60 * 60 * 24));

    let status: 'ok' | 'atencao' | 'atrasada' = 'ok';
    if (dias < 0) {
      status = 'atrasada';
    } else if (dias <= 3) {
      status = 'atencao';
    }

    return {
      status,
      diasRestantes: dias,
      ultimaVisita: ultima.data,
      proxima: proximaData
    };
  };

  const statusList = lojas.map((l) => ({
    loja: l,
    ...getStatusInfo(l),
  }));

  const totalLojas = lojas.length;
  
  // Unique regionals count
  const regionaisSet = new Set(lojas.map((l) => l.regional).filter(Boolean));
  const regionaisCount = regionaisSet.size;

  // Visitadas na semana (incluindo revisitas concluídas)
  const visitedThisWeekIds = new Set([
    ...visitas.filter((v) => weekDays.includes(v.data)).map((v) => v.lojaId),
    ...revisitas.filter((r) => r.concluida && r.dataRealizada && weekDays.includes(r.dataRealizada)).map((r) => r.lojaId),
  ]);

  const totalVencidas = statusList.filter((s) => s.status === 'atrasada').length;
  const totalNunca = statusList.filter((s) => s.status === 'nunca').length;
  const totalPendentes = statusList.filter((s) => s.status === 'ok' || s.status === 'atencao' || s.status === 'nunca').length;

  const agendaHoje = planos.filter((p) => p.data === hoje);

  // Next required returns (warning/expired or scheduled in the future)
  const proximas = statusList
    .filter((s) => s.status === 'atrasada' || s.status === 'atencao' || s.proxima !== null)
    .sort((a, b) => {
      const targetA = a.proxima 
        ? new Date(a.proxima + 'T12:00:00').getTime() 
        : (a.diasRestantes !== null 
            ? new Date(hoje + 'T12:00:00').getTime() + (a.diasRestantes * 86400000) 
            : Infinity);
      const targetB = b.proxima 
        ? new Date(b.proxima + 'T12:00:00').getTime() 
        : (b.diasRestantes !== null 
            ? new Date(hoje + 'T12:00:00').getTime() + (b.diasRestantes * 86400000) 
            : Infinity);
      return targetA - targetB;
    })
    .slice(0, 6);

  // Counts for chart
  const chartCounts = {
    ok: statusList.filter((s) => s.status === 'ok').length,
    atencao: statusList.filter((s) => s.status === 'atencao').length,
    atrasada: totalVencidas,
    nunca: totalNunca,
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="font-condensed font-extrabold text-3xl text-ink tracking-tight uppercase leading-none">
            Painel Geral
          </h1>
          <p className="text-sm text-ink-soft mt-1.5">
            Visão geral de rotas e visitas agendadas para hoje — {fmtDateBR(hoje)}
          </p>
        </div>
        <button
          onClick={() => onOpenVisitaModal()}
          className="flex items-center justify-center gap-1.5 px-4.5 py-2.5 bg-brand-accent text-white font-semibold text-sm rounded-lg hover:bg-brand-accent/90 active:scale-95 transition-all shadow-md self-start sm:self-auto"
        >
          <Plus className="w-4 h-4 stroke-[2.5]" />
          Registrar Visita
        </button>
      </div>

      {/* Stats Indicators Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Stores */}
        <div className="bg-card border border-line rounded-xl p-4.5 shadow-custom flex flex-col justify-between h-[125px]">
          <div className="flex justify-between items-start">
            <span className="text-[11.5px] font-bold text-ink-soft uppercase tracking-wider">
              Lojas Cadastradas
            </span>
            <div className="p-2 rounded-lg bg-brand-accent-soft text-brand-accent">
              <Store className="w-5 h-5" />
            </div>
          </div>
          <div>
            <div className="font-condensed font-extrabold text-4xl text-ink leading-none">
              {totalLojas}
            </div>
            <p className="text-[11.5px] text-ink-faint mt-1">Em {regionaisCount} regionais de atendimento</p>
          </div>
        </div>

        {/* Visited this Week */}
        <div className="bg-card border border-line rounded-xl p-4.5 shadow-custom flex flex-col justify-between h-[125px]">
          <div className="flex justify-between items-start">
            <span className="text-[11.5px] font-bold text-ink-soft uppercase tracking-wider">
              Visitadas na Semana
            </span>
            <div className="p-2 rounded-lg bg-brand-green-soft text-brand-green">
              <Check className="w-5 h-5" />
            </div>
          </div>
          <div>
            <div className="font-condensed font-extrabold text-4xl text-ink leading-none">
              {visitedThisWeekIds.size}
            </div>
            <p className="text-[11.5px] text-ink-faint mt-1">
              de {totalLojas} lojas ({fmtDateShort(monday)} a {fmtDateShort(weekDays[6])})
            </p>
          </div>
        </div>

        {/* Pending returns */}
        <div className="bg-card border border-line rounded-xl p-4.5 shadow-custom flex flex-col justify-between h-[125px]">
          <div className="flex justify-between items-start">
            <span className="text-[11.5px] font-bold text-ink-soft uppercase tracking-wider">
              Lojas Pendentes
            </span>
            <div className="p-2 rounded-lg bg-brand-amber-soft text-brand-amber">
              <Clock className="w-5 h-5" />
            </div>
          </div>
          <div>
            <div className="font-condensed font-extrabold text-4xl text-ink leading-none">
              {totalPendentes}
            </div>
            <p className="text-[11.5px] text-ink-faint mt-1">
              {totalNunca} lojas nunca visitadas anteriormente
            </p>
          </div>
        </div>

        {/* Delayed visits */}
        <div className="bg-card border border-line rounded-xl p-4.5 shadow-custom flex flex-col justify-between h-[125px]">
          <div className="flex justify-between items-start">
            <span className="text-[11.5px] font-bold text-ink-soft uppercase tracking-wider">
              Retornos Atrasados
            </span>
            <div className="p-2 rounded-lg bg-brand-red-soft text-brand-red">
              <AlertTriangle className="w-5 h-5" />
            </div>
          </div>
          <div>
            <div className="font-condensed font-extrabold text-4xl text-ink leading-none">
              {totalVencidas}
            </div>
            <p className="text-[11.5px] text-ink-faint mt-1">Excederam o prazo máximo estabelecido</p>
          </div>
        </div>
      </div>

      {/* Row with chart and alerts list */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Status distribution chart */}
        <div className="bg-card border border-line rounded-xl p-5 shadow-custom">
          <h3 className="font-condensed text-lg font-bold text-ink uppercase tracking-wide">
            Distribuição Geral da Rota
          </h3>
          <p className="text-xs text-ink-soft mb-4">Situação atual de visitação de toda a carteira</p>
          <div className="h-[220px]">
            <DashboardChart
              ok={chartCounts.ok}
              atencao={chartCounts.atencao}
              atrasada={chartCounts.atrasada}
              nunca={chartCounts.nunca}
            />
          </div>
        </div>

        {/* Agenda / alerts side list */}
        <div className="bg-card border border-line rounded-xl p-5 shadow-custom flex flex-col justify-between">
          <div>
            <h3 className="font-condensed text-lg font-bold text-ink uppercase tracking-wide mb-3">
              Cronograma &amp; Alertas Próximos
            </h3>

            <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1">
              {/* Agenda items for today and upcoming days */}
              {planos
                .filter((p) => p.data >= hoje && !p.concluido)
                .sort((a, b) => a.data.localeCompare(b.data))
                .slice(0, 10)
                .map((p) => {
                  const l = lojas.find((x) => x.id === p.lojaId);
                  const isHoje = p.data === hoje;
                  // Calculate if date is tomorrow
                  const nextDay = new Date(new Date(hoje + 'T12:00:00').getTime() + 86400000).toISOString().split('T')[0];
                  const isAmanha = p.data === nextDay;
                  
                  let dateLabel = fmtDateBR(p.data);
                  if (isHoje) dateLabel = 'Hoje';
                  else if (isAmanha) dateLabel = 'Amanhã';

                  return (
                    <div
                      key={p.id}
                      className={`flex items-start gap-3 px-3.5 py-2.5 rounded-lg text-xs border ${
                        isHoje
                          ? 'bg-brand-accent-soft text-brand-accent border-brand-accent/10'
                          : 'bg-paper/40 text-ink-soft border-line/40'
                      }`}
                    >
                      <Calendar className="w-4 h-4 flex-shrink-0 mt-0.5" />
                      <div className="flex-1 min-w-0">
                        <div className="flex justify-between items-start gap-1">
                          <span className="font-bold text-ink truncate">
                            {l?.nome || 'Loja desconhecida'}
                          </span>
                          <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-sm uppercase ${isHoje ? 'bg-brand-accent text-white' : 'bg-line text-ink-soft'}`}>
                            {dateLabel}
                          </span>
                        </div>
                        <p className="text-[11px] mt-0.5 text-ink-soft">
                          Supervisor: <span className="font-semibold text-ink">{p.usuario}</span>
                        </p>
                        {p.obs && (
                          <p className="text-[10.5px] text-ink-faint mt-0.5 truncate italic">
                            &ldquo;{p.obs}&rdquo;
                          </p>
                        )}
                      </div>
                    </div>
                  );
                })}

              {/* Delayed store items */}
              {statusList
                .filter((s) => s.status === 'atrasada')
                .slice(0, 4)
                .map((s) => (
                  <div
                    key={s.loja.id}
                    className="flex items-center gap-3 px-3.5 py-2.5 rounded-lg text-xs bg-brand-red-soft text-brand-red border border-brand-red/10"
                  >
                    <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                    <div className="flex-1 min-w-0 truncate">
                      <span className="font-bold">{s.loja.nome}</span> está atrasada há{' '}
                      <span className="font-bold">{Math.abs(s.diasRestantes || 0)}</span> dia(s)
                    </div>
                  </div>
                ))}

              {/* Warning store items */}
              {statusList
                .filter((s) => s.status === 'atencao')
                .slice(0, 3)
                .map((s) => (
                  <div
                    key={s.loja.id}
                    className="flex items-center gap-3 px-3.5 py-2.5 rounded-lg text-xs bg-brand-amber-soft text-brand-amber border border-brand-amber/10"
                  >
                    <Clock className="w-4 h-4 flex-shrink-0" />
                    <div className="flex-1 min-w-0 truncate">
                      <span className="font-bold">{s.loja.nome}</span> requer retorno em{' '}
                      <span className="font-bold">{s.diasRestantes}</span> dia(s)
                    </div>
                  </div>
                ))}

              {/* Empty state when everything is perfect */}
              {agendaHoje.length === 0 &&
                totalVencidas === 0 &&
                statusList.filter((s) => s.status === 'atencao').length === 0 && (
                  <div className="flex flex-col items-center justify-center py-10 text-ink-soft">
                    <Check className="w-8 h-8 text-brand-green mb-2" />
                    <span className="text-xs font-semibold">Toda a carteira de rotas está em dia!</span>
                  </div>
                )}
            </div>
          </div>

          <div className="pt-4 border-t border-line mt-4">
            <button
              onClick={() => onNavigate('planejamento')}
              className="text-xs text-brand-accent font-bold hover:underline inline-flex items-center gap-1"
            >
              Acessar planejamento semanal →
            </button>
          </div>
        </div>
      </div>

      {/* Next required store visits */}
      <div>
        <h3 className="font-condensed text-lg font-bold text-ink uppercase tracking-wide mb-3">
          Próximos Retornos Requeridos
        </h3>
        {proximas.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {proximas.map((s) => (
              <LojaMiniCard
                key={s.loja.id}
                loja={s.loja}
                statusInfo={{
                  status: s.status,
                  diasRestantes: s.diasRestantes,
                  ultimaVisita: s.ultimaVisita,
                  proxima: s.proxima,
                }}
                onClick={() => onNavigate('loja-detalhe', s.loja.id)}
              />
            ))}
          </div>
        ) : (
          <div className="bg-card border border-line rounded-xl p-10 text-center text-ink-soft shadow-custom flex flex-col items-center justify-center">
            <Store className="w-10 h-10 text-ink-faint mb-2 stroke-[1.5]" />
            <span className="text-sm font-semibold">Nenhuma visita registrada em sua base de dados ainda.</span>
            <p className="text-xs text-ink-soft mt-1">Inicie cadastrando lojas ou registrando novas visitas!</p>
          </div>
        )}
      </div>
    </div>
  );
}
