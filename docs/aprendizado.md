# O caminho de aulas

As aulas antigas eram dois parágrafos para ler e, às vezes, um exercício. Agora cada aula mostra primeiro no tabuleiro, e a pessoa pratica logo depois.

## O que a pesquisa mostrou

| Referência | O que faz | O que o Virada aproveitou |
|---|---|---|
| [Chess.com Learn Path](https://support.chess.com/en/articles/8609703-how-do-lessons-work) | Quatro níveis, com cursos, lições e desafios. As lições novas são exercícios guiados por um coach, no lugar dos vídeos. Mostra bloqueada, disponível e concluída | Quatro níveis, professor guiando, estado de cada aula e botão de continuar |
| [Chess.com: aulas e rating](https://www.chess.com/article/view/chess-lessons-improvement-stats) | Em membros abaixo de 1000, concluir aulas se associou a ganho de rating em blitz e rapid. É associação, não prova de causa | Aula curta, para fazer muitas, e o incentivo a misturar aula, partida e puzzle |
| [Lichess Learn](https://github.com/lichess-org/lila/blob/master/ui/learn/src/stage/list.ts) | 18 estágios: primeiro cada peça, depois captura, proteção, xeque e mate. Roque, en passant e afogamento vêm depois | A ordem do nível Iniciante e os exercícios de levar a peça até a casa |
| [Chessable MoveTrainer](https://notes.andymatuschak.org/zDr94hP6bG3jJYrdYy8B5hx) | Repetição espaçada: quem erra vê de novo mais cedo. Funciona melhor para lances e táticas do que para conceitos | Fica para o próximo passo, usando o treino que o app já tem |
| [Método Steps](https://lichess.org/@/HanSchut/blog/the-steps-method-for-learning-and-teaching-chess/L74I4Ihq) | Seis etapas, com material para o professor e caderno de exercícios. É o método oficial da federação holandesa | Muita prática por tema, e progressão em etapas pequenas |
| [Exemplos resolvidos](https://peer.asee.org/learning-statics-by-studying-worked-examples.pdf) | Para iniciantes, ver um exemplo resolvido costuma render mais que resolver sozinho. Essa vantagem some com a experiência. O estudo é de engenharia, não de xadrez | A ordem "veja, depois faça", e a escolha do ponto de partida para quem já sabe |

Da análise de Lichess e Chess.com sai uma diferença importante: **o Chess.com trocou os vídeos por lições interativas no caminho principal.** Por isso aqui o vídeo é opcional e o tabuleiro é o centro.

## Como é uma aula

1. **Veja.** O Seu Nonato mostra uma posição por vez, com uma frase curta, setas e casas coloridas. Dá para avançar, voltar ou deixar tocar sozinho. As demonstrações usam posições diferentes das dos exercícios, para o exercício não virar cópia.
2. **Faça.** A pessoa joga no tabuleiro. No início, só o lance pedido vale. Depois, o Stockfish aceita qualquer outro que resolva.
3. **Leve.** Uma frase para guardar, a próxima aula, puzzles do tema e o vídeo, se quiser.

O vídeo só carrega quando a pessoa toca nele, e assim a aula funciona sem internet e nada vai ao YouTube antes disso. Os vídeos têm crédito do canal e link para o YouTube.

**Limite dos vídeos.** Conferi que cada vídeo existe, além do título e do canal, pela consulta pública do YouTube. Abri um deles no app. Não assisti ao conteúdo: vale dar uma olhada antes de recomendar.

## O roteiro

São 36 aulas. A pessoa escolhe por onde começar, e os níveis anteriores continuam abertos.

### Iniciante: Peão
Para quem nunca jogou. Ao terminar, sabe jogar uma partida inteira.

| Unidade | Aulas |
|---|---|
| As peças | Torre e bispo; Dama e rei; Cavalo; Peão |
| As regras | Capturar e fazer a conta; Xeque: as três saídas; Xeque-mate e afogamento; Roque, en passant e promoção |
| Os primeiros mates | Mate do pastor; Mate do corredor |

### Básico: Cavalo
Para quem sabe as regras e perde peças sem ver. Ao terminar, para de entregar peças e fecha as partidas ganhas.

| Unidade | Aulas |
|---|---|
| Não entregue nada | Peça sem defesa |
| Abrir bem | Abertura: centro, peças, rei |
| As primeiras táticas | Garfo; Cravada; Espeto |
| Mates que você precisa saber | Dama e rei; Escada; Torre e rei |

### Intermediário: Torre
Para quem vê táticas simples. Ao terminar, cria ameaças em série, joga finais simples e tem um plano.

| Unidade | Aulas |
|---|---|
| Táticas que combinam | Ataque descoberto; Xeque duplo; Desvio; Atração; Lance intermediário |
| Mates com as peças juntas | Dama apoiada por um peão; Mate sufocado |
| Finais de peões | A regra do quadrado; Oposição; Criar um peão passado |
| O plano | Sem tática na mesa; Os peões contam a história |

### Avançado: Dama
Para quem quer técnica, cálculo e repertório. Ao terminar, calcula de verdade e estuda por conta própria.

| Unidade | Aulas |
|---|---|
| Finais de torre | Lucena; Philidor |
| Calcular | Xeques, capturas e ameaças; Sacrifício |
| Estudar sozinho | Aprenda com as suas partidas; Monte o seu repertório |

## Como a evolução aparece

- O cartão da tela inicial e do caminho mostra o nível, a peça, as aulas feitas e o botão de continuar.
- Cada nível tem uma fileira de casas: verde para feita, amarelo para a próxima.
- Cada aula diz se está feita ou é a próxima, quantos exercícios tem e se tem vídeo.

Nada fica bloqueado, ao contrário do Chess.com: o caminho sugere a ordem, e quem quiser pula. As aulas que já estavam feitas continuam valendo.

## O que os testes garantem

- Cada lance de cada demonstração é legal, e cada mate anunciado é mate.
- Cada casa marcada e cada seta existem, e toda peça citada em "até onde ela vai" está lá.
- Toda solução funciona: o mate acontece, e nas de vantagem o Stockfish confirma o resultado.
- Cada aula está no roteiro exatamente uma vez.

Passei também cada linha das demonstrações pelo Stockfish. Isso achou erros reais, como um desvio que permitia mate na volta, e eles foram corrigidos. **O que os testes não julgam é a clareza do texto.** Isso depende de ver gente usando.

## Plano priorizado

| Prioridade | O quê | Situação |
|---|---|---|
| 1 | Classificação por pontos esperados, com rating | Feito |
| 2 | O lance "!" e a nova Chance perdida | Feito |
| 3 | Caminho em quatro níveis, com progresso | Feito |
| 4 | Aulas em três partes, com demonstração | Feito |
| 5 | 15 aulas novas, do zero ao cálculo | Feito |
| 6 | Vídeos opcionais | Feito |
| 7 | Comparar 20 partidas suas com a revisão do Chess.com e ajustar os números estimados | **Depende de você** |
| 8 | Levar os exercícios errados das aulas para a repetição espaçada do Treino | A fazer |
| 9 | Testar as aulas com um iniciante de verdade e reescrever o que travar | A fazer |
| 10 | Mais exercícios nas aulas de estratégia, que têm poucos | A fazer |
| 11 | Sugerir a próxima aula a partir dos erros das partidas (quem erra garfo vê a aula de garfo) | A fazer |
| 12 | Calcular o "!" também no jogo contra bots | A fazer |
