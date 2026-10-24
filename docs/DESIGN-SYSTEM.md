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
Títulos de tela e números de destaque ainda usam tamanho arbitrário (ver pendências).

### Forma e toque

- `rounded-card` (14px) em card; `rounded-xl` em botão e campo; `rounded-full` em chip.
- `tap`: alvo mínimo de 44×44 em todo elemento tocável.
- `--nav-height`: altura da barra de navegação, pra posicionar o que é fixo.

---

## Utilitários

| Classe | O que é |
|---|---|
| `btn-primary` | ação principal, **uma por tela**: gradiente leve na cor do treino |
| `btn-solid` | cor do treino chapada |
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

Animação: `anim-*` (entrada), `pr-*` (tela de recorde), `rest-wave` (cronômetro). Com
"reduzir movimento" tudo encurta pra quase zero, e os loops param.

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

---

## Regras

1. Cor e tamanho saem de token. `text-[11px]`, `#8174e8` ou `style={{ color: "var(--color-danger)" }}`
   num componente novo é sinal de que falta usar (ou criar) um token.
2. `style` inline só pra valor que muda em runtime: largura de barra, quadro de animação, cor
   de um treino que não é o da tela (pílulas, heatmap, lista de treinos).
3. Estado visual de seleção vem do atributo ARIA (`toggle`, `option`).
4. Overlay novo usa `Dialog` ou `Sheet`, nunca `Portal` + `useModalA11y` à mão.
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

## Pendências visuais

Inconsistências que a migração encontrou e **manteve** de propósito, porque mudar é mudança
visual e precisa de protótipo:

- **Primário com e sem gradiente.** "Continuar" e "Usar este plano" do onboarding, "Começar"
  do treino, "Finalizar" da sessão, "Confirmar" do ajuste manual e "Criar e adicionar" usam
  `btn-solid`; o resto usa `btn-primary`. Provavelmente deveriam ser todos `btn-primary`.
- **Títulos sem escala.** Os títulos e números grandes usam seis tamanhos arbitrários
  (`1.625rem`, `2.125rem`, `2.375rem`, `3.75rem`, `4.5rem`, `5.25rem`). Dá pra reduzir a três
  ou quatro degraus de `display`.
- **Campo sobre superfície.** Os dois textareas do fluxo com IA usam `card` como fundo, e
  não `field` (superfície mais clara). Os outros campos do app usam `field`.
- **Heatmap com paleta própria.** O quadrado de dia treinado é um gradiente em hex
  (`#ada5f0 → #8174e8 → #6e63c5`) ajustado à mão, não derivado do `DEFAULT_ACCENT`.
- **Tint por hex.** O mapa de skills pinta o fundo com `${accent}22` (hex com alfa); o resto do
  app usa `color-mix`. O resultado é parecido, mas não igual.
