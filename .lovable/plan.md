

# Adicionar filtro "Lanç. Questor" no Controle Fiscal

## Resumo

Adicionar um checkbox de filtro para "Lanç. Questor" na barra de filtros do modulo Controle Fiscal. Quando ativado, mostra apenas empresas cujo campo `lancadoQuestor` no mes selecionado seja `"pendente"`.

## Alteracoes

### Arquivo: `src/pages/Index.tsx`

1. **Novo estado**: Adicionar `const [questorFilter, setQuestorFilter] = useState(false);`
2. **Logica de filtro**: Dentro do bloco de filtragem, quando `questorFilter` estiver ativo, manter apenas empresas onde `dados.lancadoQuestor === "pendente"` no mes selecionado
3. **Checkbox na interface**: Adicionar um checkbox com icone e label "Lanç. Questor" junto aos filtros existentes (apos Alugueis e antes dos filtros condicionais REINF/DCTF), usando o mesmo estilo visual dos demais filtros

