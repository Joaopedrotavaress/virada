---
name: Virada
description: "Toda partida tem um ponto de virada. Ache o seu."
colors:
  action: "#ffd100"
  on-action: "#0b0b0d"
  night-bg: "#0b0b0d"
  night-surface: "#17171b"
  night-sunken: "#26262c"
  night-ink: "#eeeef1"
  night-muted: "#a9a9b1"
  night-line: "#34343b"
  day-bg: "#e6e6ea"
  day-surface: "#f7f7f8"
  day-sunken: "#d8d8de"
  day-ink: "#0b0b0d"
  day-muted: "#4c4c55"
  day-line: "#bcbcc4"
  zone-0: "#0b0b0d"
  zone-1: "#17171b"
  zone-2: "#26262c"
  zone-3: "#3a3a41"
  zone-4: "#4e4e57"
  zone-5: "#6a6a73"
  zone-6: "#868690"
  zone-7: "#a6a6ae"
  zone-8: "#b9b9c0"
  zone-9: "#d8d8de"
  zone-10: "#f4f4f6"
  board-dark: "#6a6a73"
  board-light: "#b9b9c0"
  board-notation-on-dark: "#f4f4f6"
  board-notation-on-light: "#3a3a41"
  board-last: "rgb(255 255 255 / 0.32)"
  board-from: "rgb(255 255 255 / 0.32)"
  board-select: "rgb(255 255 255 / 0.5)"
  board-hint: "rgb(11 11 13 / 0.55)"
  board-mated: "#c81e3a"
  arrow-best: "#0e8a7d"
  arrow-threat: "#d12d2d"
  fill-book: "#74747d"
  fill-brilliant: "#16c2bb"
  fill-great: "#2a6fd1"
  fill-best: "#f4f4f6"
  fill-excellent: "#1f8a45"
  fill-good: "#6a6a73"
  fill-inaccuracy: "#c28a00"
  fill-mistake: "#bd5206"
  fill-blunder: "#a30f2e"
  fill-miss: "#8446dc"
  on-fill: "#ffffff"
  on-fill-best: "#0b0b0d"
  on-fill-brilliant: "#04201f"
  on-fill-inaccuracy: "#0b0b0d"
  text-inaccuracy-day: "#7a5a00"
  text-inaccuracy-night: "#e6ae3a"
  text-mistake-day: "#ab4805"
  text-mistake-night: "#f5944c"
  text-blunder-day: "#a30f2e"
  text-blunder-night: "#f97f8c"
  text-miss-day: "#6c34bd"
  text-miss-night: "#bb99f7"
  positive-day: "#1f7a33"
  positive-night: "#68d278"
  share-white: "#f4f4f6"
  share-black: "#26262c"
  share-mid: "#868690"
typography:
  numeral:
    fontFamily: "Barlow Condensed, Figtree Variable, sans-serif"
    fontSize: "6.5rem"
    fontWeight: 800
    lineHeight: 0.85
    letterSpacing: "-0.05em"
    fontFeature: "tnum"
  numeral-compact:
    fontFamily: "Barlow Condensed, Figtree Variable, sans-serif"
    fontSize: "3.75rem"
    fontWeight: 800
    lineHeight: 0.85
    letterSpacing: "-0.05em"
    fontFeature: "tnum"
  display:
    fontFamily: "Barlow Condensed, Figtree Variable, sans-serif"
    fontSize: "2.25rem"
    fontWeight: 800
    lineHeight: 1
  placa-title:
    fontFamily: "Barlow Condensed, Figtree Variable, sans-serif"
    fontSize: "1.75rem"
    fontWeight: 800
    lineHeight: 1
  headline:
    fontFamily: "Barlow Condensed, Figtree Variable, sans-serif"
    fontSize: "1.875rem"
    fontWeight: 700
    lineHeight: 1.2
  title:
    fontFamily: "Barlow Condensed, Figtree Variable, sans-serif"
    fontSize: "1.25rem"
    fontWeight: 700
    lineHeight: 1.4
  wordmark:
    fontFamily: "Barlow Condensed, Figtree Variable, sans-serif"
    fontSize: "1.5rem"
    fontWeight: 800
    letterSpacing: "0.025em"
  body:
    fontFamily: "Figtree Variable, ui-sans-serif, system-ui, sans-serif"
    fontSize: "1rem"
    fontWeight: 400
    lineHeight: 1.5
  body-strong:
    fontFamily: "Figtree Variable, ui-sans-serif, system-ui, sans-serif"
    fontSize: "1rem"
    fontWeight: 600
    lineHeight: 1.5
  label:
    fontFamily: "Figtree Variable, ui-sans-serif, system-ui, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 600
    lineHeight: 1.43
  caption:
    fontFamily: "Figtree Variable, ui-sans-serif, system-ui, sans-serif"
    fontSize: "0.75rem"
    fontWeight: 600
    lineHeight: 1.33
  board-notation:
    fontFamily: "Figtree Variable, ui-sans-serif, system-ui, sans-serif"
    fontSize: "11px"
    fontWeight: 700
    lineHeight: 1
