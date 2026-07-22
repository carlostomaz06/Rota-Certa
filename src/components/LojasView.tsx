import React from 'react';
import { Loja, Visita, Plano, Revisita } from '../types';
import { Search, Plus } from 'lucide-react';
import LojaMiniCard from './LojaMiniCard';
import { todayISO } from '../utils';
import { calculateStoreStatus } from '../utils/storeStatus';

interface LojasViewProps {
  lojas: Loja[];
  visitas: Visita[];
  revisitas?: Revisita[];
  planos: Plano[];
  onNavigate: (view: string, param?: string) => void;
  onOpenLojaForm: (lojaId?: string) => void;
  busca: string;
  setBusca: (val: string) => void;
  regional: string;
  setRegional: (val: string) => void;
  statusFilter: string;
  setStatusFilter: (val: string) => void;
}

export default function LojasView({
  lojas,
  visitas,
  revisitas = [],
  planos,
  onNavigate,
  onOpenLojaForm,
  busca,
  setBusca,
  regional,
  setRegional,
  statusFilter,
  setStatusFilter,
}: LojasViewProps) {
  const hoje = todayISO();

  // Helper to compute status for each store
  const getStatusInfo = (loja: Loja) => {
    return calculateStoreStatus(loja, visitas, revisitas, planos, hoje);
  };

  // Get list of unique regionals
  const regionais = Array.from(new Set(lojas.map((l) => l.regional).filter(Boolean))).sort();

  // Map each store with status info
  let list = lojas.map((l) => ({
    loja: l,
    ...getStatusInfo(l),
  }));

  // Apply filters
  if (busca.trim()) {
    const q = busca.toLowerCase();
    list = list.filter(
      (s) =>
        s.loja.nome.toLowerCase().includes(q) ||
        s.loja.codigo.toLowerCase().includes(q) ||
        s.loja.bairro.toLowerCase().includes(q) ||
        (s.loja.supervisor || '').toLowerCase().includes(q)
    );
  }

  if (regional) {
    list = list.filter((s) => s.loja.regional === regional);
  }

  if (statusFilter) {
    list = list.filter((s) => s.status === statusFilter);
  }

  // Sort critical: atrasada first, nunca second, atencao third, ok last
  list.sort((a, b) => {
    const rank = { atrasada: 0, nunca: 1, atencao: 2, ok: 3 };
    const rDiff = rank[a.status] - rank[b.status];
    if (rDiff !== 0) return rDiff;

    const valA = a.diasRestantes !== null ? a.diasRestantes : 9999;
    const valB = b.diasRestantes !== null ? b.diasRestantes : 9999;
    return valA - valB;
  });

  const filterChips = [
    { value: '', label: 'Todas' },
    { value: 'atrasada', label: 'Atrasadas' },
    { value: 'atencao', label: 'Atenção' },
    { value: 'ok', label: 'Em Dia' },
    { value: 'nunca', label: 'Nunca Visitadas' },
  ];

  return (
    <div className="space-y-5">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="font-condensed font-extrabold text-3xl text-ink tracking-tight uppercase leading-none">
            Lojas Cadastradas
          </h1>
          <p className="text-sm text-ink-soft mt-1.5">{lojas.length} lojas registradas na carteira</p>
        </div>
        <button
          onClick={() => onOpenLojaForm()}
          className="flex items-center justify-center gap-1.5 px-4.5 py-2.5 bg-brand-accent text-white font-semibold text-sm rounded-lg hover:bg-brand-accent/90 active:scale-95 transition-all shadow-md self-start sm:self-auto"
        >
          <Plus className="w-4 h-4 stroke-[2.5]" />
          Nova Loja
        </button>
      </div>

      {/* Filter Toolbar */}
      <div className="flex flex-col sm:flex-row gap-3">
        {/* Search Input */}
        <div className="relative flex-1">
          <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-ink-faint">
            <Search className="w-4.5 h-4.5" />
          </span>
          <input
            type="text"
            placeholder="Buscar por nome, código, bairro ou supervisor..."
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            className="w-full pl-9.5 pr-4 py-2 border-1.5 border-line rounded-lg bg-card text-ink text-sm outline-none focus:border-brand-accent transition-colors"
          />
        </div>

        {/* Regional Filter Dropdown */}
        <select
          value={regional}
          onChange={(e) => setRegional(e.target.value)}
          className="px-3 py-2 border-1.5 border-line rounded-lg bg-card text-ink text-sm outline-none focus:border-brand-accent transition-colors sm:w-48"
        >
          <option value="">Todas Regionais</option>
          {regionais.map((reg) => (
            <option key={reg} value={reg}>
              Regional {reg}
            </option>
          ))}
        </select>
      </div>

      {/* Status Filter Chips */}
      <div className="flex flex-wrap gap-2">
        {filterChips.map((chip) => (
          <button
            key={chip.value}
            onClick={() => setStatusFilter(chip.value)}
            className={`px-4 py-1.5 rounded-full text-xs font-semibold border-1.5 transition-all active:scale-95 ${
              statusFilter === chip.value
                ? 'bg-brand-accent border-brand-accent text-white'
                : 'bg-card border-line text-ink-soft hover:bg-paper hover:text-ink'
            }`}
          >
            {chip.label}
          </button>
        ))}
      </div>

      {/* Stores List Grid */}
      {list.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {list.map((s) => (
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
        <div className="bg-card border border-line rounded-xl p-14 text-center text-ink-soft shadow-custom flex flex-col items-center justify-center">
          <Search className="w-10 h-10 text-ink-faint mb-2.5 stroke-[1.5]" />
          <span className="text-sm font-semibold">Nenhuma loja corresponde aos filtros aplicados.</span>
          <p className="text-xs text-ink-soft mt-1">Experimente limpar a busca ou mudar os filtros!</p>
        </div>
      )}
    </div>
  );
}
