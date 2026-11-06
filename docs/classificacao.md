# Como o Virada classifica os lances

O objetivo é chegar o mais perto possível do Chess.com. O algoritmo deles é fechado, então este documento separa o que eles dizem publicamente do que precisou ser estimado.

**Os nomes seguem o Chess.com em português:** lá, o lance "!" (Great, em inglês) se chama Excelente, o do polegar (Excellent) se chama Ótimo, e o "??" (Blunder) se chama Capivarada.

O código está em [`src/chess/classify.ts`](../src/chess/classify.ts), [`brilliant.ts`](../src/chess/brilliant.ts) e [`expectedPoints.ts`](../src/chess/expectedPoints.ts).

## O que é público e o que é estimado

| Assunto | O que o Chess.com publica | O que o Virada faz | Origem |
|---|---|---|---|
| Medida | Pontos esperados de 0 a 1, a partir do rating e da avaliação do motor | Igual | Público |
| Melhor | Perde 0,00 | Só o primeiro lance do motor | Público |
| Ótimo (polegar) | Até 0,02 | Igual | Público |
| Bom | 0,02 a 0,05 | Igual | Público |
| Imprecisão | 0,05 a 0,10 | Igual | Público |
| Erro | 0,10 a 0,20 | Igual | Público |
| Capivarada | 0,20 a 1,00 | Igual | Público |
| A curva de cada rating | Diz que existe, não publica | Medida em 157 mil partidas do Lichess | **Medido** por nós |
| Escala de rating | Não se aplica | Rating do Chess.com convertido para a escala do Lichess | **Estimado**, com a tabela do ChessGoals |
| Excelente (!) | De perdido para igual, de igual para ganho, ou o único lance bom. Mais generoso com rating baixo | Comparação com a segunda melhor linha | Ideia pública, números **estimados** |
| Brilhante | Sempre o melhor ou quase, um bom sacrifício de peça, sem deixar a posição ruim, sem já estar ganho. Mais generoso com rating baixo | As mesmas condições | Ideia pública, números **estimados** |
| Chance perdida | Não aproveitar o erro do adversário e perder a chance de posição ganha, em geral ficando igual ou pior | As mesmas condições | Ideia pública, números **estimados** |
| Livro | O artigo citado não detalha | Base de aberturas: enquanto a posição estiver nela | **Estimado** |
| Mate | Não publica | Regras por distância do mate | **Estimado** |
| Lance forçado | Não publica | Um único lance legal é Melhor e não pesa na precisão | **Estimado** |

## A curva de pontos esperados

Antes, o Virada usava a mesma curva para todo mundo. Agora ela depende do rating:

`pontos = 1 / (1 + e^(-k × centipeões))`

O valor de `k` foi medido com `scripts/medir-pontos-esperados.mjs`, na base aberta do Lichess de junho de 2024. Entraram 157 mil partidas com avaliação, sem bullet e entre jogadores de rating parecido.

| Rating (Lichess) | Partidas | k | Pontos com +3 |
|---|---:|---:|---:|
| Até 800 | 2.647 | 0,00175 | 0,63 |
| 800 a 1000 | 8.377 | 0,00205 | 0,65 |
| 1000 a 1200 | 16.163 | 0,00235 | 0,67 |
| 1200 a 1400 | 22.130 | 0,00260 | 0,69 |
| 1400 a 1600 | 28.265 | 0,00285 | 0,70 |
| 1600 a 1800 | 28.021 | 0,00310 | 0,72 |
| 1800 a 2000 | 23.802 | 0,00335 | 0,73 |
| 2000 a 2200 | 14.966 | 0,00345 | 0,74 |
| 2200 ou mais | 12.894 | 0,00350 | 0,74 |

Na prática: a mesma vantagem vale mais para quem joga melhor. Um lance que custa 3 peões, numa posição igual, é Erro para um jogador de 800 e Capivarada para um de 2200.

Duas conferências: os valores do topo ficam perto do `0,00368` da fórmula pública do Lichess, medida em jogadores fortes, e o ajuste por faixa acompanha o resultado observado.

**Limites.** A medição usa ratings e jogadores do Lichess, não do Chess.com. A conversão entre as escalas é uma estimativa com margem, e varia com o ritmo de jogo.

## A ordem das decisões

