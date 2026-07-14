import React, { useState } from 'react';
import { Loja, Visita, User, Plano, Revisita } from '../types';
import { todayISO, fmtDateBR } from '../utils';
import {
  FileText,
  Download,
  Printer,
  Search,
  RefreshCw,
  Calendar,
  Check,
  AlertTriangle,
  MapPin,
  Eye,
  Trash2,
  ListChecks,
  Clock,
  ExternalLink
} from 'lucide-react';
import * as XLSX from 'xlsx';

interface RelatoriosViewProps {
  visitas: Visita[];
  planos: Plano[];
  revisitas?: Revisita[];
  lojas: Loja[];
  users: User[];
  toast: (msg: string) => void;
  activeTab?: 'realizadas' | 'planejadas' | 'revisitas' | 'historico';
  onChangeTab?: (tab: 'realizadas' | 'planejadas' | 'revisitas' | 'historico') => void;
  onExcluirVisita?: (id: string) => void;
  onExcluirPlano?: (id: string) => void;
  onConcluirPlano?: (id: string) => void;
  onOpenRevisitaModal?: (revisita: Revisita) => void;
  onExcluirRevisita?: (id: string) => void;
  onViewPhoto?: (url: string) => void;
  onOpenVisitaModal?: (lojaId?: string, planoId?: string) => void;
}

// Lazy photos loader helper for Visits
function VisitaPhotosRenderer({ visitaId, initialPhotos, onViewPhoto }: { visitaId: string; initialPhotos?: string[]; onViewPhoto: (url: string) => void }) {
  const [photos, setPhotos] = useState<string[]>(initialPhotos || []);
  React.useEffect(() => {
    if (initialPhotos && initialPhotos.length > 0) {
      setPhotos(initialPhotos);
      return;
    }
    try {
      const stored = localStorage.getItem(`fotos:${visitaId}`);
      if (stored) {
        setPhotos(JSON.parse(stored));
      }
    } catch (e) {
      console.error(e);
    }
  }, [visitaId, initialPhotos]);

  if (photos.length === 0) return null;

  return (
    <div className="flex gap-1.5 overflow-x-auto pb-1 mt-1.5">
      {photos.map((src, index) => (
        <img
          key={index}
          src={src}
          onClick={() => onViewPhoto(src)}
          className="w-12 h-12 object-cover rounded-lg border border-line cursor-pointer hover:scale-105 transition-all shadow-xs"
          alt="Anexo visita"
        />
      ))}
    </div>
  );
}

// Lazy photos loader helper for Revisits
function RevisitaPhotosRenderer({ revisitaId, initialPhotos, onViewPhoto }: { revisitaId: string; initialPhotos?: string[]; onViewPhoto: (url: string) => void }) {
  const [photos, setPhotos] = useState<string[]>(initialPhotos || []);
  React.useEffect(() => {
    if (initialPhotos && initialPhotos.length > 0) {
      setPhotos(initialPhotos);
      return;
    }
    try {
      const stored = localStorage.getItem(`fotos_revisita:${revisitaId}`);
      if (stored) {
        setPhotos(JSON.parse(stored));
      }
    } catch (e) {
      console.error(e);
    }
  }, [revisitaId, initialPhotos]);

  if (photos.length === 0) return null;

  return (
    <div className="flex gap-1.5 overflow-x-auto pb-1 mt-1.5">
      {photos.map((src, index) => (
        <img
          key={index}
          src={src}
          onClick={() => onViewPhoto(src)}
          className="w-12 h-12 object-cover rounded-lg border border-line cursor-pointer hover:scale-105 transition-all shadow-xs"
          alt="Anexo revisita"
        />
      ))}
    </div>
  );
}

