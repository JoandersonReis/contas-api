# Contas API

## Formatação

O projeto utiliza o padrão do Prettier, definido em `.prettierrc.json`, com a versão fixada nas dependências de desenvolvimento.

```sh
npm run format
npm run format:check
```

O primeiro comando formata o código; o segundo verifica a formatação sem alterar arquivos. Artefatos gerados, dependências e arquivos de ambiente são ignorados conforme `.prettierignore`.

Gerenciador de contas em português, com React, TypeScript, Tailwind CSS, NestJS, Prisma ORM 8 e PostgreSQL. Investimentos ficam para a próxima etapa.

Uma **pasta** representa uma conta ou categoria, com nome e valor previsto. Seus **lançamentos** representam os gastos individuais (descrição, valor e data). Exemplo: Mercado, previsto R$ 600; compras de R$ 100, R$ 200 e R$ 300 resultam em R$ 600 lançados. Valores acima da previsão são permitidos e destacados. O saldo é o previsto menos os gastos; não representa pagamento ou quitação de dívidas.

## Executar localmente

Requisitos: Node.js 24.11+ e Docker com Compose. Em máquinas com o executável separado, use `docker-compose` no lugar de `docker compose`.

```sh
cp .env.example .env
npm ci
docker compose up -d db
npm run db:init
npm run dev
```

Inicie o frontend separadamente na pasta web e abra http://localhost:5173. API em http://localhost:3000/api. A senha precisa ter entre 10 e 128 caracteres. Os exemplos de ambiente usam credenciais exclusivamente para desenvolvimento; ao alterá-las, mantenha `POSTGRES_PASSWORD` e `DATABASE_URL` coerentes. Os arquivos `.env` não são versionados.

```sh
npm run build
# Com PostgreSQL inicializado e a API em execução:
npm test
```

## Estrutura

- `src/`: API NestJS, validação, autenticação e persistência.
- `src/prisma/contract.prisma`: contrato Prisma 8; `contract.json` e `contract.d.ts` são emitidos pelo CLI.
- `docker-compose.yml`: PostgreSQL 17 com volume persistente e healthcheck, porta acessível apenas localmente.

O Prisma está fixado em `8.0.0-rc.33` (CLI) e `8.0.0-rc.23` (`@prisma/orm-postgres`). A linha 8 ainda é release candidate. Usa `contract emit` e `db init`, não os comandos de geração/migração do Prisma 7. `db:init` inicializa um banco novo. Para evolução do modelo em um banco existente, emita o contrato e utilize o fluxo de migrations do Prisma 8; não apague o volume para atualizar o modelo.

## Autenticação e dados

- Hash Argon2d, com salt aleatório da biblioteca, memória de 64 MiB, 3 iterações e paralelismo 1.
- Sessão opaca de 7 dias em cookie HttpOnly, SameSite=Lax; somente o SHA-256 do token é persistido. Logout revoga a sessão. Em produção o cookie é Secure e exige HTTPS.
- Verificação de Origin nas escritas, CORS restrito ao `WEB_ORIGIN`, limite de requisições e validação de DTOs.
- Todas as operações verificam o usuário proprietário. Excluir uma pasta remove seus lançamentos via chave estrangeira com cascade.
- Dinheiro em centavos inteiros; cada valor deve estar entre 1 e 1.000.000.000 centavos. Datas de gastos são datas civis, sem conversão de fuso horário.
- A versão inicial não inclui recuperação de senha, pagamentos, recorrência ou investimentos.

## API

