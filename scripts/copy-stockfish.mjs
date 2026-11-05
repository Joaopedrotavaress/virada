// Copia o build lite single-thread do Stockfish para /public (roda no postinstall).
import { copyFileSync, existsSync, mkdirSync, readdirSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const raiz = join(dirname(fileURLToPath(import.meta.url)), '..')
const origem = join(raiz, 'node_modules', 'stockfish', 'bin')
const destino = join(raiz, 'public', 'engine')

if (!existsSync(origem)) {
  console.error('[stockfish] node_modules/stockfish/bin não encontrado. Rode npm install.')
  process.exit(1)
}

const arquivos = readdirSync(origem).filter((nome) => /-lite-single\.(js|wasm)$/.test(nome))
if (arquivos.length !== 2) {
  console.error(`[stockfish] esperava .js e .wasm lite-single, achei: ${arquivos.join(', ') || 'nada'}`)
  process.exit(1)
}

mkdirSync(destino, { recursive: true })
for (const nome of arquivos) {
  // Nome estável: o .js procura o .wasm com o mesmo nome base, ao lado dele.
  const estavel = nome.endsWith('.wasm') ? 'stockfish.wasm' : 'stockfish.js'
  copyFileSync(join(origem, nome), join(destino, estavel))
  console.log(`[stockfish] ${nome} -> public/engine/${estavel}`)
}
// O motor é GPLv3: a licença acompanha os arquivos publicados.
copyFileSync(join(raiz, 'node_modules', 'stockfish', 'Copying.txt'), join(destino, 'LICENSE.txt'))
