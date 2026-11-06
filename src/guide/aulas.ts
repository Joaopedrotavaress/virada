import type { Lesson, LessonPosition } from './lessons'

/**
 * As aulas em tabuleiro. Cada quadro é uma coisa só: uma posição ou um lance, com uma frase do Seu Nonato.
 * Os testes conferem cada lance, cada casa marcada e cada mate. Ver docs/aprendizado.md.
 */
export interface Frame {
  /** Posição nova. Sem isso, continua da anterior. */
  fen?: string
  /** Lance em notação internacional, jogado a partir do quadro anterior. */
  move?: string
  say: string
  /** Setas verdes: o que olhar. */
  arrows?: [from: string, to: string][]
  /** Setas vermelhas: o perigo. */
  threats?: [from: string, to: string][]
  /** Mostra todas as casas para onde a peça dessa casa pode ir. */
  reach?: string
  good?: string[]
  bad?: string[]
  focus?: string[]
}

export interface Video {
  id: string
  title: string
  channel: string
  minutes: number
}

export interface Aula {
  frames: Frame[]
  /** A frase para levar da aula. */
  takeaway: string
  videos?: Video[]
  extraPositions?: LessonPosition[]
}

const V = {
  guia: { id: 'S1LsUT7jjDI', title: 'Como jogar xadrez: o guia para sair do zero', channel: 'Xadrez Brasil', minutes: 14 },
  regras: { id: 'rrx7CCLQip4', title: 'Todas as regras básicas do xadrez em 8 minutos', channel: 'Xeque!', minutes: 9 },
  enPassant: { id: 'iPdlFXZdRPg', title: 'O que é en passant? Aprenda em 1 minuto', channel: 'Xadrez Brasil', minutes: 1 },
  roque: { id: 'EIovisjFkxc', title: 'Roque', channel: 'Xadrez Prof. Ailton', minutes: 3 },
  xeque: { id: 'D3IGDDPfXQg', title: 'Xeque e xeque-mate', channel: 'Xadrez Prof. Ailton', minutes: 6 },
  mates: { id: '04dNqEcKvV0', title: 'Os principais xeques-mates do xadrez', channel: 'Raffael Chess', minutes: 12 },
  mateDama: { id: 'mBfKCEB5ZdE', title: 'O melhor mate de dama', channel: 'GM Krikor', minutes: 8 },
  taticas: { id: '67aLX1JshEA', title: 'Todas as táticas de xadrez explicadas em 9 minutos', channel: 'Xeque!', minutes: 10 },
  garfo: { id: 'G02ZEWv1ydM', title: 'Temas táticos: o garfo', channel: 'Xadrez Digital', minutes: 13 },
  cravada: { id: 'ELKzmrCx9zo', title: 'Temas táticos: a cravada', channel: 'Xadrez Digital', minutes: 12 },
  espeto: { id: '0_1hP587dXE', title: 'Temas táticos: o espeto', channel: 'Xadrez Digital', minutes: 10 },
  erros: { id: '264JnaF8m0s', title: '3 regras simples que evitam 90% dos seus erros', channel: 'GMEvandroBarbosa', minutes: 18 },
  aberturas: { id: '4aca7xKaswY', title: 'Dois conceitos fundamentais para aprender as aberturas', channel: 'Raffael Chess', minutes: 17 },
  reiPeao: { id: 'XyyEzAah_lU', title: 'Finais básicos: rei e peão contra rei', channel: 'Espaço Caíssa', minutes: 13 },
  oposicao: { id: 'D9etfeXdOZg', title: 'Finais de reis e peões: a oposição', channel: 'Tr. André Basso', minutes: 10 },
  finaisPeoes: { id: 'lSlR0MsNv7I', title: 'As 10 posições mais importantes de finais de peões', channel: 'Rafael Leitão', minutes: 29 },
  torres: { id: '69E6VuDQ3n8', title: 'Finais de torres: Philidor e Lucena', channel: 'MF Julia Alboredo', minutes: 8 },
  estrutura: { id: 'R6rNDPSnHq0', title: 'Estrutura de peões, de uma vez por todas', channel: 'Miya Chess', minutes: 16 },
  peoes: { id: 'y7uKXn47Qs4', title: 'Peão passado, isolado, dobrado e atrasado', channel: 'Xadrez Prof. Ailton', minutes: 4 },
  meioJogo: { id: 'UBJcUXHfXk0', title: '3 passos para entender o meio-jogo', channel: 'GMEvandroBarbosa', minutes: 21 },
  calcular: { id: '_Es1UC4Vyak', title: 'Como calcular no xadrez', channel: 'GMEvandroBarbosa', minutes: 16 },
} satisfies Record<string, Video>

const START = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1'

