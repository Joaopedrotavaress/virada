export type LessonGroup = 'mates' | 'taticas' | 'finais'

export const LESSON_GROUPS: { id: LessonGroup; title: string }[] = [
  { id: 'mates', title: 'Mates básicos' },
  { id: 'taticas', title: 'Táticas' },
  { id: 'finais', title: 'Finais essenciais' },
]

export interface LessonPosition {
  fen: string
  prompt: string
  /** Lances em notação internacional: o da pessoa, a resposta, o da pessoa... */
  solution: string[]
  /** O que a posição precisa alcançar. Conferido pelos testes. */
  goal: 'mate' | 'win' | 'draw'
  after: string
}

export interface Lesson {
  id: string
  group: LessonGroup
  title: string
  paragraphs: string[]
  positions: LessonPosition[]
  /** Tema dos puzzles para continuar praticando. */
  puzzleTheme?: string
}

export const LESSONS: Lesson[] = [
  // ---------- Mates ----------
  {
    id: 'mate-do-pastor',
    group: 'mates',
    title: 'Mate do pastor, e como evitar',
    paragraphs: [
      'É o mate mais famoso entre iniciantes. A dama e o bispo atacam juntos a casa f7, que no início só é defendida pelo rei.',
      'Quando as brancas trazem a dama cedo para h5, a resposta natural é defender f7 antes de atacar a dama. Lances como ...g6 ou ...De7 resolvem, e depois a dama branca perde tempo ao ser perseguida.',
    ],
    positions: [
      {
        fen: 'r1bqkb1r/pppp1ppp/2n2n2/4p2Q/2B1P3/8/PPPP1PPP/RNB1K1NR w KQkq - 4 4',
        prompt: 'As pretas atacaram a dama com o cavalo, mas esqueceram de f7. Dê o mate.',
        solution: ['Qxf7#'],
        goal: 'mate',
        after: 'A dama em f7 está defendida pelo bispo, e o rei não tem para onde ir. O cavalo em f6 atacou a dama, mas não defendeu nada.',
      },
    ],
  },
  {
    id: 'mate-do-corredor',
    group: 'mates',
    title: 'Mate do corredor',
    paragraphs: [
      'O rei fica preso atrás dos próprios peões, e uma torre ou dama chega à última fileira. É um dos mates mais comuns em partidas reais.',
      'Para se proteger, abra uma casa de fuga com ...h6 ou ...g6 assim que puder. Com peões em f7, g7 e h7 e sem peças na última fileira, confira sempre se dá para entrar um xeque ali.',
    ],
    positions: [
      {
        fen: '6k1/5ppp/8/8/8/8/5PPP/3R2K1 w - - 0 1',
        prompt: 'O rei preto está preso atrás dos peões. Dê o mate.',
        solution: ['Rd8#'],
        goal: 'mate',
        after: 'Os próprios peões tiram as casas do rei. Uma casa de fuga em h6 ou g6 teria salvado a partida.',
      },
      {
        fen: 'r4rk1/5ppp/8/8/8/8/R4PPP/R5K1 w - - 0 1',
        prompt: 'Duas torres contra duas torres. Sua coluna é mais forte: como aproveitar?',
        solution: ['Rxa8', 'Rxa8', 'Rxa8#'],
        goal: 'mate',
        after: 'Na coluna a, há duas torres brancas contra uma preta. A torre de f8 teve de capturar, e a última fileira ficou sem defensores.',
      },
    ],
    puzzleTheme: 'backRankMate',
  },
  {
    id: 'mate-de-escada',
    group: 'mates',
    title: 'Mate de escada com duas torres',
    paragraphs: [
      'Duas torres (ou dama e torre) empurram o rei até a borda, fileira por fileira. Uma corta a passagem e a outra dá o xeque, como quem sobe uma escada.',
      'Se o rei chegar perto de uma torre, leve-a para o outro lado do tabuleiro, longe dele, e continue.',
    ],
    positions: [
      {
        fen: '7k/R7/8/8/8/8/8/1R4K1 w - - 0 1',
        prompt: 'Uma torre já corta a sétima fileira. Termine o trabalho.',
        solution: ['Rb8#'],
        goal: 'mate',
        after: 'A torre de a7 fecha a sétima fileira, e a de b8 dá o xeque na oitava. O rei não tem saída.',
      },
      {
        fen: '7k/8/R7/8/8/8/1R6/6K1 w - - 0 1',
        prompt: 'Mate em dois lances. Primeiro feche a fuga.',
        solution: ['Rb7', 'Kg8', 'Ra8#'],
        goal: 'mate',
        after: 'A torre em b7 corta a sétima fileira. Assim, a outra só precisa chegar à oitava.',
      },
    ],
  },
  {
    id: 'dama-e-rei',
    group: 'mates',
    title: 'Dama e rei contra rei',
    paragraphs: [
      'A dama sozinha não dá mate: precisa do rei junto. O método é usar a dama para encurralar o rei inimigo na borda e, depois, aproximar o próprio rei.',
      'O grande perigo é o afogamento. Antes de cada lance com a dama, confira se o rei adversário ainda tem alguma casa, quando não estiver em xeque.',
    ],
    positions: [
      {
        fen: 'k7/8/1K6/8/8/8/8/7Q w - - 0 1',
        prompt: 'O seu rei já está no lugar certo. Dê o mate.',
        solution: ['Qh8#'],
        goal: 'mate',
        after: 'O rei branco tira as casas a7 e b7, e a dama cuida da oitava fileira. Db7 também seria mate.',
      },
      {
        fen: 'k7/8/2K5/8/8/8/8/1Q6 w - - 0 1',
        prompt: 'Cuidado com o lance mais natural: Db6 seria afogamento. Dê o mate.',
        solution: ['Qb7#'],
        goal: 'mate',
        after: 'A dama em b7 está protegida pelo rei e dá xeque. Em b6, sem xeque, as pretas não teriam nenhum lance, e a partida terminaria empatada.',
      },
    ],
  },
  {
    id: 'torre-e-rei',
    group: 'mates',
    title: 'Torre e rei contra rei',
    paragraphs: [
      'A torre corta o rei inimigo numa parte do tabuleiro, e essa área vai diminuindo até a borda. O rei branco precisa ficar de frente para o rei preto, em oposição, para que a torre dê o mate na fileira.',
      'Quando os reis não estão de frente, um lance de espera com a torre, ao longo da mesma coluna, obriga o adversário a se mexer. Não há pressa: dá tempo de fazer isso com calma, antes da regra dos 50 lances.',
    ],
    positions: [
      {
        fen: '6k1/8/6K1/8/8/8/8/R7 w - - 0 1',
        prompt: 'Os reis estão de frente. Dê o mate.',
        solution: ['Ra8#'],
        goal: 'mate',
        after: 'O rei branco tira as casas f7, g7 e h7, e a torre domina toda a oitava fileira.',
      },
      {
        fen: '7k/5K2/8/8/8/8/8/R7 w - - 0 1',
        prompt: 'O rei preto está no canto. Dê o mate.',
        solution: ['Rh1#'],
        goal: 'mate',
        after: 'Com o rei preto no canto, o seu rei em f7 tira g7 e g8, e a torre dá xeque pela coluna h.',
      },
    ],
  },
  {
    id: 'mate-apoiado',
    group: 'mates',
    title: 'Dama apoiada por um peão',
    paragraphs: [
      'Um peão avançado em f6 ou h6 é um perigo enorme para um rei rocado. Ele controla g7, e a dama só precisa chegar lá com apoio.',
      'Por isso, quando um peão inimigo chega tão perto do roque, é bom trocá-lo ou bloquear a entrada da dama antes que seja tarde.',
    ],
    positions: [
      {
        fen: '6k1/5p1p/5Pp1/8/7Q/8/5PPP/6K1 w - - 0 1',
        prompt: 'O peão de f6 já faz metade do trabalho. Mate em dois.',
        solution: ['Qh6', 'g5', 'Qg7#'],
        goal: 'mate',
        after: 'A dama em g7 está protegida pelo peão de f6. O rei não pode capturá-la e não tem casa livre.',
      },
    ],
    puzzleTheme: 'mateIn2',
  },
  {
    id: 'mate-sufocado',
    group: 'mates',
    title: 'Mate sufocado',
    paragraphs: [
      'O cavalo dá mate num rei cercado pelas próprias peças. A sequência clássica é um presente para quem conhece: xeques do cavalo levam o rei ao canto, a dama é sacrificada, e a torre preta fecha a última casa de fuga.',
    ],
    positions: [
      {
        fen: 'r6k/6pp/8/4N3/2Q5/8/8/6K1 w - - 0 1',
        prompt: 'Vale sacrificar a dama. Mate em quatro lances, começando com o cavalo.',
        solution: ['Nf7+', 'Kg8', 'Nh6+', 'Kh8', 'Qg8+', 'Rxg8', 'Nf7#'],
        goal: 'mate',
        after: 'Depois de Dg8+, a torre é obrigada a capturar, e assim tapa a última casa do próprio rei. O cavalo termina o serviço.',
      },
    ],
    puzzleTheme: 'smotheredMate',
  },

  // ---------- Táticas ----------
  {
    id: 'garfo',
    group: 'taticas',
    title: 'Garfo',
    paragraphs: [
      'Uma peça ataca duas ao mesmo tempo. Como o adversário só pode salvar uma, a outra cai. O cavalo é o mestre dos garfos, mas peões, damas e até o rei também fazem.',
      'O garfo mais forte vem com xeque, porque não dá tempo de reagir. Quando duas peças inimigas estão a um salto de cavalo uma da outra, procure a casa em comum.',
    ],
    positions: [
      {
        fen: 'r3k3/8/8/1N6/8/8/PP6/4K3 w - - 0 1',
        prompt: 'Rei e torre estão a um salto de distância. Ganhe a torre.',
        solution: ['Nc7+', 'Kd7', 'Nxa8'],
        goal: 'win',
        after: 'O cavalo em c7 ataca o rei e a torre ao mesmo tempo. O xeque obriga o rei a sair, e a torre cai.',
      },
      {
        fen: 'k7/pp6/2n1b3/8/3P4/8/PP1R4/K7 w - - 0 1',
        prompt: 'Até um peão pode fazer um garfo. Ganhe uma peça.',
        solution: ['d5', 'Bxd5', 'Rxd5'],
        goal: 'win',
        after: 'O peão ataca cavalo e bispo de uma vez, e está protegido pela torre. Capturar custa uma peça, e fugir com uma deixa a outra cair.',
      },
    ],
    puzzleTheme: 'fork',
  },
  {
    id: 'cravada',
    group: 'taticas',
    title: 'Cravada',
    paragraphs: [
      'Uma peça não pode sair da frente porque, atrás dela, há algo mais valioso. Se o que está atrás é o rei, ela nem sequer pode se mexer: é a cravada absoluta.',
      'Depois de cravar, ataque a peça presa outra vez, muitas vezes com um peão, já que ela não tem como fugir.',
    ],
    positions: [
      {
        fen: '4k3/8/2n5/8/3P4/3B4/8/4K3 w - - 0 1',
        prompt: 'O cavalo preto está bem na frente do rei. Crave e depois ganhe a peça.',
        solution: ['Bb5', 'Kd7', 'd5'],
        goal: 'win',
        after: 'Com o bispo em b5, o cavalo não pode sair sem deixar o rei em xeque. O peão vem e o captura.',
      },
    ],
    puzzleTheme: 'pin',
  },
  {
    id: 'espeto',
    group: 'taticas',
    title: 'Espeto',
    paragraphs: [
      'É a cravada ao contrário: a peça mais valiosa está na frente. Ela é atacada, sai, e o que estava atrás é capturado.',
      'Procure espetos com bispos, torres e damas sempre que o rei e outra peça estiverem na mesma linha.',
    ],
    positions: [
      {
        fen: 'q2k4/8/8/8/8/8/8/6KR w - - 0 1',
        prompt: 'O rei e a dama pretos estão na mesma fileira. Ganhe a dama.',
        solution: ['Rh8+', 'Kd7', 'Rxa8'],
        goal: 'win',
        after: 'O xeque obriga o rei a sair da frente, e a torre captura a dama, que ficou desprotegida.',
      },
    ],
    puzzleTheme: 'skewer',
  },
  {
    id: 'ataque-descoberto',
    group: 'taticas',
    title: 'Ataque descoberto',
    paragraphs: [
      'Uma peça se move e revela o ataque de outra que estava atrás. A peça que se move ainda pode atacar alguma coisa. Assim surgem duas ameaças em um lance só.',
      'O caso mais forte é o xeque descoberto: a peça que se move pode ir para qualquer lugar, até capturar a dama, porque o adversário precisa cuidar do xeque.',
    ],
    positions: [
      {
        fen: '4k3/8/8/3q4/8/8/4N3/4R1K1 w - - 0 1',
        prompt: 'A torre está pronta para dar xeque, só falta o cavalo sair. Para onde ele vai?',
        solution: ['Nc3+', 'Kd7', 'Nxd5'],
        goal: 'win',
        after: 'O cavalo sai com xeque descoberto da torre e, ao mesmo tempo, ataca a dama. As pretas só têm tempo de cuidar do rei.',
      },
    ],
    puzzleTheme: 'discoveredAttack',
  },
  {
    id: 'xeque-duplo',
    group: 'taticas',
    title: 'Xeque duplo',
    paragraphs: [
      'Duas peças dão xeque ao mesmo tempo. Não dá para capturar as duas nem tapar as duas linhas, então o rei é obrigado a se mexer. Se ele não tiver casa, é mate, mesmo com muitas peças por perto.',
    ],
    positions: [
      {
        fen: '3qkb2/3p1p2/8/8/4N3/8/8/4R1K1 w - - 0 1',
        prompt: 'O rei preto está cercado pelas próprias peças. Mate em um lance.',
        solution: ['Nf6#'],
        goal: 'mate',
        after: 'O cavalo e a torre dão xeque juntos. A dama e os outros defensores não adiantam: só o rei poderia responder, e ele não tem casa.',
      },
    ],
    puzzleTheme: 'doubleCheck',
  },
  {
    id: 'peca-solta',
    group: 'taticas',
    title: 'Peça sem defesa',
    paragraphs: [
      'A maioria das partidas entre iniciantes e intermediários é decidida por peças simplesmente deixadas sem proteção. Antes de cada lance, faça duas perguntas: o que o lance do adversário ameaça? E o que fica sem defesa depois do meu?',
      'O treino com puzzles deste tema ajuda a ganhar esse reflexo, que vale mais do que qualquer abertura.',
    ],
    positions: [],
    puzzleTheme: 'hangingPiece',
  },
  {
    id: 'desvio',
    group: 'taticas',
    title: 'Desvio',
    paragraphs: [
      'Uma peça está cuidando de algo importante, e você oferece a ela outra coisa para capturar. Se ela aceita, abandona o que defendia. Se recusa, a primeira ameaça continua lá.',
      'Procure esse tema quando uma única peça inimiga defende duas coisas ao mesmo tempo. Ela está sobrecarregada.',
    ],
    positions: [],
    puzzleTheme: 'deflection',
  },
  {
    id: 'atracao',
    group: 'taticas',
    title: 'Atração',
    paragraphs: [
      'Em vez de tirar uma peça da defesa, você a obriga a ir para uma casa ruim, muitas vezes com um sacrifício. O rei atraído para a frente de um cavalo ou de um bispo costuma ser a vítima de um garfo ou de um mate logo em seguida.',
    ],
    positions: [],
    puzzleTheme: 'attraction',
  },
  {
    id: 'lance-intermediario',
    group: 'taticas',
    title: 'Lance intermediário',
    paragraphs: [
      'Numa troca, a retomada parece obrigatória. Mas, antes de retomar, às vezes dá para jogar um lance que cria uma ameaça maior, como um xeque ou um ataque à dama. Depois, a peça continua lá para ser capturada.',
      'Antes de recapturar no automático, pergunte: existe algo ainda mais forte agora?',
    ],
    positions: [],
    puzzleTheme: 'intermezzo',
  },

  // ---------- Finais ----------
  {
    id: 'quadrado-do-peao',
    group: 'finais',
    title: 'A regra do quadrado',
    paragraphs: [
      'Dá para saber se um rei alcança um peão sem contar lance por lance. Imagine um quadrado cujo lado vai do peão até a casa de promoção. Se o rei estiver dentro desse quadrado, ou puder entrar nele no seu lance, ele alcança. Se não, o peão coroa.',
    ],
    positions: [
      {
        fen: '8/8/8/8/P6k/8/8/7K w - - 0 1',
        prompt: 'O rei preto está longe demais. Avance o peão até coroar.',
        solution: ['a5', 'Kg5', 'a6', 'Kf6', 'a7', 'Ke7', 'a8=Q'],
        goal: 'win',
        after: 'Depois de a5, o quadrado vai de a5 a d8. O rei preto, em h4, nem encosta nele a tempo.',
      },
    ],
  },
  {
    id: 'oposicao',
    group: 'finais',
    title: 'Oposição',
    paragraphs: [
      'Em finais de rei e peão, cada casa conta. Dois reis de frente, com uma casa entre eles, estão em oposição: quem tem de mexer precisa ceder caminho. Ganhar a oposição muitas vezes é a diferença entre vencer e empatar.',
      'Quem defende deve ficar na frente do peão e manter a oposição quando o rei atacante avança. Quem ataca deve colocar o rei à frente do próprio peão, e não atrás dele.',
    ],
    positions: [
      {
        fen: '4k3/8/8/4K3/4P3/8/8/8 w - - 0 1',
        prompt: 'Você pode tomar a oposição agora. Leve o rei para a frente do peão.',
        solution: ['Ke6', 'Kd8', 'Kf7'],
        goal: 'win',
        after: 'Com o rei em e6, as pretas têm de ceder. Depois de Rf7, o peão tem caminho livre até a oitava fileira.',
      },
    ],
    puzzleTheme: 'pawnEndgame',
  },
  {
    id: 'peao-passado',
    group: 'finais',
    title: 'Criar um peão passado',
    paragraphs: [
      'Um peão passado é aquele sem peões inimigos à frente nem nas colunas vizinhas. Às vezes dá para criar um do nada, sacrificando peões. O exemplo clássico é este: três peões contra três, frente a frente.',
    ],
    positions: [
      {
        fen: '7k/ppp5/8/PPP5/8/8/8/7K w - - 0 1',
        prompt: 'Um dos seus peões vai passar. Qual sacrifício abre o caminho?',
        solution: ['b6', 'axb6', 'c6', 'bxc6', 'a6', 'Kg7', 'a7', 'Kf7', 'a8=Q'],
        goal: 'win',
        after: 'O peão do meio sai primeiro e, depois de cada captura, outra coluna fica livre. O rei preto está longe demais para ajudar.',
      },
    ],
  },
  {
    id: 'lucena',
    group: 'finais',
    title: 'Posição de Lucena: a ponte',
    paragraphs: [
      'É o final de torre mais importante para quem ataca. O rei está na frente do peão, quase coroando, mas não consegue sair da frente sem levar xeques.',
      'A solução é construir uma ponte: a torre vai para a quarta fileira, o rei sai, e quando os xeques chegarem, a torre se interpõe.',
    ],
    positions: [
      {
        fen: '1K1k4/1P6/8/8/8/8/r7/2R5 w - - 0 1',
        prompt: 'Primeiro afaste o rei preto com um xeque e, depois, construa a ponte.',
        solution: ['Rd1+', 'Ke7', 'Rd4', 'Ra1', 'Kc7', 'Rc1+', 'Kb6', 'Rb1+', 'Kc6', 'Rc1+', 'Kb5', 'Rb1+', 'Rb4'],
        goal: 'win',
        after: 'A torre em b4 tapa o xeque, e agora nada segura o peão. Foi a quarta fileira que permitiu essa manobra.',
      },
    ],
    puzzleTheme: 'rookEndgame',
  },
  {
    id: 'philidor',
    group: 'finais',
    title: 'Posição de Philidor: como empatar',
    paragraphs: [
      'O final de torre mais importante para quem defende. A torre fica na sua própria terceira fileira e impede o rei inimigo de avançar.',
      'Assim que o peão avança, ele deixa de proteger o rei. É a hora de mudar de lugar: a torre vai para longe, atrás, e dá xeques sem parar. Como o rei não tem mais onde se esconder, a partida empata.',
    ],
    positions: [
      {
        fen: '4k3/7R/r3P3/3K4/8/8/8/8 b - - 0 1',
        prompt: 'O peão acabou de avançar para e6. Agora é hora de atacar por trás. Jogue de pretas.',
        solution: ['Ra1', 'Kd6', 'Rd1+', 'Ke5', 'Re1+'],
        goal: 'draw',
        after: 'A torre, de longe, dá xeques o tempo todo. O rei branco não consegue ajudar o peão sem levar mais um xeque.',
      },
    ],
    puzzleTheme: 'rookEndgame',
  },
]

export const lessonById = (id: string) => LESSONS.find((lesson) => lesson.id === id)
