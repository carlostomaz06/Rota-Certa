export interface Loja {
  id: string;
  filial: string;
  codigo: string;
  regional: string;
  nome: string;
  endereco: string;
  bairro: string;
  cidade: string;
  estado: string;
  supervisor: string;
  prazo: number | null;
  observacoes: string;
}

export interface User {
  id: string;
  nome: string;
  email: string;
  senha: string;
}

export interface Visita {
  id: string;
  lojaId: string;
  usuario: string;
  data: string;
  hora: string;
  status: string;
  comentario: string;
  gps: { lat: number; lng: number } | null;
  temFotos: boolean;
  pendencias?: string[];
  fotos?: string[];
}

export interface RevisitaPonto {
  descricao: string;
  corrigido: boolean;
}

export interface Revisita {
  id: string;
  visitaOriginalId: string;
  lojaId: string;
  usuario: string; // supervisor executing the revisit
  dataPlanejada: string;
  dataRealizada?: string;
  horaRealizada?: string;
  concluida: boolean;
  pontosMelhoria: RevisitaPonto[];
  observacoesOriginais: string;
  novasObservacoes?: string;
  temFotos: boolean;
  fotos?: string[];
}

export interface Plano {
  id: string;
  lojaId: string;
  data: string;
  usuario: string;
  obs: string;
  concluido: boolean;
}

export interface Config {
  prazoPadrao: number;
}
