# 🚀 Guia de Deploy em Produção: Vercel + Supabase

Este guia detalha o passo a passo para colocar o **UniFAP Sorteios** em produção utilizando o **Supabase** (Banco de Dados PostgreSQL + Storage de Arquivos) e a **Vercel** (Hospedagem Serverless Next.js 15).

---

## 📋 Pré-requisitos
1. Conta criada no [Supabase](https://supabase.com) (Plano Gratuito ou Pro).
2. Conta criada na [Vercel](https://vercel.com).
3. Repositório do projeto hospedado no GitHub ou GitLab.

---

## 🗄️ PARTE 1: Configuração no Supabase

### 1. Criar o Projeto
1. Acesse o [Supabase Dashboard](https://app.supabase.com) e clique em **New Project**.
2. Escolha um nome (ex: `unifap-sorteios`), defina uma senha forte para o banco de dados (guarde-a!) e selecione a região mais próxima (ex: `São Paulo - sa-east-1`).
3. Aguarde cerca de 1 a 2 minutos até o banco inicializar.

### 2. Obter as Chaves e URLs de Conexão
1. No menu lateral esquerdo, vá em **Project Settings** (ícone de engrenagem) > **Database**:
   - **Connection string** > Selecione a aba **URI** > Modo **Transaction** (porta `6543`):
     ```text
     postgresql://postgres.[PROJECT-REF]:[SUA-SENHA]@aws-0-[REGION].pooler.supabase.com:6543/postgres?pgbouncer=true
     ```
     👉 Este será o seu `DATABASE_URL`.
   - Selecione a aba **URI** > Modo **Session** ou **Direct connection** (porta `5432`):
     ```text
     postgresql://postgres.[PROJECT-REF]:[SUA-SENHA]@aws-0-[REGION].pooler.supabase.com:5432/postgres
     ```
     👉 Este será o seu `DIRECT_URL` (necessário para o Prisma rodar migrações na Vercel).

2. No menu lateral, vá em **Project Settings** > **API**:
   - **Project URL**: `https://[PROJECT-REF].supabase.co` (seu `NEXT_PUBLIC_SUPABASE_URL`)
   - **Project API keys** > `anon` `public`: (seu `NEXT_PUBLIC_SUPABASE_ANON_KEY`)
   - **Project API keys** > `service_role` `secret`: (seu `SUPABASE_SERVICE_ROLE_KEY`)

### 3. Criar o Bucket de Storage para Imagens (Logos e Patrocinadores)
1. No menu lateral do Supabase, clique em **Storage**.
2. Clique em **New bucket**:
   - Nome do Bucket: `sorteios`
   - Marque a opção: **Public bucket** (para que as imagens de logos e patrocinadores sejam acessíveis publicamente).
3. Clique em **Save**.

### 4. Executar o Schema e o Seed Inicial no Supabase
No terminal do seu computador (localmente), aponte temporariamente o `.env` para o banco do Supabase ou passe via comando:

```bash
# 1. Aplicar o schema do banco de dados no Supabase:
npx prisma db push

# 2. Executar o seed inicial (cria usuários, patrocinadores e evento exemplo):
npx tsx prisma/seed.ts
```

> **Credenciais criadas pelo seed:**
> - **Admin:** `admin@unifap.local` / `Admin123!`
> - **Operador:** `operador@unifap.local` / `Operador123!`
> - **Apresentador:** `apresentador@unifap.local` / `Presenter123!`
> *(Altere as senhas no painel de Usuários após o primeiro login).*

---

## ▲ PARTE 2: Deploy na Vercel

### 1. Importar o Projeto
1. Acesse o [Vercel Dashboard](https://vercel.com/dashboard) e clique em **Add New...** > **Project**.
2. Selecione o repositório GitHub do projeto **SorteadorUnifap**.
3. Em **Framework Preset**, a Vercel detectará automaticamente **Next.js**.

### 2. Configurar as Variáveis de Ambiente na Vercel
Na seção **Environment Variables**, adicione as seguintes chaves:

| Variável | Valor Exemplo / Instrução |
| :--- | :--- |
| `DATABASE_URL` | `postgresql://postgres.[REF]:[SENHA]@aws-0-[REGION].pooler.supabase.com:6543/postgres?pgbouncer=true` |
| `DIRECT_URL` | `postgresql://postgres.[REF]:[SENHA]@aws-0-[REGION].pooler.supabase.com:5432/postgres` |
| `NEXTAUTH_SECRET` | Gere com `openssl rand -base64 32` |
| `AUTH_SECRET` | Mesmo valor de `NEXTAUTH_SECRET` |
| `NEXTAUTH_URL` | `https://seu-projeto.vercel.app` *(ou seu domínio customizado)* |
| `NEXT_PUBLIC_APP_URL` | `https://seu-projeto.vercel.app` *(ou seu domínio customizado)* |
| `NEXT_PUBLIC_SUPABASE_URL` | `https://[PROJECT-REF].supabase.co` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | `eyJhbGciOi...` (chave pública do Supabase) |
| `SUPABASE_SERVICE_ROLE_KEY` | `eyJhbGciOi...` (chave privada service_role do Supabase) |
| `SUPABASE_STORAGE_BUCKET` | `sorteios` |
| `STORAGE_PROVIDER` | `supabase` |

### 3. Realizar o Deploy
1. Clique no botão **Deploy**.
2. A Vercel executará `prisma generate && next build`.
3. Em menos de 2 minutos seu projeto estará online com URL global SSL/HTTPS!

---

## 🔒 Boas Práticas Pós-Deploy

1. **Troca de Senhas Padrão:** Acesse `https://seu-projeto.vercel.app/login`, entre com `admin@unifap.local` e cadastre os administradores reais da sua instituição na aba **Usuários**.
2. **Backups Automáticos:** O Supabase realiza backups diários automatizados do seu banco de dados PostgreSQL.
3. **Domínio Institucional:** No painel da Vercel em **Settings** > **Domains**, você pode adicionar um domínio institucional próprio (ex: `sorteios.unifapce.edu.br`).
