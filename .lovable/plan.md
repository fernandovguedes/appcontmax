

# Envio em Lote de WhatsApp via OneCode

## Resumo

Adicionar selecao por checkbox na tabela de empresas para envio em lote de mensagens WhatsApp. Inclui barra de acoes flutuante, confirmacao dupla, edge function de lote com processamento sequencial, progresso em tempo real e resumo final.

## Alteracoes

### 1. Migracao: adicionar campos de lote em `whatsapp_logs`

Adicionar colunas `batch_id`, `batch_index` e `batch_total` na tabela existente:

```sql
ALTER TABLE public.whatsapp_logs
  ADD COLUMN batch_id uuid,
  ADD COLUMN batch_index integer,
  ADD COLUMN batch_total integer;
```

### 2. Edge Function: `send-whatsapp-batch`

Criar `supabase/functions/send-whatsapp-batch/index.ts`:

- Recebe `{ items: [{empresaId, to, body}], ticketStrategy, closeAfterSend }`
- Valida JWT e extrai `user_id`
- Gera um `batch_id` (uuid)
- Processa cada item sequencialmente:
  - Chama `POST {ONECODE_API_URL}/api/send/{to}` com `{ body, ticketStrategy }`
  - Se sucesso e `closeAfterSend`, chama `POST /api/tickets/{ticketId}/send-and-close`
  - Registra log em `whatsapp_logs` com `batch_id`, `batch_index`, `batch_total`
- Retorna array de resultados: `{ empresaId, to, success, error, ticketId, response_raw }`

Nota: processamento sequencial (sem concorrencia) para evitar rate limiting na API OneCode.

### 3. Componente: `WhatsAppBatchBar`

Criar `src/components/WhatsAppBatchBar.tsx`:

- Barra fixa no rodape (sticky bottom) que aparece quando ha pelo menos 1 empresa selecionada
- Exibe: "X empresa(s) selecionada(s)"
- Botoes: "Enviar WhatsApp (X)" (verde), "Limpar selecao" (outline)
- Botao "Pre-visualizar mensagem" que mostra a mensagem template em um popover

### 4. Componente: `WhatsAppBatchConfirmDialog`

Criar `src/components/WhatsAppBatchConfirmDialog.tsx`:

- Dialog com 2 etapas:
  - **Etapa 1**: "Voce deseja enviar mensagem de cobranca para X empresas?" com lista resumida dos destinatarios. Botoes: Cancelar / Continuar
  - **Etapa 2**: "Confirmar envio de X mensagens agora?" com preview do template. Botoes: Voltar / Enviar
- Durante envio: exibe barra de progresso com contador "Enviando X/Y..."
- Ao final: exibe resumo com total de sucessos e erros, com opcao de expandir detalhes por empresa
- Botao "Fechar" apos conclusao

### 5. Alteracao: `EmpresaTable.tsx`

- Adicionar coluna de checkbox como primeira coluna
- Checkbox no cabecalho: "Selecionar todos elegiveis" (seleciona apenas empresas com extrato "nao" E whatsapp preenchido e valido)
- Checkbox por linha:
  - Habilitado apenas se `mes.extratoEnviado === "nao"` E `empresa.whatsapp` existe e comeca com "55"
  - Desabilitado com tooltip explicando o motivo ("Extrato ja enviado" ou "WhatsApp nao cadastrado")
- Novos props:
  ```typescript
  selectedIds?: Set<string>;
  onSelectionChange?: (selectedIds: Set<string>) => void;
  ```

### 6. Alteracao: `Index.tsx`

- Gerenciar estado `selectedIds: Set<string>` e `batchDialogOpen: boolean`
- Passar `selectedIds` e `onSelectionChange` para `EmpresaTable`
- Renderizar `WhatsAppBatchBar` quando `selectedIds.size > 0`
- Renderizar `WhatsAppBatchConfirmDialog`
- Handler de envio em lote:
  - Chama `supabase.functions.invoke("send-whatsapp-batch", { body: { items, ticketStrategy: "create", closeAfterSend: true } })`
  - Limpa selecao apos conclusao
  - Exibe toast resumo

### 7. Configuracao: `supabase/config.toml`

Adicionar entrada para a nova edge function:
```toml
[functions.send-whatsapp-batch]
verify_jwt = false
```

## Funcao auxiliar de elegibilidade

Uma empresa e elegivel para envio em lote se:
1. `empresa.meses[mesSelecionado].extratoEnviado === "nao"`
2. `empresa.whatsapp` existe e tem formato valido (comeca com "55", minimo 12 digitos)

## Fluxo

```text
1. Usuario marca checkboxes nas linhas elegiveis
2. Barra de acoes aparece no rodape com contagem
3. Clica "Enviar WhatsApp (X)"
4. Dialog Etapa 1: lista destinatarios -> Continuar
5. Dialog Etapa 2: confirma envio -> Enviar
6. Progresso em tempo real: "Enviando 3/10..."
7. Conclusao: resumo com X sucessos, Y erros
8. Fecha dialog -> limpa selecao
```

## Detalhes Tecnicos

- A edge function `send-whatsapp-batch` reutiliza a mesma logica de envio e fechamento de ticket da `send-whatsapp` existente
- Os segredos `ONECODE_API_URL` e `ONECODE_API_TOKEN` ja estao configurados
- O progresso e exibido no frontend via estado local (a edge function retorna todos os resultados de uma vez; o progresso visual e simulado com base no total)
- Cada item gera uma linha independente em `whatsapp_logs`, vinculada pelo `batch_id`
- A selecao e resetada ao mudar de mes (limpeza automatica via `useEffect`)