/** Aulas novas, que só existem em tabuleiro. */
export const NEW_LESSONS: Lesson[] = [
  {
    id: 'torre-bispo',
    group: 'regras',
    title: 'Torre e bispo: as linhas',
    paragraphs: ['A torre anda em linha reta, o bispo na diagonal. Nenhum dos dois pula por cima de outra peça.'],
    positions: [
      { fen: '7k/8/8/8/8/8/R7/4K3 w - - 0 1', prompt: 'Leve a torre até a casa marcada.', solution: ['Ra7'], goal: 'move', strict: true, marks: ['a7'], after: 'Linha reta, quantas casas quiser. Agora ela corta a sétima fileira.' },
      { fen: '7k/8/8/8/8/8/8/2B1K3 w - - 0 1', prompt: 'Leve o bispo até a casa marcada.', solution: ['Bh6'], goal: 'move', strict: true, marks: ['h6'], after: 'A diagonal inteira, de uma vez só.' },
    ],
  },
  {
    id: 'dama-rei',
    group: 'regras',
    title: 'Dama e rei: a mais forte e o mais importante',
    paragraphs: ['A dama anda como torre e como bispo. O rei anda uma casa para qualquer lado e nunca pode ficar em casa atacada.'],
    positions: [
      { fen: '6k1/8/8/8/8/8/8/Q3K3 w - - 0 1', prompt: 'Leve a dama até a casa marcada.', solution: ['Qf6'], goal: 'move', strict: true, marks: ['f6'], after: 'Pela diagonal. Dali ela tira várias casas do rei preto.' },
      { fen: '7k/8/8/8/8/8/8/4K3 w - - 0 1', prompt: 'Ande com o rei até a casa marcada.', solution: ['Ke2'], goal: 'move', strict: true, marks: ['e2'], after: 'Uma casa de cada vez.' },
    ],
  },
  {
    id: 'cavalo',
    group: 'regras',
    title: 'Cavalo: o salto em L',
    paragraphs: ['O cavalo anda em L: duas casas para um lado e uma para o outro. É a única peça que pula por cima das outras.'],
    positions: [
      { fen: '7k/8/8/8/8/8/8/1N2K3 w - - 0 1', prompt: 'Leve o cavalo até a casa marcada.', solution: ['Nc3'], goal: 'move', strict: true, marks: ['c3'], after: 'Duas casas para cima e uma para o lado.' },
      { fen: '7k/8/8/3p4/8/2N5/8/4K3 w - - 0 1', prompt: 'Capture o peão preto.', solution: ['Nxd5'], goal: 'move', strict: true, marks: ['d5'], after: 'O cavalo captura onde cai, e só onde cai.' },
    ],
  },
  {
    id: 'peao',
    group: 'regras',
    title: 'Peão: pequeno e teimoso',
    paragraphs: ['O peão anda para a frente e captura na diagonal. No primeiro lance, pode andar duas casas. Nunca volta.'],
    positions: [
      { fen: '4k3/8/8/8/8/8/4P3/4K3 w - - 0 1', prompt: 'Avance o peão duas casas, até a casa marcada.', solution: ['e4'], goal: 'move', strict: true, marks: ['e4'], after: 'Duas casas, só no primeiro lance dele.' },
      { fen: '4k3/8/8/3p4/4P3/8/8/4K3 w - - 0 1', prompt: 'Capture o peão preto.', solution: ['exd5'], goal: 'move', strict: true, marks: ['d5'], after: 'O peão anda reto, mas captura na diagonal.' },
    ],
  },
  {
    id: 'captura-valor',
    group: 'regras',
    title: 'Capturar e fazer a conta',
    paragraphs: ['Peão vale 1, cavalo e bispo valem 3, torre vale 5 e dama vale 9. Antes de capturar, confira quem defende.'],
    positions: [
      { fen: '6k1/5ppp/8/8/3q4/8/2N2PPP/6K1 w - - 0 1', prompt: 'A dama preta está sem defesa. Capture com o cavalo.', solution: ['Nxd4'], goal: 'move', strict: true, marks: ['d4'], after: 'Nove pontos de graça. Ninguém podia retomar.' },
      { fen: '4q1k1/5ppp/8/8/p3R3/8/5PPP/6K1 w - - 0 1', prompt: 'Sua torre pode capturar duas coisas. Fique com a mais valiosa.', solution: ['Rxe8#'], goal: 'mate', strict: true, after: 'A dama vale 9 e o peão vale 1. E ainda foi mate, porque o rei não tinha casa.' },
    ],
  },
  {
    id: 'xeque',
    group: 'regras',
    title: 'Xeque: as três saídas',
    paragraphs: ['Xeque é atacar o rei. Quem leva xeque precisa resolver isso no mesmo lance: fugir, tapar ou capturar quem deu o xeque.'],
    positions: [
      { fen: '4k3/8/8/8/8/8/8/R3K3 w - - 0 1', prompt: 'Dê xeque no rei preto com a torre.', solution: ['Ra8+'], goal: 'move', strict: true, after: 'A torre ataca o rei pela fileira. Agora as pretas precisam resolver isso.' },
      { fen: '4k3/8/8/8/8/8/4r3/4K2R w - - 0 1', prompt: 'Você está em xeque. A torre preta está sem defesa: capture-a com o rei.', solution: ['Kxe2'], goal: 'move', strict: true, marks: ['e2'], after: 'O rei também captura, desde que a peça não esteja defendida.' },
    ],
  },
  {
    id: 'mate-e-afogamento',
    group: 'regras',
    title: 'Xeque-mate e afogamento',
    paragraphs: ['Mate é xeque sem saída, e vence a partida. Afogamento é ficar sem lance legal, sem estar em xeque, e dá empate.'],
    positions: [
      { fen: '7k/6pp/8/8/8/8/8/R5K1 w - - 0 1', prompt: 'O rei preto está preso atrás dos peões. Dê o mate.', solution: ['Ra8#'], goal: 'mate', after: 'Xeque, e nenhuma das três saídas funciona.' },
      { fen: '7k/8/5K2/8/8/8/8/6Q1 w - - 0 1', prompt: 'Dê o mate sem afogar o rei.', solution: ['Qg7#'], goal: 'mate', after: 'A dama em g7 está protegida pelo seu rei. Foi xeque, então é mate, e não afogamento.' },
    ],
  },
  {
    id: 'lances-especiais',
    group: 'regras',
    title: 'Roque, en passant e promoção',
    paragraphs: ['Três regras que parecem exceção. O roque protege o rei, o en passant é uma captura especial de peão, e a promoção transforma o peão que chega ao fim do tabuleiro.'],
    positions: [
      { fen: '4k3/8/8/8/8/8/5PPP/4K2R w K - 0 1', prompt: 'Faça o roque: arraste o rei duas casas em direção à torre.', solution: ['O-O'], goal: 'move', strict: true, marks: ['g1'], after: 'O rei fica atrás dos peões, e a torre sai do canto.' },
      { fen: '4k3/8/8/3pP3/8/8/8/4K3 w - d6 0 2', prompt: 'O peão preto acabou de andar duas casas. Capture en passant.', solution: ['exd6'], goal: 'move', strict: true, marks: ['d6'], after: 'Você captura como se ele tivesse andado uma casa só. Só vale neste lance.' },
      { fen: '8/P6k/8/8/8/8/8/4K3 w - - 0 1', prompt: 'Promova o peão a dama.', solution: ['a8=Q'], goal: 'move', strict: true, marks: ['a8'], after: 'Ao chegar na última fileira, ele vira a peça que você escolher. Quase sempre, dama.' },
    ],
  },
  {
    id: 'principios-abertura',
    group: 'estrategia',
    title: 'Abertura: centro, peças, rei',
    paragraphs: ['Três metas para os primeiros lances: ocupar o centro, tirar as peças de casa e colocar o rei em segurança com o roque.'],
    positions: [
      { fen: 'rnbqkbnr/pppp1ppp/8/4p3/4P3/8/PPPP1PPP/RNBQKBNR w KQkq - 0 2', prompt: 'Tire uma peça de casa, de preferência atacando o peão de e5.', solution: ['Nf3'], goal: 'move', after: 'O cavalo sai, olha para o centro e ainda cria uma ameaça.' },
      { fen: 'r1bqk1nr/pppp1ppp/2n5/2b1p3/2B1P3/5N2/PPPP1PPP/RNBQK2R w KQkq - 4 4', prompt: 'Peças fora, centro ocupado. Agora coloque o rei em segurança.', solution: ['O-O'], goal: 'move', strict: true, marks: ['g1'], after: 'Rei protegido e torre pronta para entrar no jogo.' },
    ],
    puzzleTheme: 'opening',
  },
  {
    id: 'plano-meio-jogo',
    group: 'estrategia',
    title: 'Sem tática na mesa: o que fazer?',
    paragraphs: ['Quando não há nada para ganhar agora, melhore o que está pior: coloque torres em colunas abertas e leve a pior peça para uma casa boa.'],
    positions: [
      { fen: '6k1/pp3ppp/2p5/8/8/P1P5/5PPP/3R2K1 w - - 0 1', prompt: 'A coluna d está aberta. Leve a torre à sétima fileira.', solution: ['Rd7'], goal: 'move', marks: ['d7'], after: 'Na sétima, ela ataca peões e deixa o rei preso.' },
    ],
  },
  {
    id: 'estrutura-peoes',
    group: 'estrategia',
    title: 'Os peões contam a história',
    paragraphs: ['Peão isolado precisa de ajuda, peões dobrados atrapalham um ao outro, e o peão passado é uma ameaça constante. Quase todo plano nasce daí.'],
    positions: [
      { fen: '4k3/5ppp/8/P7/8/8/5PPP/4K3 w - - 0 1', prompt: 'Só um peão aqui é passado. Empurre-o.', solution: ['a6'], goal: 'move', strict: true, marks: ['a6'], after: 'Nenhum peão preto pode pará-lo. O rei preto vai ter de correr atrás.' },
      { fen: '4k3/5ppp/8/8/3p4/8/3R1PPP/4K3 w - - 0 1', prompt: 'O peão de d4 está isolado e sem defesa. Ganhe-o.', solution: ['Rxd4'], goal: 'win', after: 'Sem vizinhos para defender, ele foi um alvo fácil.' },
    ],
  },
  {
    id: 'calculo',
    group: 'calculo',
    title: 'Calcular: xeques, capturas, ameaças',
    paragraphs: ['Antes de escolher um lance, olhe nesta ordem: todos os xeques, todas as capturas e todas as ameaças. Os lances forçados são os mais fáceis de calcular até o fim.'],
    positions: [
      { fen: '5k2/pp4pQ/5b2/2P5/P5qP/2P1R1P1/3r1P1K/8 w - - 1 36', prompt: 'Mate em dois. Comece pelos xeques.', solution: ['Qh8+', 'Kf7', 'Qe8#'], goal: 'mate', after: 'Só havia uma resposta para o primeiro xeque, então deu para ver até o fim.' },
      { fen: '8/p5R1/7p/1p2Bp1k/2q2P2/7P/P5PK/8 w - - 2 35', prompt: 'Mate em três. Vai com calma: um peão abre o caminho.', solution: ['g4+', 'fxg4', 'hxg4+', 'Kh4', 'Bf6#'], goal: 'mate', after: 'Xeque, captura, xeque, mate. Cada lance deixava poucas respostas.' },
    ],
    puzzleTheme: 'mateIn3',
  },
  {
    id: 'sacrificio',
    group: 'calculo',
    title: 'Sacrifício: pagar agora, receber depois',
    paragraphs: ['Sacrificar é entregar material em troca de algo maior: um mate, uma peça de volta ou um ataque que não para. A conta precisa fechar antes de soltar a peça.'],
    positions: [
      { fen: '1n3r1k/6pp/7N/8/3q4/8/Q4RPP/1q3BK1 w - - 2 33', prompt: 'Sua dama pode ir até g8. Vale entregar: dê mate em dois.', solution: ['Qg8+', 'Rxg8', 'Nf7#'], goal: 'mate', after: 'A torre foi obrigada a capturar e tapou a última casa do rei. É o mate sufocado de novo.' },
      { fen: '3r3r/4kp2/4p1p1/4P3/2Q2P2/4q3/P5PP/2R2R1K b - - 2 27', prompt: 'De pretas: mate em dois, entregando uma torre.', solution: ['Rxh2+', 'Kxh2', 'Rh8#'], goal: 'mate', after: 'A primeira torre abre a coluna e atrai o rei. A segunda fecha a conta.' },
    ],
    puzzleTheme: 'sacrifice',
  },
  {
    id: 'revisar-partidas',
    group: 'calculo',
    title: 'Aprenda com as suas partidas',
    paragraphs: ['Quem melhora mais não é quem joga mais: é quem olha o que errou. Depois de cada partida, procure o primeiro erro sério e entenda o que não viu.'],
    positions: [],
    link: { path: '#/partidas', label: 'Abrir as minhas partidas' },
  },
  {
    id: 'seu-repertorio',
    group: 'calculo',
    title: 'Monte o seu repertório',
    paragraphs: ['Não decore vinte aberturas. Escolha uma de brancas e duas de pretas, uma contra e4 e outra contra d4, e entenda as ideias antes de decorar lances.'],
    positions: [],
    link: { path: '#/guia', label: 'Abrir o guia de aberturas' },
  },
]

