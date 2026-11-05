import { Chess } from 'chess.js'
import { type Color, type Eval } from '../chess/evaluation'
import type { EngineResult } from '../engine/stockfish'

export interface BotConfig {
  id: string
  name: string
  /** Força aproximada, só para orientar a escolha. */
  rating: string
  description: string
  options: Record<string, string | number | boolean>
  movetime: number
  /** Quantas linhas pedir ao motor para poder errar de forma humana. */
  multiPv: number
  /** Chance de sortear entre as linhas em vez de jogar a melhor. */
  varyChance: number
  /** Quanto o sorteio tolera lances piores, em centipeões. Maior: erra mais. */
  temperature: number
  /** Chance de jogar qualquer lance legal: o motor sozinho não erra como um iniciante. */
  randomChance: number
}

const skill = (level: number) => ({ UCI_LimitStrength: false, 'Skill Level': level })
const elo = (rating: number) => ({ 'Skill Level': 20, UCI_LimitStrength: true, UCI_Elo: rating })

export const BOTS: BotConfig[] = [
  { id: 'iniciante', name: 'Iniciante', rating: '~400', description: 'Deixa peças de graça com frequência.', options: skill(0), movetime: 50, multiPv: 3, varyChance: 0.6, temperature: 250, randomChance: 0.2 },
  { id: 'aprendiz', name: 'Aprendiz', rating: '~600', description: 'Já captura o que está solto, mas se distrai.', options: skill(1), movetime: 75, multiPv: 3, varyChance: 0.5, temperature: 200, randomChance: 0.12 },
  { id: 'casual', name: 'Casual', rating: '~800', description: 'Conhece o básico, mas erra táticas simples.', options: skill(2), movetime: 100, multiPv: 3, varyChance: 0.45, temperature: 150, randomChance: 0.06 },
  { id: 'intermediario', name: 'Intermediário', rating: '~1000', description: 'Vê ameaças diretas e cai em táticas de dois lances.', options: skill(3), movetime: 150, multiPv: 3, varyChance: 0.35, temperature: 110, randomChance: 0.03 },
  { id: 'clube', name: 'Clube', rating: '~1200', description: 'Joga com sentido e pune erros grosseiros.', options: skill(5), movetime: 200, multiPv: 3, varyChance: 0.25, temperature: 80, randomChance: 0 },
  { id: 'competidor', name: 'Competidor', rating: '~1400', description: 'Raramente perde peça de graça.', options: elo(1400), movetime: 300, multiPv: 1, varyChance: 0, temperature: 0, randomChance: 0 },
  { id: 'forte', name: 'Forte', rating: '~1600', description: 'Pede atenção em cada lance.', options: elo(1600), movetime: 400, multiPv: 1, varyChance: 0, temperature: 0, randomChance: 0 },
  { id: 'avancado', name: 'Avançado', rating: '~1800', description: 'Calcula bem e aproveita posições melhores.', options: elo(1800), movetime: 500, multiPv: 1, varyChance: 0, temperature: 0, randomChance: 0 },
  { id: 'expert', name: 'Expert', rating: '~2000', description: 'Quase não dá presentes.', options: elo(2000), movetime: 600, multiPv: 1, varyChance: 0, temperature: 0, randomChance: 0 },
  { id: 'candidato', name: 'Candidato', rating: '~2200', description: 'Táticas longas e finais bem conduzidos.', options: elo(2200), movetime: 700, multiPv: 1, varyChance: 0, temperature: 0, randomChance: 0 },
  { id: 'titulado', name: 'Titulado', rating: '~2500', description: 'Força de jogador com título.', options: elo(2500), movetime: 850, multiPv: 1, varyChance: 0, temperature: 0, randomChance: 0 },
  { id: 'mestre', name: 'Mestre', rating: 'força total', description: 'O Stockfish sem limites.', options: skill(20), movetime: 1000, multiPv: 1, varyChance: 0, temperature: 0, randomChance: 0 },
]

