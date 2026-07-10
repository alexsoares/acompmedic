# AcompMedic — Visão de Produto

## Visão geral

O **Gerenciador de Laudos Médicos (AcompMedic)** é uma plataforma web para gerenciamento de pacientes, médicos, consultas e documentos médicos. O objetivo é centralizar as informações clínicas de uma clínica em um único sistema, permitindo o armazenamento seguro de laudos, organização da agenda de consultas e manutenção do histórico completo dos pacientes — com arquitetura preparada para futuras integrações com Inteligência Artificial.

## Objetivos do sistema

- Gerenciamento de pacientes e médicos
- Agendamento de consultas
- Upload e organização de laudos médicos
- Histórico clínico completo por paciente
- Pesquisa rápida de informações
- Dashboard gerencial com indicadores da clínica
- Controle de acesso por perfil (RBAC)
- Armazenamento seguro de documentos

## Dashboard

Ao acessar o sistema, o usuário visualiza um painel com indicadores como:

- Consultas do dia e próximas consultas
- Quantidade de pacientes e médicos cadastrados
- Quantidade de laudos armazenados
- Últimos documentos enviados
- Agenda da semana
- Indicadores gerais da clínica

## Cadastro de Pacientes

Cada paciente possui um cadastro completo, incluindo:

- Nome, CPF (opcional), data de nascimento, sexo
- Telefone, WhatsApp, e-mail, endereço
- Convênio e número da carteirinha
- Contato de emergência
- Observações

Cada paciente possui também um histórico completo com consultas, laudos e demais registros relacionados.

## Cadastro de Médicos

O cadastro de médicos armazena:

- Nome, CRM e UF do CRM
- Especialidade
- Telefone e e-mail
- Dias de atendimento e horários disponíveis

## Agenda de Consultas

Visualizações disponíveis: diária, semanal e mensal.

Cada consulta possui: paciente, médico, data, horário, duração, tipo de consulta, sala e observações.

Status possíveis (identificados visualmente por cores):
- Agendada
- Confirmada
- Em atendimento
- Finalizada
- Cancelada
- Paciente ausente

## Upload de Laudos

Formatos suportados: **PDF** e **TXT**. Cada laudo fica vinculado a um paciente, com:

- Título, paciente, médico responsável, especialidade
- Data e observações
- Arquivo anexado

Ações disponíveis: visualizar, baixar, substituir e excluir. Todos os documentos são armazenados de forma segura em bucket privado no **Supabase Storage**.

## Histórico Clínico

Cada paciente possui uma linha do tempo organizada cronologicamente, contendo consultas realizadas, laudos médicos, exames e observações clínicas.

## Pesquisa

Busca por nome do paciente, médico, especialidade, data, tipo de documento e, quando disponível, palavras presentes no laudo.

## Controle de acesso por perfil

### Administrador
Acesso completo: gerencia usuários, médicos, pacientes, consultas, documentos e configurações do sistema.

### Médico
Visualiza apenas os pacientes atribuídos a ele, registra consultas, anexa laudos e registra observações clínicas. A visualização de pacientes segue um fluxo de **um paciente por vez** (lista → seleção → detalhe), evitando exposição simultânea de dados clínicos de múltiplos pacientes na mesma tela.

### Paciente
Visualiza os próprios dados: consultas, laudos autorizados e histórico. Não cria nem edita consultas ou laudos diretamente — essas ações permanecem sob responsabilidade de médicos e administradores.

> Um perfil de **Recepcionista** (cadastro de pacientes, agendamento e confirmação/cancelamento de consultas, com acesso restrito a documentos médicos) está no roadmap, mas ainda não implementado na versão atual.

## Segurança

Por tratar informações médicas, a aplicação segue boas práticas de segurança e conformidade com a LGPD:

- Autenticação via Supabase Auth
- Controle de acesso baseado em perfis (RBAC), reforçado por Row Level Security (RLS) no banco
- Comunicação criptografada via HTTPS
- Registro de auditoria das principais ações
- Validação de arquivos enviados (tipo e tamanho)
- Controle de permissões sobre documentos

## Internacionalização

A interface está disponível em **português (pt-BR)** e **inglês (en-US)**, com seletor de idioma acessível tanto na tela de login quanto no dashboard. A preferência de idioma é vinculada ao perfil do usuário, mantendo-se consistente entre dispositivos.

## Inteligência Artificial (preparação)

A arquitetura está preparada para futuras integrações com modelos de IA, através do contrato plugável `MedicalReportAIService`. Funcionalidades planejadas:

- Leitura automática de PDFs e OCR para documentos digitalizados
- Extração de texto, identificação de CID, medicamentos e doenças
- Geração automática de resumos
- Busca inteligente em laudos e perguntas em linguagem natural sobre o histórico do paciente

Nesta fase, apenas a infraestrutura (contrato de interface) está preparada — a implementação em si ainda não existe.

## Escalabilidade — evoluções previstas

- Portal do paciente mais completo (autoagendamento, com aprovação)
- Integração com WhatsApp, Google Calendar e Outlook
- OCR de documentos e assinatura eletrônica
- Telemedicina e prescrição digital
- Busca inteligente utilizando IA
- Painel financeiro, faturamento e emissão de recibos
- Suporte a multiempresa (várias clínicas)
- Integração com prontuários eletrônicos e padrões HL7/FHIR

## Objetivo final

Fornecer uma plataforma moderna, segura, escalável e preparada para o futuro, permitindo que clínicas, consultórios e profissionais da saúde centralizem o gerenciamento de pacientes, consultas e documentos médicos em uma única aplicação — seguindo boas práticas de arquitetura, segurança e experiência do usuário desde a primeira versão.