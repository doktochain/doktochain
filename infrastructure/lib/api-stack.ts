import * as cdk from 'aws-cdk-lib';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as lambdaNodejs from 'aws-cdk-lib/aws-lambda-nodejs';
import * as apigateway from 'aws-cdk-lib/aws-apigateway';
import * as apigatewayv2 from 'aws-cdk-lib/aws-apigatewayv2';
import * as apigatewayv2integrations from 'aws-cdk-lib/aws-apigatewayv2-integrations';
import * as apigatewayv2authorizers from 'aws-cdk-lib/aws-apigatewayv2-authorizers';
import * as cognito from 'aws-cdk-lib/aws-cognito';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as secretsmanager from 'aws-cdk-lib/aws-secretsmanager';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as logs from 'aws-cdk-lib/aws-logs';
import { Construct } from 'constructs';
import { EnvironmentConfig } from './config';
import * as path from 'path';

interface ApiStackProps extends cdk.StackProps {
  config: EnvironmentConfig;
  vpc: ec2.Vpc;
  lambdaSecurityGroup: ec2.SecurityGroup;
  databaseSecret: secretsmanager.ISecret;
  rdsProxyEndpoint: string;
  userPool: cognito.UserPool;
  userPoolClient: cognito.UserPoolClient;
  storageBucket: s3.Bucket;
}

export class ApiStack extends cdk.Stack {
  public readonly restApi: apigateway.RestApi;
  public readonly webSocketApi: apigatewayv2.WebSocketApi;
  public readonly lambdaFunctions: lambda.Function[];
  public readonly lambdaNames: string[];