rounded:
  none: "0px"
  sm: "2px"
  md: "3px"
  full: "9999px"
spacing:
  "2": "8px"
  "3": "12px"
  "4": "16px"
  "5": "20px"
  "6": "24px"
  "10": "40px"
  "12": "48px"
components:
  button-primary:
    backgroundColor: "{colors.action}"
    textColor: "{colors.on-action}"
    typography: "{typography.body-strong}"
    rounded: "{rounded.md}"
    padding: "0 20px"
    height: "48px"
  button-secondary:
    textColor: "{colors.night-ink}"
    typography: "{typography.body-strong}"
    rounded: "{rounded.md}"
    padding: "0 20px"
    height: "48px"
  button-secondary-hover:
    backgroundColor: "{colors.night-sunken}"
  button-on-placa:
    backgroundColor: "{colors.on-action}"
    textColor: "{colors.action}"
    typography: "{typography.body-strong}"
    rounded: "{rounded.md}"
    padding: "0 16px"
    height: "44px"
  input:
    backgroundColor: "{colors.night-surface}"
    textColor: "{colors.night-ink}"
    typography: "{typography.body}"
    rounded: "{rounded.md}"
    padding: "0 12px"
    height: "48px"
  placa:
    backgroundColor: "{colors.action}"
    textColor: "{colors.on-action}"
    rounded: "{rounded.none}"
    padding: "12px 20px"
  placa-compact:
    backgroundColor: "{colors.action}"
    textColor: "{colors.on-action}"
    rounded: "{rounded.none}"
    padding: "8px 16px"
  choice-selected:
    backgroundColor: "{colors.night-ink}"
    textColor: "{colors.night-bg}"
    typography: "{typography.label}"
    height: "44px"
  choice-idle:
    backgroundColor: "{colors.night-surface}"
    textColor: "{colors.night-ink}"
    typography: "{typography.label}"
    height: "44px"
  coach-card:
    backgroundColor: "{colors.night-surface}"
    textColor: "{colors.night-ink}"
    typography: "{typography.body}"
    rounded: "{rounded.md}"
    padding: "16px"
  bot-row:
    backgroundColor: "{colors.night-surface}"
    textColor: "{colors.night-ink}"
    padding: "8px 12px"
    height: "56px"
  nav-item:
    textColor: "{colors.night-muted}"
    typography: "{typography.caption}"
    height: "56px"
  nav-item-current:
    textColor: "{colors.night-ink}"
---

# Design System: Virada

## Overview

**Creative North Star: "Da Sombra à Placa"**

Uma jogada famosa sai do escuro, casa por casa, até o lance que decidiu, e uma placa amarela entrega a história. Todo o sistema serve a esse gesto: um fundo quase preto, uma escala de 11 tons que parece uma exposição de foto, um tabuleiro cinza neutro e um único amarelo chapado. O Virada recusa o painel escuro com verde que a categoria sempre usa. Quem chega depois de perder enxerga primeiro um tabuleiro e um número, e não um painel de métricas.

O tema da noite é o padrão, e o do dia só vale quando a pessoa escolhe. É o tema para o qual o Virada foi desenhado, porque o uso principal é no celular, logo depois de jogar. O tema do dia troca só as superfícies e os textos: a escala de tons, o amarelo, o tabuleiro e os selos são os mesmos nos dois. O tema segue a preferência do aparelho e não há seletor dentro do app.

O carinho aparece nos detalhes, não em enfeite: retratos desenhados à mão em casas de tabuleiro, bordões, um professor de boteco e o rodapé assinado. Títulos em letra condensada e pesada, cantos quase retos e nenhum gradiente dão o tom de placa de rua. Tudo que é tarefa continua calmo: no meio de um exercício, a personalidade não atrapalha.

