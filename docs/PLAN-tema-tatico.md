# Tema tático (2026-10-26)

Origem: protótipo clicável com três estilos (tático, corrida, GTA), aprovado no tático com
as opções de cor e com todos os treinos na mesma cor. O padrão continua sendo o tema de
sempre; o tático é uma escolha em Ajustes → Aparência.

## Decisão

**Só pele, em CSS.** O tático redefine tokens (`--color-*`, `--radius-*`) e restiliza
utilitários (`btn-*`, `glow`, `card`) e cinco ganchos de classe (barra da sessão, série,
check, número do descanso, navegação). Nenhum componente tem versão própria nem lê o tema
em JS. Mapa completo em [DESIGN-SYSTEM.md](DESIGN-SYSTEM.md#temas).

**Atributo no `<html>` marcado antes da primeira pintura.** A preferência mora no
localStorage, que o HTML estático não conhece. Um script inline no `<head>` lê e marca
`data-theme`/`data-tone`/`data-scanlines` antes do React; `suppressHydrationWarning` só no
`<html>`. Sem isso a tela abriria no padrão e repintaria no tático. O script repete a regra
de `parseThemePref` + `applyThemePref` em JS puro, e um teste roda os dois lado a lado.

**Cor do treino por `var(--theme-ac, <hex>)`.** Uns 30 pontos pintavam com o hex do plano
direto no `style`. Eles passaram por `themedAccent`/`themedAccentBg` (e `accentVars` já
devolve assim). No padrão a variável não existe e vale o hex, então a tela é a mesma de
antes; no tático a variável é o tom escolhido. O texto é igual no servidor e no cliente.

*Descartado:* `[data-theme="tatico"] * { --ac: … !important }`. Cobria o `--ac` herdado,
mas não o hex escrito direto em `color`/`background`/`stroke`, que era a maioria dos casos.

*Descartado:* componentes com variante por tema (barra em blocos de verdade, descanso sem
o líquido, conta-giros). Dobraria a superfície de teste visual pra sempre. Onde dava pra
chegar perto em CSS (máscara na barra, colchete em pseudo-elemento), chegou; o resto fica
como está até valer a pena.

## Do protótipo pro app

- Números seguem na condensada de hoje (o protótipo abria em mono). Trocar é só CSS, mas
  `display` serve título e número ao mesmo tempo, então precisaria de gancho novo.
- O anel da constância continua anel; os dias viraram quadrados.
- O descanso mantém o disco com líquido, agora em laranja.
- Textos táticos ("Iniciar missão") ficaram de fora: eram opção desligada no protótipo.
- Scanlines ficaram no nível "sutil", com um interruptor em Ajustes.
- O cinza `#3a424a` do briefing virou `--slot` (borda e slot vazio). Texto secundário usa
  `#8a988f`, que passa contraste.