| Método | Caminho                             | Operação                                           |
| ------ | ----------------------------------- | -------------------------------------------------- |
| POST   | `/api/auth/register`                | Cadastro: name, email, password                    |
| POST   | `/api/auth/login`                   | Login: email, password                             |
| GET    | `/api/auth/me`                      | Usuário autenticado                                |
| POST   | `/api/auth/logout`                  | Revogar sessão                                     |
| GET    | `/api/folders`                      | Pastas com lançamentos e spentCents                |
| POST   | `/api/folders`                      | Criar: name, budgetCents                           |
| PUT    | `/api/folders/:id`                  | Atualizar: name, budgetCents                       |
| DELETE | `/api/folders/:id`                  | Excluir pasta e lançamentos                        |
| POST   | `/api/folders/:id/entries`          | Criar: description, amountCents, date (AAAA-MM-DD) |
| PUT    | `/api/folders/:id/entries/:entryId` | Atualizar lançamento                               |
| DELETE | `/api/folders/:id/entries/:entryId` | Excluir lançamento                                 |

Clientes de API devem enviar o cookie de sessão e, nas escritas, `Origin: http://localhost:5173` (ou o `WEB_ORIGIN` configurado).

## Validação realizada

Build do frontend e da API aprovados. Os testes de integração verificam senha Argon2d, cookies, credenciais inválidas, duplicidade de e-mail, isolamento entre usuários, validação de valores e datas, soma em centavos, edição, exclusão em cascata, logout e bloqueio de Origin incorreto.

O fluxo visual foi testado no Chromium, em desktop (1440 px) e celular (390 px): cadastro, pasta Mercado de R$ 600, três compras, persistência após recarregar e exclusão. O script opcional `scripts/browser-check.mjs` exige frontend e API em execução, build da API e uma instância isolada do Chromium com depuração local na porta 9222. Ele cria e remove seu próprio usuário de teste.

O `.npmrc` evita instalação automática dos peers de frameworks opcionais do CLI Prisma. Os peers necessários à stack usada estão declarados explicitamente.

Em desenvolvimento (`NODE_ENV=development`), a API aceita `localhost` e `127.0.0.1` na mesma porta de `WEB_ORIGIN`. Em produção, somente a origem configurada é aceita. O Vite usa a porta fixa 5173; se estiver ocupada, ele informa o erro em vez de mudar silenciosamente de porta.

## Organização da API

Os módulos `auth/` e `folders/` separam as responsabilidades:

- `*.controller.ts`: rotas, DTOs, requisições e respostas HTTP.
- `*.service.ts`: autenticação, sessões, autorização e regras das contas.
- `*.repository.ts`: consultas e alterações no PostgreSQL via Prisma.
- `*.module.ts`: registro dos componentes e injeção de dependências do NestJS.

O guard de autenticação delega a validação da sessão ao service. Cookies permanecem na camada HTTP; services não dependem de Request ou Response do Express.

## Deploy independente

Esta pasta é a raiz do projeto backend. Execute `npm ci`, `npm run build` e `npm start`. Configure `DATABASE_URL`, `WEB_ORIGIN` (origem exata do frontend), `NODE_ENV=production` e `PORT`. O servidor escuta em `0.0.0.0` por padrão, compatível com containers; `HOST` permite alterar isso. HTTPS deve ser terminado pelo proxy ou plataforma de hospedagem.

No Neon, configure `DATABASE_URL` com a conexão pooled (host com `-pooler`) para a API e `DATABASE_URL_UNPOOLED` com a conexão direta para os comandos do Prisma, incluindo inicialização e migrations. Mantenha os parâmetros TLS fornecidos pelo Neon. Se `DATABASE_URL_UNPOOLED` não estiver definida, o CLI usa `DATABASE_URL`, como no PostgreSQL local.

Inicialize um banco novo com `npm run db:init` antes de iniciar a aplicação. Para bancos existentes, aplique migrations Prisma 8 conforme as mudanças de contrato. O CLI Prisma está nas devDependencies, portanto a etapa de build/migrations deve instalar também as dependências de desenvolvimento. O runtime utiliza `dist`, incluindo o contrato JSON copiado pelo TypeScript.

O Docker Compose incluído sobe somente PostgreSQL para desenvolvimento. O frontend tem build e deploy próprios e não é necessário para compilar esta API.
