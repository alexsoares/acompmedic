# Gerenciador de Laudos Medicos

Aplicação Full Stack em Next.js 15 para autenticação, gestão de pacientes, médicos, consultas e laudos médicos, com Prisma, Supabase PostgreSQL, Supabase Auth, Supabase Storage e deploy na Vercel.

## Stack obrigatória

- Next.js 15 App Router
- React 19
- TypeScript
- TailwindCSS
- shadcn/ui
- React Hook Form
- Zod
- TanStack Query
- Prisma
- Supabase PostgreSQL
- Supabase Auth
- Supabase Storage
- Vercel

## Requisitos locais

- Node.js 20
- npm 10+
- Projeto Supabase configurado

## Scripts

- `npm run dev`: sobe a aplicação em desenvolvimento
- `npm run build`: gera Prisma Client e build de produção
- `npm run start`: sobe a build de produção
- `npm run lint`: executa ESLint
- `npm run typecheck`: executa checagem de tipos
- `npm run test`: executa a suíte de testes
- `npm run check`: executa lint, typecheck e testes
- `npm run db:generate`: gera o Prisma Client
- `npm run db:migrate`: cria e aplica migration local
- `npm run db:deploy`: aplica migrations em ambiente remoto
- `npm run db:seed`: executa seeds
- `npm run db:studio`: abre Prisma Studio

## Variáveis de ambiente

Use o arquivo `.env.example` como referência.

Variáveis obrigatórias:

- `NEXT_PUBLIC_APP_URL`
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `DATABASE_URL`
- `DIRECT_URL`
- `SUPABASE_STORAGE_BUCKET_MEDICAL_REPORTS`
- `MAX_UPLOAD_SIZE_BYTES`
- `RATE_LIMIT_WINDOW_MS`
- `RATE_LIMIT_MAX_REQUESTS`
- `LOG_LEVEL`

## Estrutura de diretórios

```txt
src/
  app/
  components/
  features/
  hooks/
  lib/
  services/
  repositories/
  types/
  utils/
  schemas/
  actions/
  server/
  middleware/
  styles/
prisma/
public/
```

Cada módulo de negócio deve expor:

- `components`
- `hooks`
- `services`
- `schemas`
- `types`
- `repository`
- `actions`

## LGPD e segurança

- validação server-side com Zod
- autenticação com Supabase Auth
- bucket privado para laudos
- trilha de auditoria para operações críticas
- segredo somente por variável de ambiente
- nenhuma confiança no frontend para autorização

## IA futura

O projeto já inclui o contrato `MedicalReportAIService`, preparado para futuras implementações baseadas em LLM, mantendo troca por interface.

## Deploy na Vercel

1. Configure as variáveis de ambiente na Vercel.
2. Configure o banco e o Storage no Supabase.
3. Rode `npm run db:deploy` no pipeline ou post-deploy.
4. Publique o projeto usando `npm run build`.

## Estado atual

- fundação do projeto pronta
- clientes de Supabase preparados
- validação de ambiente pronta
- contrato de IA futura pronto
- próxima etapa: Prisma schema, migrations, seeds, RLS e políticasThis is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.


# Gerenciador de Laudos Médicos

## Visão Geral

O **Gerenciador de Laudos Médicos** é uma plataforma web para gerenciamento de pacientes, médicos, consultas e documentos médicos.

O objetivo é centralizar todas as informações clínicas em um único sistema, permitindo o armazenamento seguro de laudos médicos, organização da agenda de consultas e manutenção do histórico completo dos pacientes.

A aplicação será desenvolvida utilizando tecnologias modernas e preparada para implantação em produção utilizando **Vercel** e **Supabase**, além de possuir arquitetura preparada para futuras integrações com Inteligência Artificial.

---

# Objetivos

O sistema permitirá:

- Gerenciamento de pacientes
- Gerenciamento de médicos
- Agendamento de consultas
- Upload de laudos médicos
- Histórico clínico completo
- Pesquisa rápida de informações
- Dashboard gerencial
- Controle de acesso por perfil
- Armazenamento seguro de documentos

---

# Dashboard

Ao acessar o sistema, o usuário visualizará um painel contendo indicadores importantes, como:

- Consultas do dia
- Próximas consultas
- Quantidade de pacientes cadastrados
- Quantidade de médicos cadastrados
- Quantidade de laudos armazenados
- Últimos documentos enviados
- Agenda da semana
- Indicadores gerais da clínica

---

# Cadastro de Pacientes

Cada paciente possuirá um cadastro completo contendo informações como:

- Nome
- CPF (opcional)
- Data de nascimento
- Sexo
- Telefone
- WhatsApp
- E-mail
- Endereço
- Convênio
- Número da carteirinha
- Contato de emergência
- Observações

Cada paciente também possuirá um histórico completo contendo consultas, laudos e demais registros relacionados.

---

# Cadastro de Médicos

O cadastro de médicos armazenará informações como:

