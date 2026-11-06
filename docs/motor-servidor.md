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

## O que falta: o endereço público

O HTTPS do servidor pertence ao proxy da LordPets, em `/opt/lordpets/Caddyfile`. Para o site alcançar o motor, esse proxy precisa de um endereço a mais. Isso não mexe na rota da loja:

```bash
ssh root@169.58.241.29
cp -p /opt/lordpets/Caddyfile /opt/virada-motor/Caddyfile.antes
docker network connect virada-motor-rede lordpets-caddy-1
printf '\nmotor.169-58-241-29.sslip.io {\n\tencode zstd gzip\n\treverse_proxy virada-motor:8080 {\n\t\tflush_interval -1\n\t}\n}\n' >> /opt/lordpets/Caddyfile
docker exec lordpets-caddy-1 caddy validate --config /etc/caddy/Caddyfile --adapter caddyfile
docker exec lordpets-caddy-1 caddy reload --config /etc/caddy/Caddyfile --adapter caddyfile
curl https://motor.169-58-241-29.sslip.io/saude
```

Só rode o `reload` se o `validate` disser que está válido. Para desfazer: `cat /opt/virada-motor/Caddyfile.antes > /opt/lordpets/Caddyfile` e rode o `reload` de novo.

**Dois cuidados:** um deploy da loja pode sobrescrever o `Caddyfile`, e recriar o container do proxy tira ele da rede do motor. Nos dois casos, a loja segue normal e o site volta a analisar no aparelho. Basta repetir os passos.

## Atualizar o motor

```bash
scp server/motor/* root@169.58.241.29:/opt/virada-motor/
ssh root@169.58.241.29 'cd /opt/virada-motor && docker compose up -d --build'
```
