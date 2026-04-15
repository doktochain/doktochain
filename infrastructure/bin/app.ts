#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { getConfig } from '../lib/config';
import { NetworkStack } from '../lib/network-stack';
import { DatabaseStack } from '../lib/database-stack';
import { AuthStack } from '../lib/auth-stack';
import { StorageStack } from '../lib/storage-stack';
import { ApiStack } from '../lib/api-stack';
import { CdnStack } from '../lib/cdn-stack';
import { MonitoringStack } from '../lib/monitoring-stack';

const app = new cdk.App();

const envName = (app.node.tryGetContext('env') || 'production') as 'staging' | 'production';
const config = getConfig(envName);

const env: cdk.Environment = {
  account: config.account || process.env.CDK_DEFAULT_ACCOUNT,
  region: config.region,
};

const prefix = `${config.projectName}-${config.environment}`;

const networkStack = new NetworkStack(app, `${prefix}-network`, {
  env,
  config,
});

const databaseStack = new DatabaseStack(app, `${prefix}-database`, {
  env,
  config,
  vpc: networkStack.vpc,
  lambdaSecurityGroup: networkStack.lambdaSecurityGroup,
});

const authStack = new AuthStack(app, `${prefix}-auth`, {
  env,
  config,
  postConfirmationLambda: databaseStack.postConfirmationFunction,
});

const storageStack = new StorageStack(app, `${prefix}-storage`, {
  env,
  config,
});

const apiStack = new ApiStack(app, `${prefix}-api`, {
  env,
  config,
  vpc: networkStack.vpc,
  lambdaSecurityGroup: networkStack.lambdaSecurityGroup,
  databaseSecret: databaseStack.databaseSecret,
  rdsProxyEndpoint: databaseStack.rdsProxyEndpoint,
  userPool: authStack.userPool,
  userPoolClient: authStack.userPoolClient,
  storageBucket: storageStack.storageBucket,
});

const cdnStack = new CdnStack(app, `${prefix}-cdn`, {
  env,
  config,
  apiGateway: apiStack.restApi,
  storageBucket: storageStack.storageBucket,
});

new MonitoringStack(app, `${prefix}-monitoring`, {
  env,
  config,
  apiGateway: apiStack.restApi,
  lambdaFunctions: apiStack.lambdaFunctions,
  auroraClusterIdentifier: databaseStack.clusterIdentifier,
});

app.synth();
