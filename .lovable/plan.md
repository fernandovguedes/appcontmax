

## Correcoes de Seguranca

### Resumo
Foram encontradas vulnerabilidades que precisam ser corrigidas para proteger o sistema contra manipulacao direta das APIs.

---

### Correcao 1 - Edge Function `create-admin` (CRITICA)
Atualmente, qualquer usuario autenticado pode chamar essa funcao e criar novos usuarios. A correcao adiciona verificacao do token JWT para confirmar que o chamador e admin antes de prosseguir.

**Arquivo:** `supabase/functions/create-admin/index.ts`
- Extrair o token do header Authorization
- Verificar na tabela `user_roles` se o usuario tem role `admin`
- Retornar 403 se nao for admin

---

### Correcao 2 - Politica INSERT em `profiles` (CRITICA)
A politica atual permite que qualquer pessoa insira registros na tabela profiles. Sera restrita para que somente o proprio usuario possa inserir seu perfil (compativel com o trigger de criacao automatica).

**Migracao SQL:**
- Dropar a politica `System can insert profiles`
- Recriar com `WITH CHECK (auth.uid() = id)` para restringir ao proprio usuario, ou usar role `service_role` no trigger

---

### Correcao 3 - Politica UPDATE em `user_modules`
Adicionar politica explicita de UPDATE para que somente admins possam alterar permissoes.

**Migracao SQL:**
- Criar politica UPDATE em `user_modules` com `USING (has_role(auth.uid(), 'admin'))`

---

### Correcao 4 - Protecao contra senhas vazadas
Ativar a verificacao de senhas comprometidas na configuracao de autenticacao.

---

### Detalhes tecnicos

**Arquivos alterados:**
- `supabase/functions/create-admin/index.ts` - Adicionar verificacao de admin
- 1 migracao SQL - Corrigir politicas RLS em `profiles` e `user_modules`
- Configuracao de autenticacao - Ativar protecao contra senhas vazadas

**Nota sobre dados empresariais (item 4 da revisao):**
A politica SELECT em `empresas` com `USING (true)` permite que todos os usuarios autenticados vejam todas as empresas. Isso pode ser intencional para o funcionamento do modulo de controle fiscal. Se desejar restringir, seria necessario associar empresas a usuarios, o que mudaria a logica de negocio. Essa correcao nao esta incluida neste plano.

