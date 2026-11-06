# Textos da landing page (/sobre)

> Todos os textos que estão no ar, na ordem em que aparecem na página. Versão de 05/11/2026,
> aprovada no protótipo (claude.ai/artifact/YUKVtFK3R7NreNegJsZb4h). Mexa à vontade: eu levo pra
> página.
>
> Público: quem vai de iniciante pra intermediário. Vocabulário: habilidade, progressão e nível,
> nunca escada nem degrau. O produto é "o Gravks"; "app" e "IA" não aparecem, com uma exceção na
> pergunta sobre quem passou do intermediário. Títulos sem ponto final.
>
> Entre colchetes estão as notas de onde e como o texto aparece. Níveis, critério, treino da demo e
> perguntas moram em `components/landing/content.ts`, conferidos por `test/landingContent.test.ts`.

## 1. Abertura

[Tela inteira. Foto: barra no celular, parada de mão no computador, ao lado do texto]

[Título]

Saiba o que treinar e quando subir de nível

[Texto de apoio]

O Gravks personaliza seu treino e te acompanha até você bater sua meta. É o que eu uso pra evoluir na calistenia.

[Botão]

Ver meu plano

[Abaixo do botão]

Grátis e sem anúncio.

## 2. Progressão

[Título]

Um nível de cada vez

[Linha abaixo]

Cada habilidade é dividida em níveis, e cada nível tem uma meta clara. Bateu a meta, você sobe.

[Linha menor]

Barra fixa é só um exemplo. São 17 habilidades, da flexão à planche.

[Cartão com três níveis, sem toque]

- ✓ Barra fixa negativa
- ● Barra fixa · seu nível
  Meta: 3 séries de 8, em 2 treinos seguidos
  [barrinha] 1 de 2 treinos
- ○ L-sit Pull-up
  Próximo nível

## 3. Aviso de novo nível

[Título]

Bateu a meta? O Gravks avisa

[Linha abaixo]

Ele olha o que você registrou e te diz a hora de subir.

[Cartão, acompanhando o nível marcado na seção 2]

**Próximo nível · desbloqueado**
Barra fixa → L-sit Pull-up
Você bateu a meta em 2 treinos seguidos, com execução limpa.

## 4. Demonstração

[Título]

Testa um treino aí

[Linha abaixo]

Um toque por série. O descanso começa sozinho e sua última vez fica no cartão.

[Demonstração tocável com o Treino A do plano intermediário com barra: Puxar + Corpo inteiro,
~27 min. Barra fixa 3 × 8, Flexão diamante 3 × 10, Pistol assistido 3 × 6/lado, Elevação de
joelhos na barra 3 × 10. No fim, o botão "Ver meu plano"]

## 5. Programa próprio

[Título]

Já segue um programa? Traz ele

[Linha abaixo]

O Gravks te guia pra colocar seu programa aqui. Não tem? Ele te passa um pro seu nível.

## 6. Quem fez

[Ao lado, sua foto em parada de mão na praia, em preto e branco]

[Título]

Quem fez

[Texto. O e-mail é link]

Treino calistenia por conta própria desde o começo de 2024. Sou um entusiasta: não sou coach e não tenho formação na área, então estudei muitos atletas de elite pra aprender execuções e progressões. Atualmente meu foco é muscle-up, parada de mão e front lever. Sou engenheiro e criei o Gravks em 2026 pra me ajudar a organizar meus treinos e progredir com consistência. Sigo usando e atualizando. Sentiu falta de algo? Me manda um e-mail: uailabs.br@gmail.com

## 7. Perguntas

[Fechadas; abrem ao tocar]

- **Preciso baixar alguma coisa?** Não. O Gravks abre direto no navegador. Se curtir, adiciona na tela inicial do celular e ele fica com ícone, igual aos outros.
- **É grátis mesmo? Qual a pegadinha?** Nenhuma. É grátis, sem anúncio e você nem precisa criar conta. Fiz pra mim e quero que ajude mais gente a progredir.
- **Já treino. Vou ter que começar do zero?** Não. Você conta em que nível está e o Gravks segue dali. Se chutar alto demais, dá pra ajustar depois em Nível e equipamento.
- **E se eu não souber fazer um exercício?** Todo exercício tem demonstração e dica de execução, pra você não ficar no achismo.
- **Não tenho barra. Serve pra mim?** Serve. Tem plano montado sem barra, com flexão, perna e parada de mão. Se arrumar uma barra depois, é só atualizar seu equipamento.
- **Já passei do intermediário. Ainda vale?** Vale. Os planos prontos vão até o intermediário, e daí pra frente o Gravks te guia a montar seu treino com IA, a partir do seu histórico.
- **Como o Gravks sabe se fiz direito?** No fim de cada exercício você marca se algo saiu errado, e só conta pra subir de nível o que saiu limpo.
- **E se eu trocar de celular?** Como não tem conta, seus treinos ficam no celular. Antes de trocar, salva um backup em Ajustes e abre no aparelho novo.
- **De onde vêm as progressões?** De referências conhecidas da calistenia, como o livro Overcoming Gravity e a rotina recomendada do r/bodyweightfitness.

[Botão final]

Ver meu plano

Grátis e sem anúncio.

## 8. Rodapé

Política de privacidade e termos de uso: texto em `components/landing/PrivacyPolicy.tsx`, fechado por
padrão. Com o canal de contato, aparece o item "Quando você manda feedback" e o link "me manda uma
mensagem" ao lado da data (atualizada pra 05/11/2026).

Ilustrações dos exercícios por RepDB

## Fora da página

### Aba do navegador e busca

- **Título:** Gravks: seu assistente de treino de calistenia
- **Descrição:** Saiba o que treinar e quando subir de nível. Plano pro seu nível, grátis e sem anúncio.

### Leitor de tela

- **Foto do Quem fez:** O autor do Gravks fazendo parada de mão na praia
- **Demonstração:** Demonstração: um treino do começo ao fim
- **Cartão do aviso:** Exemplo de aviso de novo nível

As fotos da abertura não têm descrição, de propósito: são decorativas.
