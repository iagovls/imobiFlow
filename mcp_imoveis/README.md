# MCP Imoveis

Servidor MCP em Python para:

- buscar imoveis no Postgres do Supabase;
- responder perguntas frequentes via FAQ local em JSON;
- rodar via HTTP para integracao remota com clientes MCP;
- subir com `docker compose`.

## Tools Disponiveis

### `buscar_imoveis`

Busca imoveis aplicando regras de expansao e tolerancia:

- imoveis inativos (`active = false`) nunca sao retornados;
- busca por `cidade` e `bairro` ignora acentos e case (unaccent + ILIKE);
- contagens (quartos, suites, banheiros, vagas) usam range de ±2;
- `area_util` usa range de ±50%;
- quando `preco_min` e `preco_max` forem iguais, expande para -50% e +50%.

### `consultar_faq`

Procura as perguntas e respostas mais proximas da pergunta informada usando:

- similaridade textual;
- intersecao de tokens;
- peso por tags.

## Variaveis De Ambiente

Copie `.env.example` para `.env` e preencha:

```env
MCP_SERVER_HOST=0.0.0.0
MCP_SERVER_PORT=8000

SUPABASE_POSTGRES_DSN=
SUPABASE_POSTGRES_HOST=aws-1-sa-east-1.pooler.supabase.com
SUPABASE_POSTGRES_PORT=5432
SUPABASE_POSTGRES_DATABASE=postgres
SUPABASE_POSTGRES_USER=postgres.<project-ref>
SUPABASE_POSTGRES_PASSWORD=<senha>
SUPABASE_POSTGRES_SSLMODE=require
SUPABASE_DEFAULT_SCHEMA=public
SUPABASE_CONNECT_TIMEOUT=10

FAQ_SOURCE_PATH=/app/data/faq.json
```

Se `SUPABASE_POSTGRES_DSN` for preenchida, ela tem prioridade sobre os demais campos de conexao.

## Executar Com Docker Compose

```bash
cd mcp_imoveis
cp .env.example .env
docker compose up --build
```

Endpoint MCP HTTP:

```text
http://localhost:8000/mcp
```

## Executar Localmente

```bash
cd mcp_imoveis
python -m venv .venv
. .venv/Scripts/activate
pip install -e .
python -m mcp_imoveis.server
```

## Exemplo De Uso Da Tool `buscar_imoveis`

Payload conceitual:

```json
{
  "tipo": "apartamento",
  "cidade": "Salvador",
  "bairro": "Barra",
  "finalidade": "venda",
  "preco_min": 800000,
  "preco_max": 950000,
  "quartos": 3,
  "suites": 1,
  "banheiros": 2,
  "vagas_garagem": 2,
  "area_util": 110,
  "mobiliado": true,
  "aceita_pet": true,
  "limite": 20
}
```

## Estrutura

```text
mcp_imoveis/
  data/faq.json
  src/mcp_imoveis/__init__.py
  src/mcp_imoveis/server.py
  .env.example
  .dockerignore
  Dockerfile
  docker-compose.yml
  pyproject.toml
  README.md
```
