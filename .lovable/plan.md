

## Alterar Senha de Usuarios (pelo Admin)

### O que sera feito
Adicionar um botao na pagina de Administracao que permite ao admin redefinir a senha de qualquer usuario do sistema.

---

### Implementacao

**1. Nova Edge Function `reset-user-password`**

Criar uma nova funcao backend em `supabase/functions/reset-user-password/index.ts` que:
- Valida o token JWT do chamador (mesmo padrao do `create-admin`)
- Verifica se o chamador tem role `admin` na tabela `user_roles`
- Recebe `user_id` e `new_password` no body
- Usa `supabase.auth.admin.updateUserById()` com o service role para alterar a senha
- Retorna 403 se nao for admin, 400 se faltar dados

**2. Alteracao na pagina Admin (`src/pages/Admin.tsx`)**

- Adicionar um botao com icone de chave (Key do lucide-react) em cada linha da tabela de usuarios
- Ao clicar, abre um Dialog simples pedindo a nova senha (minimo 6 caracteres)
- O dialog chama `supabase.functions.invoke("reset-user-password", { body: { user_id, new_password } })`
- Exibe toast de sucesso ou erro

### Detalhes tecnicos

**Novo arquivo:** `supabase/functions/reset-user-password/index.ts`
- Segue exatamente o mesmo padrao de autenticacao do `create-admin`
- Usa `supabase.auth.admin.updateUserById(user_id, { password: new_password })` via service role

**Arquivo editado:** `src/pages/Admin.tsx`
- Novo estado: `resetPasswordOpen`, `resetUserId`, `resetPassword`, `resetting`
- Nova funcao `handleResetPassword`
- Novo Dialog com campo de senha
- Botao com icone Key na coluna de acoes (apos a coluna de Admin)

