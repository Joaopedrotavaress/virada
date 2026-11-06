# O motor no servidor

O site analisa a partida inteira de uma vez no servidor, com o Stockfish 19 completo. Se o servidor não responder, o que faltar é calculado no aparelho, sem a pessoa fazer nada. Só as posições saem do aparelho: nem nomes, nem PGN.

## Por que ajuda

Medido com uma partida de 98 posições, 2 linhas por posição:

| Profundidade | Servidor | Motor lite neste computador |
|---:|---:|---:|
| 15 | 19 s | 30 s |
| 18 | 60 s | 96 s |
| 20 | 111 s | 264 s |
| 22 | 296 s | 534 s |
| Repetida, pelo cache | 0,7 s | |

O ganho maior não é a velocidade no computador: é o motor completo, muito mais forte em cada profundidade, e o celular, que não precisa mais fazer a conta. No celular, não medi.

## Como está instalado

O servidor também roda outro serviço em produção. Por isso o motor fica à parte:

- Container `virada-motor`, em `/opt/virada-motor`, a partir de `server/motor/`.
- Rede própria e interna, sem porta publicada.
- Teto de 3 núcleos e 1,5 GB, e prioridade de CPU menor que a dos outros containers.
- Aceita só a origem do site e do `localhost`, valida cada posição, e limita a 2 análises simultâneas e 12 mil posições por hora para cada endereço.

## O endereço público

O HTTPS do servidor pertence ao proxy da LordPets. O motor responde em `https://motor.169-58-241-29.sslip.io`, por um bloco a mais em `/opt/lordpets/Caddyfile`, que não mexe na rota da loja. O arquivo anterior está em `/opt/virada-motor/Caddyfile.antes`.

**Cuidado com o arquivo do proxy.** O container pode continuar vendo uma versão antiga do `Caddyfile`, quando um deploy troca o arquivo sem reiniciar o proxy. Para aplicar sem derrubar a loja:

```bash
docker cp /opt/lordpets/Caddyfile lordpets-caddy-1:/tmp/Caddyfile.atual
docker exec lordpets-caddy-1 caddy validate --config /tmp/Caddyfile.atual --adapter caddyfile
docker exec lordpets-caddy-1 caddy reload --config /tmp/Caddyfile.atual --adapter caddyfile
```

**O que pode tirar o endereço do ar:** um deploy da loja pode sobrescrever o `Caddyfile`, e recriar o container do proxy tira ele da rede do motor (`docker network connect virada-motor-rede lordpets-caddy-1`). Nos dois casos, a loja segue normal e o site volta a analisar no aparelho.

**Para desfazer:** volte o `Caddyfile` do backup, aplique como acima e rode `docker network disconnect virada-motor-rede lordpets-caddy-1`.

## Atualizar o motor

```bash
scp server/motor/* root@169.58.241.29:/opt/virada-motor/
ssh root@169.58.241.29 'cd /opt/virada-motor && docker compose up -d --build'
```