export const AULAS: Record<string, Aula> = {
  'torre-bispo': {
    takeaway: 'Torre em linha reta, bispo na diagonal. Ninguém pula.',
    videos: [V.guia],
    frames: [
      { fen: '7k/8/8/8/3R4/8/8/4K3 w - - 0 1', reach: 'd4', say: 'Senta aí, chefia. A torre anda em linha reta: para cima, para baixo e para os lados, quantas casas quiser.' },
      { move: 'Rd8+', arrows: [['d4', 'd8']], say: 'Olha ela indo até o fim do tabuleiro de uma vez. Em d8, ainda ataca o rei.' },
      { fen: '8/7k/8/8/3B4/8/8/4K3 w - - 0 1', reach: 'd4', say: 'O bispo anda na diagonal. Só na diagonal.' },
      { focus: ['d4'], say: 'Ele começa numa cor de casa e morre nela. Por isso cada lado tem dois: um para cada cor.' },
      { fen: '7k/8/8/8/3R4/3P4/8/4K3 w - - 0 1', reach: 'd4', bad: ['d3'], say: 'E nenhum dos dois pula. Com um peão seu na frente, o caminho acaba ali.' },
    ],
  },
  'dama-rei': {
    takeaway: 'A dama é torre e bispo juntos. O rei anda uma casa e nunca pisa em casa atacada.',
    videos: [V.regras],
    frames: [
      { fen: '6k1/8/8/8/3Q4/8/8/4K3 w - - 0 1', reach: 'd4', say: 'A dama junta torre e bispo: linha reta e diagonal. Do meio do tabuleiro, olha quanta casa.' },
      { fen: '7k/8/8/8/3K4/8/8/8 w - - 0 1', reach: 'd4', say: 'O rei anda uma casa só, para qualquer lado. É devagar, mas a partida inteira gira em torno dele.' },
      { fen: '8/8/8/3k4/8/3K4/8/8 w - - 0 1', reach: 'd3', bad: ['c4', 'd4', 'e4'], say: 'Um rei nunca encosta no outro. Essas três casas estão proibidas, porque o rei preto ataca todas.' },
    ],
  },
  cavalo: {
    takeaway: 'Duas casas e uma para o lado, pulando quem estiver no meio.',
    videos: [V.regras],
    frames: [
      { fen: '7k/8/8/8/3N4/8/8/4K3 w - - 0 1', reach: 'd4', say: 'O cavalo anda em L: duas casas para um lado e uma para o outro.' },
      { fen: '7k/8/8/2PPP3/2PNP3/2PPP3/8/4K3 w - - 0 1', reach: 'd4', say: 'É a única peça que pula. Cercado de peões, ele chega nas mesmas casas.' },
      { fen: '7k/8/8/8/3N4/8/8/4K3 w - - 0 1', focus: ['d4'], say: 'Repara na cor da casa: ele está numa escura.' },
      { move: 'Nf5', focus: ['f5'], say: 'E caiu numa clara. O cavalo sempre troca a cor da casa.' },
    ],
  },
  peao: {
    takeaway: 'Anda reto, captura na diagonal e nunca volta.',
    videos: [V.regras],
    frames: [
      { fen: '4k3/8/8/8/8/8/4P3/4K3 w - - 0 1', reach: 'e2', say: 'O peão anda uma casa para a frente. No primeiro lance, pode andar duas.' },
      { move: 'e4', say: 'Foi de duas. Daqui em diante é uma por vez, e ele nunca volta.' },
      { fen: '4k3/8/8/3p1p2/4P3/8/8/4K3 w - - 0 1', reach: 'e4', say: 'Anda reto, mas captura na diagonal. Olha as três opções dele.' },
      { fen: '4k3/8/8/4p3/4P3/8/8/4K3 w - - 0 1', bad: ['e5'], focus: ['e4'], say: 'Com alguém bem na frente, ele empaca: não anda nem captura reto.' },
    ],
  },
  'captura-valor': {
    takeaway: 'Peão 1, cavalo e bispo 3, torre 5, dama 9. Antes de capturar, olhe quem defende.',
    frames: [
      { fen: '6k1/8/8/3n4/8/8/3R4/6K1 w - - 0 1', arrows: [['d2', 'd5']], say: 'Capturar é ir para a casa de uma peça inimiga e tirá-la do tabuleiro.' },
      { move: 'Rxd5', say: 'A torre pegou o cavalo. Todas capturam do jeito que andam. Só o peão é diferente.' },
      { fen: '3qkr2/8/2b1n3/4p3/8/8/8/4K3 w - - 0 1', say: 'A conta do bar: peão vale 1, cavalo e bispo 3, torre 5, dama 9. O rei não tem preço.' },
      { fen: '6k1/5ppp/8/3r4/8/2N5/5PPP/6K1 w - - 0 1', arrows: [['c3', 'd5']], say: 'Cavalo, que vale 3, contra torre, que vale 5, sem ninguém defendendo. Lucro.' },
      { fen: '6k1/5ppp/4p3/3p4/8/2N5/5PPP/6K1 w - - 0 1', arrows: [['c3', 'd5']], threats: [['e6', 'd5']], say: 'Agora olha: pegar o peão custa o cavalo, porque e6 retoma. Paga 3 para levar 1. Prejuízo.' },
    ],
  },
  xeque: {
    takeaway: 'Em xeque, só há três saídas: fugir, tapar ou capturar.',
    videos: [V.xeque],
    frames: [
      { fen: '4k3/8/8/8/8/8/8/R3K3 w - - 0 1', arrows: [['a1', 'a8']], say: 'Xeque é atacar o rei. Quem leva precisa resolver isso agora, antes de qualquer outra coisa.' },
      { move: 'Ra8+', threats: [['a8', 'e8']], say: 'A torre ataca o rei pela fileira. Isso é xeque.' },
      { fen: '4k3/8/8/8/4R3/8/8/4K3 b - - 0 1', reach: 'e8', threats: [['e4', 'e8']], say: 'Saída número 1: fugir para uma casa que ninguém ataca. A coluna e está proibida.' },
      { fen: '4k3/8/2n5/8/4R3/8/8/4K3 b - - 0 1', threats: [['e4', 'e8']], arrows: [['c6', 'e5']], say: 'Saída número 2: tapar. Uma peça entra no caminho.' },
      { move: 'Ne5', say: 'O cavalo ficou no meio. O rei está salvo por enquanto.' },
      { fen: '4k3/8/5n2/8/4R3/8/8/4K3 b - - 0 1', threats: [['e4', 'e8']], arrows: [['f6', 'e4']], say: 'Saída número 3: capturar quem deu o xeque.' },
      { move: 'Nxe4', say: 'Resolvido, e ainda levou a torre.' },
    ],
  },
  'mate-e-afogamento': {
    takeaway: 'Xeque sem saída é mate. Sem xeque e sem lance é afogamento, e dá empate.',
    videos: [V.xeque],
    frames: [
      { fen: '6k1/5ppp/8/8/8/8/8/R5K1 w - - 0 1', arrows: [['a1', 'a8']], say: 'Olha o rei preto atrás dos próprios peões.' },
      { move: 'Ra8#', bad: ['g8'], say: 'Xeque-mate: não dá para fugir, nem tapar, nem capturar. Fechou a conta.' },
      { fen: '7k/5Q2/6K1/8/8/8/8/8 b - - 0 1', focus: ['h8'], bad: ['g8', 'g7', 'h7'], say: 'Agora é a vez das pretas. O rei não está em xeque, mas todas as casas estão proibidas.' },
      { say: 'Sem lance legal e sem xeque: é afogamento, e a partida empata. Muita vitória vai embora assim, chefia.' },
    ],
  },
  'lances-especiais': {
    takeaway: 'Roque só com rei e torre sem ter mexido. En passant só no lance seguinte. Peão no fim vira dama.',
    videos: [V.roque, V.enPassant],
    frames: [
      { fen: 'r3k2r/8/8/8/8/8/8/R3K2R w KQkq - 0 1', arrows: [['e1', 'g1']], say: 'Roque: o rei anda duas casas em direção à torre.' },
      { move: 'O-O', focus: ['g1', 'f1'], say: 'E a torre pula para o outro lado dele. É um lance só, e o único em que duas peças mexem.' },
      { fen: 'r3k2r/8/8/8/2b5/8/8/R3K2R w KQkq - 0 1', threats: [['c4', 'f1']], bad: ['f1'], say: 'Não vale passar por casa atacada. Aqui o bispo olha para f1, então o roque curto está proibido.' },
      { fen: '4k3/3p4/8/4P3/8/8/8/4K3 b - - 0 1', arrows: [['d7', 'd5']], say: 'En passant: o peão preto vai andar duas casas, para passar direto pelo branco.' },
      { move: 'd5', focus: ['d6'], say: 'Parou ao lado. Mas o branco pode capturar como se ele tivesse andado só uma.' },
      { move: 'exd6', say: 'Captura em d6 e o peão preto some de d5. Só vale neste lance, logo depois.' },
      { fen: '4k3/P7/8/8/8/8/8/4K3 w - - 0 1', arrows: [['a7', 'a8']], say: 'Promoção: o peão chegou ao fim e vira o que você quiser.' },
      { move: 'a8=Q+', say: 'Quase sempre, dama. E esta já chegou dando xeque.' },
    ],
  },
  'mate-do-pastor': {
    takeaway: 'Dama e bispo em cima de f7? Defenda f7 antes de qualquer outra coisa.',
    videos: [V.mates],
    frames: [
      { fen: START, say: 'O golpe que todo mundo leva uma vez, chefia. Depois você nunca mais cai.' },
      { move: 'e4', say: 'As brancas abrem a saída do bispo e da dama.' },
      { move: 'e5', say: 'As pretas respondem igual.' },
      { move: 'Bc4', arrows: [['c4', 'f7']], say: 'O bispo já mira f7, a casa mais fraca das pretas: só o rei defende.' },
      { move: 'Bc5', say: 'As pretas desenvolvem o bispo, tudo normal.' },
      { move: 'Qf3', arrows: [['c4', 'f7'], ['f3', 'f7']], focus: ['f7'], say: 'Agora são dois em cima de f7.' },
      { move: 'Nf6', say: 'E é aqui que se salva: o cavalo tapa a coluna, e a dama não chega mais em f7.' },
      { fen: 'rnbqk1nr/pppp1ppp/8/2b1p3/2B1P3/5Q2/PPPP1PPP/RNB1K1NR b KQkq - 3 3', threats: [['f3', 'f7'], ['c4', 'f7']], say: 'Mas volta um lance e imagina que as pretas não viram nada.' },
      { move: 'Nc6', say: 'Saiu com o cavalo para o outro lado.' },
      { move: 'Qxf7#', bad: ['e8'], say: 'Mate. A dama está protegida pelo bispo, e o rei não tem casa.' },
    ],
  },
  'mate-do-corredor': {
    takeaway: 'Abra uma casa de fuga com h6 ou g6 antes que seja tarde.',
    videos: [V.mates],
    frames: [
      { fen: '6k1/5ppp/8/8/8/8/5PPP/4R1K1 w - - 0 1', bad: ['f7', 'g7', 'h7'], arrows: [['e1', 'e8']], say: 'Rei rocado, três peões na frente, parece seguro. Só que ele não tem para onde ir.' },
      { move: 'Re8#', say: 'A torre chega na última fileira, e os próprios peões prendem o rei.' },
      { fen: '6k1/5pp1/7p/8/8/8/5PPP/4R1K1 w - - 0 1', good: ['h7'], say: 'Agora com o peão em h6: abriu uma casa de fuga, em h7.' },
      { move: 'Re8+', say: 'A mesma torre, o mesmo xeque.' },
      { move: 'Kh7', say: 'Mas agora o rei escapa. Um lance de peão salvou a partida.' },
    ],
  },
  'peca-solta': {
    takeaway: 'Antes de cada lance: o que ele ameaça? E o que fica sem defesa depois do meu?',
    videos: [V.erros],
    extraPositions: [
      { fen: '6k1/5ppp/8/1b6/8/8/1R3PPP/6K1 w - - 0 1', prompt: 'Tem uma peça sem defesa. Pegue.', solution: ['Rxb5'], goal: 'win', after: 'Ninguém defendia o bispo. Era só olhar a coluna.' },
      { fen: '2r3k1/5pp1/7p/8/2B5/8/5PPP/6K1 b - - 0 1', prompt: 'De pretas agora. Qual peça branca ficou sem defesa?', solution: ['Rxc4'], goal: 'win', after: 'O bispo estava sozinho, e a torre preta enxergava a coluna inteira.' },
    ],
    frames: [
      { fen: '6k1/5ppp/2n5/8/8/5N2/5PPP/2R3K1 w - - 0 1', focus: ['c6'], arrows: [['c1', 'c6']], say: 'Olha o cavalo preto, chefia: ninguém cuida dele. É a tática mais comum que existe.' },
      { move: 'Rxc6', say: 'Peça de graça. Em partida de verdade, isso decide mais que qualquer abertura.' },
      { fen: '6k1/5ppp/2n5/8/3N4/8/5PPP/6K1 b - - 0 1', threats: [['c6', 'd4']], say: 'Agora do outro lado: as brancas acabaram de pôr o cavalo em d4, sem defesa.' },
      { move: 'Nxd4', say: 'Duas perguntas antes de soltar a peça: o que ele ameaça? O que fica sem defesa depois do meu lance?' },
    ],
  },
  'dama-e-rei': {
    takeaway: 'A dama encurrala, o rei vem ajudar, e confira sempre se não afogou.',
    videos: [V.mateDama],
    frames: [
      { fen: '8/k7/8/8/8/2Q5/8/K7 w - - 0 1', arrows: [['c3', 'c6']], say: 'A dama sozinha não dá mate, mas encurrala. O truque é ficar a um salto de cavalo do rei.' },
      { move: 'Qc6', bad: ['a8', 'a6', 'b6', 'b7'], good: ['b8'], say: 'Olha quantas casas sumiram. Só sobrou b8.' },
      { fen: 'k7/8/1K6/8/8/8/2Q5/8 w - - 0 1', arrows: [['c2', 'c8']], say: 'Quando o rei preto está na borda, o seu rei chega perto e a dama termina.' },
      { move: 'Qc8#', say: 'Mate: a dama fecha a fileira, e o seu rei cuida de a7 e b7.' },
      { fen: 'k7/8/1K6/8/8/8/2Q5/8 w - - 0 1', threats: [['c2', 'c7']], say: 'Mesma posição. Agora o erro que todo mundo comete.' },
      { move: 'Qc7', bad: ['a7', 'b7', 'b8'], say: 'Sem xeque e sem casa para o rei: afogou. Empate numa partida ganha.' },
    ],
  },
  'mate-de-escada': {
    takeaway: 'Uma torre corta, a outra dá xeque, e o rei sobe até a borda.',
    videos: [V.mates],
    frames: [
      { fen: '8/8/8/7k/8/R7/1R6/6K1 w - - 0 1', say: 'Duas torres, sem pressa. Uma corta a passagem e a outra dá o xeque, como quem sobe escada.' },
      { move: 'Rb4', arrows: [['b4', 'h4']], say: 'A torre em b4 fecha a quarta fileira. O rei não desce mais.' },
      { move: 'Kg5', say: 'Ele anda para o lado.' },
      { move: 'Ra5+', say: 'Xeque na quinta. O rei tem de subir.' },
      { move: 'Kg6', say: 'Subiu.' },
      { move: 'Rb6+', say: 'A outra torre sobe um degrau.' },
      { move: 'Kg7', say: 'Subiu de novo.' },
      { move: 'Ra7+', say: 'Mais um degrau.' },
      { move: 'Kg8', say: 'Acabou a escada.' },
      { move: 'Rb8#', say: 'Mate. Se o rei chegar perto de uma torre, leve-a para o outro lado do tabuleiro e continue.' },
    ],
  },
  'torre-e-rei': {
    takeaway: 'Reis de frente, xeque na fileira. Se não estiverem, faça um lance de espera com a torre.',
    videos: [V.mates],
    frames: [
      { fen: '4k3/8/4K3/8/8/8/8/7R w - - 0 1', good: ['d7', 'e7', 'f7'], arrows: [['h1', 'h8']], say: 'Reis de frente: o seu tira as três casas de cima. A torre só precisa da fileira.' },
      { move: 'Rh8#', say: 'Mate. Essa é a imagem que você precisa guardar.' },
      { fen: '3k4/8/4K3/8/8/8/8/7R w - - 0 1', focus: ['d8', 'e6'], say: 'E com os reis desencontrados? Xeque agora só deixa o rei fugir.' },
      { move: 'Rh7', arrows: [['h7', 'a7']], say: 'Lance de espera: a torre corta a sétima e passa a vez.' },
      { move: 'Ke8', say: 'O rei preto é obrigado a se mexer, e foi para a frente do seu.' },
      { move: 'Rh8#', say: 'Pronto. Se ele tivesse ido para o outro lado, era só andar com o rei atrás dele.' },
    ],
  },
  garfo: {
    takeaway: 'Duas peças a um salto de cavalo? Procure a casa em comum.',
    videos: [V.garfo],
    frames: [
      { fen: '2r1k3/8/8/1N6/8/8/PP6/4K3 w - - 0 1', focus: ['d6'], say: 'Rei em e8, torre em c8. Existe uma casa que ataca os dois: d6.' },
      { move: 'Nd6+', threats: [['d6', 'e8'], ['d6', 'c8']], say: 'Um lance, dois ataques. E um deles é xeque, então não dá tempo de salvar a torre.' },
      { move: 'Kd7', say: 'O rei tem de resolver o xeque primeiro.' },
      { move: 'Nxc8', say: 'Lá se foi a torre. Mesmo que ele retome o cavalo, a conta fecha: leva 5, paga 3.' },
    ],
  },
  cravada: {
    takeaway: 'Peça cravada não foge: ataque ela de novo.',
    videos: [V.cravada],
    frames: [
      { fen: '4k3/4n3/8/8/4R3/8/8/2B1K3 w - - 0 1', arrows: [['e4', 'e8']], bad: ['e7'], say: 'O cavalo está na frente do rei. Se sair, o rei fica em xeque, e isso é proibido. Está cravado.' },
      { move: 'Bg5', arrows: [['g5', 'e7']], say: 'Peça cravada não foge. Então ataca de novo.' },
      { move: 'Kd7', say: 'O rei corre para defender.' },
      { move: 'Bxe7', say: 'Mas agora são dois atacando e um defendendo. O rei nem pode retomar, porque a torre protege o bispo.' },
    ],
  },
  espeto: {
    takeaway: 'Rei na frente, peça atrás, na mesma linha: dê o xeque.',
    videos: [V.espeto],
    frames: [
      { fen: '1q6/8/8/4k3/8/8/PP6/4B1K1 w - - 0 1', arrows: [['e1', 'g3']], focus: ['e5', 'b8'], say: 'Rei e dama na mesma diagonal. A peça mais valiosa está na frente: é o espeto.' },
      { move: 'Bg3+', threats: [['g3', 'e5']], say: 'Xeque. O rei é obrigado a sair da frente.' },
      { move: 'Kf5', arrows: [['g3', 'b8']], say: 'Saiu. E olha o que apareceu atrás dele.' },
      { move: 'Bxb8', say: 'O bispo leva a dama. É a cravada ao contrário.' },
    ],
  },
  'ataque-descoberto': {
    takeaway: 'Uma peça sai da frente e duas atacam. Se a que sai dá xeque, a outra leva o que quiser.',
    videos: [V.taticas],
    frames: [
      { fen: '3qk3/8/8/8/8/3B4/PP6/3RK3 w - - 0 1', arrows: [['d3', 'b5']], focus: ['d8'], say: 'A torre olha para a dama, mas o bispo está no meio. E se ele sair com ameaça?' },
      { move: 'Bb5+', threats: [['d1', 'd8'], ['b5', 'e8']], say: 'Saiu dando xeque, e a torre ficou de cara com a dama. Duas ameaças num lance só.' },
      { move: 'Ke7', say: 'O rei precisa sair do xeque primeiro.' },
      { move: 'Rxd8', say: 'E a dama cai. Mesmo com o rei retomando, ele levou 9 e pagou 5.' },
    ],
  },
  'xeque-duplo': {
    takeaway: 'Contra dois xeques ao mesmo tempo, só o rei pode responder.',
    videos: [V.taticas],
    frames: [
      { fen: '4k3/8/8/8/4N3/8/8/4R1K1 w - - 0 1', arrows: [['e4', 'f6']], say: 'O cavalo está tapando a torre. Quando ele sair, a torre dá xeque. E se ele sair dando xeque também?' },
      { move: 'Nf6+', threats: [['f6', 'e8'], ['e1', 'e8']], say: 'Dois xeques ao mesmo tempo. Não dá para capturar os dois nem tapar os dois.' },
      { move: 'Kf7', say: 'Só resta andar com o rei. Sem casa, seria mate, com qualquer peça em volta.' },
    ],
  },
  desvio: {
    takeaway: 'Se uma peça defende duas coisas, ela está sobrecarregada: faça ela escolher.',
    videos: [V.taticas],
    extraPositions: [
      { fen: '1r4k1/1q3ppp/8/8/8/7P/1Q3PP1/3R2K1 w - - 0 1', prompt: 'A torre preta defende a dama e a última fileira. Desvie essa torre.', solution: ['Rd8+', 'Rxd8', 'Qxb7'], goal: 'win', after: 'A torre foi obrigada a capturar e largou a dama.' },
    ],
    frames: [
      { fen: '2r3k1/2q2ppp/8/8/8/7P/2Q2PP1/4R1K1 w - - 0 1', focus: ['c8'], say: 'Olha a torre em c8: ela defende a dama e também a última fileira. É trabalho demais.' },
      { move: 'Re8+', arrows: [['e8', 'c8']], say: 'Xeque. Só existe uma resposta, e é capturar.' },
      { move: 'Rxe8', threats: [['c2', 'c7']], say: 'A torre saiu, e a dama ficou sozinha.' },
      { move: 'Qxc7', say: 'Entregou a torre, ganhou a dama. Isso é desvio.' },
    ],
  },
  atracao: {
    takeaway: 'Às vezes vale pagar para trazer o rei até a casa certa.',
    videos: [V.taticas],
    extraPositions: [
      { fen: '5rk1/6pp/8/3n4/8/8/2Q3PP/6K1 b - - 0 1', prompt: 'De pretas: traga o rei branco até f1 e ganhe a dama.', solution: ['Rf1+', 'Kxf1', 'Ne3+', 'Kf2', 'Nxc2'], goal: 'win', after: 'A torre atraiu o rei, e o cavalo fez o garfo.' },
    ],
    frames: [
      { fen: '6k1/2q3pp/8/8/3N4/8/6PP/5RK1 w - - 0 1', focus: ['e6'], say: 'O cavalo sonha com e6, atacando a dama. Mas falta o rei preto estar em f8, para o garfo vir com xeque.' },
      { move: 'Rf8+', arrows: [['f1', 'f8']], say: 'Então leva ele até lá: a torre se entrega em f8.' },
      { move: 'Kxf8', say: 'É a única resposta legal. O rei foi atraído.' },
      { move: 'Ne6+', threats: [['e6', 'f8'], ['e6', 'c7']], say: 'E lá vem o garfo, com xeque.' },
      { move: 'Ke7', say: 'O rei até ataca o cavalo.' },
      { move: 'Nxc7', say: 'Mas a dama já foi. Pagou 5 e levou 9.' },
    ],
  },
  'lance-intermediario': {
    takeaway: 'Antes de retomar no automático, pergunte: existe algo mais forte agora?',
    videos: [V.taticas],
    extraPositions: [
      { fen: '6k1/5pp1/7p/8/r7/2b5/1P2QPPP/6K1 w - - 0 1', prompt: 'O bispo em c3 pode esperar. Antes, ganhe a torre com xeques.', solution: ['Qe8+', 'Kh7', 'Qe4+', 'g6', 'Qxa4'], goal: 'win', after: 'Dois xeques no caminho e a dama chegou na torre. Foi a retomada que teve de esperar.' },
    ],
    frames: [
      { fen: '6k1/5ppp/8/8/8/2b5/1P3PPP/4R1K1 w - - 0 1', arrows: [['b2', 'c3']], say: 'O bispo preto acabou de capturar em c3. A mão já vai sozinha retomar com o peão.' },
      { arrows: [['e1', 'e8']], say: 'Espera, chefia. A retomada não vai fugir. Tem coisa melhor?' },
      { move: 'Re8#', say: 'Tinha: mate. Quase sempre o lance intermediário é um xeque ou um ataque à dama.' },
    ],
  },
  'mate-apoiado': {
    takeaway: 'Peão inimigo em f6 ou h6 perto do seu roque é perigo: troque ou bloqueie.',
    videos: [V.mates],
    frames: [
      { fen: '6k1/5p1p/6pP/8/3Q4/8/5PPP/6K1 w - - 0 1', good: ['h6'], arrows: [['d4', 'g7']], say: 'O peão em h6 protege g7. A dama só precisa chegar lá.' },
      { move: 'Qg7#', say: 'Mate. O rei não pode capturar, porque o peão protege a dama.' },
      { fen: '4n1k1/5p1p/6pP/8/3Q4/8/5PPP/6K1 w - - 0 1', arrows: [['e8', 'g7']], focus: ['g7'], say: 'A defesa é vigiar a casa: com o cavalo em e8, a dama não entra em g7.' },
    ],
  },
  'mate-sufocado': {
    takeaway: 'Rei no canto, cercado pelas próprias peças: o cavalo sozinho dá conta.',
    videos: [V.mates],
    frames: [
      { fen: 'k6r/pp6/8/3N4/5Q2/8/8/1K6 w - - 0 1', arrows: [['d5', 'c7']], say: 'Esse é bonito, chefia. Rei no canto, e o cavalo vai caçar.' },
      { move: 'Nc7+', say: 'Xeque. O rei só tem b8.' },
      { move: 'Kb8', say: 'Foi.' },
      { move: 'Na6+', threats: [['f4', 'b8'], ['a6', 'b8']], say: 'Xeque duplo: do cavalo e da dama, ao mesmo tempo. O rei precisa voltar.' },
      { move: 'Ka8', say: 'Voltou.' },
      { move: 'Qb8+', say: 'E agora a dama se entrega, na cara dele.' },
      { move: 'Rxb8', say: 'Quem captura é a torre, porque o cavalo defende b8. E ela acabou de fechar a última casa do próprio rei.' },
      { move: 'Nc7#', say: 'Mate, com o rei sufocado pelas próprias peças.' },
    ],
  },
  'quadrado-do-peao': {
    takeaway: 'Rei dentro do quadrado alcança. Fora dele, o peão coroa.',
    videos: [V.reiPeao],
    frames: [
      { fen: '8/8/8/P7/4k3/8/8/7K b - - 0 1', good: ['a5', 'a6', 'a7', 'a8', 'b5', 'b6', 'b7', 'b8', 'c5', 'c6', 'c7', 'c8', 'd5', 'd6', 'd7', 'd8'], say: 'Faltam 3 casas para o peão coroar. Desenha um quadrado com esse lado: vai de a5 até d8.' },
      { move: 'Kd5', say: 'As pretas jogam, e o rei pisa no quadrado. Quem entra alcança.' },
      { move: 'a6', say: 'O peão corre.' },
      { move: 'Kc6', say: 'O quadrado encolheu, e o rei continua dentro.' },
      { move: 'a7', say: 'Mais um.' },
      { move: 'Kb7', say: 'Chegou a tempo. Sem contar lance por lance.' },
      { fen: '8/8/8/P7/5k2/8/8/7K b - - 0 1', good: ['a5', 'a6', 'a7', 'a8', 'b5', 'b6', 'b7', 'b8', 'c5', 'c6', 'c7', 'c8', 'd5', 'd6', 'd7', 'd8'], say: 'Agora com o rei uma casa mais longe. O mesmo quadrado.' },
      { move: 'Ke5', say: 'Ele não consegue entrar: d5 ainda está longe.' },
      { move: 'a6', say: 'E o peão vai embora.' },
    ],
  },
  oposicao: {
    takeaway: 'Reis de frente com uma casa no meio: quem tem de mexer cede o caminho.',
    videos: [V.oposicao],
    frames: [
      { fen: '8/8/4k3/8/4K3/4P3/8/8 b - - 0 1', focus: ['e5'], say: 'Reis de frente, uma casa no meio. Isso é oposição. Nenhum dos dois pode pisar em e5.' },
      { move: 'Kd6', say: 'A vez é das pretas, então elas têm de ceder. Se fosse das brancas, seriam elas.' },
      { move: 'Kf5', arrows: [['f5', 'f6']], say: 'O rei branco passa pelo lado e vai ganhando terreno.' },
      { move: 'Ke7', say: 'O rei preto volta para a frente.' },
      { move: 'Ke5', say: 'Oposição de novo, duas fileiras adiante. Quem ataca vai na frente do peão, não atrás.' },
    ],
  },
  'peao-passado': {
    takeaway: 'Peão sem peão inimigo pela frente é ameaça. Às vezes dá para criar um do nada.',
    videos: [V.finaisPeoes],
    frames: [
      { fen: '7k/5ppp/8/P7/8/8/5PPP/7K w - - 0 1', good: ['a6', 'a7', 'a8'], say: 'Nenhum peão preto na coluna a nem na b. Esse peão é passado: o caminho é só dele.' },
      { move: 'a6', say: 'Ele avança, e o rei preto está longe.' },
      { move: 'Kg8', say: 'O rei corre.' },
      { move: 'a7', say: 'Não dá tempo.' },
      { move: 'Kf8', say: 'Falta muito.' },
      { move: 'a8=Q+', say: 'Virou dama. É por isso que vale tanto.' },
      { fen: '7k/ppp5/8/PPP5/8/8/8/7K w - - 0 1', focus: ['b5'], say: 'Três contra três, ninguém passado. Parece travado. Mas tente descobrir o que acontece se o peão do meio avançar.' },
    ],
  },
  lucena: {
    takeaway: 'Torre na quarta fileira, rei para fora, e a ponte tapa os xeques.',
    videos: [V.torres],
    frames: [
      { fen: '4k1K1/6P1/8/8/8/8/7r/5R2 w - - 0 1', focus: ['g8'], say: 'O rei está na frente do próprio peão e não consegue sair: a torre preta corta a coluna h.' },
      { move: 'Re1+', say: 'Primeiro, um xeque para afastar o rei preto.' },
      { move: 'Kd7', say: 'Ele se afasta.' },
      { move: 'Re4', arrows: [['e4', 'g4']], say: 'Agora o lance-chave: torre na quarta fileira. Parece estranho, mas é a ponte.' },
      { move: 'Rh1', say: 'As pretas esperam.' },
      { move: 'Kf7', say: 'O rei sai da frente.' },
      { move: 'Rf1+', say: 'Lá vêm os xeques por trás.' },
      { move: 'Kg6', say: 'O rei desce.' },
      { move: 'Rg1+', say: 'Outro.' },
      { move: 'Kf6', say: 'Volta um pouco, sem pressa.' },
      { move: 'Rf1+', say: 'Mais um.' },
      { move: 'Kg5', say: 'Desce mais.' },
      { move: 'Rg1+', say: 'Último xeque.' },
      { move: 'Rg4', say: 'A ponte: a torre tapa o xeque e o peão coroa. Essa manobra sozinha vale muitos pontos.' },
    ],
  },
  philidor: {
    takeaway: 'Torre na terceira fileira. Quando o peão avança, vá para trás e dê xeques.',
    videos: [V.torres],
    frames: [
      { fen: '3k4/R7/7r/3PK3/8/8/8/8 w - - 0 1', arrows: [['h6', 'a6']], say: 'Quem defende põe a torre na própria terceira fileira, e o rei branco não consegue avançar.' },
      { move: 'd6', say: 'O peão avança para abrir caminho. Mas agora ele não protege mais o rei.' },
      { move: 'Rh1', arrows: [['h1', 'e1']], say: 'É a hora: a torre vai para o mais longe possível.' },
      { move: 'Ke6', say: 'O rei branco chegou, e está sem abrigo.' },
      { move: 'Re1+', say: 'Xeque. E de longe, sem risco.' },
      { move: 'Kd5', say: 'Ele tenta se aproximar da torre.' },
      { move: 'Rd1+', say: 'Mais um. Não há como se esconder: empate.' },
    ],
  },
  'principios-abertura': {
    takeaway: 'Centro, peças, roque. Sem repetir peça nem sair cedo com a dama.',
    videos: [V.aberturas],
    frames: [
      { fen: START, focus: ['d4', 'e4', 'd5', 'e5'], say: 'Nos primeiros lances, são três metas: centro, peças para fora e rei seguro.' },
      { move: 'e4', say: 'Meta 1: um peão no centro, e ainda abre caminho para o bispo e a dama.' },
      { move: 'e5', say: 'As pretas fazem o mesmo.' },
      { move: 'Nf3', arrows: [['f3', 'e5']], say: 'Meta 2: peça para fora, atacando alguma coisa de preferência.' },
      { move: 'Nc6', say: 'O cavalo defende e também se desenvolve.' },
      { move: 'Bc4', say: 'O bispo vai para uma diagonal boa, e o roque já está pronto.' },
      { move: 'Bc5', say: 'As pretas seguem o mesmo plano.' },
      { move: 'O-O', say: 'Meta 3: rei seguro, torre a caminho do centro. Em sete lances, tudo em ordem.' },
      { fen: 'rnbqkbnr/pppp1ppp/8/4p2Q/4P3/8/PPPP1PPP/RNB1KBNR b KQkq - 1 2', bad: ['h5'], say: 'Agora o contrário: dama para fora no segundo lance. Ela só ameaça o que as pretas defendem fácil.' },
      { move: 'Nc6', say: 'E vai perder tempo fugindo das peças que saem atacando ela.' },
    ],
  },
  'plano-meio-jogo': {
    takeaway: 'Sem tática? Torre em coluna aberta e a pior peça para uma casa melhor.',
    videos: [V.meioJogo],
    frames: [
      { fen: 'r5k1/pp3ppp/4p3/8/8/4P3/PP3PPP/2R3K1 w - - 0 1', good: ['c2', 'c3', 'c4', 'c5', 'c6', 'c7', 'c8'], say: 'Coluna sem peão é avenida, chefia. E torre foi feita para andar em avenida.' },
      { move: 'Rc7', threats: [['c7', 'b7'], ['c7', 'f7']], say: 'Na sétima fileira, a torre ataca peões e ainda aperta o rei.' },
      { fen: '6k1/pp3ppp/2p1p3/8/4P3/2P5/PP1N1PPP/6K1 w - - 0 1', focus: ['d2'], say: 'Outra pergunta: qual é a sua pior peça? Aqui é o cavalo, que não faz nada em d2.' },
      { move: 'Nc4', arrows: [['c4', 'd6']], say: 'Ele vai em busca de uma casa melhor.' },
      { move: 'Kf8', say: 'As pretas não têm como impedir.' },
      { move: 'Nd6', threats: [['d6', 'b7']], say: 'Em d6 ninguém o expulsa com peão, e ele ataca b7. Um lance simples, e a posição já é outra.' },
    ],
  },
  'estrutura-peoes': {
    takeaway: 'Isolado vira alvo, dobrado atrapalha, passado ameaça.',
    videos: [V.peoes, V.estrutura],
    frames: [
      { fen: '4k3/pp3ppp/4p3/8/3P4/8/PP3PPP/4K3 w - - 0 1', focus: ['d4'], bad: ['c3', 'e3'], say: 'Peão isolado: sem peões nas colunas vizinhas. Ninguém pode defendê-lo com peão.' },
      { fen: '4k3/pp3ppp/8/8/8/2P5/P1P2PPP/4K3 w - - 0 1', focus: ['c2', 'c3'], say: 'Peões dobrados: um na frente do outro. O de trás fica preso.' },
      { fen: '4k3/5ppp/8/P7/8/8/5PPP/4K3 w - - 0 1', focus: ['a5'], good: ['a6', 'a7', 'a8'], say: 'Peão passado: nenhum peão inimigo pode pará-lo. Só peças, e aí elas ficam presas.' },
      { fen: '4k3/8/8/8/4P3/3P4/2P5/4K3 w - - 0 1', focus: ['c2'], say: 'Cadeia: cada peão defende o da frente. O ponto fraco é sempre a base, aqui em c2.' },
    ],
  },
  calculo: {
    takeaway: 'Xeques, capturas e ameaças, nessa ordem, até o fim da linha.',
    videos: [V.calcular],
    frames: [
      { fen: '3r2k1/5ppp/8/4Q3/8/8/5PPP/4R1K1 w - - 0 1', arrows: [['e5', 'e8'], ['e5', 'b8'], ['e5', 'g7']], say: 'Toda vez, a mesma ordem: primeiro os xeques, depois as capturas, depois as ameaças. Aqui há três candidatos.' },
      { move: 'Qe8+', say: 'Começa pelo mais forçado. Em e8 a dama parece jogada fora, mas só existe uma resposta.' },
      { move: 'Rxe8', say: 'Ela foi capturada. E agora, o que sobrou?' },
      { move: 'Rxe8#', say: 'Mate. Lance forçado se calcula fácil, porque não há muitas respostas para olhar.' },
    ],
  },
  sacrificio: {
    takeaway: 'Paga agora só se já viu o troco.',
    frames: [
      { fen: '4kb1r/p2n1ppp/4q3/4p1B1/4P3/1Q6/PPP2PPP/2KR4 w k - 0 16', focus: ['d8'], say: 'Morphy, Paris, 1858. Ele tem menos material. Olha a casa d8: é onde a torre quer chegar.' },
      { move: 'Qb8+', say: 'Entrega a dama! Tudo para tirar o cavalo de d7, que tapa a coluna.' },
      { move: 'Nxb8', say: 'Único lance, e a coluna d se abriu.' },
      { move: 'Rd8#', say: 'Mate. Ele pagou 9 e levou a partida. O motor chamaria de Brilhante, porque a conta fechou.' },
      { fen: 'r1bq1rk1/pppn1ppp/4p3/3pP3/1b1P4/2NB1N2/PPP2PPP/R1BQK2R w KQ - 0 8', arrows: [['d3', 'h7']], say: 'Outro clássico: o bispo em h7. Quem conhece esse golpe ganha muita partida.' },
      { move: 'Bxh7+', say: 'O bispo se entrega, com xeque.' },
      { move: 'Kxh7', say: 'O rei aceita e fica exposto.' },
      { move: 'Ng5+', arrows: [['d1', 'h5']], say: 'E agora vêm o cavalo e a dama, com um ataque que custa material para parar.' },
    ],
  },
  'revisar-partidas': {
    takeaway: 'Depois de cada partida, ache o primeiro erro sério e entenda o que não viu.',
    frames: [
      { fen: START, say: 'Vou te contar o segredo do bar, chefia: quem melhora mais não é quem joga mais. É quem olha o que errou.' },
      { fen: '6k1/5ppp/2n5/8/3N4/8/5PPP/6K1 b - - 0 1', threats: [['c6', 'd4']], say: 'Passo 1: ache o primeiro erro sério da partida. Não o último: o primeiro.' },
      { say: 'Passo 2: antes de olhar o motor, tenta explicar o que não viu. Ameaça? Peça solta? Pressa?' },
      { say: 'Passo 3: no Virada, é só tocar em Tentar para jogar de novo nesse lance. Os seus erros viram exercício no Treino.' },
    ],
  },
  'seu-repertorio': {
    takeaway: 'Uma abertura de brancas e duas de pretas. As ideias antes dos lances.',
    frames: [
      { fen: START, say: 'Não decore vinte aberturas. Você precisa de uma de brancas e duas de pretas: contra e4 e contra d4.' },
      { move: 'e4', say: 'Escolha o que combina com você: quem gosta de atacar joga de um jeito, quem gosta de posição joga de outro.' },
      { say: 'Aprenda primeiro o plano de cada lado. Quando o outro sair da teoria, é o plano que te salva.' },
      { say: 'No Guia tem as aberturas explicadas, com treino de lances. E na revisão você vê até onde foi a teoria em cada partida.' },
    ],
  },
}