/** Avaliação do ponto de vista do bot, em centipeões. Mate vira um valor enorme. */
function scoreFor(evaluation: Eval, color: Color): number {
  if (evaluation.kind === 'mate') return (evaluation.winner === color ? 1 : -1) * (100_000 - evaluation.moves * 100)
  return color === 'w' ? evaluation.cp : -evaluation.cp
}

/** Escolhe o lance do bot. O sorteio pesa cada linha pelo quanto ela é pior que a melhor. */
export function pickBotMove(result: EngineResult, bot: BotConfig, fen: string, random: () => number = Math.random): string | null {
  const color: Color = fen.split(' ')[1] === 'b' ? 'b' : 'w'

  if (bot.randomChance > 0 && random() < bot.randomChance) {
    const legal = new Chess(fen).moves({ verbose: true })
    if (legal.length > 0) return legal[Math.floor(random() * legal.length)].lan
  }

  const candidates = result.lines.filter((line) => line.pvUci.length > 0)
  if (candidates.length < 2 || random() >= bot.varyChance) return result.bestUci ?? candidates[0]?.pvUci[0] ?? null

  const top = Math.max(...candidates.map((line) => scoreFor(line.eval, color)))
  const weights = candidates.map((line) => Math.exp(-(top - scoreFor(line.eval, color)) / bot.temperature))
  let roll = random() * weights.reduce((sum, weight) => sum + weight, 0)
  for (let index = 0; index < candidates.length; index += 1) {
    roll -= weights[index]
    if (roll <= 0) return candidates[index].pvUci[0]
  }
  return candidates[0].pvUci[0]
}

/** Espera do bot antes de jogar, para parecer humano: de 0,5 s a 2 s. */
export const thinkingDelay = (random: () => number = Math.random) => 500 + random() * 1500

/** FEN com a vez trocada, para ver o que o adversário jogaria se pudesse. null se quem joga está em xeque. */
export function swapSideFen(fen: string): string | null {
  const chess = new Chess(fen)
  if (chess.inCheck()) return null
  const [board, side, castling, , , fullMove] = fen.split(' ')
  return `${board} ${side === 'w' ? 'b' : 'w'} ${castling} - 0 ${fullMove}`
}

export interface PgnHeaders {
  white: string
  black: string
  result: string
  date: Date
  termination?: string
  startFen?: string
  /** Relógio depois de cada lance, em segundos. */
  stamps?: (number | null)[]
  timeControl?: string
}

function clockComment(seconds: number): string {
  const total = Math.max(0, seconds)
  const hours = Math.floor(total / 3600)
  const minutes = Math.floor((total % 3600) / 60)
  const rest = (total % 60).toFixed(1).padStart(4, '0')
  return `[%clk ${hours}:${String(minutes).padStart(2, '0')}:${rest}]`
}

/** PGN da partida contra o bot, pronto para a análise. */
export function buildBotPgn(sans: string[], { white, black, result, date, termination, startFen, stamps, timeControl }: PgnHeaders): string {
  const chess = startFen ? new Chess(startFen) : new Chess()
  sans.forEach((san, index) => {
    chess.move(san)
    const stamp = stamps?.[index]
    if (stamp !== null && stamp !== undefined) chess.setComment(clockComment(stamp))
  })
  if (timeControl) chess.setHeader('TimeControl', timeControl)
  const pad = (value: number) => String(value).padStart(2, '0')
  chess.setHeader('Event', 'Treinador de Xadrez')
  chess.setHeader('Site', 'Jogo contra bot')
  chess.setHeader('Date', `${date.getFullYear()}.${pad(date.getMonth() + 1)}.${pad(date.getDate())}`)
  chess.setHeader('White', white)
  chess.setHeader('Black', black)
  chess.setHeader('Result', result)
  if (termination) chess.setHeader('Termination', termination)
  return chess.pgn()
}
