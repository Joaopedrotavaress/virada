# Treinador de Xadrez

Analisa suas partidas do chess.com e joga contra bots com treinador, com o Stockfish rodando 100% no aparelho. Grátis, sem servidor e sem API paga. Funciona no celular e no computador, instala como app e roda sem internet.

## O que ele faz

- **Análise:** classifica cada lance, explica o erro em português (peça pendurada, garfo, cravada, material, mate) e mostra as 3 melhores linhas.
- **Revisão guiada:** resumo com os principais pontos e reprodução automática em quatro velocidades, com parada nos momentos decisivos.
- **Treino:** "Tentar de novo" volta ao erro para você achar o lance; arrastar qualquer peça testa outro lance com feedback na hora.
- **Bots:** 12 níveis, de ~400 à força total, com dica, "qual a ameaça?", barra de avaliação e aviso de erro durante a partida.
- **Tabuleiro:** peças capturadas e placar de material ao lado de cada jogador, na análise e no jogo.
- **chess.com:** busca suas partidas pelo usuário, com filtro por ritmo.
- **Relógio:** tempo gasto em cada lance, gráfico e frases sobre como você usou o tempo.
- **Aberturas:** nome da abertura e lances de livro, que não contam para a precisão.

## Rodar no computador

```bash
npm install && npm run dev
```

O `npm install` copia o Stockfish para `public/engine` e gera a base de aberturas em `src/chess/openings.generated.json`.

Para abrir no celular durante o desenvolvimento, com os dois na mesma rede: `npm run dev -- --host`.

Testes, que usam o motor de verdade: `npm test`.

## Publicar na Vercel

1. Envie esta pasta para um repositório no GitHub.
2. Na Vercel, clique em **Add New > Project** e importe o repositório.
3. Mantenha o que ela detectar (framework Vite, comando `npm run build`, pasta `dist`) e clique em **Deploy**.

Ou, direto do terminal, sem GitHub: `npx vercel --prod`.

Não há variáveis de ambiente nem headers para configurar: o motor é single-thread e dispensa COOP/COEP. O app precisa de HTTPS para instalar e funcionar offline, o que a Vercel já oferece.

## Bom saber

- **Partidas salvas:** ficam em cada navegador. O que você analisa no celular não aparece no computador. Guarda as 20 análises mais recentes.
- **Profundidade:** a Rápida (12) pode errar em táticas longas. Na partida de exemplo, ela marca o sacrifício 15. Bxd7+ como erro; a partir da Normal (15), como melhor lance.
- **Força dos bots:** os números são aproximados e servem para comparar os níveis. Eles não foram medidos contra jogadores.
- **Instalar:** no Android e no Chrome, use o botão "Instalar app" da tela inicial. No iPhone, abra no Safari e use Compartilhar > Adicionar à Tela de Início.

## Licenças e dados

- **Stockfish.js** é GPLv3: o app publica a licença em `/engine/LICENSE.txt` e indica o código-fonte do motor no rodapé. Se você distribuir uma versão com o motor alterado, a GPL exige publicar essas alterações.
- **Aberturas:** base [lichess-org/chess-openings](https://github.com/lichess-org/chess-openings), domínio público (CC0), guardada em `data/openings`. Para atualizar, troque os arquivos `.tsv` e rode `node scripts/build-openings.mjs`. Os nomes das famílias principais são traduzidos nesse script; as variantes menos comuns ficam com o nome original.
- **Partidas do chess.com** vêm da API pública, sem chave, e ficam só no seu aparelho.