1. **Livro:** a posição está na base de aberturas.
2. **Forçado:** só existe um lance legal. É Melhor, com precisão 100.
3. **Brilhante:** as regras abaixo.
4. **Excelente (!):** as regras abaixo.
5. **Tamanho da perda:** a tabela pública, com os casos de mate.
6. **Chance perdida:** substitui a classe do passo 5, se as condições valerem.

### Brilhante

Tudo isto precisa valer:

- O lance entrega ao menos 2 pontos de material, já descontando o que capturou e o que já estava pendurado.
- Se o adversário capturar, quem jogou não recupera o mesmo valor de imediato em outra casa.
- Não é promoção, não é mate no lance, não é lance forçado.
- A perda fica abaixo de 0,02 com rating até 1000, e cai até 0,01 com rating 2000.
- Depois do lance, quem jogou tem ao menos 0,50 ponto.
- A alternativa (a segunda linha ou, se o lance não foi o do motor, o lance do motor) não dá mate e vale menos de 0,90.

### Excelente (!)

Tudo isto precisa valer:

- É o lance do motor, e a segunda linha está medida.
- A segunda linha fica atrás por 0,045 com rating até 1000, 0,08 com 1500 e 0,12 a partir de 2200.
- A partir de rating 1000, se os dois lances caem no mesmo estado (perdido, igual, ganho), a diferença precisa ser maior, até o dobro em 1800. É o caso do "único lance bom".
- A segunda linha vale menos de 0,90, e a posição depois do lance vale mais de 0,30.
- Não retoma a peça que acabou de chegar, em nenhum rating.
- Não é mate no lance, não é promover a dama, nem saída de xeque com até 2 opções.
- O lance não se repete na partida: num xeque perpétuo, só a primeira vez conta.
- A partir de rating 1200: não captura peça solta, nem troca de igual valor. Só vale a captura em que se entrega mais do que se leva. Abaixo disso, essas capturas contam, porque quem está começando pode não vê-las.

Os estados valem: perdido até 0,35, ganho a partir de 0,65. Como saem dos pontos, mudam com o rating, como o Chess.com descreve.

### Chance perdida

- O adversário perdeu 0,10 ou mais em um dos seus 3 últimos lances.
- Antes do lance havia posição ganha (0,65 ou mais), e depois não há mais.
- O lance perdeu 0,10 ou mais e não foi o do motor.

### Mate

| Situação | Classe |
|---|---|
| Mantém o mate, no ritmo certo | Melhor |
| Mantém, um lance mais longo | Ótimo |
| Mantém, até 5 lances mais longo | Bom |
| Mantém, mais longo que isso | Imprecisão |
| Largou o mate | Pela perda, tratando o mate como +10 |
| Já ia levar mate: encurtar por 1, até 5, ou mais | Ótimo, Bom ou Imprecisão |
| Permite mate numa posição já perdida | Erro, se em até 3 lances; senão, Imprecisão |

## Casos de teste

São mais de 90 casos em [`classify.cases.test.ts`](../src/chess/classify.cases.test.ts) e [`brilliant.test.ts`](../src/chess/brilliant.test.ts), além de 4 com o Stockfish de verdade em [`classify.real.test.ts`](../src/chess/classify.real.test.ts).

| Situação | Exemplo (rating 1500) | Resultado |
|---|---|---|
| Equilibrada | Lance do motor | Melhor |
| Equilibrada | +0,2 para 0,0 | Ótimo |
| Equilibrada | +0,2 para −0,2 | Bom |
| Equilibrada | +0,2 para −0,6 | Imprecisão |
| Equilibrada | +0,2 para −1,5 | Erro |
| Equilibrada | +0,2 para −5 | Capivarada |
| Vantagem grande | +28 para +24 | Ótimo |
| Vantagem grande | +9 para +6 | Imprecisão |
| Vantagem grande | +9 para 0 | Capivarada |
| Perdida | −12 para −15 | Ótimo |
| Tática | Adversário erra (0 para −5), o lance volta a −0,2 | Chance perdida |
| Tática | A segunda linha dá +0,4 e o lance dá +4,5 | Excelente |
| Tática | Capturar peça solta, com a mesma diferença: rating 1500 e 700 | Melhor e Excelente |
| Sacrifício | Bispo em h7, posição boa | Brilhante |
| Sacrifício | Dama de Morphy, com o Stockfish (Ópera, 1858) | Brilhante |
| Sacrifício | O mesmo lance, com outro mate disponível | Não é Brilhante |
| Sacrifício | Que deixa a posição ruim | Capivarada |
| Sacrifício | Com vitória fácil de outro jeito | Melhor |
| Sacrifício | Gambito de peão | Melhor |
| Perda de material | Dama entregue numa posição igual | Capivarada |
| Perda de material | Peão: 1500 e 2300 | Imprecisão e Erro |
| Forçado | Único lance legal | Melhor |
| Abertura | Dentro da teoria | Livro |
| Final | Largar o empate ou a vitória | Capivarada |
| Final | +90 de base de finais para mate em 20 | Ótimo |

