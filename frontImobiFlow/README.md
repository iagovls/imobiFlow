# FrontImobiFlow (ImobiFlow UI)

Frontend Angular 21 + Tailwind CSS v4 + SSR + Vitest da plataforma ImobiFlow (CRM Imobiliário com Supabase Auth).

- **Estrutura**: standalone components, Signals para estado reativo
- **Autenticação**: Supabase Auth (email/senha) + **Custom Access Token Hook PL/pgSQL** para isolar apps que compartilham o mesmo projeto Supabase
- **Media Storage**: fotos de imóveis via Edge Functions do Supabase integradas ao bucket S3 `fotos-imoveis-pierre` (AWS us-east-1)
- **Banco**: schema `pierre` no Supabase PostgreSQL (sa-east-1 / São Paulo)
- **Serviços Angular**: [auth.service.ts](src/app/services/auth.service.ts), [menu-service.ts](src/app/services/menu-service.ts), [s3.service.ts](src/app/services/s3.service.ts)
- **Injeção de envs**: script `set-env.js` lê o `.env` da raiz e gera `src/environments/environment*.ts`

## 1. Desenvolvimento local

```bash
cd frontImobiFlow
npm install
npm run start          # sobe em http://localhost:4200 (com SSR)
npm run test           # testes Vitest
npm run build          # build de produção (SSR + browser bundles)
```

> ⚠️ Para rodar local o `.env` na raiz do repositório precisa ter `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SCHEMA`, `S3_API_BASE_URL`, `S3_API_REGION`, `AWS_ACCESS_KEY_ID` e `AWS_SECRET_ACCESS_KEY`. O `npm run start` executa o `set-env.js` para criar automaticamento o `src/environments/environment.ts` (prestart).

---




### 2.1 Campos importantes

| Item | Valor |
|---|---|
| Tipo de Hook | Custom Access Token Hook (PL/pgSQL) |
| Evento | Sign-in (acionado antes da emissão do JWT) |
| Http code de erro | 401 (não 403) |
| Comparação segura NULL | `IS DISTINCT FROM` |
| Fonte de verdade do `app_id` | Coluna `raw_app_meta_data` de `auth.users` |



### 2.6 Fluxo completo de autenticação

```
Front chama signInWithPassword(email, senha)
        ↓
Supabase Auth valida credenciais
        ↓
[ANTES de emitir JWT] roda Custom Access Token Hook PL/pgSQL
        ↓
Hook lê raw_app_meta_data.app_id do usuário da tabela auth.users
   ├─ ❌ app_id IS DISTINCT FROM 'imobiflow'
   │       → retorna {error.http_code:401}
   │       → Supabase NÃO emite token
   │       → SDK retorna erro "Invalid app_id"
   └─ ✅ app_id = 'imobiflow'
           → retorna meta com claim "app_id" injetado
           → Supabase emite JWT com o claim custom
        ↓
onAuthStateChange dispara (auth.service.ts)
        ↓
AuthService só confere se há profile no schema pierre
```

---

## 2.7 Código do imóvel (`imv_codigo`)

O `imv_codigo` (`IMV-<n>` com 3+ dígitos) é a chave de negócio do imóvel — usada no
`updateImovel`/`deleteImovel` e como prefixo das pastas no S3. O usuário **não digita** o
código: `PropertiesService.getNextCodigo()` calcula `max(n) + 1` sobre os códigos existentes
e `createImovel()` o atribui no insert, com retry se houver colisão (`23505`). No formulário
o campo "Código" é somente leitura em qualquer modo.

> ⚠️ O schema `pierre.imoveis` precisa ter índice/constraint **`UNIQUE (imv_codigo)`** — é o
> que garante unicidade sob concorrência e ativa o retry do `createImovel`. Deduplicar linhas
> existentes antes de criar a constraint.

---

## 3. Serviços de mídia (imagens dos imóveis via S3)

Três Edge Functions do Supabase gerenciam fotos no bucket AWS S3 `fotos-imoveis-pierre` (us-east-1). Os endpoints são chamados por [s3.service.ts](src/app/services/s3.service.ts):

| Edge Function | Método | Descrição |
|---|---|---|
| `get-s3-property-images` | GET | Lista imagens de um imóvel no S3 |
| `get-s3-presigned-upload-url` | POST | Gera presigned URL para upload de imagem |
| `delete-s3-property-image` | POST | Apaga imagem do S3 |

> ⚠️ Hard constraints (validadas em deploy anterior):
> - Edge Functions Deno **NÃO** podem enviar body em HTTP 204 (`TypeError: Response with null body status cannot have body`)
> - Região do S3 precisa ser fixada como `us-east-1` no código (evita redirecionamento 307)
> - Credenciais AWS ficam em **Project Secrets globais** no Supabase (não só por função)
> - CORS do bucket S3 precisa aceitar `PUT` de presigned URLs vindas do navegador

---

## 4. Comandos rápidos

```bash
# Desenvolvimento com SSR
npm run start

# Build de produção (gera dist/ com bundles browser + server + prerender)
npm run build

# Testes unitários (Vitest)
npm run test
```

## 5. Recursos adicionais

- [Angular CLI Overview and Command Reference](https://angular.dev/tools/cli)
- [Tailwind CSS v4](https://tailwindcss.com)
- [Supabase Auth — Custom Access Token Hooks](https://supabase.com/docs/guides/auth/hooks/custom-claims)