export default function RelatoriosView({
  visitas,
  planos = [],
  revisitas = [],
  lojas,
  users,
  toast,
  activeTab: propActiveTab,
  onChangeTab,
  onExcluirVisita,
  onExcluirPlano,
  onConcluirPlano,
  onOpenRevisitaModal,
  onExcluirRevisita,
  onViewPhoto,
  onOpenVisitaModal
}: RelatoriosViewProps) {
  // Navigation Tabs matching step 6 of requirements
  const [localActiveTab, setLocalActiveTab] = useState<'realizadas' | 'planejadas' | 'revisitas' | 'historico'>('realizadas');
  const activeTab = propActiveTab || localActiveTab;
  const setActiveTab = onChangeTab || setLocalActiveTab;

  // Filters for Realizadas & Planejadas tabs
  const [de, setDe] = useState('');
  const [ate, setAte] = useState('');
  const [usuario, setUsuario] = useState('');
  const [regional, setRegional] = useState('');

  // Revisit filters
  const [revisitaStatus, setRevisitaStatus] = useState<'todos' | 'pendentes' | 'concluidos'>('pendentes');

  // Search filter for Histórico da Loja tab
  const [buscaLoja, setBuscaLoja] = useState('');
  const [selectedHistoryLojaId, setSelectedHistoryLojaId] = useState<string>('');

  // Extract unique regionals list
  const regionais = Array.from(new Set(lojas.map((l) => l.regional).filter(Boolean))).sort();

  // Excel Export logic using SheetJS
  const exportarExcel = () => {
    let dataToExport: any[] = [];
    let sheetName = 'Relatório';

    if (activeTab === 'realizadas') {
      sheetName = 'Visitas e Revisitas Realizadas';
      dataToExport = getFilteredRealizadas().map((v) => {
        const l = lojas.find((x) => x.id === v.lojaId);
        return {
          Tipo: v.type === 'revisita' ? 'Revisita' : 'Visita',
          Loja: l ? l.nome : '—',
          Código: l ? l.codigo : '—',
          Regional: l ? l.regional : '—',
          Cidade: l ? l.cidade : '—',
          Data: fmtDateBR(v.data),
          Hora: v.hora,
          Responsável: v.usuario,
          Status: v.status || '—',
          Comentários: v.comentario || '—',
          'Fotos Anexas': v.temFotos ? 'Sim' : 'Não',
          GPS: v.gps ? `${v.gps.lat.toFixed(5)}, ${v.gps.lng.toFixed(5)}` : '—'
        };
      });
    } else if (activeTab === 'planejadas') {
      sheetName = 'Visitas Planejadas';
      dataToExport = getFilteredPlanos().map((p) => {
        const l = lojas.find((x) => x.id === p.lojaId);
        return {
          Loja: l ? l.nome : '—',
          Código: l ? l.codigo : '—',
          Regional: l ? l.regional : '—',
          Cidade: l ? l.cidade : '—',
          'Data Planejada': fmtDateBR(p.data),
          Responsável: p.usuario,
          Status: p.concluido ? 'Realizada' : 'Pendente',
          Observações: p.obs || '—'
        };
      });
    } else if (activeTab === 'revisitas') {
      sheetName = 'Revisitas Técnicas';
      dataToExport = getFilteredRevisitas().map((r) => {
        const l = lojas.find((x) => x.id === r.lojaId);
        return {
          Loja: l ? l.nome : '—',
          Código: l ? l.codigo : '—',
          Regional: l ? l.regional : '—',
          Cidade: l ? l.cidade : '—',
          'Data Planejada': fmtDateBR(r.dataPlanejada),
          'Data Realizada': r.dataRealizada ? fmtDateBR(r.dataRealizada) : 'Pendente',
          Responsável: r.usuario,
          Status: r.concluida ? 'Concluída' : 'Pendente',
          'Desvios Originais': r.observacoesOriginais || '—',
          'Notas de Retorno': r.novasObservacoes || '—',
          'Pendências Resolvidas': r.pontosMelhoria.filter((p) => p.corrigido).map((p) => p.descricao).join('; ') || 'Nenhuma',
          'Pendências Pendentes': r.pontosMelhoria.filter((p) => !p.corrigido).map((p) => p.descricao).join('; ') || 'Nenhuma'
        };
      });
    }

    if (dataToExport.length === 0) {
      toast('Nenhum registro para exportar com os filtros atuais.');
      return;
    }

    const ws = XLSX.utils.json_to_sheet(dataToExport);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, sheetName);
    XLSX.writeFile(wb, `relatorio_${activeTab}_${todayISO()}.xlsx`);
    toast('Relatório Excel baixado com sucesso!');
  };

  const handlePrint = () => {
    window.print();
  };

  // Filter builders for standard visits and completed revisits combined
  const getFilteredRealizadas = () => {
    const combined: any[] = [];
    
    // Add standard visits
    visitas.forEach((v) => {
      combined.push({
        id: v.id,
        lojaId: v.lojaId,
        data: v.data,
        hora: v.hora,
        usuario: v.usuario,
        status: v.status || 'OK',
        comentario: v.comentario || '',
        temFotos: !!v.temFotos,
        gps: v.gps || null,
        pendenciasCount: v.pendencias ? v.pendencias.length : 0,
        type: 'visita',
        fotos: v.fotos || [],
      });
    });

    // Add completed revisits
    revisitas.forEach((r) => {
      if (r.concluida && r.dataRealizada) {
        combined.push({
          id: r.id,
          lojaId: r.lojaId,
          data: r.dataRealizada,
          hora: r.horaRealizada || '00:00',
          usuario: r.usuario,
          status: 'REVISITA CONCLUÍDA',
          comentario: r.novasObservacoes || 'Revisita de pendências finalizada.',
          temFotos: !!r.temFotos,
          gps: null,
          pendenciasCount: r.pontosMelhoria ? r.pontosMelhoria.filter((p) => !p.corrigido).length : 0,
          type: 'revisita',
          fotos: r.fotos || [],
        });
      }
    });

    // Apply filters
    let list = combined;
    if (de) list = list.filter((v) => v.data >= de);
    if (ate) list = list.filter((v) => v.data <= ate);
    if (usuario) {
      list = list.filter((v) => v.usuario.toLowerCase().includes(usuario.toLowerCase()));
    }
    if (regional) {
      list = list.filter((v) => {
        const l = lojas.find((x) => x.id === v.lojaId);
        return l && l.regional === regional;
      });
    }

    return list.sort((a, b) => (b.data + b.hora).localeCompare(a.data + a.hora));
  };

  // Filter builders for planned visits (excluding completed ones as they are now in realized)
  const getFilteredPlanos = () => {
    let list = planos.filter((p) => !p.concluido);
    if (de) list = list.filter((v) => v.data >= de);
    if (ate) list = list.filter((v) => v.data <= ate);
    if (usuario) {
      list = list.filter((v) => v.usuario.toLowerCase().includes(usuario.toLowerCase()));
    }
    if (regional) {
      list = list.filter((v) => {
        const l = lojas.find((x) => x.id === v.lojaId);
        return l && l.regional === regional;
      });
    }
    return list.sort((a, b) => b.data.localeCompare(a.data));
  };

  // Filter builders for revisits
  const getFilteredRevisitas = () => {
    let list = [...revisitas];
    if (revisitaStatus === 'pendentes') {
      list = list.filter((r) => !r.concluida);
    } else if (revisitaStatus === 'concluidos') {
      list = list.filter((r) => r.concluida);
    }

    if (de) list = list.filter((v) => (v.dataRealizada || v.dataPlanejada) >= de);
    if (ate) list = list.filter((v) => (v.dataRealizada || v.dataPlanejada) <= ate);
    if (usuario) {
      list = list.filter((v) => v.usuario.toLowerCase().includes(usuario.toLowerCase()));
    }
    if (regional) {
      list = list.filter((v) => {
        const l = lojas.find((x) => x.id === v.lojaId);
        return l && l.regional === regional;
      });
    }
    return list.sort((a, b) => b.dataPlanejada.localeCompare(a.dataPlanejada));
  };

  // Search stores for "Histórico da Loja" dossier
  const getLojasList = () => {
    if (!buscaLoja) return lojas;
    const term = buscaLoja.toLowerCase();
    return lojas.filter(
      (l) =>
        l.nome.toLowerCase().includes(term) ||
        l.codigo.toLowerCase().includes(term) ||
        l.filial.includes(term)
    );
  };

  const selectedHistoryLoja = lojas.find((l) => l.id === selectedHistoryLojaId);

  // Combine and sort chronological timeline for a specific store
  const getSelectedStoreTimeline = (lojaId: string) => {
    const sVisits = visitas.filter((v) => v.lojaId === lojaId);
    const sRevisitas = revisitas.filter((r) => r.lojaId === lojaId);

    const mappedVisits = sVisits.map((v) => ({
      id: v.id,
      type: 'visita' as const,
      usuario: v.usuario,
      data: v.data,
      hora: v.hora,
      status: v.status || 'Visita Realizada',
      comentario: v.comentario || '',
      temFotos: !!v.temFotos,
      gps: v.gps || null,
      pendencias: v.pendencias || [],
      concluida: true,
      pontosMelhoria: [] as { descricao: string; corrigido: boolean }[],
      dataPlanejada: v.data,
      fotos: v.fotos || []
    }));

    const mappedRevisitas = sRevisitas.map((r) => ({
      id: r.id,
      type: 'revisita' as const,
      usuario: r.usuario,
      data: r.concluida ? (r.dataRealizada || r.dataPlanejada) : r.dataPlanejada,
      hora: r.concluida ? (r.horaRealizada || '00:00') : '00:00',
      status: r.concluida ? 'Revisita Concluída' : 'Revisita Agendada (Pendente)',
      comentario: r.concluida ? (r.novasObservacoes || '') : 'Retorno para auditoria de desvios e conformidade.',
      temFotos: !!r.temFotos,
      gps: null as { lat: number; lng: number } | null,
      pendencias: [] as string[],
      concluida: !!r.concluida,
      pontosMelhoria: r.pontosMelhoria || [],
      dataPlanejada: r.dataPlanejada,
      fotos: r.fotos || []
    }));

    return [...mappedVisits, ...mappedRevisitas].sort((a, b) =>
      (b.data + b.hora).localeCompare(a.data + a.hora)
    );
  };

  return (
    <div className="space-y-5">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="font-condensed font-extrabold text-3xl text-ink tracking-tight uppercase leading-none">
            Relatórios e Fluxo de Visitas
          </h1>
          <p className="text-sm text-ink-soft mt-1.5 no-print">
            Audite as auditorias planejadas, execute as revisitas operacionais e visualize dossiês completos por filial.
          </p>
        </div>
        <div className="flex flex-wrap gap-2 no-print">
          {activeTab !== 'historico' && (
            <button
              onClick={exportarExcel}
              className="flex items-center justify-center gap-1.5 px-4 py-2 border border-line rounded-lg text-xs font-bold text-ink bg-card hover:bg-paper transition-all shadow-xs cursor-pointer active:scale-95"
            >
              <Download className="w-4 h-4" />
              Exportar Excel
            </button>
          )}
          <button
            onClick={handlePrint}
            className="flex items-center justify-center gap-1.5 px-4.5 py-2.5 bg-brand-accent text-white font-bold text-xs rounded-lg hover:bg-brand-accent/90 transition-all shadow-md cursor-pointer active:scale-95"
          >
            <Printer className="w-4 h-4" />
            Imprimir Relatório
          </button>
        </div>
      </div>

      {/* Main Tabs Navigation */}
      <div className="flex bg-card p-1 rounded-xl border border-line max-w-2xl no-print shadow-xs overflow-x-auto">
        <button
          onClick={() => setActiveTab('realizadas')}
          className={`whitespace-nowrap py-2 px-3.5 rounded-lg text-xs font-extrabold uppercase tracking-wide transition-all cursor-pointer ${
            activeTab === 'realizadas'
              ? 'bg-brand-accent text-white shadow-xs'
              : 'text-ink-soft hover:text-ink'
          }`}
        >
          ✅ Realizadas ({visitas.length + revisitas.filter((r) => r.concluida).length})
        </button>
        <button
          onClick={() => setActiveTab('planejadas')}
          className={`whitespace-nowrap py-2 px-3.5 rounded-lg text-xs font-extrabold uppercase tracking-wide transition-all cursor-pointer ${
            activeTab === 'planejadas'
              ? 'bg-brand-accent text-white shadow-xs'
              : 'text-ink-soft hover:text-ink'
          }`}
        >
          📅 Planejadas ({planos.filter((p) => !p.concluido).length})
        </button>
        <button
          onClick={() => setActiveTab('revisitas')}
          className={`whitespace-nowrap py-2 px-3.5 rounded-lg text-xs font-extrabold uppercase tracking-wide transition-all cursor-pointer ${
            activeTab === 'revisitas'
              ? 'bg-brand-accent text-white shadow-xs'
              : 'text-ink-soft hover:text-ink'
          }`}
        >
          🔄 Revisitas ({revisitas.filter((r) => !r.concluida).length})
        </button>
        <button
          onClick={() => setActiveTab('historico')}
          className={`whitespace-nowrap py-2 px-3.5 rounded-lg text-xs font-extrabold uppercase tracking-wide transition-all cursor-pointer ${
            activeTab === 'historico'
              ? 'bg-brand-accent text-white shadow-xs'
              : 'text-ink-soft hover:text-ink'
          }`}
        >
          📚 Histórico da Loja
        </button>
      </div>

      {/* Filter Form (Invisible on print, hidden for Dossier/History tab) */}
      {activeTab !== 'historico' && (
        <div className="bg-card border border-line rounded-xl p-4.5 shadow-custom grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3 no-print">
          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-bold text-ink-soft uppercase tracking-wider">
              Data Inicial
            </label>
            <input
              type="date"
              value={de}
              onChange={(e) => setDe(e.target.value)}
              className="px-3 py-1.5 border border-line rounded-lg text-xs outline-none focus:border-brand-accent bg-paper/20 text-ink"
            />
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-bold text-ink-soft uppercase tracking-wider">
              Data Final
            </label>
            <input
              type="date"
              value={ate}
              onChange={(e) => setAte(e.target.value)}
              className="px-3 py-1.5 border border-line rounded-lg text-xs outline-none focus:border-brand-accent bg-paper/20 text-ink"
            />
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-bold text-ink-soft uppercase tracking-wider">
              Supervisor / Auditor
            </label>
            <select
              value={usuario}
              onChange={(e) => setUsuario(e.target.value)}
              className="px-3 py-1.5 border border-line rounded-lg text-xs outline-none focus:border-brand-accent bg-card text-ink"
            >
              <option value="">Todos</option>
              {users.map((u) => (
                <option key={u.id} value={u.nome}>
                  {u.nome}
                </option>
              ))}
            </select>
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-bold text-ink-soft uppercase tracking-wider">
              Regional
            </label>
            <select
              value={regional}
              onChange={(e) => setRegional(e.target.value)}
              className="px-3 py-1.5 border border-line rounded-lg text-xs outline-none focus:border-brand-accent bg-card text-ink"
            >
              <option value="">Todas</option>
              {regionais.map((reg) => (
                <option key={reg} value={reg}>
                  Regional {reg}
                </option>
              ))}
            </select>
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-bold text-ink-soft uppercase tracking-wider">
              Status Específico
            </label>
            {activeTab === 'revisitas' ? (
              <select
                value={revisitaStatus}
                onChange={(e: any) => setRevisitaStatus(e.target.value)}
                className="px-3 py-1.5 border border-line rounded-lg text-xs outline-none focus:border-brand-accent bg-card text-ink"
              >
                <option value="todos">Todas as Revisitas</option>
                <option value="pendentes">Pendentes (Em Aberto)</option>
                <option value="concluidos">Finalizadas</option>
              </select>
            ) : (
              <div className="text-xs text-ink-faint italic px-3 py-2 bg-paper/30 border border-line rounded-lg">
                Filtro automático
              </div>
            )}
          </div>
        </div>
      )}

      {/* Tab Contents */}

      {/* 1. VISITAS REALIZADAS */}
      {activeTab === 'realizadas' && (
        <div className="bg-card border border-line rounded-xl overflow-hidden shadow-custom">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-paper border-b border-line text-ink-soft font-bold uppercase tracking-wider text-[10px]">
                  <th className="p-3">Loja / Filial</th>
                  <th className="p-3">Reg.</th>
                  <th className="p-3">Data</th>
                  <th className="p-3">Responsável</th>
                  <th className="p-3">Tipo / Status</th>
                  <th className="p-3 max-w-[200px]">Comentários / Fotos</th>
                  <th className="p-3 text-right no-print">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line text-ink leading-relaxed">
                {getFilteredRealizadas().length > 0 ? (
                  getFilteredRealizadas().map((v) => {
                    const l = lojas.find((x) => x.id === v.lojaId);
                    return (
                      <tr key={v.id} className="hover:bg-paper/25 transition-colors">
                        <td className="p-3">
                          <span className="font-bold block">{l ? l.nome : '—'}</span>
                          <span className="text-[10.5px] text-ink-faint font-mono font-medium block mt-0.5">
                            {l ? l.codigo : '—'}
                          </span>
                        </td>
                        <td className="p-3 text-ink-soft font-semibold">{l ? l.regional : '—'}</td>
                        <td className="p-3 font-medium whitespace-nowrap">
                          {fmtDateBR(v.data)} <span className="text-ink-faint text-[10.5px]">às {v.hora}</span>
                        </td>
                        <td className="p-3 font-semibold text-brand-navy">{v.usuario}</td>
                        <td className="p-3">
                          <div className="flex flex-col gap-1 items-start">
                            <span className={`inline-flex px-2 py-0.5 rounded-full text-[9px] font-extrabold uppercase tracking-wide ${
                              v.type === 'revisita'
                                ? 'bg-indigo-50 border border-indigo-200 text-indigo-700'
                                : 'bg-brand-green-soft text-brand-green'
                            }`}>
                              {v.type === 'revisita' ? 'Revisita' : 'Visita'}
                            </span>
                            <span className="text-[10px] text-ink-soft font-bold uppercase tracking-wide">
                              {v.status || 'OK'}
                            </span>
                          </div>
                        </td>
                        <td className="p-3 max-w-[280px]">
                          <p className="text-ink-soft font-medium text-xs truncate-2-lines break-words">
                            {v.comentario || <span className="text-ink-faint italic">Sem observações</span>}
                          </p>
                          {v.pendenciasCount > 0 && (
                            <div className="mt-1 flex flex-wrap gap-1">
                              <span className="text-[9px] bg-brand-red-soft text-brand-red px-1 rounded font-bold uppercase tracking-wider">
                                {v.pendenciasCount} {v.type === 'revisita' ? 'Desvios Pendentes' : 'Pendências'}
                              </span>
                            </div>
                          )}
                          {v.temFotos && onViewPhoto && (
                            v.type === 'revisita' ? (
                              <RevisitaPhotosRenderer revisitaId={v.id} initialPhotos={v.fotos} onViewPhoto={onViewPhoto} />
                            ) : (
                              <VisitaPhotosRenderer visitaId={v.id} initialPhotos={v.fotos} onViewPhoto={onViewPhoto} />
                            )
                          )}
                        </td>
                        <td className="p-3 text-right whitespace-nowrap no-print">
                          <div className="flex items-center justify-end gap-1.5">
                            {v.type === 'revisita' ? (
                              onExcluirRevisita && (
                                <button
                                  onClick={() => onExcluirRevisita(v.id)}
                                  className="p-1.5 border border-brand-red text-brand-red bg-card hover:bg-brand-red-soft rounded-lg transition-colors cursor-pointer"
                                  title="Excluir revisita realizada"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              )
                            ) : (
                              onExcluirVisita && (
                                <button
                                  onClick={() => onExcluirVisita(v.id)}
                                  className="p-1.5 border border-brand-red text-brand-red bg-card hover:bg-brand-red-soft rounded-lg transition-colors cursor-pointer"
                                  title="Excluir visita realizada"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              )
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={7} className="p-12 text-center text-ink-soft">
                      <div className="flex flex-col items-center justify-center">
                        <Search className="w-8 h-8 text-ink-faint mb-2 stroke-[1.5]" />
                        <span className="text-xs font-semibold">Nenhuma visita ou revisita realizada encontrada com estes filtros.</span>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 2. VISITAS PLANEJADAS */}
      {activeTab === 'planejadas' && (
        <div className="bg-card border border-line rounded-xl overflow-hidden shadow-custom">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-paper border-b border-line text-ink-soft font-bold uppercase tracking-wider text-[10px]">
                  <th className="p-3">Loja / Filial</th>
                  <th className="p-3">Reg.</th>
                  <th className="p-3">Data Agendada</th>
                  <th className="p-3">Responsável</th>
                  <th className="p-3 max-w-[200px]">Objetivo / Obs</th>
                  <th className="p-3 text-right no-print">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line text-ink leading-relaxed">
                {getFilteredPlanos().length > 0 ? (
                  getFilteredPlanos().map((p) => {
                    const l = lojas.find((x) => x.id === p.lojaId);
                    return (
                      <tr 
                        key={p.id} 
                        className="hover:bg-paper/25 transition-colors cursor-pointer"
                        onClick={() => onOpenVisitaModal && onOpenVisitaModal(p.lojaId, p.id)}
                      >
                        <td className="p-3">
                          <span className="font-bold block">{l ? l.nome : '—'}</span>
                          <span className="text-[10.5px] text-ink-faint font-mono font-medium block mt-0.5">
                            {l ? l.codigo : '—'}
                          </span>
                        </td>
                        <td className="p-3 text-ink-soft font-semibold">{l ? l.regional : '—'}</td>
                        <td className="p-3 font-semibold whitespace-nowrap text-brand-accent">
                          {fmtDateBR(p.data)}
                        </td>
                        <td className="p-3 font-semibold text-brand-navy">{p.usuario}</td>
                        <td className="p-3 max-w-[280px] text-ink-soft font-medium">
                          {p.obs || <span className="text-ink-faint italic">Retorno operacional planejado</span>}
                        </td>
                        <td className="p-3 text-right whitespace-nowrap no-print" onClick={(e) => e.stopPropagation()}>
                          <div className="flex items-center justify-end gap-1.5">
                            {onOpenVisitaModal && (
                              <button
                                onClick={() => onOpenVisitaModal(p.lojaId, p.id)}
                                className="px-3 py-1.5 bg-brand-green text-white hover:bg-brand-green/90 rounded-lg text-[10.5px] font-bold shadow-2xs transition-colors cursor-pointer"
                                title="Iniciar execução e registrar visita"
                              >
                                Registrar Visita
                              </button>
                            )}
                            {onExcluirPlano && (
                              <button
                                onClick={() => onExcluirPlano(p.id)}
                                className="p-1.5 border border-line text-ink-soft hover:bg-paper rounded-lg transition-colors cursor-pointer"
                                title="Remover planejamento"
                              >
                                <Trash2 className="w-4 h-4 text-red-500" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={6} className="p-12 text-center text-ink-soft">
                      <div className="flex flex-col items-center justify-center">
                        <Calendar className="w-8 h-8 text-ink-faint mb-2 stroke-[1.5]" />
                        <span className="text-xs font-semibold">Nenhuma visita agendada pendente com os filtros informados.</span>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 3. REVISITAS */}
      {activeTab === 'revisitas' && (
        <div className="bg-card border border-line rounded-xl overflow-hidden shadow-custom">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-paper border-b border-line text-ink-soft font-bold uppercase tracking-wider text-[10px]">
                  <th className="p-3">Loja / Filial</th>
                  <th className="p-3">Data Prevista</th>
                  <th className="p-3">Data Realizada</th>
                  <th className="p-3">Auditor</th>
                  <th className="p-3">Pendências Cadastradas</th>
                  <th className="p-3">Status</th>
                  <th className="p-3 text-right no-print">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line text-ink leading-relaxed">
                {getFilteredRevisitas().length > 0 ? (
                  getFilteredRevisitas().map((r) => {
                    const l = lojas.find((x) => x.id === r.lojaId);
                    const totalPendencias = r.pontosMelhoria.length;
                    const resolvidas = r.pontosMelhoria.filter((p) => p.corrigido).length;

                    return (
                      <tr key={r.id} className="hover:bg-paper/25 transition-colors">
                        <td className="p-3">
                          <span className="font-bold block">{l ? l.nome : '—'}</span>
                          <span className="text-[10.5px] text-ink-faint font-mono block mt-0.5">
                            {l ? l.codigo : '—'}
                          </span>
                        </td>
                        <td className="p-3 font-medium text-ink-soft">{fmtDateBR(r.dataPlanejada)}</td>
                        <td className="p-3 font-semibold text-ink">
                          {r.concluida && r.dataRealizada ? (
                            <span>{fmtDateBR(r.dataRealizada)} <span className="text-ink-faint text-[10px] font-normal">às {r.horaRealizada}</span></span>
                          ) : (
                            <span className="text-brand-amber font-bold flex items-center gap-1">
                              <Clock className="w-3.5 h-3.5" />
                              Pendente
                            </span>
                          )}
                        </td>
                        <td className="p-3 font-semibold text-brand-navy">{r.usuario}</td>
                        <td className="p-3">
                          {totalPendencias > 0 ? (
                            <div className="space-y-1">
                              <span className="text-[10px] font-bold uppercase text-ink-soft">
                                {resolvidas}/{totalPendencias} Corrigidos
                              </span>
                              <div className="w-24 h-1.5 bg-paper rounded-full overflow-hidden border border-line">
                                <div
                                  className="h-full bg-brand-green rounded-full transition-all"
                                  style={{ width: `${(resolvidas / totalPendencias) * 100}%` }}
                                />
                              </div>
                            </div>
                          ) : (
                            <span className="text-ink-faint italic text-[11px]">Nenhum desvio checklist</span>
                          )}

                          {r.concluida && r.novasObservacoes && (
                            <p className="text-[11px] text-ink-soft mt-1 line-clamp-1 italic">
                              "{r.novasObservacoes}"
                            </p>
                          )}
                          {r.concluida && onViewPhoto && (
                            <RevisitaPhotosRenderer revisitaId={r.id} onViewPhoto={onViewPhoto} />
                          )}
                        </td>
                        <td className="p-3">
                          <span
                            className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wide border ${
                              r.concluida
                                ? 'bg-indigo-50 border-indigo-200 text-indigo-700'
                                : 'bg-brand-amber-soft border-brand-amber/30 text-brand-amber'
                            }`}
                          >
                            {r.concluida ? 'Concluída' : 'Em Aberto'}
                          </span>
                        </td>
                        <td className="p-3 text-right whitespace-nowrap no-print">
                          <div className="flex items-center justify-end gap-1.5">
                            {!r.concluida && onOpenRevisitaModal && (
                              <button
                                onClick={() => onOpenRevisitaModal(r)}
                                className="px-3 py-1.5 bg-indigo-650 hover:bg-indigo-700 text-white rounded-lg text-[10.5px] font-bold shadow-2xs transition-colors cursor-pointer flex items-center gap-1"
                                title="Registrar auditoria de revisita"
                              >
                                <RefreshCw className="w-3.5 h-3.5" />
                                Registrar Revisita
                              </button>
                            )}
                            {onExcluirRevisita && (
                              <button
                                onClick={() => onExcluirRevisita(r.id)}
                                className="p-1.5 border border-line text-ink-soft hover:bg-paper rounded-lg transition-colors cursor-pointer"
                                title="Deletar revisita"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={7} className="p-12 text-center text-ink-soft">
                      <div className="flex flex-col items-center justify-center">
                        <RefreshCw className="w-8 h-8 text-ink-faint mb-2 stroke-[1.5]" />
                        <span className="text-xs font-semibold">Nenhuma revisita técnica registrada.</span>
                        <p className="text-[11px] text-ink-soft mt-1">
                          Conclua visitas com desvios/pendências para que o sistema agende revisitas automaticamente.
                        </p>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 4. HISTÓRICO COMPLETO DA LOJA */}
      {activeTab === 'historico' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
          {/* Left search & list panel */}
          <div className="bg-card border border-line rounded-xl p-4 lg:col-span-4 space-y-3.5 shadow-xs no-print">
            <h3 className="text-xs font-bold uppercase text-ink-soft tracking-wider">
              Selecione uma Filial
            </h3>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-faint">
                <Search className="w-4 h-4" />
              </span>
              <input
                type="text"
                value={buscaLoja}
                onChange={(e) => setBuscaLoja(e.target.value)}
                placeholder="Buscar por nome ou código..."
                className="w-full pl-9 pr-3 py-1.5 border border-line rounded-lg text-xs outline-none bg-paper/20 focus:border-brand-accent text-ink"
              />
            </div>

            <div className="max-h-[50vh] overflow-y-auto space-y-1.5 pr-1 divide-y divide-line/40">
              {getLojasList().length > 0 ? (
                getLojasList().map((l) => (
                  <button
                    key={l.id}
                    onClick={() => setSelectedHistoryLojaId(l.id)}
                    className={`w-full text-left p-3 rounded-lg transition-all flex items-center justify-between group cursor-pointer ${
                      selectedHistoryLojaId === l.id
                        ? 'bg-brand-accent/10 border-l-3 border-brand-accent text-brand-navy shadow-2xs font-semibold'
                        : 'hover:bg-paper/40 text-ink-soft'
                    }`}
                  >
                    <div>
                      <span className="text-xs font-bold block group-hover:text-brand-accent">{l.nome}</span>
                      <span className="text-[10.5px] font-mono font-medium block text-ink-faint mt-0.5">
                        Filial {l.filial} · Código {l.codigo}
                      </span>
                    </div>
                    <span className="text-[11px] bg-paper px-2 py-0.5 rounded border border-line text-ink-soft font-semibold">
                      Reg. {l.regional}
                    </span>
                  </button>
                ))
              ) : (
                <p className="text-xs text-ink-faint italic py-4 text-center">Nenhuma filial encontrada</p>
              )}
            </div>
          </div>

          {/* Right dossier timeline panel */}
          <div className="lg:col-span-8 space-y-4">
            {selectedHistoryLoja ? (
              <div className="space-y-4">
                {/* Dossier Store Header */}
                <div className="bg-card border border-line rounded-xl p-5 shadow-custom flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="space-y-1.5">
                    <span className="text-[10px] uppercase font-extrabold text-brand-accent tracking-wider bg-brand-accent-soft px-2 py-0.5 rounded">
                      Dossiê Técnico Operacional
                    </span>
                    <h2 className="text-2xl font-extrabold font-condensed uppercase text-brand-navy leading-none mt-1">
                      {selectedHistoryLoja.nome}
                    </h2>
                    <p className="text-xs text-ink-soft">
                      Filial: <strong>{selectedHistoryLoja.filial}</strong> · Código: <strong>{selectedHistoryLoja.codigo}</strong> · Cidade: <strong>{selectedHistoryLoja.cidade} · Regional {selectedHistoryLoja.regional}</strong>
                    </p>
                  </div>
                  <div className="grid grid-cols-2 gap-4 text-center border border-dashed border-line rounded-lg p-3 bg-paper/20">
                    <div>
                      <span className="text-[9px] uppercase font-bold text-ink-faint block">Retornos a cada</span>
                      <span className="text-sm font-extrabold text-brand-navy">{selectedHistoryLoja.prazo || 15} dias</span>
                    </div>
                    <div>
                      <span className="text-[9px] uppercase font-bold text-ink-faint block">Supervisor</span>
                      <span className="text-xs font-bold text-ink-soft truncate max-w-[120px] block mt-0.5">{selectedHistoryLoja.supervisor || '—'}</span>
                    </div>
                  </div>
                </div>

                {/* Combined Timeline for Dossier */}
                <div className="bg-card border border-line rounded-xl p-5 shadow-custom space-y-4">
                  <h3 className="font-condensed text-lg font-extrabold text-ink uppercase tracking-wide border-b border-line pb-2 flex items-center gap-2">
                    <ListChecks className="w-5 h-5 text-brand-accent" />
                    Histórico Completo de Intervenções ({getSelectedStoreTimeline(selectedHistoryLoja.id).length})
                  </h3>

                  {getSelectedStoreTimeline(selectedHistoryLoja.id).length > 0 ? (
                    <div className="relative border-l border-line pl-6 ml-3 space-y-6 py-2">
                      {getSelectedStoreTimeline(selectedHistoryLoja.id).map((item) => {
                        const isRevisita = item.type === 'revisita';
                        const isOK = item.status && (item.status.startsWith('OK') || item.status.includes('Concluída'));
                        const isClosed = item.status === 'Loja fechada / não atendeu';

                        const statusDotColor = isRevisita
                          ? (item.concluida ? 'bg-indigo-650' : 'bg-slate-400')
                          : (isOK ? 'bg-brand-green' : isClosed ? 'bg-brand-red' : 'bg-brand-amber');

                        const statusBadgeStyle = isRevisita
                          ? (item.concluida ? 'bg-indigo-50 text-indigo-700 border border-indigo-200' : 'bg-slate-100 text-slate-500 border border-slate-200')
                          : (isOK ? 'bg-brand-green-soft text-brand-green' : 'bg-brand-amber-soft text-brand-amber');

                        return (
                          <div key={item.id} className="relative group text-xs">
                            {/* Timeline dot */}
                            <span
                              className={`absolute -left-[31px] top-1.5 w-2.5 h-2.5 rounded-full border-2 border-card ring-4 ring-card shadow-sm ${statusDotColor}`}
                            />

                            {/* Content */}
                            <div className="space-y-1.5">
                              <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1">
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
                                <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${statusBadgeStyle}`}>
                                  {item.status}
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

                              {/* Display lazy loaded photos */}
                              {item.temFotos && onViewPhoto && (
                                isRevisita ? (
                                  <RevisitaPhotosRenderer revisitaId={item.id} initialPhotos={item.fotos} onViewPhoto={onViewPhoto} />
                                ) : (
                                  <VisitaPhotosRenderer visitaId={item.id} initialPhotos={item.fotos} onViewPhoto={onViewPhoto} />
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
                      <span className="text-xs font-semibold">Nenhuma visita ou revisita registrada no histórico.</span>
                      <p className="text-[11px] text-ink-soft mt-1">
                        Utilize os canais de agendamento e registro para iniciar a rastreabilidade operacional desta loja.
                      </p>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="bg-card border border-line rounded-xl p-12 text-center text-ink-soft shadow-custom flex flex-col items-center justify-center min-h-[40vh]">
                <FileText className="w-12 h-12 text-ink-faint mb-3 stroke-[1.2] animate-pulse" />
                <h3 className="text-sm font-bold text-ink uppercase tracking-wide">Selecione uma filial para auditoria de dossiê</h3>
                <p className="text-xs text-ink-soft mt-1.5 max-w-md mx-auto leading-relaxed">
                  Pesquise e selecione qualquer uma das filiais no painel lateral esquerdo para auditar a linha do tempo completa, relatórios de auditoria, resoluções de pendências e registros fotográficos correspondentes.
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
