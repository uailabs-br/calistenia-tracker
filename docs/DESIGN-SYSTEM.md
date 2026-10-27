# Design system

Documento **vivo**: se divergir do código, o documento está errado.

O app é dark-only e tem uma cor por treino. O sistema mora em três lugares:

- **Tokens** em [`app/globals.css`](../app/globals.css) (`@theme`): cor, fonte, tamanho, raio.
- **Utilitários de componente** no mesmo arquivo (`@utility`): botão, card, campo, rótulo, alternância.
- **Peças com comportamento** em [`components/ui/`](../components/ui/): modal, sheet, linha de ajuste, ícones.

Não há biblioteca de componentes nem de gráficos: num PWA offline, bundle é feature.

---

## Tokens

### Cor

| Token | Classe | Uso |
|---|---|---|
| `--color-bg` | `bg-bg` | fundo da página |
| `--color-surface` | `bg-surface` | card |
| `--color-surface2` | `bg-surface2` | campo, botão neutro, trilho |
| `--color-border` | `border-border` | borda padrão |
| `--color-text` | `text-text` | texto |
| `--color-muted` | `text-muted` | texto secundário (5,2:1, passa AA em texto pequeno) |
| `--color-danger` / `success` / `warn` / `gold` | `text-danger`… | erro, ganho, atenção, recorde |
| `--color-on-accent` | `text-on-accent` | texto sobre a cor do treino |
| `--color-brand` | `text-brand`… | lilás do símbolo (ícone e abertura). Fixo: não segue treino nem tema |

### Cor do treino

Cada treino tem `accent` e `accent_bg` no plano. Na tela eles viram as variáveis `--ac` e
`--ac-bg`, definidas **no container** com `accentVars()`:

```tsx
<div style={accentVars(workout.accent, workout.accent_bg)}>
  <button className="btn-primary">…</button>   {/* segue a cor */}
  <p className="text-ac">…</p>
</div>
```

Tudo dentro herda: `text-ac`, `bg-ac`, `border-ac`, `bg-ac-bg`, `border-ac/60`, e os
utilitários de botão. Componente filho **não recebe `accent` por prop** só pra pintar.

- **Portal não herda.** Sheet, diálogo e tela cheia montam no `body`, fora do container: quem
  abre passa `style={accentVars(accent)}` pro painel (`Sheet` aceita `style`).
- Fora de um treino (landing, métricas, histórico sem plano), a cor é `DEFAULT_ACCENT`, o mesmo
  valor do `--ac` padrão do `:root`.
- Tint (fundo claro de bolinha, pílula) é `bg-ac/14`, que vira `color-mix` com a cor. Hex com
  alfa (`${accent}22`) não.
- Categoria de skill (Puxar, Empurrar, Core, Pernas) usa `CATEGORY_ACCENT`. A lista das
  categorias é `SKILL_CATEGORIES` em `lib/plan/skills.ts`, a mesma que valida catálogo e backup.
- Hex literal em componente não: as cores vêm do plano, de `accent.ts` ou dos tokens.

### Tipografia

| Fonte | Classe | Uso |
|---|---|---|
| DM Sans | padrão | texto |
| DM Mono | `font-mono`, `.tnum` | rótulos, números alinhados |
| Barlow Condensed | `display`, `display-caps` | título e número grande. `display-caps` só em título curto |

Escala: a do Tailwind mais três degraus que o app usa muito, `text-3xs` (10px), `text-2xs`
(11px) e `text-md` (15px). Os três herdam a altura de linha, como o valor arbitrário fazia.

A fonte display tem escala própria, com a altura de linha sempre explícita (`leading-*`):

| Classe | Tamanho | Onde |
|---|---|---|
| `text-display-sm` | 26px | nome do exercício (card, sheet) |
| `text-display` | 34px | pergunta do onboarding, título e números do fim de treino |
| `text-display-lg` | 60px | cronômetro de descanso |
| `text-display-xl` | 72px | número do stepper |
| `text-display-hero` | 84px | número herói do fim de treino |

Título de página usa a escala comum (`text-3xl`).

### Forma e toque

- `rounded-card` (14px) em card; `rounded-xl` em botão e campo; `rounded-full` em chip.
- `tap`: alvo mínimo de 44×44 em todo elemento tocável.
- `--nav-height`: altura da barra de navegação, pra posicionar o que é fixo.

---

## Utilitários

