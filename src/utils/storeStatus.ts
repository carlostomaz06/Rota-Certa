import { Loja, Visita, Revisita, Plano } from '../types';
import { matchLojaId } from '../utils';

export function calculateStoreStatus(
  loja: Loja,
  visitas: Visita[],
  revisitas: Revisita[],
  planos: Plano[],
  hojeStr: string = new Date().toISOString().split('T')[0]
) {
  const storeVisits = (visitas || []).filter((v) => matchLojaId(v.lojaId, loja.id));
  const storeRevisitas = (revisitas || []).filter((r) => matchLojaId(r.lojaId, loja.id));
  const storePlanos = (planos || []).filter((p) => matchLojaId(p.lojaId, loja.id));

  const completedVisits = storeVisits.map((v) => ({
    id: v.id,
    data: v.data,
    hora: v.hora || '00:00',
    type: 'visita',
  }));

  const completedRevisitas = storeRevisitas
    .filter((r) => r.concluida)
    .map((r) => ({
      id: r.id,
      data: r.dataRealizada || r.dataPlanejada,
      hora: r.horaRealizada || '00:00',
      type: 'revisita',
    }));

  const allCompleted = [...completedVisits, ...completedRevisitas].sort((a, b) =>
    (b.data + b.hora).localeCompare(a.data + a.hora)
  );

  // Any uncompleted retorno is an active pending retorno
  const activePendingRevisitas = storeRevisitas
    .filter((r) => !r.concluida)
    .sort((a, b) => a.dataPlanejada.localeCompare(b.dataPlanejada));

  const pendingPlanos = storePlanos
    .filter((p) => !p.concluido)
    .sort((a, b) => a.data.localeCompare(b.data));

  const proximoPlano = pendingPlanos.find((p) => p.data >= hojeStr);
  const proximaRevisita = activePendingRevisitas.find((r) => r.dataPlanejada >= hojeStr);

  const proximaData = proximaRevisita?.dataPlanejada || proximoPlano?.data || null;

  // 1. Check if there is an OVERDUE pending Retorno (revisita planned date in the past)
  const overdueRevisita = activePendingRevisitas.find((r) => r.dataPlanejada < hojeStr);
  if (overdueRevisita) {
    const diffTime = new Date(overdueRevisita.dataPlanejada + 'T12:00:00').getTime() - new Date(hojeStr + 'T12:00:00').getTime();
    const dias = Math.round(diffTime / (1000 * 60 * 60 * 24));
    return {
      status: 'atrasada' as const,
      diasRestantes: dias,
      ultimaVisita: allCompleted[0]?.data || null,
      proxima: overdueRevisita.dataPlanejada,
      motivo: 'Retorno Atrasado',
    };
  }

  // 2. Check if there is an OVERDUE pending Plan (plano date in the past)
  const overduePlano = pendingPlanos.find((p) => p.data < hojeStr);
  if (overduePlano) {
    const diffTime = new Date(overduePlano.data).getTime() - new Date(hojeStr).getTime();
    const dias = Math.round(diffTime / (1000 * 60 * 60 * 24));
    return {
      status: 'atrasada' as const,
      diasRestantes: dias,
      ultimaVisita: allCompleted[0]?.data || null,
      proxima: overduePlano.data,
      motivo: 'Visita Planejada Atrasada',
    };
  }

  // 3. If there are NO completed visits or retornos
  if (allCompleted.length === 0) {
    return {
      status: 'nunca' as const,
      diasRestantes: null,
      ultimaVisita: null,
      proxima: proximaData,
      motivo: 'Sem Visita',
    };
  }

  // 4. If there is a scheduled pending Retorno or Plan in the future
  if (proximaData) {
    const diffTime = new Date(proximaData).getTime() - new Date(hojeStr).getTime();
    const dias = Math.round(diffTime / (1000 * 60 * 60 * 24));
    const status = dias <= 3 ? ('atencao' as const) : ('ok' as const);
    return {
      status,
      diasRestantes: dias,
      ultimaVisita: allCompleted[0]?.data || null,
      proxima: proximaData,
      motivo: 'Agendado',
    };
  }

  // 5. Standard routine cycle from last completed visit / retorno
  const ultima = allCompleted[0];
  const prazo = loja.prazo || 15;
  const proximaDate = new Date(ultima.data + 'T12:00:00');
  proximaDate.setDate(proximaDate.getDate() + prazo);

  const diffTime = proximaDate.getTime() - new Date(hojeStr + 'T12:00:00').getTime();
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
    proxima: proximaDate.toISOString().split('T')[0],
    motivo: 'Ciclo Rotina',
  };
}
