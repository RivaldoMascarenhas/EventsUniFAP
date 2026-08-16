# 🎓 UniFAP Sorteios — Sistema Institucional de Premiações & Sorteios (v2)

Plataforma corporativa e institucional desenvolvida sob medida para o gerenciamento, auditoria e execução de sorteios em tempo real durante eventos acadêmicos, conferências e cerimônias do **Centro Universitário Paraíso — UniFAP** ([unifapce.edu.br](https://unifapce.edu.br/)).

---

## 🌟 O que há de Novo na Versão 2 (v2)

1. **Sincronização em Tempo Real (Operador ↔ Telão 4K)**:
   - Canal de tempo real por evento (`event:{eventId}`) via **Server-Sent Events (SSE)** integrado ao Next.js App Router.
   - Sincronização de 4 estados principais: `IDLE`, `SHOWING_PRIZE`, `DRAWING`, `RESULT`.
   - Eventos emitidos: `prize:show`, `draw:start`, `draw:result`, `draw:cancel`.
   - Reconexão resiliente: ao reconectar ou recarregar a aba da apresentação (projetor desligado, queda de rede), o telão solicita e recebe o snapshot do estado atual imediatamente via `state:sync`.
2. **Idempotência no Sorteio**:
   - O endpoint `POST /api/events/[id]/draw` consome `Idempotency-Key` no header.
   - Retries de rede ou múltiplos cliques no botão "SORTEAR" retornam o mesmo resultado já gravado sem avançar prêmios indevidamente.
3. **Conformidade LGPD & Proteção de Dados**:
   - Mascaramento automático de CPF (`084.***.***-78`) em todas as telas públicas, telão e relatórios.
   - Campo de controle de retenção (`Participant.anonymizedAt`) no schema Prisma.
   - Proteção anti-bot com campo *honeypot* no formulário público de auto-inscrição via QR Code.
4. **Token de Apresentação Leve (`presentationToken`)**:
   - Acesso ao Telão via `/presentation/[eventId]?token=...`, permitindo que notebooks de auditório conectados a projetores acessem a tela sem exigir sessão administrativa completa do NextAuth.
   - Endpoint administrativo para geração e revogação do token: `POST /api/events/[id]/presentation-token`.
5. **Componente Centralizado `<BrandLogo>` & Paleta de Cores**:
   - `<BrandLogo variant="default" | "white" | "square" />` com fallback gracioso para wordmark temporário.
   - Documentação de tokens de cor em `src/lib/theme/unifap-colors.ts`.

---

## 🛠️ Stack Tecnológica

| Camada | Tecnologia |
|---|---|
| **Framework Web** | Next.js 15 (App Router) & React 19 |
| **Linguagem** | TypeScript (Strict Mode) |
| **Estilização** | Tailwind CSS (Tokens Oficiais UniFAP) |
| **Tempo Real** | Server-Sent Events (SSE) & Realtime Broadcast Service |
| **Animações** | Framer Motion & canvas-confetti |
| **Ícones** | Lucide React |
| **Banco de Dados** | PostgreSQL 16 & Prisma ORM |
| **Autenticação** | NextAuth.js (Credentials Provider + bcryptjs / Argon2) |
| **Validação** | Zod & React Hook Form |
| **Planilhas & Dados** | SheetJS (xlsx) & PapaParse |
| **QR Code** | QRCode Generator |
| **Testes** | Vitest Test Runner |
| **Containerização** | Docker & Docker Compose |

---

## 🚀 Como Executar o Projeto

### 1. Instalação das Dependências

```bash
npm install
```

---

### 2. Configuração do Ambiente (.env)

Copie o arquivo `.env.example` para `.env`:

```bash
cp .env.example .env
```

Variáveis configuradas:
```env
DATABASE_URL="postgresql://postgres:postgrespassword2026@localhost:5432/unifap_sorteios?schema=public"
AUTH_SECRET="unifap-sorteios-super-secret-key-change-in-production-2026"
NEXTAUTH_SECRET="unifap-sorteios-super-secret-key-change-in-production-2026"
NEXTAUTH_URL="http://localhost:3000"
NEXT_PUBLIC_APP_URL="http://localhost:3000"
STORAGE_PROVIDER="local"
UPLOAD_DIR="./public/uploads"
```

---

### 3. Banco de Dados & Carga Inicial (Seed)

Inicie o PostgreSQL e execute as migrações:

```bash
docker compose up -d postgres
npm run prisma:generate
npm run prisma:push
npm run prisma:seed
```

#### 🔑 Credenciais de Desenvolvimento (Seed):
- **Administrador**: `admin@unifap.local` / `Admin123!`
- **Operador**: `operador@unifap.local` / `Operador123!`
- **Apresentador**: `apresentador@unifap.local` / `Presenter123!`

---

### 4. Executando em Desenvolvimento

```bash
npm run dev
```

Acesse a aplicação em: **[http://localhost:3000](http://localhost:3000)**

- **Login Administrativo**: `http://localhost:3000/login`
- **Dashboard**: `http://localhost:3000/admin/dashboard`
- **Console do Operador**: `http://localhost:3000/admin/events/<ID_DO_EVENTO>/draw`
- **Telão 4K Sincronizado**: `http://localhost:3000/presentation/<ID_DO_EVENTO>`
- **Inscrição Pública (QR Code)**: `http://localhost:3000/public/event/semana-academica-unifap-2026`

---

### 5. Executando Testes Automatizados

```bash
npm run test
```

A suíte Vitest valida:
- Algoritmo de aleatoriedade segura e não-repetição de ganhadores
- Idempotência e integridade transacional
- Sincronização e snapshot de estado em tempo real
- Mascaramento de CPF e conformidade LGPD
- Validações de esquemas Zod e importação de planilhas

---

## 🏛️ Estrutura de Diretórios

```
SorteadorUnifap/
├── prisma/
│   ├── schema.prisma         # Schema PostgreSQL com Enums, UUIDs, Idempotency e Token
│   └── seed.ts               # Script de carga inicial de desenvolvimento
├── public/
│   ├── branding/             # Logos oficiais em SVG (unifap-logo, white, square)
│   ├── sponsors/             # Logos vetoriais dos parceiros (TechParaíso, Livraria, Café)
│   └── uploads/              # Armazenamento de mídias e uploads
├── src/
│   ├── app/
│   │   ├── (auth)/login/     # Tela de login com Suspense e credenciais rápidas
│   │   ├── (dashboard)/      # Gestão (Dashboard, Eventos, Prêmios, Patrocinadores, Auditoria)
│   │   ├── presentation/     # Tela de Apresentação Telão 16:9 / 4K com SSE em tempo real
│   │   ├── public/event/     # Inscrição pública mobile-first com honeypot anti-bot
│   │   └── api/              # REST API (draw idempotente, realtime SSE, presentation-token, etc.)
│   ├── components/
│   │   ├── branding/         # BrandLogo com fallback gracioso
│   │   ├── layout/           # Sidebar institucional, Header, EmptyState
│   │   ├── ui/               # Botões, Cards, Modais, Inputs, Badges, Confetti
│   │   └── providers/        # AuthProvider, ToastProvider
│   ├── lib/
│   │   ├── services/         # lotteryService, realtimeService, importService, exportService, auditService
│   │   ├── sound/            # Sintetizador procedural Web Audio API
│   │   ├── theme/            # unifap-colors.ts documentado
│   │   ├── validations/      # Schemas Zod
│   │   ├── auth.ts           # Configuração NextAuth com RBAC
│   │   └── prisma.ts         # Singleton do Prisma Client
│   └── middleware.ts         # Proteção de rotas RBAC e bypass de token de apresentação
├── tests/                    # Suíte Vitest (lottery, realtime, import, validations)
├── Dockerfile                # Multi-stage build de produção
├── docker-compose.yml        # Orquestração App + Postgres
└── README.md
```

---

**Centro Universitário Paraíso — UniFAP**  
*Desenvolvido com excelência técnica, tempo real e integridade institucional.*
