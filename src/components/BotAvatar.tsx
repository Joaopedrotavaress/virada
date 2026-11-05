/**
 * O retrato de cada bot, desenhado à mão em casas de tabuleiro.
 * a = cabelo ou roupa, b = pele, c = claro, d = escuro. Cada um tem um traço próprio.
 */
const PORTRAITS: Record<string, string[]> = {
  // Tio Beto: careca e de bigode.
  iniciante: ['........', '..bbbb..', '.bbbbbb.', '.bdbbdb.', '.bbbbbb.', '.bddddb.', '..bbbb..', '.aaaaaa.'],
  // Duda: franja e camiseta clara.
  aprendiz: ['..aaaa..', '.aaaaaa.', '.abbbba.', '.bdbbdb.', '.bbbbbb.', '..bddb..', '..bbbb..', '.cccccc.'],
  // Seu Zé da Praça: boina.
  casual: ['.aaaaaa.', 'aaaaaaaa', '.bbbbbb.', '.bdbbdb.', '.bbbbbb.', '.bbddbb.', '..bbbb..', '.dddddd.'],
  // Marli: coque alto.
  intermediario: ['...aa...', '..aaaa..', '.aaaaaa.', 'abdbbdba', 'abbbbbba', 'abbddbba', 'a.bbbb.a', '.cccccc.'],
  // Jorginho do Clube: boné e camisa do clube.
  clube: ['..aaaa..', '.aaaaaaa', '.bbbbbb.', '.bdbbdb.', '.bbbbbb.', '..bddb..', '..bbbb..', '.acaaca.'],
  // Rafa da Madrugada: fone de ouvido.
  competidor: ['..aaaa..', 'c.aaaa.c', 'cbbbbbbc', 'cbdbbdbc', '.bbbbbb.', '..bddb..', '..bbbb..', '.aaaaaa.'],
  // Dona Cida: cabelo branco e óculos.
  forte: ['.cccccc.', 'cccccccc', 'cbbbbbbc', 'bddbbddb', '.bbbbbb.', '..bddb..', '..bbbb..', '.aaaaaa.'],
  // Dr. Nogueira: óculos, barba e gravata.
  avancado: ['..aaaa..', '.aaaaaa.', '.bbbbbb.', 'bddbbddb', '.bbbbbb.', '.aaaaaa.', '..aaaa..', '.cccdccc'],
  // Bia Campeã: rabo de cavalo.
  expert: ['..aaaa..', '.aaaaaaa', '.abbbb.a', '.bdbbd.a', '.bbbbb.a', '..bdb..a', '..bbb...', '.cccc...'],
  // Caio do Final: cabelo arrepiado e barba curta.
  candidato: ['.a.aa.a.', '.aaaaaa.', '.bbbbbb.', '.bdbbdb.', '.bbbbbb.', '.abddba.', '..aaaa..', '.dddddd.'],
  // Mestra Iara: cabelo longo e faixa clara.
  titulado: ['..dddd..', '.dddddd.', 'dccccccd', 'dbdbbdbd', 'dbbbbbbd', 'dbbddbbd', 'd.bbbb.d', 'd.aaaa.d'],
  // O Stockfish: não tem rosto. É um peixe.
  mestre: ['...cc...', 'c.cccc..', 'cccccdc.', 'cccccccc', 'cccccc..', 'c.cccc..', '...cc...', '........'],
}

const TONES: Record<string, string> = { a: 'var(--zone-5)', b: 'var(--zone-8)', c: 'var(--zone-10)', d: 'var(--zone-0)' }

/** Sempre sobre fundo escuro, como o símbolo do app, para ler igual nos dois temas. */
export function BotAvatar({ id, className = 'size-10' }: { id: string; className?: string }) {
  const rows = PORTRAITS[id] ?? PORTRAITS.casual
  return (
    <svg viewBox="-1 -1 10 10" aria-hidden="true" shapeRendering="crispEdges" className={`shrink-0 rounded-sm ${className}`}>
      <rect x="-1" y="-1" width="10" height="10" fill="var(--zone-3)" />
      {rows.flatMap((row, y) =>
        [...row].map((cell, x) => (cell === '.' ? null : <rect key={`${x}-${y}`} x={x} y={y} width="1" height="1" fill={TONES[cell]} />)),
      )}
    </svg>
  )
}
