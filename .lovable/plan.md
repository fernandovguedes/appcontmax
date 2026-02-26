

## Reorganizar Tickets Avaliados por Atendente

### Problema
A lista de "Tickets Avaliados" cresce infinitamente, dificultando a navegacao. Todos os tickets aparecem em uma unica tabela plana.

### Solucao
Agrupar os tickets por atendente usando um componente Accordion. Cada atendente sera um item colapsavel que, ao clicar, expande e mostra apenas os tickets dele.

### Detalhes Tecnicos

**Arquivo:** `src/pages/QualidadeAtendimento.tsx`

1. **Agrupar tickets por atendente** - Criar um `useMemo` que agrupa o array `scores` por `user_name`, retornando um Map de nome do atendente para array de tickets.

2. **Substituir a tabela plana por Accordion** - Usar o componente `Accordion` (ja disponivel em `src/components/ui/accordion.tsx`) para renderizar cada atendente como um `AccordionItem`:
   - O trigger mostra o nome do atendente, quantidade de tickets e media do score
   - O conteudo expandido mostra a tabela de tickets daquele atendente (mantendo o layout atual com expand de feedback)

3. **Manter funcionalidade existente** - O expand de feedback individual (chevron por ticket) continua funcionando dentro de cada grupo.

### Layout Visual

```text
+------------------------------------------+
| Tickets Avaliados                        |
+------------------------------------------+
| > Joao Silva (12 tickets) - Media: 82.3 |
|------------------------------------------|
| > Maria Santos (8 tickets) - Media: 91.0|
|   +--------------------------------------+
|   | Ticket | Score | Data |              |
|   | #123   | 95.0  | 01/02 |            |
|   | #456   | 87.0  | 03/02 |            |
|   +--------------------------------------+
| > Pedro Lima (5 tickets) - Media: 68.5  |
+------------------------------------------+
```

