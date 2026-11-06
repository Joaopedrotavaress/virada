// Motor do Virada no servidor: o Stockfish completo, atendendo partidas inteiras de uma vez.
// As respostas saem uma por linha, assim que cada posição fica pronta. Sem dependências além do Node.
import { spawn } from 'node:child_process'
import { createServer } from 'node:http'
import { createInterface } from 'node:readline'
import { LIMITES, chaveDe, criarCota, lerInfo, lerPedido, origemPermitida } from './regras.mjs'

const PORTA = Number(process.env.PORTA ?? 8080)
const BINARIO = process.env.STOCKFISH ?? '/usr/local/bin/stockfish'
const MOTORES = Number(process.env.MOTORES ?? 3)
const HASH_MB = Number(process.env.HASH_MB ?? 128)
const CACHE_MAX = 60_000
/** Nenhuma busca passa disto: o servidor é dividido com outros serviços. */
const BUSCA_MAX_MS = 45_000
const POR_IP_ATIVOS = 2
const cota = criarCota({ janelaMs: 60 * 60 * 1000, posicoes: 12_000 })

const cache = new Map()
const guardar = (chave, valor) => {
  if (cache.size >= CACHE_MAX) cache.delete(cache.keys().next().value)
  cache.set(chave, valor)
}

/** Pedidos em andamento. Eles se revezam: uma partida longa não faz a outra esperar até o fim. */
const pedidos = []
let contadorBuscas = 0

function proximoTrabalho() {
  for (let volta = 0; volta < pedidos.length; volta += 1) {
    const pedido = pedidos.shift()
    pedidos.push(pedido)
    if (pedido.cancelado) continue
    const trabalho = pedido.fila.shift()
    if (trabalho) return { pedido, trabalho }
  }
  return null
}

class Motor {
  constructor() {
    this.ocupado = false
    this.linhas = this.multiPv = 0
    this.ligar()
  }

  ligar() {
    this.processo = spawn(BINARIO, [], { stdio: ['pipe', 'pipe', 'ignore'] })
    this.pronto = false
    this.espera = null
    createInterface({ input: this.processo.stdout }).on('line', (linha) => this.espera?.(linha))
    this.processo.stdin.on('error', () => {})
    this.processo.on('exit', () => this.caiu())
    this.mandar(`setoption name Threads value 1\nsetoption name Hash value ${HASH_MB}\nisready`)
    this.espera = (linha) => {
      if (linha === 'readyok') {
        this.pronto = true
        this.espera = null
        distribuir()
      }
    }
  }

  mandar(texto) {
    if (this.processo.stdin.writable) this.processo.stdin.write(`${texto}\n`)
  }

  caiu() {
    const atual = this.atual
    this.atual = null
    this.ocupado = false
    clearTimeout(this.relogio)
    if (atual) atual.pedido.falhou(atual.trabalho)
    setTimeout(() => this.ligar(), 500)
  }

  buscar({ pedido, trabalho }) {
    this.ocupado = true
    this.atual = { pedido, trabalho }
    contadorBuscas += 1
    const linhas = new Map()
    if (this.multiPv !== pedido.linhas) {
      this.multiPv = pedido.linhas
      this.mandar(`setoption name MultiPV value ${pedido.linhas}`)
    }
    this.mandar(`position fen ${trabalho.fen}\ngo depth ${pedido.profundidade}`)
    this.relogio = setTimeout(() => this.mandar('stop'), BUSCA_MAX_MS)
    this.espera = (texto) => {
      const info = lerInfo(texto)
      if (info) {
        linhas.set(info.linha, info)
        return
      }
      if (!texto.startsWith('bestmove')) return
      clearTimeout(this.relogio)
      this.espera = null
      this.ocupado = false
      this.atual = null
      const melhor = texto.split(' ')[1]
      const resultado = { best: melhor === '(none)' ? null : melhor, lines: [...linhas.values()].sort((a, b) => a.linha - b.linha).map(({ depth, score, pv }) => ({ depth, score, pv })) }
      guardar(trabalho.chave, resultado)
      pedido.pronto(trabalho, resultado)
      distribuir()
    }
  }
}

const motores = Array.from({ length: MOTORES }, () => new Motor())

function distribuir() {
  for (const motor of motores) {
    if (motor.ocupado || !motor.pronto) continue
    const proximo = proximoTrabalho()
    if (!proximo) return
    motor.buscar(proximo)
  }
}

