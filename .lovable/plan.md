

## Correcao Final: Barra de Rolagem Horizontal

### Diagnostico Real

Testei no navegador automatizado e confirmei que a tabela **de fato transborda** horizontalmente em Marco (colunas extras ficam escondidas). Porem a barra fixa nao aparece.

O problema e que o `createPortal` renderiza a barra no `document.body`, mas os refs (`scrollbarRef`, `scrollbarContentRef`) podem nao estar prontos no momento exato em que o `useEffect` roda. Quando o guard `if (!scrollbar) return` falha, o `setInterval` nunca e criado e a barra fica para sempre com `display: none`.

### Solucao: Eliminar Portal e Fixed -- Usar Wrapper com Altura Limitada + Sticky

A unica abordagem que funciona de forma 100% confiavel e criar um **contexto de scroll proprio** para a tabela. Nenhum `fixed`, nenhum `portal`, nenhum calculo de `getBoundingClientRect`.

### Mudancas no arquivo `src/components/EmpresaTable.tsx`

**1. Wrapper externo com altura limitada**

Envolver a tabela e o scrollbar em um div com `max-h-[calc(100vh-220px)]` e `overflow-y-auto overflow-x-hidden`. Isso cria o contexto de scroll vertical necessario para o `sticky` funcionar.

**2. Container da tabela com `overflow-x-auto`**

Manter o container da tabela com `overflow-x-auto` para permitir scroll horizontal nativo.

**3. Scrollbar com `sticky bottom-0`**

Agora que o pai tem altura limitada e scroll vertical, `sticky bottom-0` vai funcionar corretamente. A barra vai grudar no fundo da area visivel.

**4. Sincronizacao simplificada via useEffect**

Um `useEffect` simples que:
- Observa o container da tabela via `ResizeObserver`
- Se `scrollWidth > clientWidth`: mostra a barra e define `width` do conteudo fake
- Sincroniza `scrollLeft` bidirecionalmente entre container e barra

**5. Remover `createPortal`, `setInterval`, e calculos de `getBoundingClientRect`**

Nada disso e necessario com a abordagem sticky + wrapper com altura limitada.

### Estrutura final

```text
div (max-h-[calc(100vh-220px)], overflow-y-auto, overflow-x-hidden)
  div (overflow-x-auto, ref=containerRef)
    Table (min-w-max)
  div (sticky bottom-0, overflow-x-scroll, ref=scrollbarRef)
    div (width = scrollWidth da tabela)
```

### Por que vai funcionar

- `sticky` so precisa de um pai com overflow -- agora o pai tem `overflow-y: auto` com altura maxima
- Nenhuma dependencia de timing, portals, ou calculos de posicao
- Os refs estao no mesmo componente React (sem portal), entao nunca serao null no useEffect
- Solucao puramente CSS/HTML, sem hacks de JS

