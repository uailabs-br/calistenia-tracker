# Mídia de demonstração por exercício

**Decisão (2026-10-12):** ilustrações do dataset gratuito do RepDB (repdb.co), duas poses
(início → topo) dentro do bloco colapsável "como executar", buscadas sob demanda e
guardadas no cache do service worker. No repo só vai o mapa `id do catálogo → arquivo`
([lib/plan/media.ts](../lib/plan/media.ts)).

## Por que assim
- **Licença clara:** o plano gratuito do RepDB libera uso dentro de aplicativo com crédito
  visível (Ajustes) e proíbe republicar as imagens como dataset. O repositório do app é
  público, então as imagens não são commitadas.
- **Leve:** ~13 KB por pose (medido: média 16 KB, máx. 37 KB nas 1.138 imagens). Nada no
  bundle nem no precache; a imagem só é pedida ao abrir "como executar". Cache com teto
  (120 entradas, expira sem uso em 180 dias).
- **Cobre o catálogo estável:** 56 dos 120 ids do catálogo. Só entra o que é o MESMO
  movimento — variação parecida mostraria a execução errada.

## Alternativas descartadas
- **GIFs do ExerciseDB** (`bootstrapping-lab/exercisedb-api`): animam, mas pesam 50–115 KB
  e o repo só declara AGPL pro código; a mídia não tem licença nem origem declaradas.
- **Link externo de busca:** zero peso, mas sempre exige internet e tira a pessoa do app.
- **Clipe do próprio usuário em IndexedDB:** tabela nova + migração + efeito no backup;
  fica pra uma v2.
- **Imagens versionadas em `public/`:** offline desde a primeira abertura, porém
  redistribui o dataset num repo público (termo 3 da licença).

## Limites assumidos
- Primeira visualização de cada exercício precisa de internet; depois funciona offline.
- Dependência do host `exercise-dataset.com` (GitHub Pages do RepDB). Se sair do ar, a
  imagem some e o texto continua. Trocar de host é mudar `MEDIA_HOST`.
- Exercício com id livre gerado pela IA (`mu-puxada-explosiva`) não tem mídia.
- Imagem estática, não animação (a animação é do plano pago).
