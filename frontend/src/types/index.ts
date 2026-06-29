export type PerfilUsuario = "ADMINISTRADOR" | "AUDITORIA" | "CONSULTA";

export type StatusJustificativa =
  | "RECEBIDO"
  | "EM_ANALISE"
  | "APROVADO"
  | "REPROVADO"
  | "SOLICITADO_COMPLEMENTACAO";

export type NivelRisco = "BAIXO" | "MEDIO" | "ALTO" | "CRITICO";

export type TipoAlerta =
  | "VALOR_DIARIO_EXCEDIDO"
  | "FREQUENCIA_MENSAL_EXCEDIDA"
  | "PENDENCIA_PROLONGADA"
  | "CRESCIMENTO_REGIONAL";

export type SeveridadeAlerta = "INFO" | "ATENCAO" | "CRITICO";

export interface Usuario {
  id: string;
  nome: string;
  email: string;
  perfil: PerfilUsuario;
  ultimoLogin?: string | null;
}

export interface Regional {
  id: string;
  nome: string;
  codigo?: string | null;
  responsavelId?: string | null;
  responsavel?: { id: string; nome: string; email: string } | null;
  lojas?: Loja[];
  _count?: { lojas: number };
}

export interface Loja {
  id: string;
  codigo: string;
  nome: string;
  cidade?: string | null;
  uf?: string | null;
  regionalId?: string | null;
  regional?: Regional | null;
  gerente?: string | null;
}

export interface Justificativa {
  id: string;
  sheetRowId: string;
  submissaoId?: string | null;
  itemDaSubmissao?: number | null;
  dataEnvio: string;
  dataOcorrencia?: string | null;
  lojaId?: string | null;
  loja?: Loja | null;
  lojaCodigoBruto: string;
  produtoCodigo?: string | null;
  produtoNome?: string | null;
  quantidade?: number | null;
  valorAjustado: number;
  motivo: string;
  motivoDetalhe?: string | null;
  responsavel?: string | null;
  gerenteBruto?: string | null;
  anexosUrls: string[];
  status: StatusJustificativa;
  nivelRisco?: NivelRisco | null;
  scoreRisco?: number | null;
  dataPrimeiraAnalise?: string | null;
  dataConclusao?: string | null;
  createdAt: string;
  updatedAt: string;
  historico?: HistoricoStatus[];
  analises?: AnaliseAuditoria[];
  comentarios?: Comentario[];
  alertas?: Alerta[];
}

export interface HistoricoStatus {
  id: string;
  statusAnterior?: StatusJustificativa | null;
  statusNovo: StatusJustificativa;
  observacao?: string | null;
  createdAt: string;
}

export interface AnaliseAuditoria {
  id: string;
  status: StatusJustificativa;
  parecerTecnico: string;
  observacoes?: string | null;
  createdAt: string;
  auditor: { id: string; nome: string };
}

export interface Comentario {
  id: string;
  texto: string;
  createdAt: string;
  usuario: { id: string; nome: string };
}

export interface Alerta {
  id: string;
  tipo: TipoAlerta;
  severidade: SeveridadeAlerta;
  titulo: string;
  descricao: string;
  lojaId?: string | null;
  regionalId?: string | null;
  justificativaId?: string | null;
  lido: boolean;
  resolvido: boolean;
  createdAt: string;
}

export interface CardsDashboard {
  totalJustificativas: number;
  pendentes: number;
  emAnalise: number;
  aprovadas: number;
  reprovadas: number;
  valorAjustadoHoje: number;
  valorAjustadoMes: number;
  lojasComOcorrencias: number;
  produtosAjustados: number;
  tempoMedioRespostaAuditoriaHoras: number | null;
  tempoMedioEnvioLojaHoras: number | null;
}

export interface TopLoja {
  lojaId: string;
  lojaNome: string;
  lojaCodigo: string;
  valorTotal: number;
  quantidadeAjustes: number;
}

export interface PontoEvolucao {
  periodo: string;
  quantidade: number;
  valor: number;
}

export interface MotivoAgregado {
  motivo: string;
  quantidade: number;
}

export interface ProdutoAgregado {
  produtoCodigo: string;
  produtoNome: string | null;
  valorTotal: number;
  quantidadeAjustes: number;
}

export interface RegionalHeatmap {
  regionalId: string;
  regionalNome: string;
  quantidadeOcorrencias: number;
  valorTotal: number;
}

export interface FiltrosGlobais {
  dataInicial?: string;
  dataFinal?: string;
  regionalId?: string;
  lojaId?: string;
  cidade?: string;
  produtoCodigo?: string;
  status?: StatusJustificativa;
  motivo?: string;
  gerente?: string;
  responsavel?: string;
  valorMinimo?: string;
  valorMaximo?: string;
  busca?: string;
}

export interface Paginacao {
  pagina: number;
  porPagina: number;
  total: number;
  totalPaginas: number;
}