const ipDe = (req) => (req.headers['x-forwarded-for'] ?? '').split(',').pop().trim() || req.socket.remoteAddress
const ativosPorIp = new Map()

function lerCorpo(req) {
  return new Promise((resolve, reject) => {
    const partes = []
    let tamanho = 0
    req.on('data', (parte) => {
      tamanho += parte.length
      if (tamanho > LIMITES.corpoBytes) {
        reject(new Error('grande demais'))
        req.destroy()
        return
      }
      partes.push(parte)
    })
    req.on('end', () => resolve(Buffer.concat(partes).toString('utf8')))
    req.on('error', reject)
  })
}

function analisar(req, res, dados, ip) {
  const { fens, profundidade, linhas } = dados
  res.writeHead(200, { 'Content-Type': 'application/x-ndjson; charset=utf-8', 'Cache-Control': 'no-store', 'X-Accel-Buffering': 'no' })
  let faltam = fens.length
  const fechar = () => {
    if (pedido.cancelado) return
    pedido.cancelado = true
    pedidos.splice(pedidos.indexOf(pedido), 1)
    const ativos = (ativosPorIp.get(ip) ?? 1) - 1
    if (ativos > 0) ativosPorIp.set(ip, ativos)
    else ativosPorIp.delete(ip)
    res.end()
  }
  const responder = (indices, resultado) => {
    for (const i of indices) {
      res.write(`${JSON.stringify({ i, ...resultado })}\n`)
      faltam -= 1
    }
    if (faltam <= 0) fechar()
  }
  const pedido = {
    linhas,
    profundidade,
    fila: [],
    cancelado: false,
    pronto: (trabalho, resultado) => {
      if (!pedido.cancelado) responder(trabalho.indices, resultado)
    },
    falhou: (trabalho) => {
      if (!pedido.cancelado) responder(trabalho.indices, { erro: true })
    },
  }
  pedidos.push(pedido)
  ativosPorIp.set(ip, (ativosPorIp.get(ip) ?? 0) + 1)
  res.on('close', fechar)

  const iguais = new Map()
  fens.forEach((fen, i) => {
    const chave = chaveDe(fen, profundidade, linhas)
    const pronto = cache.get(chave)
    if (pronto) {
      responder([i], pronto)
      return
    }
    const existente = iguais.get(chave)
    if (existente) existente.indices.push(i)
    else {
      const trabalho = { fen, chave, indices: [i] }
      iguais.set(chave, trabalho)
      pedido.fila.push(trabalho)
    }
  })
  distribuir()
}

const servidor = createServer(async (req, res) => {
  const origem = req.headers.origin
  if (origemPermitida(origem)) {
    res.setHeader('Access-Control-Allow-Origin', origem)
    res.setHeader('Vary', 'Origin')
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
    res.setHeader('Access-Control-Max-Age', '86400')
  }
  const responderJson = (status, corpo) => {
    res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' })
    res.end(JSON.stringify(corpo))
  }
  if (req.method === 'OPTIONS') {
    res.writeHead(204)
    res.end()
    return
  }
  if (req.method === 'GET' && req.url === '/saude') {
    responderJson(200, { app: 'virada-motor', motores: motores.filter((motor) => motor.pronto).length, ocupados: motores.filter((motor) => motor.ocupado).length, pedidos: pedidos.length, cache: cache.size, buscas: contadorBuscas })
    return
  }
  if (req.method !== 'POST' || req.url !== '/analisar') return responderJson(404, { erro: 'não encontrado' })
  if (!origemPermitida(origem)) return responderJson(403, { erro: 'origem não permitida' })
  const ip = ipDe(req)
  if ((ativosPorIp.get(ip) ?? 0) >= POR_IP_ATIVOS) return responderJson(429, { erro: 'muitas análises ao mesmo tempo' })
  let dados
  try {
    dados = lerPedido(JSON.parse(await lerCorpo(req)))
  } catch {
    return responderJson(400, { erro: 'pedido inválido' })
  }
  if (dados.erro) return responderJson(400, { erro: dados.erro })
  if (!cota.pode(ip, dados.fens.length)) return responderJson(429, { erro: 'limite de análises por hora' })
  analisar(req, res, dados, ip)
})

servidor.requestTimeout = 15_000
servidor.listen(PORTA, () => console.log(`motor na porta ${PORTA}, ${MOTORES} motores, hash ${HASH_MB} MB`))
