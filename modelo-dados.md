# Modelo de Dados — Portal Auditoria MEGA

Referência rápida das entidades do `backend/prisma/schema.prisma`. Para o detalhe completo de
campos e tipos, consulte o próprio arquivo do schema — ele é a fonte de verdade.

## Entidades principais

### `Justificativa`
Representa uma linha importada da planilha do Google Sheets (uma resposta do Forms).
Guarda tanto os dados brutos enviados pela loja (`lojaCodigoBruto`, `gerenteBruto` etc., que
preservam o texto exatamente como veio do Forms) quanto os vínculos resolvidos (`lojaId`, depois
de o sistema conseguir casar o código/nome com uma `Loja` cadastrada).

Campos de controle de auditoria: `status`, `nivelRisco`, `scoreRisco`, `dataPrimeiraAnalise`,
`dataConclusao`.

### `Loja` / `Regional`
Cadastro organizacional mantido pela Auditoria/Admin no próprio Portal (não vem do Forms).
Usado para o "match" automático das respostas e para agrupar dashboards por regional/loja.

### `AnaliseAuditoria`
Cada parecer técnico registrado por um auditor sobre uma `Justificativa`. Uma justificativa pode
ter várias análises ao longo do tempo (ex: "Solicitado Complementação" → depois "Aprovado").

### `HistoricoStatus`
Trilha de auditoria interna: toda mudança de status gera uma linha aqui, incluindo a importação
inicial. É o que alimenta a Timeline na tela de detalhamento.

### `Comentario`
Comentários livres de qualquer usuário autenticado sobre uma justificativa (não substitui o
parecer formal de `AnaliseAuditoria`).

### `Alerta`
Gerado automaticamente pelas 4 regras de negócio (ver `backend/src/services/alertas.service.ts`).
Pode estar vinculado a uma `Loja`, uma `Regional`, ou uma `Justificativa` específica, dependendo
do tipo.

### `Usuario`
Login do Portal. Perfis: `ADMINISTRADOR`, `AUDITORIA`, `CONSULTA`. As lojas **não** têm usuários
neste sistema.

### `LogAcesso`
Trilha de auditoria de ações no próprio sistema (login, alteração de status, exportações),
exibida na tela **Logs** (apenas Administrador), em conformidade com requisitos de governança/LGPD.

### `SyncControl`
Registro único que guarda o estado da última sincronização com o Google Sheets (data, status,
mensagem de erro se houver). Usado pela tela **Configurações** e pelo indicador no topo do Portal.

## Diagrama simplificado de relacionamentos

```
Regional 1───* Loja 1───* Justificativa 1───* AnaliseAuditoria
                                    │  │  │
                                    │  │  └───* HistoricoStatus
                                    │  └──────* Comentario
                                    └─────────* Alerta

Usuario 1───* AnaliseAuditoria
Usuario 1───* Comentario
Usuario 1───* LogAcesso
```

## Enums

| Enum | Valores |
|---|---|
| `StatusJustificativa` | RECEBIDO, EM_ANALISE, APROVADO, REPROVADO, SOLICITADO_COMPLEMENTACAO |
| `NivelRisco` | BAIXO 🟢, MEDIO 🟡, ALTO 🟠, CRITICO 🔴 |
| `TipoAlerta` | VALOR_DIARIO_EXCEDIDO, FREQUENCIA_MENSAL_EXCEDIDA, PENDENCIA_PROLONGADA, CRESCIMENTO_REGIONAL |
| `SeveridadeAlerta` | INFO, ATENCAO, CRITICO |
| `PerfilUsuario` | ADMINISTRADOR, AUDITORIA, CONSULTA |
