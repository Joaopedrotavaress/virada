// Gera os ícones do app em public/icons. Rode uma vez: node scripts/generate-icons.mjs
// Desenho simples e próprio: um peão claro sobre o azul-ardósia do tabuleiro.
import { mkdirSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { deflateSync } from 'node:zlib'

const destino = join(dirname(fileURLToPath(import.meta.url)), '..', 'public', 'icons')
mkdirSync(destino, { recursive: true })

const FUNDO = [22, 32, 43]
const CASA = [111, 141, 161]
const PECA = [244, 246, 248]
const SUPERAMOSTRAS = 4

const dentroDoCirculo = (x, y, cx, cy, r) => (x - cx) ** 2 + (y - cy) ** 2 <= r ** 2

/** Coordenadas de 0 a 1 dentro da área do desenho. */
function noPeao(x, y) {
  if (dentroDoCirculo(x, y, 0.5, 0.27, 0.13)) return true // cabeça
  if (y >= 0.38 && y <= 0.42 && Math.abs(x - 0.5) <= 0.14) return true // colarinho
  if (y >= 0.42 && y <= 0.74) {
    // corpo: afina no meio e abre na base
    const t = (y - 0.42) / 0.32
    const meia = 0.075 + 0.145 * t ** 2
    if (Math.abs(x - 0.5) <= meia) return true
  }
  if (y >= 0.74 && y <= 0.86 && Math.abs(x - 0.5) <= 0.27) return true // base
  return false
}

function cor(x, y, escala) {
  // x e y de 0 a 1 no ícone inteiro. "escala" reduz o peão para caber na zona segura.
  const px = 0.5 + (x - 0.5) / escala
  const py = 0.5 + (y - 0.5) / escala
  if (px >= 0 && px <= 1 && py >= 0 && py <= 1 && noPeao(px, py)) return PECA
  const coluna = x < 0.5 ? 0 : 1
  const linha = y < 0.5 ? 0 : 1
  return (coluna + linha) % 2 === 1 ? CASA : FUNDO
}

const TABELA = Array.from({ length: 256 }, (_, n) => {
  let c = n
  for (let k = 0; k < 8; k += 1) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
  return c >>> 0
})
function crc32(dados) {
  let c = 0xffffffff
  for (const byte of dados) c = TABELA[(c ^ byte) & 0xff] ^ (c >>> 8)
  return (c ^ 0xffffffff) >>> 0
}

function bloco(tipo, dados) {
  const nome = Buffer.from(tipo)
  const tamanho = Buffer.alloc(4)
  tamanho.writeUInt32BE(dados.length)
  const crc = Buffer.alloc(4)
  crc.writeUInt32BE(crc32(Buffer.concat([nome, dados])))
  return Buffer.concat([tamanho, nome, dados, crc])
}

function png(tamanho, escala) {
  const cabecalho = Buffer.alloc(13)
  cabecalho.writeUInt32BE(tamanho, 0)
  cabecalho.writeUInt32BE(tamanho, 4)
  cabecalho[8] = 8 // 8 bits por canal
  cabecalho[9] = 2 // RGB
  const linhas = Buffer.alloc((tamanho * 3 + 1) * tamanho)
  let i = 0
  for (let y = 0; y < tamanho; y += 1) {
    linhas[i++] = 0
    for (let x = 0; x < tamanho; x += 1) {
      const soma = [0, 0, 0]
      for (let sy = 0; sy < SUPERAMOSTRAS; sy += 1) {
        for (let sx = 0; sx < SUPERAMOSTRAS; sx += 1) {
          const c = cor((x + (sx + 0.5) / SUPERAMOSTRAS) / tamanho, (y + (sy + 0.5) / SUPERAMOSTRAS) / tamanho, escala)
          soma[0] += c[0]
          soma[1] += c[1]
          soma[2] += c[2]
        }
      }
      for (const canal of soma) linhas[i++] = Math.round(canal / SUPERAMOSTRAS ** 2)
    }
  }
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    bloco('IHDR', cabecalho),
    bloco('IDAT', deflateSync(linhas, { level: 9 })),
    bloco('IEND', Buffer.alloc(0)),
  ])
}

for (const [nome, tamanho, escala] of [
  ['icon-192.png', 192, 0.95],
  ['icon-512.png', 512, 0.95],
  ['icon-maskable-512.png', 512, 0.72], // sistemas recortam a borda: o peão fica na zona segura
  ['apple-touch-icon.png', 180, 0.85],
]) {
  writeFileSync(join(destino, nome), png(tamanho, escala))
  console.log(`[ícones] ${nome}`)
}
