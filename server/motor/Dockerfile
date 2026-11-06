FROM node:22-slim
ARG VERSAO=sf_19
ADD https://github.com/official-stockfish/Stockfish/releases/download/${VERSAO}/stockfish-linux-x86-64-universal.tar.gz /tmp/sf.tar.gz
RUN mkdir -p /opt/stockfish && tar xzf /tmp/sf.tar.gz -C /opt/stockfish --strip-components=1 && rm /tmp/sf.tar.gz \
 && chmod -R a+rX /opt/stockfish \
 && ln -s "$(find /opt/stockfish -maxdepth 2 -type f -perm -u+x -name 'stockfish*' | head -1)" /usr/local/bin/stockfish
WORKDIR /app
COPY regras.mjs motor.mjs ./
USER node
CMD ["node", "motor.mjs"]