### Em partidas reais

36 partidas do Lichess, 12 por faixa, com o Stockfish em profundidade 12. Porcentagem de lances:

| Rating | Brilhante | Excelente | Livro | Melhor | Ótimo | Bom | Imprecisão | Erro | Chance perdida | Capivarada |
|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| 1000 | 0,1 | 7,5 | 4,6 | 25,3 | 23,5 | 17,0 | 11,5 | 6,0 | 1,2 | 3,2 |
| 1500 | 0,0 | 1,0 | 7,6 | 31,9 | 25,7 | 14,6 | 9,3 | 4,6 | 1,7 | 3,7 |
| 2000 | 0,1 | 1,3 | 12,0 | 35,4 | 17,1 | 13,4 | 9,8 | 6,5 | 0,9 | 3,5 |

Por partida, somando os dois lados, são 4,9 lances "!" na faixa de 1000 e 0,7 nas outras duas, e um Brilhante a cada 18 partidas. Esse salto vem da regra das capturas, que muda em 1200 e ainda é uma estimativa grossa. Os ratings dessa amostra são do Lichess.

## Comparação com o Chess.com

Uma partida real de 10 minutos, com rating 324 contra 294, comparada com o resumo do fim de partida do Chess.com, nas brancas:

| Classe | Chess.com | Virada antes | Virada agora |
|---|---:|---:|---:|
| Excelente (!) | 4 | 0 | 5 |
| Melhor | 11 | 21 | 10 |
| Ótimo (polegar) | 6 | 5 | 11 |

- **O que bateu naquele momento:** Melhor mais "!" deu 15 lá e 15 aqui, com o motor lite. Com o motor completo, deu 17 aqui, então essa coincidência não deve ser levada como prova.
- **O que levou à mudança:** antes, 6 lances fora do primeiro do motor apareciam como Melhor, e nenhuma captura decisiva ganhava "!".
- **O que ainda não bate:** o polegar, com 11 aqui e 6 lá. Não sei a causa: pode ser o motor, a profundidade ou a curva.
- **O limite desta comparação:** é uma partida só, e o resumo traz contagens, não quais lances foram. Os números do "!" foram ajustados com ela, então bater aqui não prova que vai bater em outras. A regressão está em [`classify.chesscom.test.ts`](../src/chess/classify.chesscom.test.ts).

### A profundidade explica a diferença?

A mesma partida, rodando neste computador, nas brancas. O motor é o mesmo, muda só a profundidade:

| Profundidade | Tempo | Excelente (!) | Melhor | Ótimo (polegar) |
|---:|---:|---:|---:|---:|
| Chess.com | | 4 | 11 | 6 |
| 15 | 0,5 min | 5 | 10 | 11 |
| 18 | 1,6 min | 5 | 11 | 10 |
| 20 | 4,4 min | 5 | 11 | 9 |
| 22 | 8,9 min | 5 | 12 | 9 |

Da 15 para a 22, 26 dos 97 lances mudaram de classe, quase sempre para uma classe vizinha, e o total pouco se mexeu. O polegar melhora um pouco, mas continua longe. **Nesta partida, a profundidade não explica a maior parte da diferença.** Por isso as opções 20 e 22 são para quem quer mais confiança numa partida específica, e o motor completo de 99 MB não parece valer o custo por enquanto.

A fila em segundo plano e as 3 melhores linhas param na profundidade 18, para não ficarem lentas demais.

### A precisão

A API pública do Chess.com informa a precisão oficial das partidas revisadas. Coletei 160 partidas (320 lados), analisei com o Stockfish 19 completo em profundidade 14 e ajustei a fórmula em metade dos lados. Os números abaixo são da outra metade:

| | Erro médio | Até 3 pontos | Até 5 pontos |
|---|---:|---:|---:|
| Fórmula antiga (Lichess) | 11,2 pontos | 10% | 21% |
| Fórmula ajustada | 4,5 pontos | 46% | 71% |

