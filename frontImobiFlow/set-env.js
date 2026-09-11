require('dotenv').config();
const fs = require('fs');
const path = require('path');

const envDir = path.join(__dirname, 'src', 'environments');
const requiredVars = ['SUPABASE_URL', 'SUPABASE_ANON_KEY', 'SUPABASE_SCHEMA'];
const missing = requiredVars.filter((v) => !process.env[v]);
const hasEnv = !!process.env.SUPABASE_URL || !!process.env.SUPABASE_ANON_KEY;

const content = (prod) => `export const environment = {
  production: ${prod},
  supabaseUrl: '${process.env.SUPABASE_URL ?? ''}',
  supabaseAnonKey: '${process.env.SUPABASE_ANON_KEY ?? ''}',
  supabaseSchema: '${process.env.SUPABASE_SCHEMA ?? 'public'}',
  s3ApiBaseUrl: '${process.env.S3_API_BASE_URL ?? ''}',
  s3ApiRegion: '${process.env.S3_API_REGION ?? 'us-east-1'}',
  S3_BUCKET: '${process.env.S3_BUCKET ?? ''}',
  AWS_ACCESS_KEY_ID: '${process.env.AWS_ACCESS_KEY_ID ?? ''}',
  AWS_SECRET_ACCESS_KEY: '${process.env.AWS_SECRET_ACCESS_KEY ?? ''}',
  googleCalendarClientId: '${process.env.GOOGLE_CALENDAR_CLIENT_ID ?? ''}',
};
`;

if (!fs.existsSync(envDir)) fs.mkdirSync(envDir, { recursive: true });

fs.writeFileSync(path.join(envDir, 'environment.ts'), content(false));
fs.writeFileSync(path.join(envDir, 'environment.prod.ts'), content(true));

if (hasEnv) {
  console.log(`[set-env] Arquivos environment gerados a partir do .env (${missing.length ? 'missing: ' + missing.join(', ') : 'todas vars presentes'})`);
} else {
  console.log('[set-env] Nenhum .env carregado. Arquivos environment gerados com valores vazios.');
  console.log(`[set-env] Copie .env.example (da raiz do repo) para .env e preencha: ${requiredVars.join(', ')}`);
  requiredVars.forEach((v) => {
    console.log(`           ${v}=...`);
  });
}

