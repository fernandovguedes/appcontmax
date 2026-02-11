

## Correção Definitiva: Barra de Rolagem Horizontal Fixa

### O que falhou antes e por quê

1. **`sticky bottom-0`** (atual): Não funciona porque o pai (`div.flex.flex-col`) cresce livremente com o conteúdo -- não tem altura limitada nem overflow vertical. O `sticky` simplesmente não tem efeito nenhum.

2. **`fixed bottom-0`** (tentativa anterior): O posicionamento e largura dependiam de cálculos via `ResizeObserver` que disparavam antes da tabela renderizar completamente, resultando em largura zero ou posição errada.

### Solução: `fixed` com atualização robusta via `setInterval`

A abordagem mais confiável é usar `position: fixed` com um **polling simples** (`setInterval` a cada 200ms) que continuamente recalcula a posição e largura da barra. Isso elimina completamente os problemas de timing do `ResizeObserver`.

### Arquivo alterado

Somente `src/components/EmpresaTable.tsx`.

### O que muda

**1. Scrollbar com `fixed bottom-0` (volta a ser fixed)**

A barra será posicionada de forma fixa no rodapé do viewport, visível independente da rolagem vertical.

**2. Polling com `setInterval` + `ResizeObserver` como backup**

Em vez de depender apenas do `ResizeObserver` (que tem problemas de timing), um `setInterval` a cada 200ms garante que a posição/largura da barra esteja sempre correta. O custo de performance é mínimo pois são apenas leituras de `getBoundingClientRect()`.

**3. Lógica simplificada**

```text
A cada 200ms (e também no ResizeObserver):
  1. Ler container.scrollWidth e container.clientWidth
  2. Se scrollWidth > clientWidth:
     - Mostrar a barra (display: block)
     - Ler container.getBoundingClientRect()
     - Definir left = rect.left, width = rect.width
     - Definir largura do conteúdo fake = scrollWidth
  3. Senão:
     - Esconder a barra (display: none)
```

**4. Sincronização bidirecional (sem mudança)**

Manter os handlers `handleContainerScroll` e `handleScrollbarScroll` para sincronizar as posições de scroll entre a tabela e a barra fixa.

**5. Cleanup no unmount**

Limpar o `setInterval`, o `ResizeObserver` e os event listeners no retorno do `useEffect`.

### Estrutura final

```text
div.flex.flex-col
  div (overflow-x-auto, border)       <-- container da tabela com scroll nativo
    Table (min-w-max)
  div (fixed bottom-0, overflow-x-scroll)  <-- barra fixa no viewport
    div (width = scrollWidth da tabela)
```

### Por que desta vez vai funcionar

- `position: fixed` não depende de nenhum contexto de scroll do pai
- O `setInterval` garante que mesmo que o `ResizeObserver` falhe no timing, a barra será atualizada em no máximo 200ms
- A barra está sempre no DOM (sem renderização condicional), então os refs nunca são nulos

