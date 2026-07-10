# Gerenciador de Laudos Médicos (AcompMedic)

Aplicação full stack em Next.js para gestão de pacientes, médicos, consultas e laudos médicos — com autenticação, controle de acesso por perfil (RBAC), suporte a múltiplos idiomas (i18n) e armazenamento seguro de documentos.

## Stack

- **Next.js 15** (App Router)
- **React 19**
- **TypeScript**
- **Tailwind CSS**
- **shadcn/ui**
- **React Hook Form** + **Zod** (validação de formulários)
- **TanStack Query**
- **Prisma** (ORM)
- **Supabase**: PostgreSQL, Auth, Storage
- **next-intl** (i18n: pt-BR / en-US)
- **Vercel** (hospedagem)

## Requisitos locais

- Node.js 20+
- npm 10+
- Projeto Supabase configurado (URL, chaves de API e connection string do banco)

## Como rodar localmente

```bash
npm install
cp .env.example .env   # preencha com suas credenciais do Supabase
npx prisma migrate dev
npm run db:seed
npm run dev
```

Acesse [http://localhost:3000](http://localhost:3000).

## Scripts

| Comando | Descrição |
|---|---|
| `npm run dev` | Sobe a aplicação em desenvolvimento |
| `npm run build` | Gera o Prisma Client, aplica migrations e faz o build de produção |
| `npm run start` | Sobe a build de produção |
| `npm run lint` | Executa o ESLint |
| `npm run typecheck` | Checagem de tipos |
| `npm run test` | Executa a suíte de testes |
| `npm run check` | Executa lint, typecheck e testes |
| `npm run db:generate` | Gera o Prisma Client |
| `npm run db:migrate` | Cria e aplica uma migration em desenvolvimento |
| `npm run db:deploy` | Aplica migrations pendentes em ambiente remoto |
| `npm run db:seed` | Executa o seed do banco |
| `npm run db:studio` | Abre o Prisma Studio |

> O script `build` já executa `prisma generate && prisma migrate deploy && next build`, garantindo que toda migration pendente seja aplicada automaticamente antes de cada deploy na Vercel.

## Variáveis de ambiente

Use o `.env.example` como referência. Variáveis obrigatórias:

| Variável | Descrição |
|---|---|
| `NEXT_PUBLIC_APP_URL` | URL pública da aplicação (usada em redirects, ex: confirmação de email) |
| `NEXT_PUBLIC_SUPABASE_URL` | URL do projeto Supabase |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Chave pública (client-side) do Supabase |
| `SUPABASE_SERVICE_ROLE_KEY` | Chave com privilégios totais — **somente server-side** |
| `DATABASE_URL` | Connection string do Postgres (via pooler/PgBouncer, para runtime) |
| `DIRECT_URL` | Connection string direta do Postgres (sem pooler, usada para migrations) |
| `SUPABASE_STORAGE_BUCKET_MEDICAL_REPORTS` | Nome do bucket privado usado para armazenar laudos |
| `MAX_UPLOAD_SIZE_BYTES` | Tamanho máximo permitido por upload |
| `RATE_LIMIT_WINDOW_MS` | Janela de tempo para rate limiting |
| `RATE_LIMIT_MAX_REQUESTS` | Máximo de requisições por janela |
| `LOG_LEVEL` | Nível de log da aplicação |

## Estrutura de diretórios

```txt
src/
  app/           # rotas (App Router)
  components/    # componentes de UI compartilhados
  features/      # módulos de negócio (patients, doctors, appointments, reports...)
  hooks/
  lib/
  services/
  repositories/
  types/
  utils/
  schemas/       # validações Zod
  actions/       # Server Actions
  server/        # código exclusivo de servidor (clients, auth, etc.)
  middleware/
  styles/
messages/        # arquivos de tradução (pt-BR, en-US)
prisma/          # schema e migrations
public/
```

Cada módulo de negócio (dentro de `features/`) deve expor, quando aplicável: `components`, `hooks`, `services`, `schemas`, `types`, `repository` e `actions`.

## Controle de acesso (RBAC)

O sistema possui três perfis de usuário:

| Perfil | Acesso |
|---|---|
| **ADMIN** | Visualiza e gerencia todos os dados do sistema |
| **DOCTOR** | Visualiza apenas os pacientes atribuídos a ele (`assignedDoctorId`), suas consultas e os laudos correspondentes |
| **PATIENT** | Visualiza apenas os próprios dados (consultas e laudos); não cria/edita consultas nem laudos |

A autorização é aplicada em duas camadas:
1. **Aplicação** — toda API Route/Server Action filtra os dados pelo perfil do usuário autenticado
2. **Row Level Security (RLS)** no Supabase — camada defensiva adicional, espelhando a mesma regra, para proteger contra falhas na camada de aplicação ou acessos futuros via client direto do Supabase

## Internacionalização (i18n)

- Idiomas suportados: **pt-BR** (padrão) e **en-US**, via `next-intl`
- Sem prefixo de idioma na URL — a preferência é resolvida por perfil do usuário (`User.locale`) → cookie → header `Accept-Language` → padrão `pt-BR`
- Seletor de idioma disponível no header do dashboard e na tela de login

## LGPD e segurança

- Validação server-side com Zod em todas as entradas
- Autenticação via Supabase Auth
- Bucket privado no Storage para laudos médicos
- Trilha de auditoria para operações críticas
- Segredos apenas via variável de ambiente — nunca hardcoded
- Nenhuma confiança no frontend para autorização (toda regra é revalidada no servidor)

## Deploy na Vercel

1. Configure as variáveis de ambiente no painel do projeto (**Settings > Environment Variables**)
2. Configure o banco e o Storage no Supabase
3. Conecte o repositório do GitHub ao projeto na Vercel
4. O deploy roda automaticamente `prisma migrate deploy` antes do build — sem passos manuais adicionais

## Roadmap / IA futura

O projeto já expõe o contrato `MedicalReportAIService`, preparado para futuras integrações baseadas em LLM (leitura automática de laudos, extração de CID/medicamentos, resumos automáticos, busca em linguagem natural), mantendo a implementação plugável por interface.

Para a visão completa de produto e funcionalidades planejadas, veja [`docs/PRODUCT.md`](./docs/PRODUCT.md).