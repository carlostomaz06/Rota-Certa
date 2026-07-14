import React, { useState, useEffect } from 'react';
import { Loja, Visita, Revisita } from '../types';
import { ArrowLeft, Edit3, Plus, MapPin, AlertTriangle, Clock, Check, Calendar, RefreshCw } from 'lucide-react';
import { fmtDateBR } from '../utils';

interface LojaDetailViewProps {
  lojaId: string;
  lojas: Loja[];
  visitas: Visita[];
  revisitas?: Revisita[];
  onNavigate: (view: string, param?: string) => void;
  onOpenLojaForm: (lojaId: string) => void;
  onOpenVisitaModal: (lojaId: string) => void;
  onViewPhoto: (photoUrl: string) => void;
}

// Stateful lazy loader for timeline photos
function TimelinePhotos({ visitaId, onViewPhoto }: { visitaId: string; onViewPhoto: (url: string) => void }) {
  const [photos, setPhotos] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(`fotos:${visitaId}`);
      if (stored) {
        setPhotos(JSON.parse(stored));
      }
    } catch (e) {
      console.error('Failed to parse photos for visita ' + visitaId, e);
    } finally {
      setLoading(false);
    }
  }, [visitaId]);

  if (loading) {
    return <span className="text-[11px] text-ink-faint animate-pulse">Carregando fotos...</span>;
  }

  if (photos.length === 0) return null;

  return (
    <div className="flex gap-2 mt-2.5 overflow-x-auto pb-1">
      {photos.map((src, index) => (
        <img
          key={index}
          src={src}
          onClick={() => onViewPhoto(src)}
          alt="Anexo de visita"
          className="w-16 h-16 object-cover rounded-lg border border-line cursor-pointer hover:scale-105 transition-all"
        />
      ))}
    </div>
  );
}

function RevisitaTimelinePhotos({ revisitaId, onViewPhoto }: { revisitaId: string; onViewPhoto: (url: string) => void }) {
  const [photos, setPhotos] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(`fotos_revisita:${revisitaId}`);
      if (stored) {
        setPhotos(JSON.parse(stored));
      }
    } catch (e) {
      console.error('Failed to parse photos for revisita ' + revisitaId, e);
    } finally {
      setLoading(false);
    }
  }, [revisitaId]);

  if (loading) {
    return <span className="text-[11px] text-ink-faint animate-pulse">Carregando fotos...</span>;
  }

  if (photos.length === 0) return null;

  return (
    <div className="flex gap-2 mt-2.5 overflow-x-auto pb-1">
      {photos.map((src, index) => (
        <img
          key={index}
          src={src}
          onClick={() => onViewPhoto(src)}
          alt="Anexo de revisita"
          className="w-16 h-16 object-cover rounded-lg border border-line cursor-pointer hover:scale-105 transition-all"
        />
      ))}
    </div>
  );
}

