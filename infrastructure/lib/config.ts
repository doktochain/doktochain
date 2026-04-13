export interface EnvironmentConfig {
  account: string;
  region: string;
  projectName: string;
  environment: 'staging' | 'production';
  domainName: string;
  certificateArn?: string;
  hostedZoneId?: string;
  dbName: string;
  dbUsername: string;
  minAcu: number;
  maxAcu: number;
  alertEmail?: string;
}

export const getConfig = (env: string): EnvironmentConfig => {
  const configs: Record<string, EnvironmentConfig> = {
    staging: {
      account: process.env.CDK_DEFAULT_ACCOUNT || process.env.AWS_ACCOUNT_ID || '',
      region: 'ca-central-1',
      projectName: 'doktochain',
      environment: 'staging',
      domainName: 'staging.doktochain.ca',
      certificateArn: process.env.ACM_CERTIFICATE_ARN,
      hostedZoneId: process.env.HOSTED_ZONE_ID,
      dbName: 'doktochain_staging',
      dbUsername: 'doktochain',
      minAcu: 0.5,
      maxAcu: 4,
      alertEmail: process.env.ALERT_EMAIL,
    },
    production: {
      account: process.env.CDK_DEFAULT_ACCOUNT || process.env.AWS_ACCOUNT_ID || '',
      region: 'ca-central-1',
      projectName: 'doktochain',
      environment: 'production',
      domainName: 'doktochain.ca',
      certificateArn: process.env.ACM_CERTIFICATE_ARN,
      hostedZoneId: process.env.HOSTED_ZONE_ID,
      dbName: 'doktochain',
      dbUsername: 'doktochain',
      minAcu: 0.5,
      maxAcu: 16,
      alertEmail: process.env.ALERT_EMAIL,
    },
  };

  const config = configs[env];
  if (!config) {
    throw new Error(
      `Unknown environment: "${env}". Valid environments: ${Object.keys(configs).join(', ')}`
    );
  }

  if (!config.account) {
    throw new Error(
      'AWS account ID is required. Set CDK_DEFAULT_ACCOUNT or AWS_ACCOUNT_ID environment variable.'
    );
  }

  return config;
};
