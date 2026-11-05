import type { OpeningGuide } from '../types'

export const ABERTAS: OpeningGuide[] = [
  {
    slug: 'italiana',
    name: 'Abertura Italiana',
    eco: 'C50–C54',
    group: 'abertas',
    side: 'w',
    level: 'iniciante',
    root: 'e4 e5 Nf3 Nc6 Bc4',
    summary:
      'As brancas desenvolvem o cavalo, atacam o peão de e5 e apontam o bispo para f7, a casa mais fraca das pretas no começo da partida. É uma das melhores aberturas para aprender, porque segue os princípios básicos: peça para fora, roque cedo, briga pelo centro.',
    ideas: ['O bispo em c4 pressiona f7 e controla a diagonal até g8.', 'O peão em c3 prepara d4, que é a ruptura central das brancas.', 'Com d3 no lugar de d4, a partida fica mais lenta e vira uma manobra de peças.'],
    plans: {
      white: ['Jogar c3 e d4 para formar um centro de peões.', 'Na versão lenta (d3), rocar, trazer o cavalo de b1 por d2 e f1 até g3 e preparar d4 mais tarde.'],
      black: ['Colocar o bispo em c5 e o cavalo em f6, rocar e responder a d4 com a troca em d4.', 'Se as brancas jogarem devagar, preparar ...d5 para tomar o centro.'],
    },
    lines: [
      { name: 'Giuoco Pianissimo', sans: 'e4 e5 Nf3 Nc6 Bc4 Bc5 c3 Nf6 d3 d6 O-O O-O', note: 'A versão tranquila. Os dois lados rocam e a luta fica para o meio-jogo.' },
      { name: 'Giuoco Piano com 4.c3 e 5.d4', sans: 'e4 e5 Nf3 Nc6 Bc4 Bc5 c3 Nf6 d4 exd4 cxd4 Bb4+ Bd2 Bxd2+ Nbxd2 d5 exd5 Nxd5', note: 'As brancas abrem o centro na hora. Ficam com um peão isolado em d4, mas com peças ativas.' },
    ],
    traps: [
      {
        name: 'Gambito Blackburne Shilling',
        sans: 'e4 e5 Nf3 Nc6 Bc4 Nd4 Nxe5 Qg5 Nxf7 Qxg2 Rf1 Qxe4+ Be2 Nf3#',
        who: 'b',
        errorAt: 8,
        text: 'O lance 3...Cd4 parece entregar o peão de e5. Se as brancas capturam e depois ainda levam em f7, a dama preta entra por g2 e e4, e o cavalo dá mate em f3. Contra 3...Cd4, o simples 4.Cxd4 é melhor do que comer o peão. Mesmo depois de 4.Cxe5 Dg5, 5.Bxf7+ ainda salva as brancas.',
      },
    ],
    mistakes: ['Atacar cedo demais com Cg5 sem apoio, perdendo tempo se o ataque não funcionar.', 'Esquecer de rocar: com o centro aberto, o rei no meio costuma pagar caro.', 'Pelas pretas, jogar ...h6 ou ...a6 sem necessidade e atrasar o desenvolvimento.'],
  },
  {
    slug: 'dois-cavalos',
    name: 'Defesa dos Dois Cavalos',
    eco: 'C55–C59',
    group: 'abertas',
    side: 'b',
    level: 'intermediário',
    root: 'e4 e5 Nf3 Nc6 Bc4 Nf6',
    summary:
      'Em vez de copiar o bispo para c5, as pretas contra-atacam o peão de e4. A resposta 4.Cg5 ataca f7 de imediato, e as pretas costumam entregar um peão em troca de desenvolvimento rápido. É uma defesa ativa, que exige conhecer alguns lances exatos.',
    ideas: ['Depois de 4.Cg5 d5 5.exd5, a resposta clássica é 5...Ca5: o cavalo ataca o bispo e abre caminho para o contra-jogo.', 'As pretas aceitam ficar com um peão a menos porque ganham tempo perseguindo as peças brancas.'],
    plans: {
      white: ['Tentar manter o peão a mais depois de 4.Cg5, recuando o bispo com calma.', 'Ou evitar a complicação com 4.d3, uma partida lenta parecida com a Italiana.'],
      black: ['Responder a 4.Cg5 com 4...d5 e, depois de 5.exd5, com 5...Ca5.', 'Usar os lances ganhos para jogar ...c6, ...e4 e atacar o cavalo de g5.'],
    },
    lines: [
      { name: 'Linha principal com 4.Cg5', sans: 'e4 e5 Nf3 Nc6 Bc4 Nf6 Ng5 d5 exd5 Na5 Bb5+ c6 dxc6 bxc6 Be2 h6 Nf3 e4 Ne5', note: 'As pretas têm um peão a menos e compensação pela atividade das peças.', sharp: true },
      { name: 'Versão tranquila com 4.d3', sans: 'e4 e5 Nf3 Nc6 Bc4 Nf6 d3 Bc5 c3 d6 O-O O-O', note: 'As brancas evitam a teoria e a partida se transforma numa Italiana lenta.' },
    ],
    traps: [
      {
        name: 'Fígado Frito',
        sans: 'e4 e5 Nf3 Nc6 Bc4 Nf6 Ng5 d5 exd5 Nxd5 Nxf7 Kxf7 Qf3+ Ke6 Nc3',
        who: 'w',
        errorAt: 9,
        minWin: 55,
        text: 'Retomar em d5 com o cavalo (5...Cxd5) é o erro natural. As brancas sacrificam o cavalo em f7, tiram o rei de casa e atacam o cavalo cravado em d5. Com defesa perfeita as pretas resistem, mas o Stockfish segue preferindo as brancas, e na prática o rei exposto é muito difícil de defender. Por isso 5...Ca5 é o lance das pretas.',
      },
    ],
    mistakes: ['Retomar em d5 com o cavalo depois de 4.Cg5 d5 5.exd5.', 'Pelas brancas, jogar para o ataque sem rocar e deixar o peão extra voltar sem receber nada em troca.'],
  },
  {
    slug: 'evans',
    name: 'Gambito Evans',
    eco: 'C51–C52',
    group: 'abertas',
    side: 'w',
    level: 'intermediário',
    root: 'e4 e5 Nf3 Nc6 Bc4 Bc5 b4',
    summary:
      'Uma Italiana com pressa. As brancas entregam o peão de b4 para ganhar tempo sobre o bispo e construir o centro com c3 e d4. Quem aceita precisa defender com cuidado, porque as peças brancas chegam muito rápido.',
    ideas: ['Depois de ...Bxb4 e c3, o bispo perde outro tempo e o peão de d4 entra com força.', 'O bispo de c4 e a dama em b3 miram f7 ao mesmo tempo.'],
    plans: {
      white: ['Jogar c3 e d4, rocar e abrir linhas contra o rei preto.', 'Aceitar ficar sem peões em troca de ritmo e peças ativas.'],
      black: ['Aceitar o peão, recuar o bispo para a5 e devolver material na hora certa para terminar o desenvolvimento.', 'Quem prefere evitar o risco pode recusar com 4...Bb6.'],
    },
    lines: [
      { name: 'Gambito aceito', sans: 'e4 e5 Nf3 Nc6 Bc4 Bc5 b4 Bxb4 c3 Ba5 d4 exd4 O-O', note: 'As brancas têm dois peões a menos por um momento, e todo o centro aberto para as peças.', sharp: true },
      { name: 'Gambito recusado', sans: 'e4 e5 Nf3 Nc6 Bc4 Bc5 b4 Bb6 a4 a6', note: 'As pretas não aceitam a oferta. O jogo fica mais calmo, com as brancas tendo ganhado espaço na ala da dama.' },
    ],
    traps: [],
    mistakes: ['Pelas brancas, ter pressa e tentar recuperar o peão em vez de seguir desenvolvendo.', 'Pelas pretas, agarrar-se a todo o material sem rocar.'],
  },
  {
    slug: 'espanhola',
    name: 'Abertura Espanhola (Ruy López)',
    eco: 'C60–C99',
    group: 'abertas',
    side: 'w',
    level: 'intermediário',
    root: 'e4 e5 Nf3 Nc6 Bb5',
    summary:
      'O bispo em b5 pressiona o cavalo que defende o peão de e5. A ameaça não é imediata, mas a pressão dura a partida inteira. É uma das aberturas mais respeitadas da história, com planos claros para os dois lados e uma luta longa no centro.',
    ideas: ['As brancas não ganham o peão de e5 logo: depois de Bxc6 dxc6, Cxe5 é respondido por ...Dd4.', 'Com c3 e d4, as brancas montam um centro forte, e o bispo recua para c2, de onde mira o roque preto.', 'As pretas ganham espaço na ala da dama com ...a6 e ...b5.'],
    plans: {
      white: ['Montar o centro com c3 e d4, jogar h3 para evitar ...Bg4 e levar o cavalo de b1 por d2 e f1 até g3.', 'Atacar na ala do rei depois de fechar o centro.'],
      black: ['Expulsar o bispo com ...a6 e ...b5, rocar e segurar o peão de e5.', 'Buscar contra-jogo com ...c5 ou com a ruptura ...d5 no momento certo.'],
    },
    lines: [
      { name: 'Linha principal fechada', sans: 'e4 e5 Nf3 Nc6 Bb5 a6 Ba4 Nf6 O-O Be7 Re1 b5 Bb3 d6 c3 O-O h3', note: 'O tabuleiro de referência da Espanhola. A partir daqui existem dezenas de sistemas das pretas.' },
      { name: 'Defesa Berlinense', sans: 'e4 e5 Nf3 Nc6 Bb5 Nf6 O-O Nxe4 d4 Nd6 Bxc6 dxc6 dxe5 Nf5 Qxd8+ Kxd8', note: 'As damas saem cedo. O rei preto fica no centro, mas o par de bispos e a estrutura sólida compensam.' },
      { name: 'Variante das Trocas', sans: 'e4 e5 Nf3 Nc6 Bb5 a6 Bxc6 dxc6 O-O', note: 'As brancas entregam o bispo para estragar os peões pretos e apostar num final melhor.' },
    ],
    traps: [
      {
        name: 'Arca de Noé',
        sans: 'e4 e5 Nf3 Nc6 Bb5 a6 Ba4 d6 d4 b5 Bb3 Nxd4 Nxd4 exd4 Qxd4 c5 Qd5 Be6 Qc6+ Bd7 Qd5 c4',
        who: 'b',
        errorAt: 14,
        text: 'Pegar o peão de d4 com a dama parece seguro, mas ...c5 e ...c4 prendem o bispo de b3 atrás dos próprios peões das pretas. As brancas perdem uma peça. Em vez de 8.Dxd4, os lances 8.c3 ou 8.Bd5 mantêm a posição equilibrada.',
      },
    ],
    mistakes: ['Capturar em e5 logo depois de Bxc6 dxc6 sem olhar a resposta ...Dd4.', 'Esquecer de jogar h3 e deixar o cavalo de f3 cravado por ...Bg4.', 'Pelas pretas, abandonar o centro e deixar o peão de e5 cair.'],
  },
  {
    slug: 'escocesa',
    name: 'Abertura Escocesa',
    eco: 'C44–C45',
    group: 'abertas',
    side: 'w',
    level: 'iniciante',
    root: 'e4 e5 Nf3 Nc6 d4',
    summary:
      'As brancas abrem o centro já no terceiro lance. Depois da troca em d4, as peças ganham espaço e a partida fica aberta. É uma alternativa direta à Italiana e à Espanhola, com menos teoria para decorar.',
    ideas: ['O cavalo central em d4 é forte, mas também é alvo: as pretas podem atacá-lo com ...Bc5 ou trocá-lo.', 'Com o peão de e4 livre, as brancas podem avançar e5 e empurrar o cavalo de f6.'],
    plans: {
      white: ['Manter o cavalo em d4 com apoio de Be3 e c3, ou trocar em c6 e avançar e5.', 'Desenvolver rápido e rocar.'],
      black: ['Atacar o centro com ...Bc5 ou ...Cf6 e, depois, buscar ...d5.'],
    },
    lines: [
      { name: 'Variante Clássica', sans: 'e4 e5 Nf3 Nc6 d4 exd4 Nxd4 Bc5 Be3 Qf6 c3 Nge7', note: 'As pretas juntam dama e bispo contra o cavalo central. As brancas apoiam e seguem com o desenvolvimento.' },
      { name: 'Variante Mieses', sans: 'e4 e5 Nf3 Nc6 d4 exd4 Nxd4 Nf6 Nxc6 bxc6 e5 Qe7 Qe2 Nd5 c4', note: 'As brancas expulsam o cavalo e ganham espaço. As pretas ficam com peões dobrados, mas com jogo ativo.' },
    ],
    traps: [],
    mistakes: ['Trazer a dama para d4 cedo e perder tempo com ...Cc6.', 'Pelas pretas, defender o peão de e5 em vez de trocar: 3...d6 deixa uma posição passiva.'],
  },
  {
    slug: 'petrov',
    name: 'Defesa Petrov',
    eco: 'C42–C43',
    group: 'abertas',
    side: 'b',
    level: 'intermediário',
    root: 'e4 e5 Nf3 Nf6',
    summary:
      'Em vez de defender o peão de e5, as pretas atacam o de e4. A abertura é simétrica e muito sólida, usada por quem busca igualdade segura com as pretas. A diferença vem nos detalhes: copiar demais pode custar caro.',
    ideas: ['Depois de 3.Cxe5, primeiro vem 3...d6 para expulsar o cavalo, e só depois ...Cxe4.', 'A simetria dá menos chances de ganhar rápido, mas também poucas fraquezas.'],
    plans: {
      white: ['Usar o pequeno avanço de desenvolvimento para pressionar o cavalo central com Bd3, O-O e c4.'],
      black: ['Manter o cavalo em e4 enquanto for seguro, rocar e igualar o centro com ...d5.'],
    },
    lines: [
      { name: 'Linha principal', sans: 'e4 e5 Nf3 Nf6 Nxe5 d6 Nf3 Nxe4 d4 d5 Bd3', note: 'As pretas recuperam o peão. O cavalo em e4 é forte enquanto puder ser apoiado.' },
    ],
    traps: [
      {
        name: 'Cópia que custa a dama',
        sans: 'e4 e5 Nf3 Nf6 Nxe5 Nxe4 Qe2 Nf6 Nc6+',
        who: 'w',
        errorAt: 5,
        minWin: 55,
        text: 'Capturar em e4 na hora, sem expulsar o cavalo, é o erro clássico. Com 4.De2, o cavalo preto é atacado e, se ele foge, o cavalo branco salta com xeque descoberto e ganha a dama em d8. As pretas têm de jogar 4...De7, mas continuam com um peão a menos.',
      },
    ],
    mistakes: ['Jogar 3...Cxe4 antes de 3...d6.', 'Pelas brancas, trocar peças demais e ficar sem nenhum plano numa posição igual.'],
  },
  {
    slug: 'filidor',
    name: 'Defesa Filidor',
    eco: 'C41',
    group: 'abertas',
    side: 'b',
    level: 'iniciante',
    root: 'e4 e5 Nf3 d6',
    summary:
      'As pretas defendem o peão de e5 com outro peão. É simples e sólido, mas deixa o bispo de f8 fechado e dá espaço às brancas. Serve bem para quem gosta de posições compactas, com uma estrutura firme e poucas surpresas.',
    ideas: ['O peão de d6 defende e5, ao custo de bloquear o bispo de casas escuras.', 'Com a formação ...Cf6, ...Cbd7 e ...Be7, as pretas guardam tudo e só depois reagem.'],
    plans: {
      white: ['Abrir o centro com d4, desenvolver depressa e aproveitar a vantagem de espaço.'],
      black: ['Montar a estrutura compacta, rocar e preparar ...c6 e ...b5 ou a troca em d4 no momento certo.'],
    },
    lines: [
      { name: 'Troca em d4', sans: 'e4 e5 Nf3 d6 d4 exd4 Nxd4 Nf6 Nc3 Be7', note: 'As pretas cedem o centro e buscam desenvolvimento rápido. A posição é sólida, mas um pouco apertada.' },
      { name: 'Formação Hanham', sans: 'e4 e5 Nf3 d6 d4 Nf6 Nc3 Nbd7', note: 'As pretas mantêm o peão em e5. Atenção à ordem dos lances: há armadilhas para os dois lados.' },
    ],
    traps: [
      {
        name: 'Mate de Légal',
        sans: 'e4 e5 Nf3 d6 Bc4 Bg4 Nc3 g6 Nxe5 Bxd1 Bxf7+ Ke7 Nd5#',
        who: 'w',
        errorAt: 7,
        text: 'A cravada em f3 parece impedir o cavalo de sair, mas ela não é absoluta. Depois de 5.Cxe5, capturar a dama é um desastre: bispo e dois cavalos dão mate. O erro verdadeiro já foi 4...g6: mesmo sem pegar a dama, as pretas perdem um peão, porque 5...dxe5 6.Dxg4 deixa as brancas bem melhores.',
      },
    ],
    mistakes: ['Cravar com ...Bg4 antes de desenvolver os cavalos.', 'Deixar a estrutura passiva demais e nunca buscar uma ruptura.'],
  },
  {
    slug: 'vienense',
    name: 'Abertura Vienense',
    eco: 'C25–C29',
    group: 'abertas',
    side: 'w',
    level: 'intermediário',
    root: 'e4 e5 Nc3',
    summary:
      'As brancas desenvolvem o cavalo da dama antes do cavalo do rei, deixando o peão f livre para avançar. A ideia é jogar f4, como no Gambito do Rei, em condições melhores. Também aceita um jogo tranquilo com Bc4 e d3.',
    ideas: ['Com o cavalo em c3, o peão de e4 está defendido e as brancas podem preparar f4.', 'Sem o cavalo em f3, a dama fica livre para sair por g4 ou h5.'],
    plans: {
      white: ['Jogar f4 para abrir a coluna f e atacar o centro preto.', 'Na versão calma, colocar o bispo em c4 e seguir com d3 e Cf3.'],
      black: ['Responder com ...Cf6 e, contra f4, abrir o centro com ...d5.'],
    },
    lines: [
      { name: 'Gambito Vienense', sans: 'e4 e5 Nc3 Nf6 f4 d5 fxe5 Nxe4 Nf3', note: 'O centro abre logo. As pretas têm um cavalo forte em e4, e as brancas um peão avançado em e5.' },
      { name: 'Versão com o bispo', sans: 'e4 e5 Nc3 Nf6 Bc4 Nc6 d3 Bb4', note: 'As brancas mantêm a tensão e deixam f4 para mais tarde.' },
    ],
    traps: [],
    mistakes: ['Jogar f4 sem olhar a resposta ...Dh4+ quando g3 e o roque estão comprometidos.', 'Sair com a dama cedo sem um objetivo concreto e perder tempo depois.'],
  },
  {
    slug: 'gambito-do-rei',
    name: 'Gambito do Rei',
    eco: 'C30–C39',
    group: 'abertas',
    side: 'w',
    level: 'avançado',
    root: 'e4 e5 f4',
    summary:
      'Uma das aberturas mais antigas e arriscadas. As brancas entregam o peão f para tirar o peão preto de e5 e abrir a coluna f contra f7. As partidas costumam ser agudas, com sacrifícios e reis expostos, inclusive o branco.',
    ideas: ['Depois de ...exf4, as brancas tentam jogar d4 e formar um centro de dois peões.', 'As pretas podem defender o peão extra com ...g5, mas isso enfraquece a própria ala do rei.', 'O rei branco também fica mais exposto na diagonal e1–h4.'],
    plans: {
      white: ['Desenvolver com Cf3 para impedir ...Dh4+, jogar d4 e usar a coluna f.', 'Recuperar o peão de f4 quando as peças estiverem prontas.'],
      black: ['Aceitar e defender com ...g5, ou devolver o peão com ...d5 ou ...d6 para ter jogo fácil.', 'Recusar com ...Bc5, deixando o bispo apontado para g1.'],
    },
    lines: [
      { name: 'Aceito, Variante Kieseritzky', sans: 'e4 e5 f4 exf4 Nf3 g5 h4 g4 Ne5', note: 'As brancas atacam a corrente de peões. O cavalo em e5 é forte, mas as pretas têm um peão a mais.', sharp: true },
      { name: 'Aceito, Defesa Fischer', sans: 'e4 e5 f4 exf4 Nf3 d6 d4 g5', note: 'As pretas tiram a casa e5 do cavalo antes de proteger o peão. O centro fica com as brancas.', sharp: true },
      { name: 'Recusado com o bispo', sans: 'e4 e5 f4 Bc5 Nf3 d6 c3', note: 'As pretas não aceitam o peão. O bispo em c5 impede o roque das brancas por um tempo.', sharp: true },
    ],
    traps: [
      {
        name: 'Capturar em e5 cedo demais',
        sans: 'e4 e5 f4 Bc5 fxe5 Qh4+ g3 Qxe4+ Qe2 Qxh1',
        who: 'b',
        errorAt: 4,
        text: 'Contra o gambito recusado, pegar o peão parece natural, mas abre a diagonal do rei. Depois de ...Dh4+, se g3, a dama pega em e4 com xeque e leva a torre de h1. Se o rei sai para e2, ...Dxe4 é mate. Antes, é preciso jogar Cf3.',
      },
    ],
    mistakes: ['Esquecer o xeque em h4: quase sempre Cf3 precisa vir antes de qualquer outra coisa.', 'Pelas pretas, ganhar mais peões e nunca desenvolver as peças.'],
  },
  {
    slug: 'quatro-cavalos',
    name: 'Jogo dos Quatro Cavalos',
    eco: 'C46–C49',
    group: 'abertas',
    side: 'w',
    level: 'iniciante',
    root: 'e4 e5 Nf3 Nc6 Nc3 Nf6',
    summary:
      'Os quatro cavalos saem primeiro, seguindo à risca o conselho de desenvolver antes de mexer nos bispos. A posição é equilibrada e simétrica, boa para quem quer jogar xadrez sem estudar muita teoria. Por isso, ganha quem entende melhor o meio-jogo.',
    ideas: ['A simetria dá uma pequena iniciativa a quem está com a vez, mas nada decisivo.', 'As duas formas mais comuns são o bispo em b5 ou a abertura do centro com d4.'],
    plans: {
      white: ['Com Bb5, pressionar c6 e depois jogar d3 ou d4.', 'Com d4, abrir o jogo como na Escocesa.'],
      black: ['Copiar com ...Bb4 enquanto for seguro, ou responder com ...Cd4 na variante Rubinstein.'],
    },
    lines: [
      { name: 'Variante Espanhola', sans: 'e4 e5 Nf3 Nc6 Nc3 Nf6 Bb5 Bb4 O-O O-O d3 d6', note: 'A cópia dura até aqui. A partir de agora, cada lado precisa de um plano próprio.' },
      { name: 'Variante Escocesa', sans: 'e4 e5 Nf3 Nc6 Nc3 Nf6 d4 exd4 Nxd4 Bb4 Nxc6 bxc6 Bd3 d5', note: 'O centro se abre. As pretas têm peões dobrados, mas brigam logo pelo centro.' },
    ],
    traps: [],
    mistakes: ['Continuar copiando as brancas por tempo demais: em algum momento a simetria quebra a favor de quem tem a vez.', 'Tomar o peão de e4 ou e5 sem conferir a cravada do bispo.'],
  },
]
