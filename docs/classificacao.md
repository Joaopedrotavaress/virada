# Como o Virada classifica os lances

O objetivo é chegar o mais perto possível do Chess.com. O algoritmo deles é fechado, então este documento separa o que eles dizem publicamente do que precisou ser estimado.

O código está em [`src/chess/classify.ts`](../src/chess/classify.ts), [`brilliant.ts`](../src/chess/brilliant.ts) e [`expectedPoints.ts`](../src/chess/expectedPoints.ts).

## O que é público e o que é estimado

| Assunto | O que o Chess.com publica | O que o Virada faz | Origem |
|---|---|---|---|
| Medida | Pontos esperados de 0 a 1, a partir do rating e da avaliação do motor | Igual | Público |
| Melhor | Perde 0,00 | Lance do motor, ou perda abaixo de 0,005 (arredonda para 0,00) | Público, com o arredondamento **estimado** |
| Excelente | Até 0,02 | Igual | Público |
| Bom | 0,02 a 0,05 | Igual | Público |
| Imprecisão | 0,05 a 0,10 | Igual | Público |
| Erro | 0,10 a 0,20 | Igual | Público |
| Erro grosseiro | 0,20 a 1,00 | Igual | Público |
| A curva de cada rating | Diz que existe, não publica | Medida em 157 mil partidas do Lichess | **Medido** por nós |
| Escala de rating | Não se aplica | Rating do Chess.com convertido para a escala do Lichess | **Estimado**, com a tabela do ChessGoals |
| Ótimo | De perdido para igual, de igual para ganho, ou o único lance bom. Mais generoso com rating baixo | Comparação com a segunda melhor linha | Ideia pública, números **estimados** |
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

Na prática: a mesma vantagem vale mais para quem joga melhor. Um lance que custa 3 peões, numa posição igual, é Erro para um jogador de 800 e Erro grosseiro para um de 2200.

Duas conferências: os valores do topo ficam perto do `0,00368` da fórmula pública do Lichess, medida em jogadores fortes, e o ajuste por faixa acompanha o resultado observado.

**Limites.** A medição usa ratings e jogadores do Lichess, não do Chess.com. A conversão entre as escalas é uma estimativa com margem, e varia com o ritmo de jogo.

## A ordem das decisões

1. **Livro:** a posição está na base de aberturas.
2. **Forçado:** só existe um lance legal. É Melhor, com precisão 100.
3. **Brilhante:** as regras abaixo.
4. **Ótimo:** as regras abaixo.
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

### Ótimo

Tudo isto precisa valer:

- É o lance do motor, e a segunda linha está medida.
- A segunda linha fica atrás por 0,05 com rating até 1000, 0,08 com 1500 e 0,12 a partir de 2200.
- Se os dois lances caem no mesmo estado (perdido, igual, ganho), a diferença precisa ser o dobro. É o caso do "único lance bom".
- A segunda linha vale menos de 0,90, e a posição depois do lance vale mais de 0,30.
- Não é mate no lance, não é promover a dama, nem saída de xeque com até 2 opções.
- Não captura a peça que acabou de chegar, nem peça solta, nem troca de igual valor. Só vale a captura em que se entrega mais do que se leva.
- O lance não se repete na partida: num xeque perpétuo, só a primeira vez conta.

Os estados valem: perdido até 0,30, ganho a partir de 0,70. Como saem dos pontos, mudam com o rating, como o Chess.com descreve.

### Chance perdida

- O adversário acabou de perder 0,10 ou mais.
- Antes do lance havia posição ganha (0,70 ou mais), e depois não há mais.
- O lance perdeu 0,10 ou mais e não foi o do motor.

### Mate

| Situação | Classe |
|---|---|
| Mantém o mate, no ritmo certo | Melhor |
| Mantém, um lance mais longo | Excelente |
| Mantém, até 5 lances mais longo | Bom |
| Mantém, mais longo que isso | Imprecisão |
| Largou o mate | Pela perda, tratando o mate como +10 |
| Já ia levar mate: encurtar por 1, até 5, ou mais | Excelente, Bom ou Imprecisão |
| Permite mate numa posição já perdida | Erro, se em até 3 lances; senão, Imprecisão |

## Casos de teste

São mais de 90 casos em [`classify.cases.test.ts`](../src/chess/classify.cases.test.ts) e [`brilliant.test.ts`](../src/chess/brilliant.test.ts), além de 4 com o Stockfish de verdade em [`classify.real.test.ts`](../src/chess/classify.real.test.ts).