| Classe | O que é |
|---|---|
| `btn-primary` | ação principal, **uma por tela**: gradiente leve na cor do treino |
| `btn-secondary` | tint + borda na cor; preenche ao pressionar |
| `btn-outline` | só contorno na cor (finalizar, adicionar; `border-dashed` pra "adicionar") |
| `btn-neutral` | cancelar, voltar |
| `btn-danger` / `btn-inverse` | confirmação destrutiva / neutra de alto contraste |
| `btn-key` | tecla física (stepper): afunda ao tocar |
| `card` | card neutro (superfície + borda + raio) |
| `glow` | borda na cor do treino, pro destaque da tela |
| `eyebrow` / `eyebrow-lg` | rótulo mono em caixa alta, 11px (bloco) / 12px (seção) |
| `field` | input e textarea; a altura (`py-*`) fica com quem usa |
| `toggle` | chip ou opção de grade. Ligado = preenchido na cor do treino |
| `option` | card de resposta (onboarding). Marcado = borda na cor + `--ac-bg` |

Os utilitários de botão definem só cor e superfície. Tamanho, raio e peso da fonte ficam no
`className` de quem usa: `btn-primary tap w-full rounded-xl py-3.5 font-medium`.

`toggle` e `option` **leem o estado do `aria-pressed` ou `aria-checked`**. Não existe classe
de "selecionado": se o atributo está certo pro leitor de tela, o visual também está.

```tsx
<button aria-pressed={on} className="toggle tap rounded-full px-3 text-sm text-muted">
```

A cor do texto desligado (`text-muted` ou `text-text`) fica com quem usa; ligado, o seletor
de atributo vence.

Animação: `anim-*` (entrada), `pr-screen`/`pr-drain` (tela de recorde), `rest-wave`
(cronômetro). Com "reduzir movimento" tudo encurta pra quase zero, e os loops param. Tela
cheia entra por opacidade, nunca com flash ou corte seco: no celular isso lê como bug.

- **Sequência de tela** (carregamento da missão, nível concluído, semana passada): cada peça
  recebe o atraso em `--d` (`style={{ "--d": "450ms" }}`) e as classes leem dele:
  `anim-rise` (sobe), `anim-lit` (acende), `anim-unlock` (destranca), `anim-reveal` (círculo
  abrindo a partir do botão tocado), `ladder-fill` / `load-fill` / `anim-grow-x` (traço ou
  barra crescendo), `check-draw-at` (check desenhado).
- **Número contando:** `useTimeline` + `countAt`/`progressAt` (`lib/domain/timeline.ts`).
  Na home e em Evolução conta só na primeira abertura desde que o app carregou
  (`useFirstView`): contar toda vez que a pessoa volta pra aba cansa e atrasa a leitura.

---

## Componentes (`components/ui/`)

| Componente | Uso |
|---|---|
| `Modal.tsx` → `Dialog`, `Sheet`, `ModalShell` | todo overlay. Trava foco, Esc, scroll lock e portal vêm juntos (`useModalA11y`). `Sheet draggable` fecha arrastando a alça; só onde o conteúdo não rola |
| `ConfirmDialog` | confirmação (sair, apagar), com atalho secundário opcional |
| `PageHeader`, `BackLink` | topo de página e volta pra tela-mãe |
| `SettingsGroup`, `SettingsRow` | lista agrupada de Ajustes e Evolução |
| `Toast` | aviso com "desfazer" |
| `Skeleton` | placeholder de carregamento |
| `icons.tsx` | ícones de traço (`stroke(d)`), 1.8 padrão e 2.2 em ação |
| `accent.ts` | `accentVars`, `DEFAULT_ACCENT`, `CATEGORY_ACCENT` |
| `ProgressRing`, `RollingNumber`, `DuotoneImage`, `Switch` | peças específicas |
| `Splash` | abertura no carregamento da página (A desenhado + nome). Sequência em CSS (`.splash*`), parada de 1 s e saída no componente; fora da landing |

---

## Temas

Dois estilos, escolhidos em Ajustes → Aparência: **padrão** (o de sempre) e **tático**
(escuro militar, cantos retos, caixa alta, scanlines). Decisão em
[PLAN-tema-tatico.md](PLAN-tema-tatico.md).

- O tema mora em atributos do `<html>`: `data-theme="tatico"`, `data-tone` (verde, ciano,
  ambar, oliva, gelo) e `data-scanlines`. No padrão não há atributo nenhum.
- Quem marca é o boot script do `<head>` (`THEME_BOOT_SCRIPT` em `lib/utils/theme.ts`), antes
  da primeira pintura. Ajustes chama `setThemePref`, que grava e reaplica na hora.
