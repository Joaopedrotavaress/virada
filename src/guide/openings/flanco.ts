import type { OpeningGuide } from '../types'

export const FLANCO: OpeningGuide[] = [
  {
    slug: 'inglesa',
    name: 'Abertura Inglesa',
    eco: 'A10–A39',
    group: 'flanco',
    side: 'w',
    level: 'intermediário',
    root: 'c4',
    summary:
      'As brancas controlam d5 com um peão lateral e costumam jogar g3 e Bg2. O resultado parece uma Siciliana com as cores trocadas, e com um lance a mais. É flexível, e pode transpor para muitas estruturas. Quem gosta de manobra costuma se dar bem aqui.',
    ideas: ['O bispo de g2 domina a grande diagonal até b7.', 'As brancas costumam jogar na ala da dama, com a coluna c e o avanço b4.'],
    plans: {
      white: ['Cc3, g3, Bg2, Cf3 e roque. Depois, b4 e d3, com pressão na ala da dama.'],
      black: ['Contra c4, ocupar o centro com ...e5 ou ...c5, e jogar como se fosse uma Siciliana invertida.'],
    },
    lines: [
      { name: 'Com 1...e5', sans: 'c4 e5 Nc3 Nf6 g3 d5 cxd5 Nxd5 Bg2 Nb6 Nf3 Nc6 O-O', note: 'As pretas têm o centro, como numa Siciliana Dragão com as cores trocadas. As brancas têm um lance a mais.' },
      { name: 'Simétrica', sans: 'c4 c5 Nc3 Nc6 g3 g6 Bg2 Bg7 Nf3', note: 'Os dois lados fazem o mesmo. A partida é lenta, e a primeira ruptura define quem fica melhor.' },
    ],
    traps: [],
    mistakes: ['Jogar lento demais e deixar as pretas com um centro enorme.', 'Trocar o bispo de g2 sem motivo.'],
  },
  {
    slug: 'reti',
    name: 'Abertura Réti',
    eco: 'A04–A09',
    group: 'flanco',
    side: 'w',
    level: 'intermediário',
    root: 'Nf3 d5 c4',
    summary:
      'Um clássico das ideias hipermodernas: em vez de ocupar o centro, as brancas o atacam com o cavalo em f3 e o peão em c4. Costuma levar a posições calmas, nas quais as brancas têm uma pequena pressão e bastante flexibilidade.',
    ideas: ['O centro preto é pressionado de longe: c4, g3, Bg2.', 'As brancas podem transpor para a Catalã ou a Inglesa.'],
    plans: {
      white: ['g3, Bg2, O-O, b3 e Bb2, com os dois bispos apontando para o centro.'],
      black: ['Manter d5 com ...e6 ou ...c6, ou avançar ...d4 e ganhar espaço.'],
    },
    lines: [
      { name: 'Com 2...e6', sans: 'Nf3 d5 c4 e6 g3 Nf6 Bg2 Be7 O-O O-O', note: 'Posição próxima da Catalã. A estrutura é firme para os dois lados.' },
      { name: 'Com 2...d4', sans: 'Nf3 d5 c4 d4 e3 Nc6 exd4 Nxd4', note: 'As pretas avançam o peão e as brancas o atacam de imediato.' },
    ],
    traps: [],
    mistakes: ['Pelas brancas, perder a chance de abrir com d4 ou e4 no momento certo.', 'Pelas pretas, deixar o bispo de c8 fechado com ...e6 sem plano.'],
  },
  {
    slug: 'bird',
    name: 'Abertura Bird',
    eco: 'A02–A03',
    group: 'flanco',
    side: 'w',
    level: 'iniciante',
    root: 'f4',
    summary:
      'As brancas controlam e5 com o peão de f, como uma Holandesa com as cores trocadas. É raro em nível alto, mas prático no dia a dia: as brancas têm um plano fácil na ala do rei, com o bispo em b2 ou g2. O preço é um rei mais exposto.',
    ideas: ['O peão de f4 impede ...e5 e dá base para o ataque.', 'O bispo de c1 costuma ir para b2, mirando a grande diagonal.'],
    plans: {
      white: ['Cf3, e3, Be2 ou b3 e Bb2, roque, e depois De1–h4 para atacar.'],
      black: ['Jogar ...d5, ...g6 e ...Bg7, ou tentar punir o lance de cara com o Gambito From.'],
    },
    lines: [
      { name: 'Formação com ...g6', sans: 'f4 d5 Nf3 Nf6 e3 g6 Be2 Bg7 O-O O-O', note: 'As brancas ainda escolhem entre b3 com o bispo em b2, ou d3 e a pressão em e4.' },
      { name: 'Gambito From', sans: 'f4 e5 fxe5 d6 exd6 Bxd6 Nf3 g5', note: 'As pretas entregam um peão para atacar a ala do rei. O melhor é conhecer a resposta precisa.', sharp: true },
    ],
    traps: [
      {
        name: 'Mate rápido no Gambito From',
        sans: 'f4 e5 fxe5 d6 exd6 Bxd6 h3 Bg3#',
        who: 'b',
        errorAt: 6,
        text: 'A saída do peão de f deixa a diagonal e1–h4 sem defesa. Depois de 4.h3, o bispo salta para g3 e o rei não tem casa, nem peça que capture ou tape. Antes de qualquer coisa, as brancas precisam jogar Cf3.',
      },
    ],
    mistakes: ['Esquecer que a saída do peão de f deixa o rei mais exposto.', 'Atacar antes de completar o desenvolvimento.'],
  },
  {
    slug: 'ataque-indio-do-rei',
    name: 'Ataque Índio do Rei',
    eco: 'A07–A08',
    group: 'flanco',
    side: 'w',
    level: 'iniciante',
    root: 'Nf3 d5 g3',
    summary:
      'Um sistema: as brancas jogam Cf3, g3, Bg2, roque, d3, Cbd2 e, por fim, e4. É a Índia do Rei com as cores trocadas e um lance a mais. Funciona contra quase tudo, e o plano de ataque é fácil de lembrar.',
    ideas: ['Com o centro fechado por e5, as brancas atacam na ala do rei com h4, Cf1 e Ch2.', 'Serve contra a Francesa e a Siciliana, sem precisar estudar muita teoria.'],
    plans: {
      white: ['Montar a formação, jogar e4 e, com e5 depois, atacar o roque preto.'],
      black: ['Ocupar o centro com ...d5, ...c5 e ...e5, e atacar na ala da dama com ...b5 e ...c4.'],
    },
    lines: [
      { name: 'Formação clássica', sans: 'Nf3 d5 g3 Nf6 Bg2 c5 O-O Nc6 d3 e5 Nbd2 Be7 e4 O-O Re1', note: 'O Índio do Rei invertido. As pretas têm mais espaço, e as brancas, o plano e4 e f4.' },
      { name: 'Contra a Francesa', sans: 'e4 e6 d3 d5 Nd2 Nf6 Ngf3 Be7 g3 c5 Bg2 Nc6 O-O O-O', note: 'Evita a teoria da Francesa: com e5, as brancas ganham espaço para o ataque.' },
    ],
    traps: [],
    mistakes: ['Jogar a formação sem olhar o que as pretas fazem: às vezes uma ruptura precisa vir antes.', 'Pelas brancas, atrasar e4 e deixar as pretas ganharem espaço de graça.'],
  },
]