| Situação | Exemplo (rating 1500) | Resultado |
|---|---|---|
| Equilibrada | Lance do motor | Melhor |
| Equilibrada | +0,2 para 0,0 | Excelente |
| Equilibrada | +0,2 para −0,2 | Bom |
| Equilibrada | +0,2 para −0,6 | Imprecisão |
| Equilibrada | +0,2 para −1,5 | Erro |
| Equilibrada | +0,2 para −5 | Erro grosseiro |
| Vantagem grande | +28 para +24 | Melhor |
| Vantagem grande | +9 para +6 | Imprecisão |
| Vantagem grande | +9 para 0 | Erro grosseiro |
| Perdida | −12 para −15 | Melhor |
| Tática | Adversário erra (0 para −5), o lance volta a −0,2 | Chance perdida |
| Tática | A segunda linha dá +0,4 e o lance dá +4,5 | Ótimo |
| Tática | Capturar peça solta, com a mesma diferença | Melhor |
| Sacrifício | Bispo em h7, posição boa | Brilhante |
| Sacrifício | Dama de Morphy, com o Stockfish (Ópera, 1858) | Brilhante |
| Sacrifício | O mesmo lance, com outro mate disponível | Não é Brilhante |
| Sacrifício | Que deixa a posição ruim | Erro grosseiro |
| Sacrifício | Com vitória fácil de outro jeito | Melhor |
| Sacrifício | Gambito de peão | Melhor |
| Perda de material | Dama entregue numa posição igual | Erro grosseiro |
| Perda de material | Peão: 1500 e 2300 | Imprecisão e Erro |
| Forçado | Único lance legal | Melhor |
| Abertura | Dentro da teoria | Livro |
| Final | Largar o empate ou a vitória | Erro grosseiro |
| Final | +90 de base de finais para mate em 20 | Melhor |

### Em partidas reais

36 partidas do Lichess, 12 por faixa, com o Stockfish em profundidade 12. Porcentagem de lances:

| Rating | Brilhante | Ótimo | Livro | Melhor | Excelente | Bom | Imprecisão | Erro | Chance perdida | Erro grosseiro |
|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| 1000 | 0,1 | 1,3 | 4,6 | 45,5 | 9,7 | 17,0 | 11,6 | 5,8 | 1,2 | 3,2 |
| 1500 | 0,0 | 0,9 | 7,6 | 44,2 | 13,6 | 14,6 | 9,1 | 4,7 | 1,7 | 3,6 |
| 2000 | 0,1 | 1,3 | 12,0 | 42,3 | 10,1 | 13,4 | 9,8 | 6,5 | 0,9 | 3,5 |

Isso dá 0,7 lance Ótimo por partida, somando os dois lados, e um Brilhante a cada 18 partidas. Essa medição foi feita antes do último ajuste fino da curva, que mudou o `k` em menos de 3%.

## O que este teste não prova

**A fidelidade ao Chess.com não foi medida lance a lance.** Eles não têm uma base pública com os rótulos da revisão, então não há como calcular a porcentagem de acerto. Para medir, é preciso comparar partidas suas com a revisão do Chess.com, lado a lado.

Outras diferenças que continuam existindo:

- O motor e a profundidade são outros. No celular, o Stockfish roda bem mais raso que num servidor.
- O Ótimo só é calculado na análise completa. No jogo contra bots e nos lances testados na revisão, não há segunda linha.
- A base de aberturas é outra, então o ponto em que o Livro acaba pode mudar.
- A precisão continua na fórmula pública do Lichess, não na CAPS do Chess.com.

## Partidas antigas

Ao abrir uma análise antiga, os lances são reclassificados com as avaliações guardadas, sem chamar o motor. O Ótimo e o peso do rating dependem de dados novos: a aba Resumo oferece "Analisar de novo".

## Fontes

- [Chess.com: como os lances são classificados](https://support.chess.com/en/articles/8572705-how-are-moves-classified-what-is-a-blunder-or-brilliant-etc): a tabela e as definições.
- [WintrChess](https://github.com/WintrCat/wintrchess): classificador aberto (GPL-3.0). Serviu de comparação para as ideias de segunda linha e peça insegura. O código daqui é próprio.
- [Base aberta de partidas do Lichess](https://database.lichess.org/): a medição da curva.
- [Lichess: a fórmula de chance de vitória](https://lichess.org/page/accuracy): a referência de comparação e a precisão.
- [ChessGoals: comparação de ratings](https://chessgoals.com/rating-comparison/): a conversão entre as escalas.
- [Ben Balas: o que faz um lance parecer brilhante](https://benbalas.substack.com/p/science-of-chess-what-makes-a-move): resumo de um estudo sobre o tema.
- [Fórum do Chess.com](https://www.chess.com/forum/view/game-analysis/erik-confirms-what-makes-a-move-brilliant): a mudança histórica da definição de Brilhante.
