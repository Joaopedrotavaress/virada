import type { OpeningGuide } from '../types'

export const FECHADAS: OpeningGuide[] = [
  {
    slug: 'gambito-da-dama',
    name: 'Gambito da Dama',
    eco: 'D06–D69',
    group: 'fechadas',
    side: 'w',
    level: 'iniciante',
    root: 'd4 d5 c4',
    summary:
      'Apesar do nome, não é um gambito de verdade: se as pretas capturam em c4, as brancas recuperam o peão com facilidade. O lance c4 ataca o centro preto de lado, sem deixar fraquezas. É uma das bases do xadrez clássico e serve para jogadores de qualquer nível.',
    ideas: ['As brancas trocam um peão lateral por um central, e assim ganham o centro.', 'O plano depende da resposta: ...e6 recusa, ...c6 é a Eslava, e ...dxc4 aceita.'],
    plans: {
      white: ['Desenvolver com Cc3, Cf3 e Bg5 ou Bf4, rocar pequeno e usar a coluna c.', 'Em muitas linhas, preparar e4 quando for seguro.'],
      black: ['Segurar o peão de d5 com ...e6 ou ...c6, ou trocar em c4 e atacar o centro depois com ...c5.'],
    },
    lines: [
      { name: 'Recusado', sans: 'd4 d5 c4 e6 Nc3 Nf6 Bg5 Be7 e3 O-O Nf3', note: 'A posição clássica. As brancas têm mais espaço, e as pretas, uma estrutura firme.' },
      { name: 'Eslava', sans: 'd4 d5 c4 c6 Nf3 Nf6 Nc3', note: 'As pretas defendem com o peão de c para não fechar o bispo de c8.' },
      { name: 'Aceito', sans: 'd4 d5 c4 dxc4 Nf3 Nf6 e3 e6 Bxc4', note: 'As brancas recuperam o peão, e as pretas ganham casas e jogam ...c5 depois.' },
    ],
    traps: [],
    mistakes: ['Tentar defender c4 cedo demais em vez de desenvolver.', 'Jogar com pressa sem rocar: o centro pode abrir de repente.'],
  },
  {
    slug: 'gambito-da-dama-recusado',
    name: 'Gambito da Dama Recusado',
    eco: 'D30–D69',
    group: 'fechadas',
    side: 'b',
    level: 'iniciante',
    root: 'd4 d5 c4 e6',
    summary:
      'As pretas apoiam o peão de d5 com ...e6, formando uma muralha no centro. A posição é uma das mais sólidas que existem. O preço é o bispo de c8, que fica preso atrás dos peões. O grande objetivo das pretas é libertar esse bispo.',
    ideas: ['A ruptura ...c5 ou ...e5 alivia a posição no momento certo.', 'Trocas de peças leves ajudam quem tem menos espaço.', 'Em c8, o bispo costuma sair por b7 depois de ...b6.'],
    plans: {
      white: ['Pressionar com Bg5, Cf3, e3 e a coluna c, ou usar o ataque de minoria com b4 e b5 na variante das trocas.'],
      black: ['Rocar, jogar ...h6 para perguntar ao bispo, ...b6 e ...Bb7, e abrir com ...c5.'],
    },
    lines: [
      { name: 'Variante Tartakower', sans: 'd4 d5 c4 e6 Nc3 Nf6 Bg5 Be7 e3 O-O Nf3 h6 Bh4 b6', note: 'As pretas resolvem o problema do bispo de c8 levando-o para b7.' },
      { name: 'Variante das Trocas', sans: 'd4 d5 c4 e6 Nc3 Nf6 cxd5 exd5 Bg5 c6', note: 'Abre a diagonal do bispo de c8, mas dá às brancas um plano claro: o ataque de minoria.' },
    ],
    traps: [
      {
        name: 'Armadilha do Elefante',
        sans: 'd4 d5 c4 e6 Nc3 Nf6 Bg5 Nbd7 cxd5 exd5 Nxd5 Nxd5 Bxd8 Bb4+ Qd2 Bxd2+ Kxd2 Kxd8',
        who: 'b',
        errorAt: 10,
        text: 'O cavalo em f6 parece cravado, e o peão de d5, sem proteção. Mas a cravada é falsa: ...Cxd5 oferece a dama, e depois de Bxd8 o bispo preto dá xeque em b4 e recupera a dama branca. No fim, as pretas ficam com uma peça a mais.',
      },
    ],
    mistakes: ['Deixar o bispo de c8 sem plano.', 'Pelas brancas, capturar em d5 com o cavalo na variante com ...Cbd7 sem conferir a armadilha do elefante.'],
  },
  {
    slug: 'gambito-da-dama-aceito',
    name: 'Gambito da Dama Aceito',
    eco: 'D20–D29',
    group: 'fechadas',
    side: 'b',
    level: 'intermediário',
    root: 'd4 d5 c4 dxc4',
    summary:
      'As pretas pegam o peão, não para mantê-lo, mas para desviar as brancas do centro. O bispo branco perde um tempo ao recuperar o peão, e as pretas usam esse tempo para atacar d4 com ...c5. O resultado é uma posição aberta e sem fraquezas.',
    ideas: ['O peão de c4 não precisa ser defendido: o objetivo é ganhar tempo.', 'Com ...a6 e ...b5, as pretas ganham espaço na ala da dama.'],
    plans: {
      white: ['Recuperar o peão com e3 e Bxc4, ou tomar o centro de imediato com e4.'],
      black: ['Jogar ...Cf6, ...e6, ...c5 e atacar d4. Depois, desenvolver o bispo de c8 por b7.'],
    },
    lines: [
      { name: 'Clássica', sans: 'd4 d5 c4 dxc4 Nf3 Nf6 e3 e6 Bxc4 c5 O-O a6', note: 'A linha principal: as pretas têm jogo livre, e as brancas, um centro um pouco mais forte.' },
      { name: 'Variante Central', sans: 'd4 d5 c4 dxc4 e4 e5 Nf3 exd4 Bxc4', note: 'As brancas ocupam o centro. As pretas respondem na mesma moeda, com ...e5.' },
    ],
    traps: [
      {
        name: 'Defender o peão com ...b5',
        sans: 'd4 d5 c4 dxc4 e3 b5 a4 c6 axb5 cxb5 Qf3',
        who: 'w',
        errorAt: 5,
        minWin: 55,
        text: 'Tentar manter o peão a mais é o erro típico. Com a4 e a coluna a aberta, a dama em f3 ataca a torre de a8 ao longo da grande diagonal, e as brancas ganham uma peça. Em vez de ...b5, as pretas devem deixar o peão ir embora e seguir desenvolvendo.',
      },
    ],
    mistakes: ['Tentar defender o peão de c4 com ...b5.', 'Esquecer de atacar o centro com ...c5 e ficar sem jogo.'],
  },
  {
    slug: 'eslava',
    name: 'Defesa Eslava',
    eco: 'D10–D19',
    group: 'fechadas',
    side: 'b',
    level: 'intermediário',
    root: 'd4 d5 c4 c6',
    summary:
      'As pretas defendem d5 com o peão de c, deixando o bispo de c8 livre para sair por f5 ou g4. É tão sólida quanto o Gambito da Dama Recusado, com a vantagem de não prender esse bispo. Em troca, o cavalo de b8 perde a casa c6.',
    ideas: ['O bispo de c8 fica ativo antes de ...e6.', 'Na linha principal, as pretas capturam em c4 e usam ...b5 ou ...Bf5 para complicar a recuperação do peão.'],
    plans: {
      white: ['Recuperar o peão com a4 e e3, e usar o centro com e4 mais tarde.'],
      black: ['Colocar o bispo em f5 ou g4, jogar ...e6, rocar e depois romper com ...c5.'],
    },
    lines: [
      { name: 'Linha principal', sans: 'd4 d5 c4 c6 Nf3 Nf6 Nc3 dxc4 a4 Bf5 e3 e6 Bxc4 Bb4', note: 'O bispo sai antes de ...e6, e as pretas têm desenvolvimento confortável.' },
      { name: 'Variante das Trocas', sans: 'd4 d5 c4 c6 cxd5 cxd5 Nc3 Nf6 Bf4', note: 'As brancas buscam segurança. O jogo é simétrico, e uma pequena iniciativa pode durar muito.' },
    ],
    traps: [],
    mistakes: ['Jogar ...e6 cedo e cair numa Semi-Eslava sem querer.', 'Pelas brancas, esquecer a4 e deixar o peão extra ser protegido com ...b5.'],
  },
  {
    slug: 'semi-eslava',
    name: 'Defesa Semi-Eslava',
    eco: 'D43–D49',
    group: 'fechadas',
    side: 'b',
    level: 'avançado',
    root: 'd4 d5 c4 c6 Nf3 Nf6 Nc3 e6',
    summary:
      'As pretas jogam ...c6 e ...e6 ao mesmo tempo, com uma muralha de peões em d5. O bispo de c8 fica fechado por enquanto, mas as pretas têm a ideia de ...dxc4 e ...b5, ganhando espaço na ala da dama. É uma das defesas mais ricas de hoje em dia.',
    ideas: ['Na Meran, as pretas capturam em c4 e ganham tempo com ...b5, ...a6 e ...c5.', 'Com Bg5, a partida pode virar um combate afiadíssimo, como na variante Botvinnik.'],
    plans: {
      white: ['Com e3, jogo sólido e pressão no centro. Com Bg5, luta bem mais concreta.'],
      black: ['Capturar em c4 no momento certo, expandir com ...b5 e, finalmente, abrir com ...c5.'],
    },
    lines: [
      { name: 'Meran', sans: 'd4 d5 c4 c6 Nf3 Nf6 Nc3 e6 e3 Nbd7 Bd3 dxc4 Bxc4 b5 Bd3', note: 'As pretas ganham espaço na ala da dama e preparam ...c5, liberando tudo.' },
      { name: 'Variante Botvinnik', sans: 'd4 d5 c4 c6 Nf3 Nf6 Nc3 e6 Bg5 dxc4 e4 b5', note: 'Das linhas mais agudas de toda a teoria. Sem conhecer os detalhes, é fácil perder em poucos lances.', sharp: true },
    ],
    traps: [],
    mistakes: ['Entrar nas linhas agudas sem estudo.', 'Pelas pretas, não abrir com ...c5: a posição pode ficar presa.'],
  },
  {
    slug: 'londres',
    name: 'Sistema Londres',
    eco: 'D02, A46, A48',
    group: 'fechadas',
    side: 'w',
    level: 'iniciante',
    root: 'd4 d5 Bf4',
    summary:
      'Um sistema, mais do que uma abertura: as brancas repetem quase a mesma formação contra quase tudo. O bispo sai cedo para f4 e depois vêm e3, Cf3, c3, Bd3 e Cbd2. É ideal para quem quer ter um plano claro sem decorar teoria.',
    ideas: ['O bispo sai antes de e3, para não ficar preso atrás dos peões.', 'A formação é muito firme: difícil de quebrar, ainda que pouco ambiciosa.', 'Às vezes, o cavalo vai para e5 e a ala do rei vira alvo.'],
    plans: {
      white: ['Montar a formação padrão e rocar. Depois, atacar com Ce5, h4 ou com a abertura em e4.'],
      black: ['Atacar logo com ...c5, ...Cc6 e ...Db6, mirando b2 e d4.', 'Se possível, expulsar o bispo com ...Ch5 ou ...Bd6.'],
    },
    lines: [
      { name: 'Contra 1...d5', sans: 'd4 d5 Bf4 Nf6 e3 e6 Nf3 c5 c3 Nc6 Nbd2 Bd6 Bg3 O-O Bd3', note: 'A formação completa. O bispo recua para g3 e aceita a troca, porque a coluna h fica aberta.' },
      { name: 'Contra a Índia do Rei', sans: 'd4 Nf6 Bf4 g6 Nf3 Bg7 e3 O-O Be2 d6 h3', note: 'O lance h3 dá uma casa para o bispo de f4 e evita ...Ch5 com tempo.' },
    ],
    traps: [
      {
        name: 'O peão envenenado de b2',
        sans: 'd4 d5 Bf4 c5 e3 Qb6 Nc3 Qxb2 Nxd5',
        who: 'w',
        errorAt: 7,
        text: 'A dama em b6 pressiona b2, e pegar o peão parece fácil. Mas d5 fica sem defesa: 5.Cxd5 recupera o material e ameaça ao mesmo tempo Cc7+ e Tb1, que prende a dama. As brancas ficam muito melhores. Só não vale 5.Tb1, porque a dama captura em c3 com xeque. Pelas pretas, é melhor desenvolver do que levar o peão.',
      },
    ],
    mistakes: ['Jogar sempre no automático, sem olhar a resposta: ...Db6 pede cuidado com b2.', 'Deixar o bispo de f4 sem casa de recuo. Em muitas linhas, h3 ou c3 são necessários.'],
  },
  {
    slug: 'colle',
    name: 'Sistema Colle',
    eco: 'D04–D05',
    group: 'fechadas',
    side: 'w',
    level: 'iniciante',
    root: 'd4 d5 Nf3 Nf6 e3',
    summary:
      'Outro sistema de plano simples. Ao contrário do Londres, o bispo de c1 fica dentro da cadeia, pois as brancas jogam e3 logo. Em compensação, a ruptura e4 abre as peças e, se as pretas rocarem pequeno, um ataque clássico com Bd3 pode surgir.',
    ideas: ['As brancas preparam a ruptura e4, depois de c3, Bd3 e Cbd2.', 'O bispo em d3 mira h7, e o sacrifício Bxh7+ é um tema a conhecer.'],
    plans: {
      white: ['Bd3, c3, Cbd2, roque e e4. Depois, atacar a ala do rei.'],
      black: ['Jogar ...c5, ...Cc6 e desenvolver o bispo por b7 ou g4, de fora da cadeia.', 'Trocar o bispo de d3 sempre que possível.'],
    },
    lines: [
      { name: 'Formação principal', sans: 'd4 d5 Nf3 Nf6 e3 e6 Bd3 c5 c3 Nc6 Nbd2 Bd6 O-O O-O dxc5 Bxc5 e4', note: 'A ruptura em e4 aparece. O centro abre com as peças brancas prontas para atacar.' },
    ],
    traps: [],
    mistakes: ['Esquecer da ruptura e4 e ficar sem plano com o bispo de c1 preso.', 'Pelas pretas, rocar sem olhar o sacrifício em h7.'],
  },
  {
    slug: 'trompowsky',
    name: 'Ataque Trompowsky',
    eco: 'A45',
    group: 'fechadas',
    side: 'w',
    level: 'intermediário',
    root: 'd4 Nf6 Bg5',
    summary:
      'As brancas atacam o cavalo de f6 no segundo lance, evitando as defesas índias. Se o cavalo for trocado, as pretas ficam com peões dobrados. É uma arma prática, com posições fora da teoria comum, mas boa para quem aceita desequilíbrios.',
    ideas: ['O bispo ameaça estragar a estrutura preta com Bxf6.', 'Se 2...Ce4, o bispo recua para f4 e depois f3 expulsa o cavalo. Outra opção é proteger o bispo com h4.'],
    plans: {
      white: ['Trocar em f6 quando for bom, jogar e3 e c4 e usar o centro.', 'Contra ...Ce4, expulsar o cavalo com Bf4 e f3.'],
      black: ['Ativar o cavalo com ...Ce4, atacar d4 com ...c5, ou aceitar os peões dobrados e usar o par de bispos.'],
    },
    lines: [
      { name: 'Com 2...Ce4', sans: 'd4 Nf6 Bg5 Ne4 Bf4 c5 f3 Qa5+ c3 Nf6 Nd2', note: 'As peças mudam de lugar várias vezes. As brancas buscam um centro grande.' },
      { name: 'Com 2...d5', sans: 'd4 Nf6 Bg5 d5 Bxf6 exf6 e3', note: 'As pretas têm o par de bispos, e as brancas, uma estrutura bem melhor.' },
      { name: 'Com 2...e6', sans: 'd4 Nf6 Bg5 e6 e4 h6 Bxf6 Qxf6', note: 'As brancas tomam o centro, e as pretas ficam com os bispos.' },
    ],
    traps: [],
    mistakes: ['Trocar em f6 sem razão e entregar o par de bispos.', 'Pelas pretas, deixar o cavalo em e4 sem apoio e perdê-lo depois de f3.'],
  },
]
