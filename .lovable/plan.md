
# Aviso de Duplicidade no Envio de WhatsApp

## Resumo

Implementar deteccao de envios anteriores por competencia (mes/ano) e tipo de mensagem, exibindo alerta visual na tabela e exigindo confirmacao extra com checkbox ao reenviar.

## Alteracoes

### 1. Migracao: novos campos em `whatsapp_logs`

Adicionar colunas na tabela existente:

```sql
ALTER TABLE public.whatsapp_logs
  ADD COLUMN competencia text,
  ADD COLUMN message_type text DEFAULT 'extrato_nao_enviado',
  ADD COLUMN is_resend boolean DEFAULT false,
  ADD COLUMN resend_reason text;
```

- `competencia`: formato "YYYY-MM" (ex: "2026-01" para Janeiro/2026)
- `message_type`: tipo da mensagem, default "extrato_nao_enviado"
- `is_resend`: indica se foi um reenvio consciente
- `resend_reason`: motivo opcional do reenvio

### 2. Funcao utilitaria: `getCompetenciaAtual()`

Criar em `src/lib/formatUtils.ts`:

```typescript
const MES_INDEX: Record<MesKey, number> = {
  janeiro: 1, fevereiro: 2, marco: 3,
  abril: 4, maio: 5, junho: 6,
  julho: 7, agosto: 8, setembro: 9,
  outubro: 10, novembro: 11, dezembro: 12,
};

export function getCompetenciaAtual(mesSelecionado: MesKey): string {
  const mes = MES_INDEX[mesSelecionado];
  return `2026-${String(mes).padStart(2, "0")}`;
}
```

Usa o ano fixo 2026 (consistente com o resto do sistema).

### 3. Hook: `useWhatsAppLogs()`

Criar `src/hooks/useWhatsAppLogs.ts`:

- Recebe `competencia: string`
- Consulta `whatsapp_logs` filtrando por `competencia`, `message_type = "extrato_nao_enviado"` e `status = "success"`
- Faz join com `profiles` para obter o nome do usuario que enviou
- Retorna um `Map<string, { sentAt: string; sentBy: string }>` indexado por `empresa_id`
- Usa `useQuery` do TanStack para cache e revalidacao
- Revalida apos cada envio (individual ou lote)

### 4. Edge Functions: gravar competencia e message_type

**`send-whatsapp/index.ts`**:
- Aceitar campos opcionais `competencia`, `message_type`, `is_resend`, `resend_reason` no body
- Gravar esses campos no insert de `whatsapp_logs`

**`send-whatsapp-batch/index.ts`**:
- Aceitar `competencia`, `message_type` no body (nivel raiz)
- Aceitar `is_resend` e `resend_reason` por item (cada empresa pode ter status diferente de reenvio)
- Gravar no insert de cada log

### 5. Alteracao: `EmpresaTable.tsx`

Adicionar prop `whatsappLogs?: Map<string, { sentAt: string; sentBy: string }>`.

Na coluna de acoes, ao renderizar o botao de WhatsApp:
- Se `empresa.id` existe no Map de logs (ja enviado nesta competencia):
  - Botao com icone `AlertTriangle` em amarelo/laranja
  - Label interna ou tooltip: "Enviado em {data} por {usuario}"
  - `onClick` chama `onSendWhatsApp` com flag `isResend: true`
- Se nao existe no Map: comportamento atual (botao verde normal)

### 6. Alteracao: `WhatsAppConfirmDialog.tsx`

Adicionar props opcionais:
- `isResend?: boolean`
- `sentInfo?: { sentAt: string; sentBy: string }`

Quando `isResend` for true:
- Exibir alerta amarelo na Etapa 1: "Mensagem ja enviada em {data} por {usuario}"
- Adicionar Etapa 2.5 (antes do envio): checkbox obrigatorio "Entendo que pode gerar mensagem duplicada"
- Campo opcional de texto para `resend_reason`
- Passar `is_resend` e `resend_reason` no body da chamada ao edge function

### 7. Alteracao: `WhatsAppBatchConfirmDialog.tsx`

Receber `whatsappLogs` Map como prop.

Na Etapa 1 (lista de destinatarios):
- Marcar com icone de alerta as empresas que ja receberam mensagem nesta competencia
- Exibir contagem: "X empresas ja receberam mensagem neste mes"

Na Etapa 2 (confirmacao):
- Se houver empresas com envio anterior, exibir checkbox obrigatorio "Entendo que pode gerar mensagens duplicadas para X empresa(s)"
- Campo opcional de texto para `resend_reason`
- Enviar `is_resend: true` para itens que sao reenvio e `is_resend: false` para novos

### 8. Alteracao: `Index.tsx`

- Importar `useWhatsAppLogs` e `getCompetenciaAtual`
- Computar `competencia` a partir de `mesSelecionado`
- Chamar `useWhatsAppLogs(competencia)` para obter o Map de logs
- Passar `whatsappLogs` para `EmpresaTable` e `WhatsAppBatchConfirmDialog`
- Atualizar handlers de envio individual e lote para incluir `competencia` e `message_type` no body
- Invalidar query de logs apos envio bem-sucedido

## Fluxo de Reenvio Individual

```text
1. Tabela mostra botao amarelo com icone de alerta para empresa ja notificada
2. Tooltip: "Enviado em 24/02/2026 por Maria"
3. Clique abre WhatsAppConfirmDialog com isResend=true
4. Etapa 1: alerta "Mensagem ja enviada em..."
5. Etapa 2: preview da mensagem
6. Etapa 3: checkbox "Entendo que pode gerar duplicata" + motivo opcional
7. Envio com is_resend=true e resend_reason gravados no log
```

## Fluxo de Reenvio em Lote

```text
1. Selecionar empresas (mix de novas e ja notificadas)
2. Barra de acoes mostra contagem total
3. Dialog Etapa 1: lista com icone de alerta nas ja notificadas
4. Dialog Etapa 2: se houver reenvios, checkbox obrigatorio + motivo
5. Envio com is_resend individual por empresa no log
```

## Detalhes Tecnicos

- A consulta de logs usa RLS existente (SELECT permitido para autenticados)
- O hook `useWhatsAppLogs` agrupa por `empresa_id` e pega o registro mais recente (ordenado por `created_at DESC`)
- O join com `profiles` usa `user_id` para mostrar o nome do remetente
- A invalidacao da query apos envio garante que a tabela atualiza imediatamente o estado visual do botao
- Os campos `competencia` e `message_type` sao opcionais nas edge functions para manter retrocompatibilidade com logs antigos