- **Nenhum componente decide nada pelo tema.** O tático é um bloco no fim de `globals.css`
  que redefine os tokens (cor, raio) e restiliza utilitários e alguns ganchos de classe.
  Componente não lê o tema em JS: o HTML estático tem que ser o mesmo nos dois (regra 10).
- **Cor do treino trocável:** no tático todos os treinos (e as categorias de skill) ficam na
  cor do tom. Por isso toda cor de treino passa por `accentVars`, `themedAccent` ou
  `themedAccentBg`, que escrevem `var(--theme-ac, <hex do plano>)`. No padrão
  `--theme-ac` não existe e vale o hex.
- `--rest-color`: cor do descanso no tático (laranja de alerta); no padrão não existe e o
  cronômetro segue o treino.

Ganchos de classe que só o tático usa (no padrão não fazem nada):

| Classe | Onde | No tático |
|---|---|---|
| `session-progress` | trilho da barra da sessão | vira blocos (máscara) |
| `set-chip` + `data-state` | série no `SetBySetPanel` | `[ 8 ]` vazado; feita acende |
| `done-mark` | check do exercício fechado | quadrado com brilho |
| `rest-clock` | número do descanso | laranja com brilho |
| `app-nav` | `BottomNav` | caixa alta; aba ativa com seta e traço |
| `mission-screen` | fundo das telas cheias da campanha | grade e varredura |
| `load-bar` | barra da tela de carregamento | blocos |
| `ladder-node` + `data-state` | degrau da `SkillLadder` | vencido com brilho |

A landing usa a cor fixa (`DEFAULT_ACCENT` literal): quem chega nela ainda não escolheu tema.

---

## Regras

1. Cor e tamanho saem de token. `text-[11px]`, `#8174e8` ou `style={{ color: "var(--color-danger)" }}`
   num componente novo é sinal de que falta usar (ou criar) um token.
2. `style` inline só pra valor que muda em runtime: largura de barra, quadro de animação, cor
   de um treino que não é o da tela (pílulas, heatmap, lista de treinos). Cor de treino
   inline passa por `themedAccent`/`themedAccentBg`, senão fica fora do tema tático.
3. Estado visual de seleção vem do atributo ARIA (`toggle`, `option`).
4. Overlay novo usa `Dialog` ou `Sheet`, nunca `Portal` + `useModalA11y` à mão. Exceção:
   **tela cheia que é cena** (fim do treino, carregamento da missão, nível concluído, semana
   passada). Não tem alça, cartão nem fundo escurecido, então `Dialog`/`Sheet` não servem;
   essas seguem o `SessionSummary` (`Portal` + `useModalA11y`, `role="dialog"`).
5. Mudança **visual** passa por protótipo antes do código. Este sistema só deu nome ao que já
   existia: a migração foi validada com screenshot pixel a pixel antes/depois.

---

## Decisões

- **Utilitário CSS em vez de componente `<Button>`.** Os botões variam em largura, altura, peso
  e layout de tela pra tela. Um componente precisaria aceitar `className` e resolver conflito
  de classe (`py-3` contra `py-3.5`), o que pede `tailwind-merge` ou uma API de variantes por
  tamanho. A classe `btn-*` já era o padrão do repo (`btn-primary` existia) e fica só com a
  cor. Componente fica pro que tem comportamento (modal, sheet, linha de ajuste).
- **Estado pelo ARIA, não por classe condicional.** Antes cada chip montava um `style` com
  ternário (`on ? accent : border`), e o atributo `aria-pressed` vivia separado. Agora um é o
  outro.
- **`--ac` herdado em vez de `accent` por prop.** Seis componentes de sessão recebiam
  `accent` só pra repetir no `style`. A exceção é o portal, que não herda.

---

## Inconsistências corrigidas (2026-10-24)

Achadas na migração, mantidas até ele aprovar o protótipo, e aplicadas depois:

- Os seis botões principais de cor chapada (onboarding, "Começar", "Finalizar", "Confirmar"
  do ajuste, "Criar e adicionar") passaram a `btn-primary`. O `btn-solid` deixou de existir.
- Os seis tamanhos soltos de display viraram a escala acima; só o título do fim de treino
  mudou na tela (38 → 34px).
- Os textareas do fluxo com IA passaram a `field`.
- O tint do mapa de skills passou de hex com alfa pra `bg-ac/14`.
- O heatmap deixou o gradiente em hex e passou a derivar do `DEFAULT_ACCENT` e do
  `--color-surface2`.