export default function LojaDetailView({
  lojaId,
  lojas,
  visitas,
  revisitas = [],
  onNavigate,
  onOpenLojaForm,
  onOpenVisitaModal,
  onViewPhoto,
}: LojaDetailViewProps) {
  const loja = lojas.find((l) => l.id === lojaId);

  if (!loja) {
    return (
      <div className="text-center py-12">
        <p className="text-ink-soft">Loja não encontrada.</p>
        <button
          onClick={() => onNavigate('lojas')}
          className="mt-4 px-4 py-2 bg-brand-accent text-white rounded-lg text-sm"
        >
          Voltar para Lojas
        </button>
      </div>
    );
  }

  // Combine standard visits and completed revisits into a single chronological timeline
  const storeVisits = visitas.filter((v) => v.lojaId === loja.id);
  const storeRevisitas = revisitas.filter((r) => r.lojaId === loja.id);

  // For visual indicators, get the historical standard visits sorted descending
  const history = [...storeVisits].sort((a, b) => (b.data + b.hora).localeCompare(a.data + a.hora));

  interface TimelineItem {
    id: string;
    type: 'visita' | 'revisita';
    usuario: string;
    data: string;
    hora: string;
    status: string;
    comentario: string;
    temFotos: boolean;
    gps?: { lat: number; lng: number } | null;
    pendencias?: string[];
    concluida?: boolean;
    dataPlanejada?: string;
    pontosMelhoria?: { descricao: string; corrigido: boolean }[];
    novasObservacoes?: string;
  }

  const timelineItems: TimelineItem[] = [
    ...storeVisits.map((v) => ({
      id: v.id,
      type: 'visita' as const,
      usuario: v.usuario,
      data: v.data,
      hora: v.hora,
      status: v.status || 'Visita Realizada',
      comentario: v.comentario || '',
      temFotos: !!v.temFotos,
      gps: v.gps,
      pendencias: v.pendencias || [],
    })),
    ...storeRevisitas.map((r) => ({
      id: r.id,
      type: 'revisita' as const,
      usuario: r.usuario,
      data: r.concluida ? (r.dataRealizada || r.dataPlanejada) : r.dataPlanejada,
      hora: r.concluida ? (r.horaRealizada || '00:00') : '00:00',
      status: r.concluida ? 'Revisita Concluída' : 'Revisita Agendada (Pendente)',
      comentario: r.concluida ? (r.novasObservacoes || '') : `Verificação de pendências pós visita original.`,
      temFotos: !!r.temFotos,
      concluida: r.concluida,
      dataPlanejada: r.dataPlanejada,
      pontosMelhoria: r.pontosMelhoria,
      novasObservacoes: r.novasObservacoes,
    })),
  ].sort((a, b) => (b.data + b.hora).localeCompare(a.data + a.hora));

  // Calculate status info
  const prazo = loja.prazo || 15;
  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);

  let status: 'ok' | 'atencao' | 'atrasada' | 'nunca' = 'nunca';
  let diasRestantes: number | null = null;
  let ultimaVisita: string | null = null;

  if (history.length > 0) {
    const ultima = history[0];
    ultimaVisita = ultima.data;
    
    const [y, m, d] = ultima.data.split('-').map(Number);
    const proximaDate = new Date(y, m - 1, d);
    proximaDate.setDate(proximaDate.getDate() + prazo);

    const diffTime = proximaDate.getTime() - hoje.getTime();
    diasRestantes = Math.round(diffTime / (1000 * 60 * 60 * 24));

    if (diasRestantes < 0) {
      status = 'atrasada';
    } else if (diasRestantes <= 3) {
      status = 'atencao';
    } else {
      status = 'ok';
    }
  }

  // Calculate percentage for visual tracker line
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

  const STATUS_LABELS = {
    ok: 'Em dia',
    atencao: 'Atenção',
    atrasada: 'Atrasada',
    nunca: 'Nunca visitada',
  };

  const mapUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
    `${loja.endereco}, ${loja.bairro}, ${loja.cidade} RJ`
  )}`;

  return (
    <div className="space-y-6">
      {/* Back Button */}
      <button
        onClick={() => onNavigate('lojas')}
        className="flex items-center gap-1.5 text-xs text-brand-accent font-bold hover:underline transition-all cursor-pointer"
      >
        <ArrowLeft className="w-3.5 h-3.5" />
        Voltar para Lojas
      </button>

      {/* Store Header Info */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="font-condensed font-extrabold text-3xl text-ink tracking-tight uppercase leading-none">
            {loja.nome}
          </h1>
          <p className="text-sm text-ink-soft mt-2.5">
            {loja.endereco}, {loja.bairro} — {loja.cidade}/{loja.estado} ·{' '}
            <span className="font-mono text-xs">{loja.codigo}</span> · Regional {loja.regional}
          </p>
        </div>
        <div className="flex flex-wrap gap-2.5">
          <button
            onClick={() => onOpenLojaForm(loja.id)}
            className="flex items-center justify-center gap-1.5 px-4 py-2 border-1.5 border-line rounded-lg text-xs font-semibold text-ink-soft bg-card hover:bg-paper hover:text-ink active:scale-95 transition-all shadow-xs"
          >
            <Edit3 className="w-3.5 h-3.5" />
            Editar Cadastro
          </button>
          <button
            onClick={() => onOpenVisitaModal(loja.id)}
            className="flex items-center justify-center gap-1.5 px-4.5 py-2.5 bg-brand-accent text-white font-semibold text-xs rounded-lg hover:bg-brand-accent/90 active:scale-95 transition-all shadow-md"
          >
            <Plus className="w-4 h-4 stroke-[2.5]" />
            Registrar Visita
          </button>
        </div>
      </div>

      {/* Main Grid: Details Tracker + Location Map */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Tracker Panel */}
        <div className="bg-card border border-line rounded-xl p-5 shadow-custom md:col-span-2 space-y-4">
          <div className="flex justify-between items-center gap-2">
            <span
              className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${
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
                ? 'Sem histórico'
                : diasRestantes !== null && diasRestantes < 0
                ? `${Math.abs(diasRestantes)} dia(s) de atraso`
                : `Próximo retorno em ${diasRestantes} dia(s)`}
            </span>
          </div>

          {/* Progress Route Track */}
          <div className="relative h-1.5 rounded-full routeline-bg overflow-visible">
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

          <div className="grid grid-cols-2 gap-4 pt-2">
            <div>
              <span className="text-[10px] uppercase font-bold text-ink-faint tracking-wider">
                Última Visita Realizada
              </span>
              <p className="text-sm font-bold text-ink mt-0.5">
                {ultimaVisita ? fmtDateBR(ultimaVisita) : 'Nenhuma registrada'}
              </p>
            </div>
            <div>
              <span className="text-[10px] uppercase font-bold text-ink-faint tracking-wider">
                Prazo de Retorno Requerido
              </span>
              <p className="text-sm font-bold text-ink mt-0.5">{prazo} dias</p>
            </div>
          </div>

          <div className="pt-2">
            <span className="text-[10px] uppercase font-bold text-ink-faint tracking-wider">
              Supervisor Responsável
            </span>
            <p className="text-sm font-semibold text-ink mt-0.5">{loja.supervisor || '—'}</p>
          </div>

          {loja.observacoes && (
            <div className="pt-2 border-t border-line">
              <span className="text-[10px] uppercase font-bold text-ink-faint tracking-wider">
                Observações de Roteiro
              </span>
              <p className="text-xs text-ink-soft mt-1 leading-relaxed bg-paper/30 p-2.5 rounded-lg border border-line/40">
                {loja.observacoes}
              </p>
            </div>
          )}
        </div>

        {/* Location & Quick Info Card */}
        <div className="bg-card border border-line rounded-xl p-5 shadow-custom flex flex-col justify-between">
          <div className="space-y-3.5">
            <h3 className="font-condensed text-lg font-bold text-ink uppercase tracking-wide">
              Geolocalização
            </h3>
            <p className="text-xs text-ink-soft leading-relaxed">
              Consulte a rota de entrega e localização física desta filial diretamente no Google Maps.
            </p>
          </div>

          <div className="space-y-4 pt-4">
            <a
              href={mapUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-1.5 w-full py-2.5 border-1.5 border-line rounded-lg text-xs font-bold text-brand-accent bg-card hover:bg-brand-accent-soft active:scale-95 transition-all shadow-xs"
            >
              <MapPin className="w-4 h-4" />
              Ver no Google Maps
            </a>

            <div className="text-[10.5px] text-ink-faint leading-normal bg-paper/20 p-2.5 rounded-lg border border-dashed border-line">
              Cadastro técnico de faturamento (CNPJ/IE) não listado neste painel operacional — consulte o cadastro centralizado da rede.
            </div>
          </div>
        </div>
      </div>

      {/* History Timeline of Visits and Revisits */}
      <div className="space-y-3">
        <h3 className="font-condensed text-lg font-bold text-ink uppercase tracking-wide">
          Linha do Tempo Operacional ({timelineItems.length})
        </h3>

        <div className="bg-card border border-line rounded-xl p-5 shadow-custom space-y-1">
          {timelineItems.length > 0 ? (
            <div className="relative border-l border-line pl-6 ml-3 space-y-6 py-2">
              {timelineItems.map((item) => {
                const isRevisita = item.type === 'revisita';
                const isOK = item.status && (item.status.startsWith('OK') || item.status.includes('Concluída'));
                const isClosed = item.status === 'Loja fechada / não atendeu';

                const statusDotColor = isRevisita
                  ? (item.concluida ? 'bg-indigo-600' : 'bg-slate-400')
                  : (isOK ? 'bg-brand-green' : isClosed ? 'bg-brand-red' : 'bg-brand-amber');

                const statusBadgeStyle = isRevisita
                  ? (item.concluida ? 'bg-indigo-50 text-indigo-700 border border-indigo-200' : 'bg-slate-100 text-slate-500 border border-slate-200')
                  : (isOK ? 'bg-brand-green-soft text-brand-green' : 'bg-brand-amber-soft text-brand-amber');

                return (
                  <div key={item.id} className="relative group">
                    {/* Timeline circle dot */}
                    <span
                      className={`absolute -left-[31px] top-1.5 w-2.5 h-2.5 rounded-full border-2 border-card ring-4 ring-card shadow-sm ${statusDotColor}`}
                    />

                    {/* Timeline Content */}
                    <div className="space-y-1.5">
                      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 text-xs">
                        <span className="font-bold text-ink text-sm group-hover:text-brand-accent transition-colors flex items-center gap-1.5">
                          {isRevisita && <RefreshCw className="w-3.5 h-3.5 text-indigo-600 animate-spin-slow" />}
                          {item.usuario}
                          {isRevisita && <span className="text-[10px] bg-indigo-100 text-indigo-700 px-1.5 py-0.2 rounded font-semibold uppercase">Revisita</span>}
                        </span>
                        <span className="font-mono text-ink-faint text-[11px]">
                          {fmtDateBR(item.data)} às {item.hora}
                        </span>
                      </div>

                      <div>
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${statusBadgeStyle}`}
                        >
                          {item.status || '—'}
                        </span>
                      </div>

                      {item.comentario && (
                        <p className="text-xs text-ink-soft leading-relaxed pr-2 pt-0.5">
                          {item.comentario}
                        </p>
                      )}

                      {/* Display checklists for visits or revisits */}
                      {!isRevisita && item.pendencias && item.pendencias.length > 0 && (
                        <div className="mt-1 text-xs bg-paper/50 rounded-lg p-2 border border-line/60 max-w-md">
                          <span className="font-bold text-ink-soft block mb-1">Pendências registradas para retorno:</span>
                          <ul className="list-disc list-inside space-y-0.5 text-ink-soft">
                            {item.pendencias.map((p, idx) => (
                              <li key={idx} className="truncate">• {p}</li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {isRevisita && item.pontosMelhoria && item.pontosMelhoria.length > 0 && (
                        <div className="mt-1 text-xs bg-paper/50 rounded-lg p-2 border border-line/60 max-w-md">
                          <span className="font-bold text-ink-soft block mb-1">Status das pendências na revisita:</span>
                          <ul className="space-y-1">
                            {item.pontosMelhoria.map((p, idx) => (
                              <li key={idx} className="flex items-center gap-1.5 text-ink-soft">
                                <span className={`w-1.5 h-1.5 rounded-full ${p.corrigido ? 'bg-brand-green' : 'bg-brand-red'}`} />
                                <span className={p.corrigido ? 'line-through text-ink-faint' : 'font-medium'}>
                                  {p.descricao}
                                </span>
                                <span className={`text-[9px] font-bold uppercase ml-auto px-1 rounded ${p.corrigido ? 'bg-brand-green-soft text-brand-green' : 'bg-brand-red-soft text-brand-red'}`}>
                                  {p.corrigido ? 'Resolvido' : 'Pendente'}
                                </span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {/* Display lazy loaded photos from local storage */}
                      {item.temFotos && (
                        isRevisita ? (
                          <RevisitaTimelinePhotos revisitaId={item.id} onViewPhoto={onViewPhoto} />
                        ) : (
                          <TimelinePhotos visitaId={item.id} onViewPhoto={onViewPhoto} />
                        )
                      )}

                      {/* GPS tracking coordinates map link */}
                      {item.gps && (
                        <a
                          href={`https://www.google.com/maps?q=${item.gps.lat},${item.gps.lng}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-[11px] font-bold text-brand-accent hover:underline mt-1 cursor-pointer"
                        >
                          <MapPin className="w-3 h-3" />
                          Localização registrada ({item.gps.lat.toFixed(5)}, {item.gps.lng.toFixed(5)})
                        </a>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-12 text-ink-soft flex flex-col items-center justify-center">
              <Calendar className="w-9 h-9 text-ink-faint mb-2.5 stroke-[1.5]" />
              <span className="text-xs font-semibold">Esta loja ainda não possui histórico operacional registrado.</span>
              <p className="text-[11px] text-ink-soft mt-1">
                Toque no botão "Registrar Visita" acima para salvar o primeiro relatório técnico.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