- Nome
- CRM
- UF do CRM
- Especialidade
- Telefone
- E-mail
- Dias de atendimento
- Horários disponíveis

---

# Agenda de Consultas

O sistema disponibilizará diferentes visualizações da agenda:

- Agenda diária
- Agenda semanal
- Agenda mensal

Cada consulta possuirá:

- Paciente
- Médico
- Data
- Horário
- Duração
- Tipo de consulta
- Sala
- Observações

Os agendamentos poderão possuir os seguintes status:

- Agendada
- Confirmada
- Em atendimento
- Finalizada
- Cancelada
- Paciente ausente

Cada status será identificado visualmente por cores para facilitar o acompanhamento.

---

# Upload de Laudos

O sistema permitirá anexar documentos médicos nos formatos:

- PDF
- TXT

Cada documento ficará vinculado a um paciente.

As informações armazenadas para cada laudo incluem:

- Título
- Paciente
- Médico responsável
- Especialidade
- Data
- Observações
- Arquivo

Será possível:

- Visualizar
- Baixar
- Substituir
- Excluir

Todos os documentos serão armazenados de forma segura no **Supabase Storage**.

---

# Histórico Clínico

Cada paciente possuirá uma linha do tempo contendo:

- Consultas realizadas
- Laudos médicos
- Exames
- Observações clínicas

Todo o histórico será organizado cronologicamente.

---

# Pesquisa

O sistema permitirá pesquisas utilizando diversos critérios, incluindo:

- Nome do paciente
- Médico
- Especialidade
- Data
- Tipo do documento
- Palavras presentes no laudo (quando disponíveis)

---

# Inteligência Artificial (Preparação)

A arquitetura será preparada para futuras integrações com modelos de Inteligência Artificial.

Entre as funcionalidades planejadas estão:

- Leitura automática de PDFs
- OCR para documentos digitalizados
- Extração de texto
- Identificação de CID
- Identificação de medicamentos
- Identificação de doenças
- Geração automática de resumos
- Busca inteligente em laudos
- Perguntas em linguagem natural sobre o histórico do paciente

Nesta primeira versão, apenas a infraestrutura necessária será preparada.

---

# Controle de Usuários

O sistema será baseado em perfis de acesso.

## Administrador

Possui acesso completo ao sistema.

Permissões:

- Gerenciar usuários
- Gerenciar médicos
- Gerenciar pacientes
- Gerenciar consultas
- Gerenciar documentos
- Configurações do sistema

---

## Médico

Permissões:

- Visualizar seus pacientes
- Registrar consultas
- Anexar laudos
- Registrar observações clínicas

---

## Recepcionista

Permissões:

- Cadastrar pacientes
- Agendar consultas
- Confirmar consultas
- Cancelar consultas

Dependendo da configuração, poderá possuir acesso restrito aos documentos médicos.

---

## Paciente (Evolução futura)

Futuramente poderá existir um portal do paciente, permitindo:

- Visualizar consultas
- Baixar laudos autorizados
- Consultar histórico
- Acompanhar agendamentos

---

# Segurança

Por tratar informações médicas, a aplicação seguirá boas práticas de segurança e conformidade com a LGPD.

Entre elas:

- Autenticação utilizando Supabase Auth
- Controle de acesso baseado em perfis (RBAC)
- Row Level Security (RLS)
- Comunicação criptografada via HTTPS
- Registro de auditoria das principais ações
- Validação de arquivos enviados
- Controle de permissões sobre documentos

---

# Arquitetura Tecnológica

## Frontend

- Next.js 15
- React 19
- TypeScript
- Tailwind CSS
- shadcn/ui

## Backend

- Route Handlers do Next.js

## Banco de Dados

- PostgreSQL (Supabase)

## ORM

- Prisma

## Autenticação

- Supabase Auth

## Armazenamento

- Supabase Storage

## Hospedagem

- Vercel

---

# Escalabilidade

A arquitetura será preparada para receber novas funcionalidades sem necessidade de reescrever a aplicação.

Entre as evoluções previstas:

- Integração com WhatsApp
- Integração com Google Calendar
- Integração com Outlook
- OCR de documentos
- Assinatura eletrônica
- Telemedicina
- Prescrição digital
- Busca inteligente utilizando IA
- Painel financeiro
- Faturamento
- Emissão de recibos
- Multiempresa (várias clínicas)
- Integração com prontuários eletrônicos
- Integração com padrões HL7/FHIR

---

# Objetivo Final

O projeto tem como finalidade fornecer uma plataforma moderna, segura, escalável e preparada para o futuro, permitindo que clínicas, consultórios e profissionais da saúde centralizem o gerenciamento de pacientes, consultas e documentos médicos em uma única aplicação.

Desde sua primeira versão, a solução será desenvolvida seguindo boas práticas de arquitetura, segurança, experiência do usuário e escalabilidade, facilitando futuras integrações com serviços de Inteligência Artificial e novas funcionalidades voltadas à gestão clínica.