  constructor(scope: Construct, id: string, props: ApiStackProps) {
    super(scope, id, props);

    const {
      config, vpc, lambdaSecurityGroup, databaseSecret,
      rdsProxyEndpoint, userPool, userPoolClient, storageBucket,
    } = props;
    const prefix = `${config.projectName}-${config.environment}`;

    this.lambdaFunctions = [];
    this.lambdaNames = [];

    const dailyApiKeySecret = secretsmanager.Secret.fromSecretNameV2(
      this, 'DailyApiKey', `${prefix}/daily-api-key`
    );
    const stripeSecretKeySecret = secretsmanager.Secret.fromSecretNameV2(
      this, 'StripeSecretKey', `${prefix}/stripe-secret-key`
    );
    const stripeWebhookSecret = secretsmanager.Secret.fromSecretNameV2(
      this, 'StripeWebhookSecret', `${prefix}/stripe-webhook-secret`
    );

    const sharedEnv: Record<string, string> = {
      NODE_OPTIONS: '--enable-source-maps',
      DB_HOST: rdsProxyEndpoint,
      DB_NAME: config.dbName,
      DB_SECRET_ARN: databaseSecret.secretArn,
      COGNITO_USER_POOL_ID: userPool.userPoolId,
      COGNITO_CLIENT_ID: userPoolClient.userPoolClientId,
      STORAGE_BUCKET: storageBucket.bucketName,
      ENVIRONMENT: config.environment,
      AWS_NODEJS_CONNECTION_REUSE_ENABLED: '1',
    };

    const bundlingOptions: lambdaNodejs.BundlingOptions = {
      minify: true,
      sourceMap: true,
      target: 'node22',
      format: lambdaNodejs.OutputFormat.CJS,
      externalModules: ['@aws-sdk/*'],
    };

    const createLambda = (
      name: string,
      handlerDir: string,
      extraEnv?: Record<string, string>,
      extraTimeout?: cdk.Duration,
    ): lambdaNodejs.NodejsFunction => {
      const logGroup = new logs.LogGroup(this, `${name}LogGroup`, {
        logGroupName: `/aws/lambda/${prefix}-${name}`,
        retention: logs.RetentionDays.ONE_MONTH,
        removalPolicy: cdk.RemovalPolicy.DESTROY,
      });

      const fn = new lambdaNodejs.NodejsFunction(this, `${name}Function`, {
        functionName: `${prefix}-${name}`,
        runtime: lambda.Runtime.NODEJS_22_X,
        handler: 'handler',
        entry: path.join(__dirname, `../lambda/handlers/${handlerDir}/index.ts`),
        bundling: bundlingOptions,
        vpc,
        vpcSubnets: { subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS },
        securityGroups: [lambdaSecurityGroup],
        environment: { ...sharedEnv, ...extraEnv },
        timeout: extraTimeout || cdk.Duration.seconds(30),
        memorySize: 512,
        logGroup,
        tracing: lambda.Tracing.ACTIVE,
      });

      databaseSecret.grantRead(fn);
      this.lambdaFunctions.push(fn);
      this.lambdaNames.push(name);
      return fn;
    };

    const authFn = createLambda('auth', 'auth');
    authFn.addToRolePolicy(new iam.PolicyStatement({
      actions: [
        'cognito-idp:SignUp',
        'cognito-idp:InitiateAuth',
        'cognito-idp:GlobalSignOut',
        'cognito-idp:ForgotPassword',
        'cognito-idp:ConfirmForgotPassword',
        'cognito-idp:AdminAddUserToGroup',
      ],
      resources: [userPool.userPoolArn],
    }));

    const patientsFn = createLambda('patients', 'patients');
    const providersFn = createLambda('providers', 'providers');
    const appointmentsFn = createLambda('appointments', 'appointments');
    const prescriptionsFn = createLambda('prescriptions', 'prescriptions');
    const pharmacyFn = createLambda('pharmacy', 'pharmacy');
    const healthRecordsFn = createLambda('health-records', 'health-records');
    const messagingFn = createLambda('messaging', 'messaging');
    const adminFn = createLambda('admin', 'admin');
    const clinicFn = createLambda('clinic', 'clinic');
    const auditFn = createLambda('audit', 'audit');

    const billingFn = createLambda('billing', 'billing', {
      STRIPE_SECRET_KEY_ARN: stripeSecretKeySecret.secretArn,
    });
    stripeSecretKeySecret.grantRead(billingFn);

    const telemedicineFn = createLambda('telemedicine', 'telemedicine', {
      DAILY_API_KEY_ARN: dailyApiKeySecret.secretArn,
    });
    dailyApiKeySecret.grantRead(telemedicineFn);

    const storageFn = createLambda('storage', 'storage');
    storageBucket.grantReadWrite(storageFn);

    const dataFn = createLambda('data', 'data');
    const rpcFn = createLambda('rpc', 'rpc');

    const stripeWebhookFn = createLambda('stripe-webhook', 'stripe-webhook', {
      STRIPE_SECRET_KEY_ARN: stripeSecretKeySecret.secretArn,
      STRIPE_WEBHOOK_SECRET_ARN: stripeWebhookSecret.secretArn,
    }, cdk.Duration.seconds(60));
    stripeSecretKeySecret.grantRead(stripeWebhookFn);
    stripeWebhookSecret.grantRead(stripeWebhookFn);

    this.restApi = new apigateway.RestApi(this, 'RestApi', {
      restApiName: `${prefix}-api`,
      description: 'DoktoChain REST API',
      deployOptions: {
        stageName: config.environment === 'production' ? 'v1' : 'staging',
        throttlingRateLimit: 1000,
        throttlingBurstLimit: 500,
        loggingLevel: apigateway.MethodLoggingLevel.INFO,
        metricsEnabled: true,
      },
      defaultCorsPreflightOptions: {
        allowOrigins: config.environment === 'production'
          ? ['https://doktochain.ca', 'https://www.doktochain.ca']
          : ['https://staging.doktochain.ca', 'http://localhost:5173'],
        allowMethods: apigateway.Cors.ALL_METHODS,
        allowHeaders: [
          'Content-Type', 'Authorization', 'X-Amz-Date',
          'X-Api-Key', 'X-Amz-Security-Token',
        ],
        allowCredentials: true,
      },
    });

    const authorizer = new apigateway.CognitoUserPoolsAuthorizer(this, 'CognitoAuth', {
      cognitoUserPools: [userPool],
      authorizerName: `${prefix}-cognito-authorizer`,
    });

    const authOpts: apigateway.MethodOptions = {
      authorizer,
      authorizationType: apigateway.AuthorizationType.COGNITO,
    };

    const addResource = (
      basePath: string,
      fn: lambda.Function,
      options: apigateway.MethodOptions,
    ) => {
      const resource = this.restApi.root.addResource(basePath);
      resource.addProxy({
        defaultIntegration: new apigateway.LambdaIntegration(fn),
        defaultMethodOptions: options,
        anyMethod: true,
      });
      resource.addMethod('ANY', new apigateway.LambdaIntegration(fn), options);
    };

    addResource('auth', authFn, {});
    addResource('public', providersFn, {});
    addResource('patients', patientsFn, authOpts);
    addResource('providers', providersFn, authOpts);
    addResource('appointments', appointmentsFn, authOpts);
    addResource('prescriptions', prescriptionsFn, authOpts);
    addResource('pharmacy', pharmacyFn, authOpts);
    addResource('health-records', healthRecordsFn, authOpts);
    addResource('messaging', messagingFn, authOpts);
    addResource('admin', adminFn, authOpts);
    addResource('clinic', clinicFn, authOpts);
    addResource('audit', auditFn, authOpts);
    addResource('billing', billingFn, authOpts);
    addResource('telemedicine', telemedicineFn, authOpts);
    addResource('storage', storageFn, authOpts);
    addResource('data', dataFn, authOpts);
    addResource('public-data', dataFn, {});
    addResource('rpc', rpcFn, authOpts);

    const webhookResource = this.restApi.root.addResource('webhooks');
    const stripeWebhookResource = webhookResource.addResource('stripe');
    stripeWebhookResource.addMethod('POST', new apigateway.LambdaIntegration(stripeWebhookFn));

    const wsFn = createLambda('websocket', 'websocket');

    const wsAuthorizerLogGroup = new logs.LogGroup(this, 'WsAuthorizerLogGroup', {
      logGroupName: `/aws/lambda/${prefix}-ws-authorizer`,
      retention: logs.RetentionDays.ONE_MONTH,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });

    const wsAuthorizerFn = new lambdaNodejs.NodejsFunction(this, 'WsAuthorizerFunction', {
      functionName: `${prefix}-ws-authorizer`,
      runtime: lambda.Runtime.NODEJS_22_X,
      handler: 'handler',
      entry: path.join(__dirname, '../lambda/handlers/ws-authorizer/index.ts'),
      bundling: { ...bundlingOptions, externalModules: ['@aws-sdk/*'] },
      environment: {
        COGNITO_USER_POOL_ID: userPool.userPoolId,
        COGNITO_CLIENT_ID: userPoolClient.userPoolClientId,
      },
      timeout: cdk.Duration.seconds(10),
      memorySize: 256,
      logGroup: wsAuthorizerLogGroup,
    });

    const wsAuthorizer = new apigatewayv2authorizers.WebSocketLambdaAuthorizer(
      'WsAuthorizer', wsAuthorizerFn, {
        identitySource: ['route.request.querystring.token'],
      }
    );

    this.webSocketApi = new apigatewayv2.WebSocketApi(this, 'WebSocketApi', {
      apiName: `${prefix}-websocket`,
      connectRouteOptions: {
        authorizer: wsAuthorizer,
        integration: new apigatewayv2integrations.WebSocketLambdaIntegration(
          'ConnectIntegration', wsFn
        ),
      },
      disconnectRouteOptions: {
        integration: new apigatewayv2integrations.WebSocketLambdaIntegration(
          'DisconnectIntegration', wsFn
        ),
      },
      defaultRouteOptions: {
        integration: new apigatewayv2integrations.WebSocketLambdaIntegration(
          'DefaultIntegration', wsFn
        ),
      },
    });

    const wsStage = new apigatewayv2.WebSocketStage(this, 'WebSocketStage', {
      webSocketApi: this.webSocketApi,
      stageName: config.environment === 'production' ? 'v1' : 'staging',
      autoDeploy: true,
    });

    wsFn.addEnvironment('WEBSOCKET_API_ENDPOINT', wsStage.callbackUrl);
    messagingFn.addEnvironment('WEBSOCKET_API_ENDPOINT', wsStage.callbackUrl);

    const wsManagePolicy = new iam.PolicyStatement({
      effect: iam.Effect.ALLOW,
      actions: ['execute-api:ManageConnections'],
      resources: [
        `arn:aws:execute-api:${this.region}:${this.account}:${this.webSocketApi.apiId}/*`,
      ],
    });
    wsFn.addToRolePolicy(wsManagePolicy);
    messagingFn.addToRolePolicy(wsManagePolicy);

    new cdk.CfnOutput(this, 'ApiGatewayUrl', {
      value: this.restApi.url,
    });
    new cdk.CfnOutput(this, 'WebSocketUrl', {
      value: wsStage.url,
    });
  }
}
