# RabbitMQ Solar View Dev

Painel local para operar o fluxo da Equatorial GO no RabbitMQ: subir o broker rapidamente, ver as filas de entrada e saída, inspecionar mensagens e publicar novas sem sair do navegador.

## Subir tudo (RabbitMQ + API + painel)

Requisitos: Docker com Compose.

```bash
cp .env.example .env
docker compose up --build
```

- Painel: http://localhost:8080
- API: http://localhost:3000
- RabbitMQ Management: http://localhost:15673 (`guest` / `guest`)
- AMQP (para workers locais): `amqp://guest:guest@localhost:5673/`

As portas do RabbitMQ ficam em 5673/15673 (em vez das padrão 5672/15672) para não colidir com outro RabbitMQ já rodando na máquina.

A API roda com `nodemon --legacy-watch` (polling, necessário para detectar mudanças de forma confiável em bind mount) e monta `server/src` do host, então editar o backend não exige rebuild. O painel roda o próprio Vite dev server dentro do container, com `web/src`, `index.html` e `vite.config.js` montados do host — editar o frontend recarrega na hora (hot-reload), sem passo manual extra.

O usuário `guest`/`guest` vem fixo do `rabbitmq/definitions.json` (hash gerado com `rabbitmqctl hash_password`). A imagem oficial do RabbitMQ ignora `RABBITMQ_DEFAULT_USER`/`RABBITMQ_DEFAULT_PASS` quando `management.load_definitions` está ativo, então para trocar a senha é preciso gerar um novo hash (`docker exec <container> rabbitmqctl hash_password <senha>`) e atualizar o arquivo.

Se preferir instalar as dependências do frontend localmente (autocompletar da IDE, etc.), `cd web && npm install`. Isso não é necessário para rodar — o container já tem tudo.

## Concessionárias e filas

As concessionárias e suas filas ficam em `rabbitmq/concessionarias.json` — cada entrada tem `nome`, `id` (companyId) e o par `queueIn`/`queueOut`. O painel lê esse arquivo (via API) para montar o select do topo; trocar de concessionária troca os cards, as mensagens exibidas e o `companyId`/`concessionaireName` padrão do formulário de publicação.

Para adicionar uma nova concessionária, edite o JSON e reinicie a API (`docker compose up -d api`, necessário porque as filas são declaradas na conexão AMQP) — não precisa mexer no frontend nem no backend.

A leitura do painel usa `ack_requeue_true`, então visualizar mensagens não as remove das filas. Um worker pode apontar para `amqp://guest:guest@localhost:5673/` e usar as filas do JSON acima.

## Payload

O formulário já começa com o contrato solicitado (companyId, credential, dev, base64, isPortalAuth, priority). Ele aceita um objeto JSON por envio, escolhe a fila de destino e publica com mensagem persistente e prioridade entre 0 e 2.
