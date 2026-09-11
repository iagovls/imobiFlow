# ImobiFlow

Plataforma imobiliária completa com CRM, automação de workflows via n8n, integração com WhatsApp (Meta WhatsApp Cloud API), IA via Dify e MCP Server para consultas a imóveis.

---

## Arquitetura

```
ImobiFlow/
├── imobiFlow/                  # Backend Java 17 + Spring Boot 4.1 (CRM Imobiliário)
├── frontImobiFlow/             # Frontend Angular 21 + Tailwind CSS v4 + SSR
├── mcp_imoveis/                # MCP Server Python (FastMCP v3) → Supabase PostgreSQL
├── dify/                       # Sub-repo Dify (plataforma de IA/RAG)
├── docker-compose.yml          # Infra completa: n8n + Postgres + Redis + Nginx
├── nginx.conf                  # Configuração de proxy reverso (desenvolvimento)
└── nginx.conf.prod             # Configuração de produção com SSL (Let's Encrypt)
```

### READMEs por módulo

| Módulo | Documentação detalhada |
|---|---|
| **Frontend (frontImobiFlow)** | [frontImobiFlow/README.md](frontImobiFlow/README.md) — Auth Hook PL/pgSQL, integrações S3, comandos, policies RLS. |
| **Backend (imobiFlow)** | *(Em breve)* |
| **MCP Imóveis (mcp_imoveis)** | [mcp_imoveis/README.md](mcp_imoveis/README.md) |
| **Dify** | [dify/README.md](dify/README.md) (sub-repositório) |

### Serviços (Docker Compose)

| Serviço | Imagem | Porta | Descrição |
|---|---|---|---|
| **nginx** | `nginx:1.25-alpine` | 80 / 443 | Proxy reverso + SSL |
| **postgres** | `postgres:16.4-alpine` | 5432 | Banco de dados principal (n8n) |
| **redis** | `redis:7.2-alpine` | 6379 | Cache e filas (BullMQ) |
| **n8n** | `n8nio/n8n:2.37.9` | 5678 | Automação de workflows |
| **n8n-worker** | `n8nio/n8n:2.37.9` | — | Worker de fila do n8n |
| **mcp_imoveis** | Build local | 8000 | MCP Server de imóveis |
| **cloudflared** | `cloudflare/cloudflared` | — | Tunnel Cloudflare (acesso externo HTTPS) |

> WhatsApp é a **API oficial da Meta (WhatsApp Cloud API)**, consumida diretamente pelos nodes de WhatsApp do n8n via `META_ACCESS_TOKEN` — não há gateway de WhatsApp self-hosted na infra.

---

## Pré-requisitos

- Docker + Docker Compose v2
- Java 17+ (apenas se rodar backend fora do Docker)
- Node.js 22+ (apenas se rodar frontend fora do Docker)
- Python 3.11+ (apenas se rodar MCP fora do Docker)
- Arquivo `.env` na raiz (copie de um existente ou preencha o template abaixo)

---

## Variáveis de Ambiente (`.env`)

Todas as variáveis **obrigatórias** devem estar no `.env`. Valores sem fallback — se faltar, o container sobe com valor vazio e pode quebrar.

## Como rodar

### Infra completa (Docker)

```bash
# 1. Clone o repo e entre na pasta
git clone https://github.com/iagovls/imobiflow.git
cd imobiflow

# 2. Copie/crie o .env com suas credenciais
#    (ver sessão de variáveis acima)

# 3. Suba tudo
docker compose up -d

# 4. Verifique os logs
docker compose logs -f
```

### Backend (Spring Boot) — desenvolvimento local

```bash
cd imobiFlow
./mvnw spring-boot:run      # Linux/Mac
mvnw.cmd spring-boot:run     # Windows
```

Aplicação sobe em `http://localhost:8080` com banco H2 em memória por padrão.

### Frontend (Angular + SSR) — desenvolvimento local

```bash
cd frontImobiFlow
npm install
npm run start
```

Frontend em `http://localhost:4200`.

### MCP Imóveis (Python) — desenvolvimento local

```bash
cd mcp_imoveis
pip install -e .
uvicorn app:app --reload --port 8000
```

MCP Server em `http://localhost:8000` (conecta no Supabase).

---

## Deploy na AWS (EC2)

Os scripts `ec2-user-data.sh` e `user-data.sh` provisionam uma instância EC2 com Docker, clonam este repo e rodam `docker compose up -d`.

Fluxo:
1. Anexe `user-data.sh` no launch da EC2 (Amazon Linux 2 / Ubuntu)
2. SSL via Let's Encrypt (certbot) — certificados montados em `/etc/letsencrypt`
3. Use `nginx.conf.prod` ao invés de `nginx.conf` em produção

---

## Estrutura de comunicação

```
 ┌─────────────────────────────────────────────────────────────┐
 │                        nginx (80/443)                       │
 │  80    /  →  n8n:5678                                       │
 └────────┬────────────────────────────────────────────────────┘
          │
          ▼
 ┌────────────────┐         ┌────────────────────┐
 │  n8n (5678)    │◄────────┤  WhatsApp Cloud API │
 │  + worker      │         │  (Meta, externa)    │
 │  queue (Bull)  │         └────────────────────┘
 └──┬─────────┬───┘
    │         │
    ▼         ▼
 ┌────────┐ ┌───────┐
 │Postgres│ │ Redis  │
 └────────┘ └───────┘
     ▲
     │ Conexão separada (Supabase)
     ▼
 ┌──────────────────────────────────┐
 │    MCP Imóveis (FastMCP :8000)   │
 │    → Dify / LLMs via MCP         │
 └──────────────────────────────────┘

                          Cloudflare Tunnel → acesso HTTPS externo
```

---


## Segurança


- Cloudflare Tunnel é preferencial a portas abertas diretamente na EC2
- PostgreSQL e Redis só são acessíveis pela rede Docker bridge (`app_network`)

---

## Licença

Veja arquivo [LICENSE](./LICENSE).