O resultado por rating: até 600, erro de 6,2; 1000 a 1400, 5,4; 1400 a 1800, 4,0; 1800 ou mais, 2,4.

**Limites.** Só entram partidas que alguém revisou, e quase nenhuma tinha rating entre 600 e 1000. É uma aproximação do resultado: a fórmula CAPS do Chess.com continua fechada. A precisão nos diz pouco sobre as classes: a API não informa o rótulo de cada lance.

### Segunda comparação: os dois lados, tabela completa

Uma partida de 98 lances, com rating 348 contra 342. Números do Chess.com vêm da revisão dele; os do Virada, do Stockfish 19 completo no servidor, em profundidade 18:

| Classe | Brancas: Chess.com | Virada | Pretas: Chess.com | Virada |
|---|---:|---:|---:|---:|
| Excelente (!) | 2 | 1 | 7 | 8 |
| Melhor | 16 | 17 | 18 | 18 |
| Ótimo (polegar) | 5 | 12 | 5 | 6 |
| Bom | 7 | 5 | 7 | 3 |
| Imprecisão | 2 | 1 | 3 | 5 |
| Erro | 11 | 8 | 1 | 0 |
| Chance perdida | 2 | 2 | 3 | 5 |
| Capivarada | 0 | 0 | 2 | 1 |
| Precisão | 57,0 | 63,6 | 71,2 | 67,1 |

Juntando as tabelas das duas partidas, três regras baixaram a diferença total de 49 para 39 lances: retomar peça nunca é "!", a Chance perdida olha os 3 últimos lances do adversário, e a posição ganha começa em 0,65 ponto. Na primeira partida, as brancas ficaram em 2 "!", 15 Melhores e 10 polegares, contra 4, 11 e 6.

**O que continua diferente:** o polegar das brancas (12 contra 5) é o maior erro, e a primeira partida também sobra nele. Testar outros limites não trouxe ganho claro, então a tabela pública foi mantida. São só duas partidas: bastam para achar problemas, não para garantir o resultado em outras.

**Um erro meu nesta medição:** a primeira versão dessas comparações caiu sem aviso no motor lite, porque o motor de teste apagava o `fetch` do Node. Os números acima são da nova rodada, em que os testes confirmaram que tudo veio do servidor. A calibração da precisão usou o servidor desde o início.

## O que este teste não prova

**A fidelidade ao Chess.com não foi medida lance a lance.** Eles não têm uma base pública com os rótulos da revisão, então não há como calcular a porcentagem de acerto. Para medir, é preciso comparar mais partidas com a revisão do Chess.com, lado a lado.

Outras diferenças que continuam existindo:

- O motor e a profundidade são outros. No celular, o Stockfish roda bem mais raso que num servidor.
- O "!" só é calculado na análise completa. No jogo contra bots e nos lances testados na revisão, não há segunda linha.
- A base de aberturas é outra, então o ponto em que o Livro acaba pode mudar.
- A precisão é uma aproximação ajustada, não a CAPS do Chess.com.

## Partidas antigas

Ao abrir uma análise antiga, os lances são reclassificados com as avaliações guardadas, sem chamar o motor. O "!" e o peso do rating dependem de dados novos: a aba Resumo oferece "Analisar de novo".

## Fontes

- [Chess.com: como os lances são classificados](https://support.chess.com/en/articles/8572705-how-are-moves-classified-what-is-a-blunder-or-brilliant-etc): a tabela e as definições.
- [WintrChess](https://github.com/WintrCat/wintrchess): classificador aberto (GPL-3.0). Serviu de comparação para as ideias de segunda linha e peça insegura. O código daqui é próprio.
- [Base aberta de partidas do Lichess](https://database.lichess.org/): a medição da curva.
- [Lichess: a fórmula de chance de vitória](https://lichess.org/page/accuracy): a referência de comparação e a precisão.
- [ChessGoals: comparação de ratings](https://chessgoals.com/rating-comparison/): a conversão entre as escalas.
- [Ben Balas: o que faz um lance parecer brilhante](https://benbalas.substack.com/p/science-of-chess-what-makes-a-move): resumo de um estudo sobre o tema.
- [Fórum do Chess.com](https://www.chess.com/forum/view/game-analysis/erik-confirms-what-makes-a-move-brilliant): a mudança histórica da definição de Brilhante.
