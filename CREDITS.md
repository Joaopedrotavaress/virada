# Créditos e licenças

O Virada é distribuído sob a licença GPL-3.0 (arquivo `LICENSE`).

## Código de terceiros

| Projeto | Licença | Uso |
|---|---|---|
| [Stockfish.js](https://github.com/nmrugg/stockfish.js) | GPL-3.0 | Motor de xadrez, copiado para `public/engine` |
| [chess.js](https://github.com/jhlywa/chess.js) | BSD-2-Clause | Regras do xadrez |
| [react-chessboard](https://github.com/Clariity/react-chessboard) | MIT | Tabuleiro |
| [recharts](https://github.com/recharts/recharts) | MIT | Gráficos |
| [ts-fsrs](https://github.com/open-spaced-repetition/ts-fsrs) | MIT | Agenda da repetição espaçada |

## Dados

| Base | Licença | Uso |
|---|---|---|
| [lichess-org/chess-openings](https://github.com/lichess-org/chess-openings) | CC0 | Nomes de aberturas, em `data/openings` |
| [Lichess Open Database, puzzles](https://database.lichess.org/) | CC0 | Recorte de puzzles, em `data/puzzles` |

## Serviços usados em tempo de execução

- [API pública do chess.com](https://www.chess.com/news/view/published-data-api): busca as partidas do usuário.
- [Tablebase do Lichess](https://tablebase.lichess.ovh): resultado exato de finais com até 7 peças, só quando há internet.

## Textos do guia

Os textos do guia de aberturas e das lições foram escritos para este projeto. Lances e nomes de aberturas vêm das bases acima; nenhum texto foi copiado de outros sites.
