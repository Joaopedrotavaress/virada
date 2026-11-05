import type { OpeningGuide } from '../types'

export const INDIAS: OpeningGuide[] = [
  {
    slug: 'india-do-rei',
    name: 'Defesa Índia do Rei',
    eco: 'E60–E99',
    group: 'indias',
    side: 'b',
    level: 'avançado',
    root: 'd4 Nf6 c4 g6',
    summary:
      'As pretas deixam as brancas tomarem o centro, colocam o bispo em g7 e, depois de rocar, atacam com ...e5 ou ...c5. Com o centro fechado, a partida é uma corrida clássica: as brancas avançam na ala da dama, e as pretas partem para o rei branco.',
    ideas: ['A cadeia de peões indica o lado do ataque: as pretas vão com ...f5 na ala do rei.', 'O bispo de g7 parece fechado, mas é decisivo quando o centro se abre.', 'Na ala da dama, as brancas têm c5 e b4.'],
    plans: {
      white: ['Fechar o centro com d5 e avançar com b4 e c5.', 'Bloquear o ataque preto com f3 e Ce1 ou Cd2.'],
      black: ['Jogar ...e5, ...Cc6 ou ...Ca6 e, com o centro fechado, ...Ce8 ou ...Cd7 e ...f5.', 'Atacar o rei branco com ...f4, ...g5 e ...g4.'],
    },
    lines: [
      { name: 'Mar del Plata', sans: 'd4 Nf6 c4 g6 Nc3 Bg7 e4 d6 Nf3 O-O Be2 e5 O-O Nc6 d5 Ne7', note: 'A estrutura típica: o centro fecha e cada lado ataca numa ala.' },
      { name: 'Sämisch', sans: 'd4 Nf6 c4 g6 Nc3 Bg7 e4 d6 f3 O-O Be3 e5', note: 'O peão em f3 dá apoio a e4. As brancas podem rocar grande e atacar também.' },
      { name: 'Com fianchetto', sans: 'd4 Nf6 c4 g6 Nf3 Bg7 g3 O-O Bg2 d6 O-O', note: 'As brancas jogam com menos risco. A luta é mais de manobra.' },
    ],
    traps: [],
    mistakes: ['Pelas pretas, jogar na ala da dama e perder o momento do ataque.', 'Abrir o centro com ...exd4 sem motivo e soltar a pressão.', 'Pelas brancas, ignorar ...f5: um ataque na ala do rei costuma ser perigoso.'],
  },
  {
    slug: 'nimzoindia',
    name: 'Defesa Nimzoíndia',
    eco: 'E20–E59',
    group: 'indias',
    side: 'b',
    level: 'intermediário',
    root: 'd4 Nf6 c4 e6 Nc3 Bb4',
    summary:
      'O bispo em b4 crava o cavalo de c3 e controla e4, impedindo o centro ideal das brancas. As pretas costumam entregar esse bispo em troca de peões dobrados brancos. É uma das defesas mais respeitadas: flexível, ativa e com planos claros.',
    ideas: ['Controlar e4 é mais importante do que manter o par de bispos.', 'Depois da troca em c3, os peões dobrados viram alvo: ...c5, ...b6 e ...Ba6 pressionam c4.'],
    plans: {
      white: ['Evitar os peões dobrados com Dc2, ou aceitá-los e usar o par de bispos e o centro.'],
      black: ['Rocar, jogar ...d5 ou ...b6 e ...c5, e bloquear o centro com peças em e4.'],
    },
    lines: [
      { name: 'Rubinstein', sans: 'd4 Nf6 c4 e6 Nc3 Bb4 e3 O-O Bd3 d5 Nf3 c5 O-O', note: 'Desenvolvimento natural. Daqui saem as posições clássicas do peão isolado.' },
      { name: 'Clássica', sans: 'd4 Nf6 c4 e6 Nc3 Bb4 Qc2 O-O a3 Bxc3+ Qxc3', note: 'As brancas guardam a estrutura com a dama e ficam com o par de bispos.' },
    ],
    traps: [],
    mistakes: ['Trocar em c3 sem criar pressão nos peões dobrados.', 'Pelas brancas, jogar a3 e aceitar os peões dobrados sem plano para o par de bispos.'],
  },
  {
    slug: 'india-da-dama',
    name: 'Defesa Índia da Dama',
    eco: 'E12–E19',
    group: 'indias',
    side: 'b',
    level: 'intermediário',
    root: 'd4 Nf6 c4 e6 Nf3 b6',
    summary:
      'Com o cavalo em f3, a Nimzoíndia perde força, então as pretas colocam o bispo na grande diagonal, por b7 ou a6. O objetivo continua sendo o controle de e4. É uma escolha muito sólida, conhecida pelos finais equilibrados.',
    ideas: ['O bispo em b7 vigia e4 e d5.', 'O lance ...Ba6 cria um incômodo imediato ao peão de c4.'],
    plans: {
      white: ['Fianchetto com g3 e Bg2 para disputar a diagonal, depois Cc3 e e4.'],
      black: ['Rocar, jogar ...d5 ou ...c5 no momento certo e trocar peças para igualar.'],
    },
    lines: [
      { name: 'Variante com ...Ba6', sans: 'd4 Nf6 c4 e6 Nf3 b6 g3 Ba6 b3 Bb4+ Bd2 Be7 Bg2 c6', note: 'O bispo ataca c4 e obriga as brancas a tomar uma decisão pouco natural.' },
      { name: 'Variante com ...Bb7', sans: 'd4 Nf6 c4 e6 Nf3 b6 g3 Bb7 Bg2 Be7 O-O O-O Nc3', note: 'Os dois bispos se olham na diagonal. As brancas tentam jogar e4 mais tarde.' },
    ],
    traps: [],
    mistakes: ['Pelas brancas, jogar e4 antes de ter controle suficiente da casa.', 'Pelas pretas, esquecer de quebrar com ...c5 ou ...d5.'],
  },
  {
    slug: 'grunfeld',
    name: 'Defesa Grünfeld',
    eco: 'D70–D99',
    group: 'indias',
    side: 'b',
    level: 'avançado',
    root: 'd4 Nf6 c4 g6 Nc3 d5',
    summary:
      'As pretas oferecem o centro de propósito. Depois das trocas em d5 e c3, as brancas ficam com dois peões centrais, e as pretas passam a atacar esse centro com o bispo de g7 e ...c5. É dinâmica, teórica e muito usada no alto nível.',
    ideas: ['O centro branco é grande, mas está sob ataque de g7, c5 e, muitas vezes, Cc6 e Bg4.', 'Se o centro for bloqueado ou cair, as pretas ficam muito bem.'],
    plans: {
      white: ['Manter o centro com Be3, Tc1 e Cf3, e empurrar quando for seguro.'],
      black: ['Jogar ...Bg7, ...c5, ...Cc6, ...Bg4 e ...Da5, tudo contra d4.'],
    },
    lines: [
      { name: 'Variante das Trocas', sans: 'd4 Nf6 c4 g6 Nc3 d5 cxd5 Nxd5 e4 Nxc3 bxc3 Bg7 Nf3 c5 Be3 Qa5', note: 'O centro está pronto, e toda a força preta aponta para ele.' },
      { name: 'Variante Russa', sans: 'd4 Nf6 c4 g6 Nc3 d5 Nf3 Bg7 Qb3 dxc4 Qxc4 O-O e4', note: 'A dama branca ganha tempo sobre d5 e o centro avança. As pretas respondem com peças.' },
      { name: 'Com 4.Bf4', sans: 'd4 Nf6 c4 g6 Nc3 d5 Bf4 Bg7 e3 O-O', note: 'As brancas evitam a teoria principal e pressionam d5 e c7.' },
    ],
    traps: [],
    mistakes: ['Pelas pretas, esquecer ...c5: sem ele, o centro branco esmaga.', 'Pelas brancas, empurrar d5 cedo e deixar a grande diagonal aberta.'],
  },
  {
    slug: 'benoni',
    name: 'Defesa Benoni Moderna',
    eco: 'A60–A79',
    group: 'indias',
    side: 'b',
    level: 'avançado',
    root: 'd4 Nf6 c4 c5 d5 e6',
    summary:
      'Estrutura desequilibrada: as brancas têm maioria de peões no centro, e as pretas, na ala da dama. As pretas usam a coluna e aberta, o bispo de g7 e o avanço ...b5 para ganhar jogo. É uma escolha de quem quer ganhar, mesmo com algum risco.',
    ideas: ['A casa e5 e o peão de d5 são os pontos-chave.', 'As brancas querem e5 para abrir o centro. As pretas querem ...b5 para atacar c4.'],
    plans: {
      white: ['Desenvolver com Cf3 e Be2 ou f4, e preparar a ruptura e5.'],
      black: ['Colocar o bispo em g7, a torre em e8, e jogar ...a6 e ...b5.'],
    },
    lines: [
      { name: 'Linha principal', sans: 'd4 Nf6 c4 c5 d5 e6 Nc3 exd5 cxd5 d6 e4 g6 Nf3 Bg7 Be2 O-O O-O Re8', note: 'A posição de referência. As pretas têm um peão fraco em d6, mas muita atividade.', sharp: true },
    ],
    traps: [],
    mistakes: ['Pelas pretas, esquecer ...b5: sem ele, sobra apenas o peão fraco.', 'Pelas brancas, deixar o bispo de g7 livre e a coluna e sem controle.'],
  },
  {
    slug: 'benko',
    name: 'Gambito Benko',
    eco: 'A57–A59',
    group: 'indias',
    side: 'b',
    level: 'intermediário',
    root: 'd4 Nf6 c4 c5 d5 b5',
    summary:
      'As pretas entregam um peão em troca de pressão duradoura nas colunas a e b. Ao contrário da maioria dos gambitos, o ataque não é para ganhar rápido, e sim para pressionar a ala da dama por muito tempo. Mesmo finais podem ser agradáveis para as pretas.',
    ideas: ['O bispo em g7 e as torres em a8 e b8 miram b2 e a2.', 'O peão a mais das brancas pesa pouco, enquanto a pressão durar.'],
    plans: {
      white: ['Consolidar, rocar à mão com Rf1–g2 e, depois, usar o peão extra ou o centro com e5.'],
      black: ['Colocar o bispo em g7, as torres nas colunas a e b, o cavalo em d7 e pressionar sem pressa.'],
    },
    lines: [
      { name: 'Linha principal', sans: 'd4 Nf6 c4 c5 d5 b5 cxb5 a6 bxa6 Bxa6 Nc3 d6 Nf3 g6 e4 Bxf1 Kxf1 Bg7 g3 O-O Kg2', note: 'As brancas têm um peão a mais, e as pretas, as duas colunas abertas.', sharp: true },
    ],
    traps: [],
    mistakes: ['Pelas pretas, ter pressa e tentar recuperar o peão logo: a pressão vale mais do que ele.', 'Pelas brancas, recusar trocas que aliviam a posição.'],
  },
  {
    slug: 'catala',
    name: 'Abertura Catalã',
    eco: 'E00–E09',
    group: 'indias',
    side: 'w',
    level: 'avançado',
    root: 'd4 Nf6 c4 e6 g3',
    summary:
      'As brancas juntam a estrutura do Gambito da Dama com o bispo em g2. Esse bispo pressiona d5 e a ala da dama preta por toda a partida. É uma abertura elegante, sólida, muito usada no alto nível, em que vale mais a pressão do que o ataque direto.',
    ideas: ['O bispo de g2 é o grande trunfo: não vale trocá-lo à toa.', 'Muitas vezes as brancas entregam o peão de c4 e o recuperam com calma.'],
    plans: {
      white: ['Desenvolver, rocar e pressionar com Dc2, Ce5 e Tc1.', 'Recuperar o peão de c4 e usar a pressão em b7.'],
      black: ['Aceitar o peão em c4 e devolvê-lo na hora certa, ou manter a estrutura com ...Be7 e ...c6.', 'Liberar o bispo de c8 por b7, depois de ...b6.'],
    },
    lines: [
      { name: 'Com 4...Be7 e captura depois', sans: 'd4 Nf6 c4 e6 g3 d5 Bg2 Be7 Nf3 O-O O-O dxc4 Qc2 a6', note: 'As brancas entregam o peão por pouco tempo. A dama recupera c4, e a pressão continua.' },
      { name: 'Com captura imediata', sans: 'd4 Nf6 c4 e6 g3 d5 Bg2 dxc4 Nf3 Nc6', note: 'As pretas capturam logo e tentam atrapalhar o desenvolvimento branco com ...Cc6.' },
    ],
    traps: [],
    mistakes: ['Pelas brancas, entrar no meio-jogo sem saber como recuperar c4.', 'Pelas pretas, deixar o bispo de c8 sem saída.'],
  },
  {
    slug: 'holandesa',
    name: 'Defesa Holandesa',
    eco: 'A80–A99',
    group: 'indias',
    side: 'b',
    level: 'intermediário',
    root: 'd4 f5',
    summary:
      'As pretas controlam e4 com o peão de f, buscando uma posição desequilibrada e chances na ala do rei. Em troca, enfraquecem a diagonal e8–h5 e o próprio rei. É uma escolha combativa: ataca bem, mas pede cuidado.',
    ideas: ['O peão de f5 domina e4 e dá base para um ataque.', 'As formações mais conhecidas são a Clássica, a Leningrado e a Stonewall.'],
    plans: {
      white: ['Fianchetto com g3 e Bg2, rocar e jogar c4 e Cc3 para atacar o centro com e4.'],
      black: ['Rocar, jogar ...d6 e ...e5 ou ...De8 e ...Dh5, levando as peças para a ala do rei.'],
    },
    lines: [
      { name: 'Clássica', sans: 'd4 f5 g3 Nf6 Bg2 e6 Nf3 Be7 O-O O-O c4 d6', note: 'Formação flexível. As pretas preparam ...De8 e ...e5.' },
      { name: 'Leningrado', sans: 'd4 f5 g3 Nf6 Bg2 g6 Nf3 Bg7 O-O O-O c4 d6', note: 'O bispo em g7 une a ideia índia ao peão de f5.' },
      { name: 'Stonewall', sans: 'd4 f5 g3 Nf6 Bg2 e6 Nf3 d5 O-O Bd6 c4 c6', note: 'Uma muralha de peões: firme em e4, mas com uma casa fraca em e5.' },
    ],
    traps: [
      {
        name: 'Mate com a dama sacrificada',
        sans: 'd4 f5 Bg5 h6 Bh4 g5 Bg3 f4 e3 h5 Bd3 Rh6 Qxh5+ Rxh5 Bg6#',
        who: 'w',
        errorAt: 11,
        text: 'Expulsar o bispo com peões é tentador, mas abre as casas em volta do rei. Depois de ...Th6, a dama branca captura em h5 de propósito: a torre aceita, e o bispo dá mate em g6. Os peões avançados tiraram todas as casas do próprio rei.',
      },
    ],
    mistakes: ['Avançar os peões da ala do rei sem antes rocar.', 'Pelas brancas, jogar e4 antes de estar pronto e perder um peão.'],
  },
]
