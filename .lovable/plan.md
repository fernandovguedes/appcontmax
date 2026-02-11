

## Correcao: Barra de Rolagem Horizontal Fixa

### Problema Raiz
A barra de rolagem fixa nao aparece porque a deteccao de overflow (`hasOverflow`) falha por problemas de timing. O `ResizeObserver` pode disparar antes da tabela renderizar completamente as novas colunas. Como o elemento da barra so e montado quando `hasOverflow` e `true`, ele nunca aparece.

### Solucao
Mudar a abordagem para sempre renderizar a barra de rolagem e controlar sua visibilidade via CSS/JS, eliminando o problema de timing.

### Arquivo alterado
Somente `src/components/EmpresaTable.tsx`.

### Detalhes tecnicos

**1. Sempre renderizar a barra**
Remover o `{hasOverflow && ...}` condicional. A barra sera sempre montada no DOM, mas oculta via `display: none` quando nao houver overflow.

**2. Usar refs diretas sem condicional**
Como os refs `fakeScrollRef` e `fakeContentRef` estarao sempre no DOM, a sincronizacao de posicao/largura funcionara de forma confiavel.

**3. Logica de visibilidade unificada**
Um unico `useEffect` com `ResizeObserver` + listeners de scroll/resize fara:
- Verificar se `container.scrollWidth > container.clientWidth`
- Se sim: mostrar a barra (`display: block`), atualizar largura e posicao via `getBoundingClientRect()`
- Se nao: esconder a barra (`display: none`)

**4. Usar `overflow-x: scroll` em vez de `overflow-x: auto`**
Isso garante que o track do scrollbar seja sempre visivel quando a barra esta exibida, em vez de depender do hover ou interacao.

**5. Adicionar verificacao com `requestAnimationFrame`**
Apos mudanca de mes (deps `isFechamento`, `isDctfPos`), agendar uma re-verificacao com `requestAnimationFrame` para garantir que o DOM ja reflete as novas colunas.

