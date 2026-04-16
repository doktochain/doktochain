/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL: string;
  readonly VITE_SUPABASE_ANON_KEY: string;
  readonly VITE_API_URL: string;
  readonly VITE_WS_URL: string;
  readonly VITE_COGNITO_USER_POOL_ID: string;
  readonly VITE_COGNITO_CLIENT_ID: string;
  readonly VITE_S3_BUCKET: string;
  readonly VITE_CLOUDFRONT_DOMAIN: string;
  readonly VITE_AWS_REGION: string;
  readonly VITE_SITE_URL?: string;
  readonly VITE_GSC_VERIFICATION?: string;
  readonly VITE_BING_VERIFICATION?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
