

# Envio de WhatsApp via OneCode no Controle Fiscal

**Custo estimado: ~3 creditos**

## Resumo

Implementar envio automatizado de cobranca de extrato bancario via WhatsApp, usando a API OneCode. O botao aparece na coluna Acoes da tabela de empresas, visivel apenas quando o extrato esta "Nao Enviado". Inclui confirmacao dupla, log de auditoria e feedback via toast.

## Alteracoes

### 1. Secrets (ONECODE_API_URL e ONECODE_API_TOKEN)

Solicitar ao usuario os dois valores necessarios:
- `ONECODE_API_URL`: URL base da API OneCode (o endpoint completo informado)
- `ONECODE_API_TOKEN`: Token Bearer de autenticacao

Esses segredos serao usados exclusivamente na edge function.

### 2. Migracao: tabela `whatsapp_logs`

Criar tabela de auditoria:

```sql
CREATE TABLE public.whatsapp_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id uuid NOT NULL,
  "to" text NOT NULL,
  body text NOT NULL,
  user_id uuid NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  ticket_id text,
  response_raw jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.whatsapp_logs ENABLE ROW LEVEL SECURITY;

-- Apenas usuarios autenticados podem ler e inserir logs
CREATE POLICY "Authenticated users can read whatsapp_logs"
  ON public.whatsapp_logs FOR SELECT
  USING (true);

CREATE POLICY "Authenticated users can insert whatsapp_logs"
  ON public.whatsapp_logs FOR INSERT
  WITH CHECK (auth.uid() = user_id);
```

### 3. Edge Function: `send-whatsapp`

Criar `supabase/functions/send-whatsapp/index.ts`:

- Valida JWT do usuario
- Recebe `{ to, body, empresa_id, ticketStrategy }`
- Chama `POST {ONECODE_API_URL}/api/send/{to}` com headers `Authorization: Bearer {ONECODE_API_TOKEN}` e body `{ body, ticketStrategy }`
- Insere registro na tabela `whatsapp_logs` com status `success` ou `error`, incluindo `ticket_id` e `response_raw`
- Retorna resultado ao frontend

### 4. Componente: `WhatsAppConfirmDialog`

Criar `src/components/WhatsAppConfirmDialog.tsx`:

- Dialog com 2 etapas:
  - **Etapa 1**: "Voce deseja enviar a mensagem de cobranca de extrato para {empresa}?" com botoes Cancelar / Continuar
  - **Etapa 2**: Exibe a mensagem que sera enviada e botoes Voltar / Enviar
- Estado de loading durante o envio
- Mensagem template:
  ```
  Ola, {empresa}! Identificamos que o extrato de {competencia} ainda nao foi enviado. Pode nos encaminhar por aqui hoje?
  ```
  Onde `{competencia}` corresponde ao mes selecionado (ex: "Marco/2026")

### 5. Alteracao: `EmpresaTable.tsx`

Na coluna Acoes, adicionar botao com icone de WhatsApp (usando `MessageCircle` do Lucide):

- **Visivel/habilitado** somente quando `mes.extratoEnviado === "nao"`
- Quando extrato ja enviado: botao oculto ou desabilitado com tooltip "Extrato ja enviado"
- Ao clicar: abre o `WhatsAppConfirmDialog`
- Necessita receber novo callback `onSendWhatsApp` via props

Novo prop no `EmpresaTableProps`:
```typescript
onSendWhatsApp?: (empresa: Empresa) => void;
```

### 6. Alteracao: `Index.tsx` (Controle Fiscal)

- Importar `WhatsAppConfirmDialog`
- Gerenciar estado `whatsappEmpresa` (empresa selecionada para envio)
- Passar `onSendWhatsApp` para `EmpresaTable`
- Chamar a edge function `send-whatsapp` via Supabase client ao confirmar
- Exibir toast de sucesso ou erro
- A empresa precisa ter o campo `whatsapp` preenchido; caso contrario, exibir toast de erro informando que o WhatsApp nao esta cadastrado

## Fluxo

1. Usuario ve botao WhatsApp na linha da empresa (extrato "Nao Enviado")
2. Clica no botao -> abre dialog Etapa 1
3. Clica "Continuar" -> avanca para Etapa 2 com preview da mensagem
4. Clica "Enviar" -> chama edge function -> loading no botao
5. Sucesso -> toast "Mensagem enviada" + fecha dialog
6. Erro -> toast com mensagem amigavel + reabilita botao

## Detalhes Tecnicos

- A edge function usa `Deno.env.get("ONECODE_API_URL")` e `Deno.env.get("ONECODE_API_TOKEN")`
- O campo `whatsapp` da empresa ja existe na tabela `empresas` (implementado anteriormente)
- Se a empresa nao tiver WhatsApp cadastrado, o botao ainda aparece mas ao clicar mostra erro "WhatsApp nao cadastrado para esta empresa"
- Os logs ficam acessiveis na tabela `whatsapp_logs` para auditoria futura
- A competencia e derivada do mes selecionado + ano corrente (ex: "Marco/2026")

