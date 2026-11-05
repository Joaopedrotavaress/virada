# Virada

Toda partida tem um ponto de virada. Ache o seu.

Analisa suas partidas do chess.com e joga contra bots com treinador, com o Stockfish rodando 100% no aparelho. Grátis, sem servidor e sem API paga. Funciona no celular e no computador, instala como app e roda sem internet.

## O que ele faz

- **Análise:** classifica cada lance, explica o erro em português (peça pendurada, garfo, cravada, material, mate) e mostra as 3 melhores linhas.
- **Revisão guiada:** resumo com os principais pontos e reprodução automática em quatro velocidades, com parada nos momentos decisivos.
- **Treino:** "Tentar de novo" volta ao erro para você achar o lance; arrastar qualquer peça testa outro lance com feedback na hora.
- **Bots:** 12 níveis, de ~400 à força total, com dica, "qual a ameaça?", barra de avaliação, aviso de erro, relógio opcional e início de qualquer posição. A partida sobrevive a recarregar a página.
- **Tabuleiro:** peças capturadas e placar de material ao lado de cada jogador, na análise e no jogo.
- **Partidas:** tudo num lugar só, do chess.com, contra bots e coladas, com busca, filtros, notas e marcadores. Análise em lote que continua depois de fechar o app.
- **Progresso:** rating, precisão, aproveitamento e erros graves por período e ritmo, e o que se repete nos seus erros.
- **Treino:** seus piores erros viram exercícios com repetição espaçada, numa sessão diária, com sequência de dias.
- **Puzzles:** puzzle do dia e 22 temas, em quatro dificuldades, sem internet.
- **Guia:** catálogo com 3.865 linhas de aberturas, 41 aberturas explicadas com planos e armadilhas, repertório com prática lance a lance e 21 lições de mates, táticas e finais.
- **Relógio:** tempo gasto em cada lance, gráfico e frases sobre como você usou o tempo.
- **Aberturas:** nome da abertura e lances de livro, que não contam para a precisão.

## Rodar no computador

```bash
npm install && npm run dev
```

O `npm install` copia o Stockfish para `public/engine` e gera a base de aberturas em `src/chess/openings.generated.json`.

Para abrir no celular durante o desenvolvimento, com os dois na mesma rede: `npm run dev -- --host`.

Testes, que usam o motor de verdade: `npm test`. Eles também conferem cada lance do guia com as regras e com o Stockfish.

## Backend local (opcional)

No seu computador, e só nele:

```bash
npm run local
```

Isso abre o mesmo app em `http://127.0.0.1:4300`, com uma cópia dos dados num SQLite em `data-local/` e a análise em lote usando o motor completo do Stockfish. Requer Node 22.13 ou mais novo, e não instala nada além do que o projeto já tem. O servidor só aceita conexões deste computador.

O site publicado não depende disso: ele nem chega a procurar o backend fora de `localhost`. Com o backend desligado, tudo continua funcionando com os dados do navegador.

## Publicar na Vercel

1. Envie esta pasta para um repositório no GitHub.
2. Na Vercel, clique em **Add New > Project** e importe o repositório.
3. Mantenha o que ela detectar (framework Vite, comando `npm run build`, pasta `dist`) e clique em **Deploy**.

Ou, direto do terminal, sem GitHub: `npx vercel --prod`.

Não há variáveis de ambiente nem headers para configurar: o motor é single-thread e dispensa COOP/COEP. O app precisa de HTTPS para instalar e funcionar offline, o que a Vercel já oferece.

## Bom saber

- **Seus dados:** ficam no navegador, sem limite de quantidade além do espaço do aparelho. O que você analisa no celular não aparece no computador, a não ser por backup ou gist.
- **Levar para outro aparelho:** na tela Seus dados, salve um backup em arquivo, ou ligue a sincronização por gist secreto com um token seu do GitHub. No gist, vão partidas, notas e treino; as análises são refeitas. Um gist secreto não é criptografado: quem tiver o link consegue ler.
- **Textos do guia:** escritos para este app. Cada lance citado foi conferido pelas regras e pelo Stockfish, mas as explicações estratégicas não foram revisadas por um jogador forte.
- **Profundidade:** a Rápida (12) pode errar em táticas longas. Na partida de exemplo, ela marca o sacrifício 15. Bxd7+ como erro; a partir da Normal (15), como melhor lance.
- **Força dos bots:** os números são aproximados e servem para comparar os níveis. Eles não foram medidos contra jogadores.
- **Instalar:** no Android e no Chrome, use o botão "Instalar app" da tela inicial. No iPhone, abra no Safari e use Compartilhar > Adicionar à Tela de Início.

## Licenças e dados

- **Stockfish.js** é GPLv3: o app publica a licença em `/engine/LICENSE.txt` e indica o código-fonte do motor no rodapé. Se você distribuir uma versão com o motor alterado, a GPL exige publicar essas alterações.
- **Aberturas:** base [lichess-org/chess-openings](https://github.com/lichess-org/chess-openings), domínio público (CC0), guardada em `data/openings`. Para atualizar, troque os arquivos `.tsv` e rode `node scripts/build-openings.mjs`. Os nomes das famílias principais são traduzidos nesse script; as variantes menos comuns ficam com o nome original.
- **Partidas do chess.com** vêm da API pública, sem chave, e ficam só no seu aparelho.
- **Puzzles:** recorte da base aberta do Lichess (CC0), guardado em `src/puzzles/puzzles.json`. Para refazer o recorte: `npm install --no-save fzstd && node scripts/build-puzzles.mjs`.
- **Banco de finais:** o serviço do Lichess responde posições com até 7 peças. Sem internet, a informação só não aparece.
- O projeto é **GPL-3.0**. Veja `LICENSE` e `CREDITS.md`.