**Key Characteristics:**
- Um só amarelo chapado (#ffd100), reservado ao que dá para tocar e ao lance que decide.
- Escala de 11 tons, visível como barra de 6px no topo das telas de navegação.
- Superfícies chapadas: a profundidade vem do tom, quase nunca de sombra.
- Cantos de 2px e 3px; a placa não tem canto nenhum.
- Barlow Condensed pesada para anunciar, Figtree para ler.
- Lance comum é neutro. Cor forte só no erro e no lance que merece festa, e sempre com símbolo junto.
- A geometria recorrente é a casa do tabuleiro: símbolo, retratos e ondas são feitos dela.

## Colors

Cinzas levemente frios mais um amarelo de sinalização; as outras cores só existem para classificar erros e para as setas.

### Primary
- **Amarelo Placa** (#ffd100): botão principal, traço da seção atual na navegação, interruptor ligado, placa, casa-chave da Revelação, linha do ponto de virada no gráfico de avaliação e casa central do símbolo. Também colore a seleção de texto e o cursor de digitação.
- **Preto Placa** (#0b0b0d): todo texto sobre o amarelo. Na placa e nos cartões amarelos, inverte: um botão preto com letra amarela é a ação dentro de um cartão amarelo.

### Neutral

| Papel | Noite | Dia | Uso |
|---|---|---|---|
| Fundo | Breu (#0b0b0d) | Cinza Dia (#e6e6ea) | Fundo da página e da navegação inferior |
| Superfície | Carvão (#17171b) | Papel Frio (#f7f7f8) | Cartão do treinador, lista de bots, campos, diálogos |
| Rebaixado | Grafite (#26262c) | Cinza Rebaixado (#d8d8de) | Passar o ponteiro em botões e linhas, trilho das barras |
| Texto | Giz (#eeeef1) | Tinta (#0b0b0d) | Texto principal; também é o contorno de foco |
| Texto apagado | Giz Apagado (#a9a9b1) | Tinta Apagada (#4c4c55) | Ajuda, metadados, itens fora da seção atual |
| Linha | Fio Noturno (#34343b) | Fio Diurno (#bcbcc4) | Bordas de 1px e divisórias |

**Escala de 11 tons**, a mesma nos dois temas, da zona 0 à zona 10: #0b0b0d, #17171b, #26262c, #3a3a41, #4e4e57, #6a6a73, #868690, #a6a6ae, #b9b9c0, #d8d8de, #f4f4f6. É a barra do topo, o V do símbolo, o tabuleiro, os retratos dos bots e a barra de rolagem (zona 5).

### Tabuleiro
- **Casa escura** (#6a6a73, zona 5) e **casa clara** (#b9b9c0, zona 8): cinza neutro nos dois temas.
- **Coordenadas** em 11px e peso 700, por cima das peças da borda: #d8d8de sobre a casa escura, #3a3a41 sobre a clara.
- **Último lance e origem da dica** (branco a 32%) e **peça selecionada** (branco a 50%): mudança de tom, nunca cor.
- **Lances possíveis** (preto #0b0b0d a 55%): ponto central numa casa vazia, anel numa captura.
- **Rei em xeque-mate** (#c81e3a): a casa inteira, na Revelação.
- **Casa do lance classificado:** a cor do selo a 48% misturada à casa.
- **Setas:** melhor lance em verde-azulado (#0e8a7d), ameaça do adversário em vermelho (#d12d2d). São valores literais porque a biblioteca do tabuleiro usa a cor no identificador da seta.
- **Barra e gráfico de avaliação:** a parte clara é das brancas (#f4f4f6), a escura das pretas (#26262c), o meio é #868690. No computador, a barra fica em pé, com 24px. No celular, ela vira uma linha de 6px acima do tabuleiro, de ponta a ponta, e o número aparece no cartão do treinador.

### Classificações
As classes aparecem como selo (fundo e símbolo fixos nos dois temas) e como texto (com contraste próprio por tema). O detalhe de cada selo está em Components.

### Named Rules
**A Regra da Placa.** O amarelo é só para ação, para o lance em destaque na Revelação e para a linha discreta do gráfico. Se não dá para tocar e não marca esse lance, não é amarelo. No tabuleiro, o resto é mudança de tom.

**A Regra do Acerto.** A única exceção aceita é o acerto de exercício: a onda e o flash amarelos na casa do lance certo. Ela dura menos de um segundo e some sozinha. O código ainda tem barras de progresso e um aviso de análise em segundo plano em amarelo; eles divergem da regra e não servem de modelo.

**A Regra da Cor com Motivo.** Lance comum é neutro: Melhor, Bom e Livro usam branco e cinzas. Cor forte aparece nos erros (Imprecisão, Erro, Erro grosseiro e Chance perdida) e nos dois lances que a pessoa quer conquistar: Excelente, em verde, e Brilhante, em verde-azulado. Nunca sozinha: o símbolo garante a leitura sem cor.

**A Regra do Fundo Fixo.** O símbolo e os retratos ficam sobre tons escuros fixos da escala, para lerem igual nos dois temas.

## Typography

**Fonte de display:** Barlow Condensed, pesos 700 e 800 (recai em Figtree)
**Fonte de texto:** Figtree Variable (recai em ui-sans-serif, system-ui, sans-serif)

**Caráter:** a condensada pesada anuncia como letreiro de rua; a Figtree, humanista e arredondada, explica como gente. As fontes vêm empacotadas no app e funcionam sem internet.

### Hierarchy
- **Número da placa** (800, 6.5rem, altura de linha 0.85, espaçamento -0.05em, algarismos tabulares): o número do lance na placa.
- **Display** (800, 2.25rem, altura de linha 1; 3.75rem na tela larga para visitantes novos e 3rem para quem volta): o título da tela inicial.
- **Título da placa** (800, 1.75rem, altura de linha 1): a frase ao lado do número.
- **Headline** (700, 1.875rem, altura de linha 1.2): título de tela, como "Quem vai sentar do outro lado?".
- **Title** (700, 1.25rem, altura de linha 1.4; 1.125rem no nome dos bots): títulos de seção e o enunciado dos exercícios.
- **Logotipo** (800, 1.5rem, espaçamento 0.025em; 1.25rem no cabeçalho da tela larga).
- **Body** (Figtree 400, 1rem, altura de linha 1.5; 1.625 no comentário do treinador): texto corrido, limitado à largura de leitura (65ch). Em botões, peso 600.
- **Label** (Figtree 600, 0.875rem): rótulos de campo e opções. Ajuda e metadados usam o mesmo tamanho em peso 400 e texto apagado.
- **Caption** (Figtree 600, 0.75rem): rótulos da navegação inferior.
- **Coordenadas** (Figtree 700, 11px): letras e números do tabuleiro.

### Named Rules
**A Regra do Letreiro.** Títulos de tela e de seção, nomes de bots e números de impacto usam Barlow Condensed. Parágrafos, rótulos e botões usam Figtree.

**A Regra do Número Alinhado.** Avaliações, forças dos bots, contagens e números da placa usam algarismos tabulares, para não dançarem quando mudam.

## Layout

O app é feito primeiro para o celular. Até 1024px, a navegação fica fixa embaixo (56px de altura, respeitando a área segura) e o logotipo aparece no topo do conteúdo; a partir de 1024px, ela sobe para um cabeçalho com o logotipo. A barra de tons de 6px fica no topo de todas essas telas.

- **Larguras:** telas de consulta até 64rem (1024px), configuração de bots até 36rem, telas de tabuleiro até 72rem.
- **Primeira visita:** no celular, tabuleiro, placa de ponta a ponta, campo do usuário, título e o restante. Na tela larga, duas colunas (até 26rem para o tabuleiro e a placa, e o resto para o texto), com 48px entre elas. O tabuleiro tem margem de 20px no celular, enquanto o contrato de direção pedia largura de tela, e encolhe em telas baixas para a placa continuar à vista.
- **Quem volta:** coluna principal e coluna de 22rem com as partidas recentes.
- **Tabuleiro em uso:** tela cheia, sem a navegação. O tabuleiro fica sempre à vista, e o texto fica embaixo no celular e ao lado na tela larga, rolando sozinho.
- **Revisão no celular:** de cima para baixo, cabeçalho, linha da avaliação, tabuleiro de ponta a ponta, fila de lances que rola para os lados, abas, comentário e uma barra fixa com Tocar, Melhor, Tentar e o próximo passo em amarelo. O tabuleiro cede altura só em tela baixa, reservando 21rem para o resto.
- **Ritmo:** passos de 4px. Os mais usados são 8px entre botões, 12px e 16px dentro de blocos, 24px entre grupos, 40px e 48px entre seções, com 16px ou 20px de margem lateral.
- **Alvos de toque:** 44px no mínimo, 48px em botões principais e 56px na navegação e nas linhas de bot.

## Elevation & Depth

O sistema é chapado e usa camadas de tom: fundo, superfície e rebaixado separam os planos, e bordas de 1px fazem o resto. Cartões, botões e a placa não têm sombra. Diálogos ficam sobre um véu preto a 50%.

### Shadow Vocabulary
- **Dica do gráfico** (`box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)`): a caixinha flutuante dos gráficos de avaliação, relógio e progresso.
- **Aviso de atualização** (`box-shadow: 0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)`): o aviso flutuante de nova versão.
- **Halo da peça capturada** (`filter: drop-shadow(0 0 1px #f4f4f6)`): só no tema da noite, para peças pretas capturadas não sumirem no fundo.

### Named Rules
**A Regra do Chapado.** Sombra só no que flutua sobre o conteúdo sem ser diálogo. O que está no fluxo da página fica plano.

## Shapes

A forma de base é a casa do tabuleiro. Cantos quase retos e nenhuma curva decorativa.

- **Sem canto (0):** placa, barra de tons, casas e tabuleiro da Revelação, onda do acerto.
- **Canto mínimo (2px):** tabuleiro de jogo, retratos dos bots, logotipo clicável.
- **Canto padrão (3px):** botões, campos, cartões, diálogos e avisos.
- **Proporcionais:** o símbolo tem raio de 4 em 64, e o selo de classificação tem raio de 6 em 100.
- **Círculo:** só para o que é físico ou mínimo: interruptor, barras de progresso, pontos de cor e o botão "?" compacto da legenda.
- **Bordas:** 1px no tom de linha. O traço da seção atual na navegação tem 3px em amarelo.
- **Foco:** contorno de 2px na cor do texto, afastado 2px, em todos os controles.

## Components

### Símbolo e logotipo
Um V desenhado em casas de tabuleiro: desce, vira na casa amarela e sobe mais forte.

- **Grade:** quadro de 64 por 64 em zona 0, com raio de 4. Casas de 9.6 a cada 10.4, em cinco colunas e cinco linhas, começando em 7.
- **Traçado:** duas casas em zona 5 no alto, à esquerda; duas em zona 6; uma amarela no vértice; duas em zona 9; duas em zona 10 no alto, à direita. A subida termina mais clara que a descida.
- **Logotipo:** o símbolo seguido de "Virada" em Barlow Condensed 800, separados por 8px. São 28px de símbolo com letra de 1.5rem, ou 24px com 1.25rem no cabeçalho largo.
- **Fundo:** sempre o quadro escuro, nos dois temas. O favicon e os ícones do app usam o mesmo desenho.

### Barra de tons
As 11 zonas lado a lado, sem espaço, com 6px de altura. Fica no topo da navegação.

### Buttons
Botões retos e diretos, em que a cor diz qual é a próxima ação.

- **Forma:** canto de 3px, peso 600, altura de 44px a 56px.
- **Principal:** fundo amarelo, texto preto. Em geral um por contexto: nas telas com várias ações, quando a ação principal é outra, as demais perdem o amarelo. Não muda ao passar o ponteiro.
- **Secundário:** sem fundo, borda de 1px no tom de linha, e fundo rebaixado ao passar o ponteiro. "Analisar partida" usa borda na cor do texto.
- **Sobre amarelo:** fundo preto com texto amarelo, ou borda preta a 40% para a ação menor.
- **Desativado:** opacidade reduzida, de 35% a 60%.

### Escolhas e interruptores
- **Grupo segmentado** (profundidade, cor, relógio): células coladas, separadas por 1px de linha. A opção escolhida inverte para fundo na cor do texto e letra na cor do fundo.
- **Interruptor:** cápsula de 48 por 28, amarela quando ligada e no tom de linha quando desligada, com bolinha de 20px na cor do fundo.

**A Regra da Inversão.** Seleção se mostra invertendo texto e fundo, não com amarelo. Amarelo chama para agir; a inversão diz o que já está escolhido.

### Inputs / Fields
- **Estilo:** fundo de superfície, borda de 1px, canto de 3px, texto de 1rem e 48px de altura.
- **Foco:** contorno de 2px na cor do texto, afastado 1px.
- **Erro:** mensagem em peso 500 na cor de texto de Erro grosseiro, logo abaixo do campo.

### Cartões
- **Fundo:** superfície, sem sombra e sem borda, com canto de 3px e 16px a 20px de respiro interno.
- **Listas:** linhas separadas por divisória de 1px, sem cartão em volta, e fundo rebaixado ao passar o ponteiro.
- **Cartão amarelo:** fundo amarelo e botões invertidos, para a partida em andamento.

### Navigation
- **Celular:** cinco itens fixos embaixo (Início, Partidas, Treino, Aprender, Progresso), com ícone de 24px sobre rótulo de 0.75rem. Item atual com traço amarelo de 3px no alto e texto comum; os demais em texto apagado, que fica comum ao passar o ponteiro.
- **Tela larga:** logotipo e itens em linha, com ícone de 20px ao lado do rótulo de 0.875rem e o traço de 3px embaixo.

### Classificações de lance
Cada classe tem selo, símbolo e cor de texto. O selo é um quadrado desenhado com canto proporcional e contorno de 5 em 100 em zona 0, sobre o canto superior direito da casa (42% da largura dela) e com 32px na legenda. Escala com o tabuleiro.

| Classe | Fundo do selo | Sinal | Cor do sinal | Texto no dia | Texto na noite |
|---|---|---|---|---|---|
| Brilhante | #16c2bb | Sinal "!!" | #04201f | #0a7470 | #4fe3dc |
| Melhor | #f4f4f6 | Ícone de estrela | #0b0b0d | Texto comum | Texto comum |
| Excelente | #2a6fd1 | Sinal "!" | #ffffff | #1f5fb8 | #8dbcff |
| Ótimo | #1f8a45 | Ícone de polegar | #ffffff | #1f7a33 | #68d278 |
| Bom | #6a6a73 | Ícone de visto | #ffffff | Texto comum | Texto comum |
| Imprecisão | #c28a00 | Sinal "?!" | #0b0b0d | #7a5a00 | #e6ae3a |
| Erro | #bd5206 | Sinal "?" | #ffffff | #ab4805 | #f5944c |
| Erro grosseiro | #a30f2e | Sinal "??" | #ffffff | #a30f2e | #f97f8c |
| Chance perdida | #8446dc | Ícone de X | #ffffff | #6c34bd | #bb99f7 |
| Livro | #74747d | Ícone de livro aberto | #ffffff | Texto apagado | Texto apagado |

- **Ícones:** desenhados em SVG, porque sinais de texto dependem da fonte de cada aparelho. Os sinais de notação ("!", "?!", "?", "??") são texto em Figtree 800.
- **Brilhante e Excelente:** as regras estão em docs/classificacao.md. Ao chegar neles, uma onda na cor do selo sai da casa.
- **No cartão do treinador:** o sinal aparece grande (3.75rem, ícones de 56px) na cor de texto da classe, ao lado do nome da classe. No celular, o selo tem 28px e divide a linha com o lance e a avaliação.
- **Acessibilidade:** o selo tem o nome da classe como rótulo.

### Aula
Veja, faça, leve: o Seu Nonato mostra no tabuleiro, a pessoa pratica e sai com uma frase. O conteúdo e a pesquisa estão em docs/aprendizado.md.

- **Marcas no tabuleiro:** verde para onde ir ou o que dá certo, vermelho para o que é proibido ou perigoso, azul para o que olhar. Nunca amarelo, que continua só para ação.
- **Caminho:** cada nível tem a peça branca do tabuleiro (peão, cavalo, torre, dama) e uma fileira de casas sem canto, uma por aula. Verde para feita, amarelo para a próxima, zona 3 para o resto.
- **Vídeo:** só carrega quando tocado, com o crédito do canal.

### Placa
A resposta do app. Bloco amarelo sem canto, com o número gigante à esquerda, a frase ao lado e uma nota de 0.875rem em peso 600.

- **Na tela inicial:** o número do lance, o que aconteceu ("Entregou a dama e deu mate.") e a nota com a partida ("A Partida da Ópera: Morphy x Duque de Brunswick, 1858"). Vai de ponta a ponta no celular.
- **Compacta:** no resumo da revisão guiada ("Virou aqui", com o lance).
- **Movimento:** sobe de fora da tela (de 110vh ao lugar) em 550ms. Ao voltar para o início, já aparece parada.

### A Revelação
O movimento próprio do Virada: a partida se acende a partir da casa-chave, 3 lances acontecem, a casa-chave fica amarela, as peças derrubadas saem voando e a placa sobe. Só na tela inicial, e só com jogadas famosas: são 120 partidas reais, sorteadas a cada visita, e "Mostra outra" troca a jogada. Depois de analisar uma partida, nada interrompe: a análise abre direto.

- **Quais lances:** o lance em destaque e os dois seguintes, ou os 3 últimos quando a partida termina em mate logo depois. Os lances vêm da base PGN Mentor. O destaque é o lance célebre, nos clássicos marcados à mão; nas outras, o último sacrifício do vencedor que o Stockfish aprova ou, sem sacrifício, a resposta ao maior erro de quem perdeu ("O erro saiu caro.").

- **Casas:** acendem em onda a partir da casa-chave, com atraso de 150ms mais 85ms por casa de distância. Em 650ms, a opacidade vai de 0 a 1 e o brilho vai de 0.2 a 1.6 e volta a 1.
- **Tabuleiro:** assenta de -1.6 graus e 97% para o lugar, em 900ms, a partir de 700ms.
- **Peças:** surgem em 280ms, 200ms depois da própria casa.
- **Lances:** começam em 1250ms, com 400ms cada (300ms o último) e pausa de 300ms entre eles. A peça cresce até 120% no caminho.
- **Voo:** quando a outra peça chega, a capturada sai em arco por 1000ms, girando duas voltas, para o lado mais perto da borda: sobe quase 2 casas, anda 8 e cresce até 150%. Se o último lance é mate, o rei voa igual, no impacto. O arco evita que a peça suma logo, já que o tabuleiro da tela inicial fica no topo da página. A página recorta a largura em `#root`, porque no celular a peça encolheria a tela inteira.
- **Impacto:** a casa amarela acende em 160ms quando o lance em destaque está chegando, e a onda amarela (borda de 4px, de 100% a 450%, em 750ms) sai dela nesse instante. A origem e o rei em mate aparecem no começo do último lance. Quando ele termina, o tabuleiro desce 5px e volta, em 320ms.
- **Placa:** sobe 500ms depois do impacto, com a peça ainda no ar (3450ms com 3 lances).
- **Pular:** um toque encerra tudo. Na tela inicial, as animações vão direto ao fim.
- **Menos movimento:** nenhuma animação roda. O tabuleiro já mostra a posição final com as marcas e o rei em mate parado na casa vermelha e a placa aparece no lugar. O estado de repouso é sempre o certo.

### O acerto de exercício
Quando a pessoa acha o lance, sai uma onda amarela da casa dele. É decorativa, escondida de leitores de tela e some sozinha.

- **Flash na casa:** amarelo em modo de multiplicação, sobe a 85% de opacidade e sai em 900ms.
- **Onda:** borda amarela de 4px, de 100% a 500% com opacidade de 1 a 0, em 800ms.
- **Seta do melhor lance:** pulsa duas vezes, 900ms cada, quando aparece.
- **Texto:** "Achou!" em Barlow Condensed na cor positiva (#1f7a33 no dia, #68d278 na noite).
- **Menos movimento:** as animações terminam em 0.01ms, então a onda e o flash não aparecem. O acerto continua claro pelo texto.

### Outros movimentos
Peças deslizam em 140ms no tabuleiro de jogo e param de animar com menos movimento. A barra de avaliação muda de tamanho em 200ms e a barra de análise em 150ms. A regra global de menos movimento reduz qualquer transição ou animação de CSS a 0.01ms.

### Voz do treinador
Seu Nonato, um velho de boteco que joga xadrez no bar há décadas: direto, com humor de balcão e sem humilhar. Chama todo mundo de "chefia", palavra que serve para qualquer pessoa. A voz faz parte do acabamento, então vale para todo texto novo.

- **Quem fala o quê:** a abertura da fala e a lição são dele. O que aconteceu na posição continua vindo do Stockfish, sem floreio. A lição é geral, nunca cita lance da posição, para não estragar o "Tentar de novo".
- **Boteco sem exagero:** balcão, conta, mesa, dono do bar. Sem bebedeira e sem xingar.
- **Retrato:** 12 por 12 casas, careca, bigode branco e palito na boca, com quatro caras: neutra, feliz, brava e espantada. Quando tem coisa nova para dizer, ele fala: a boca abre e fecha a cada 120ms, a cabeça acompanha e o corpo fica parado. Pisca a cada 3,6 segundos. Com menos movimento, fica parado. Fica ao lado do cartão, que vira balão de fala, com 44px no celular e 64px com o nome na tela larga.

- **Frases curtas, falando com "você":** "Não é esse. Olha de novo.", "Achou! ... era o caminho.", "Esse volta logo, para fixar."
- **Coloquial sem exagero:** "Ô, chefia, calma. Tem lance bem melhor aqui.", "Deixa eu ver esse lance…", "Olha o garfo: ...", "Xeque-mate. Fim de papo: ...", "Teoria pura: esse lance está nos livros."
- **Abordagem de amigo:** "E aí, [usuário]?", "Quem vai sentar do outro lado?", "O adversário vacilou no lance anterior e a chance passou."
- **Honesta:** não elogia lance em posição perdida ("Era o melhor, mas já não tinha salvação"), e diz que a força dos bots é aproximada.
- **Concreta:** explica pelo motivo tático quando existe e, se não, pela avaliação e pelo lance do adversário. Lances em notação portuguesa.

### Bots
Doze personagens em ordem de força, cada um com nome, frase e retrato. Na escolha, a linha mostra retrato, nome em Barlow Condensed, descrição, bordão em itálico entre aspas e força. A linha escolhida inverte as cores. Durante a partida, aparece o retrato menor (24px).

**Retratos:** desenhados à mão em 8 por 8 casas com margem de uma casa, sem suavização, sobre zona 3. Quatro tons: zona 5 (cabelo ou roupa), zona 8 (pele), zona 10 (claro), zona 0 (escuro). Canto de 2px e 40px por padrão.

| Bot | Força | Frase | Retrato |
|---|---|---|---|
| Tio Beto | ~400 | "Essa torre eu nem queria mesmo." | Careca e de bigode |
| Duda | ~600 | "Se está solto, é meu." | Franja e camiseta clara |
| Seu Zé da Praça | ~800 | "Mais uma, que essa foi aquecimento." | Boina |
| Marli | ~1000 | "Essa ameaça eu vi. A outra, não." | Coque alto |
| Jorginho do Clube | ~1200 | "Aqui no clube, peça solta não dura." | Boné e camisa do clube |
| Rafa da Madrugada | ~1400 | "Só mais uma blitz e eu durmo." | Fone de ouvido |
| Dona Cida | ~1600 | "Quarenta anos de clube, meu bem." | Cabelo branco e óculos |
| Dr. Nogueira | ~1800 | "Vejamos a variante até o fim." | Óculos, barba e gravata |
| Bia Campeã | ~2000 | "Presente, só no aniversário." | Rabo de cavalo |
| Caio do Final | ~2200 | "Pode trocar tudo, o final é comigo." | Cabelo arrepiado e barba curta |
| Mestra Iara | ~2500 | "Já vi essa posição. Em 1998." | Cabelo longo e faixa clara |
| O Stockfish | força total | "Não erra, não cansa e não conversa." | Não tem rosto: é um peixe |

### Rodapé
A tela inicial termina com "Feito com carinho no Brasil" em Barlow Condensed 700, 1.25rem, na cor do texto e em linha própria. Abaixo, em 0.875rem e texto apagado, vêm o link "Seus dados e backup" e o crédito do Stockfish.js com a licença GPLv3.

## Do's and Don'ts

### Do:
- **Do** use o amarelo #ffd100 em botões principais, no traço da seção atual, e em interruptores ligados, sempre com texto #0b0b0d.
- **Do** mostre seleção invertendo texto e fundo.
- **Do** mantenha cantos em 3px nos controles e cartões, 2px no tabuleiro e nos retratos, e 0 na placa.
- **Do** separe planos com tom e borda de 1px.
- **Do** coloque símbolo junto de toda cor de classificação.
- **Do** desenhe novos ícones em SVG e novos retratos na mesma grade de 8 por 8 casas, com os quatro tons da escala.
- **Do** faça toda animação nova terminar no estado de repouso certo e respeitar a preferência por menos movimento, sem perder informação.
- **Do** escreva como o Seu Nonato: curto, direto, com "você" e "chefia".
- **Do** deixe o símbolo e os retratos sobre tons escuros fixos nos dois temas.

### Don't:
- **Don't** use amarelo em enfeite, em texto de leitura ou no tabuleiro, fora do lance em destaque na Revelação e do acerto de exercício.
- **Don't** use verde como cor de superfície ou de marca: o verde existe só no texto positivo e na seta do melhor lance.
- **Don't** dê cor forte a Melhor ou Bom.
- **Don't** use gradiente em superfícies nem sombra em cartões, botões e placas.
- **Don't** arredonde a placa.
- **Don't** use Barlow Condensed em parágrafos.
- **Don't** interrompa uma tarefa com personalidade: bordões ficam na escolha de bots, e a Revelação sempre pode ser pulada com um toque.
- **Don't** transforme a Revelação em animação de tela comum, nem a repita em cada partida: ela é só a abertura do app.
- **Don't** fale do ponto de virada nas partidas da pessoa: ele fica só como a linha discreta do gráfico.
