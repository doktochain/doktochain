import * as cdk from 'aws-cdk-lib';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as rds from 'aws-cdk-lib/aws-rds';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as lambdaNodejs from 'aws-cdk-lib/aws-lambda-nodejs';
import * as logs from 'aws-cdk-lib/aws-logs';
import * as secretsmanager from 'aws-cdk-lib/aws-secretsmanager';
import * as path from 'path';
import { Construct } from 'constructs';
import { EnvironmentConfig } from './config';

interface DatabaseStackProps extends cdk.StackProps {
  config: EnvironmentConfig;
  vpc: ec2.Vpc;
  lambdaSecurityGroup: ec2.SecurityGroup;
}

export class DatabaseStack extends cdk.Stack {
  public readonly databaseSecret: secretsmanager.ISecret;
  public readonly rdsProxyEndpoint: string;
  public readonly postConfirmationFunction: lambda.Function;
  public readonly clusterIdentifier: string;

  constructor(scope: Construct, id: string, props: DatabaseStackProps) {
    super(scope, id, props);

    const { config, vpc, lambdaSecurityGroup } = props;
    const prefix = `${config.projectName}-${config.environment}`;

    const databaseSecurityGroup = new ec2.SecurityGroup(this, 'DatabaseSg', {
      vpc,
      securityGroupName: `${prefix}-database-sg`,
      description: 'Security group for Aurora Serverless v2 and RDS Proxy',
      allowAllOutbound: true,
    });

    databaseSecurityGroup.addIngressRule(
      lambdaSecurityGroup,
      ec2.Port.tcp(5432),
      'Allow Lambda to connect to Aurora/RDS Proxy on port 5432'
    );

    databaseSecurityGroup.addIngressRule(
      databaseSecurityGroup,
      ec2.Port.tcp(5432),
      'Allow RDS Proxy to connect to Aurora within the same security group'
    );

    const cluster = new rds.DatabaseCluster(this, 'AuroraCluster', {
      clusterIdentifier: `${prefix}-aurora`,
      engine: rds.DatabaseClusterEngine.auroraPostgres({
        version: rds.AuroraPostgresEngineVersion.VER_15_15,
      }),
      credentials: rds.Credentials.fromGeneratedSecret(config.dbUsername, {
        secretName: `${prefix}/database-credentials`,
      }),
      defaultDatabaseName: config.dbName,
      serverlessV2MinCapacity: config.minAcu,
      serverlessV2MaxCapacity: config.maxAcu,
      writer: rds.ClusterInstance.serverlessV2('writer', {
        publiclyAccessible: false,
      }),
      readers: config.environment === 'production'
        ? [rds.ClusterInstance.serverlessV2('reader', {
            scaleWithWriter: true,
            publiclyAccessible: false,
          })]
        : [],
      vpc,
      vpcSubnets: { subnetType: ec2.SubnetType.PRIVATE_ISOLATED },
      securityGroups: [databaseSecurityGroup],
      storageEncrypted: true,
      backup: {
        retention: cdk.Duration.days(config.environment === 'production' ? 35 : 7),
      },
      deletionProtection: config.environment === 'production',
      removalPolicy: config.environment === 'production'
        ? cdk.RemovalPolicy.RETAIN
        : cdk.RemovalPolicy.SNAPSHOT,
      parameterGroup: new rds.ParameterGroup(this, 'AuroraParams', {
        engine: rds.DatabaseClusterEngine.auroraPostgres({
          version: rds.AuroraPostgresEngineVersion.VER_15_15,
        }),
        parameters: {
          'rds.force_ssl': '1',
          'log_statement': 'mod',
          'log_min_duration_statement': '1000',
        },
      }),
    });

    this.databaseSecret = cluster.secret!;
    this.clusterIdentifier = `${prefix}-aurora`;

    const proxy = cluster.addProxy('RdsProxy', {
      dbProxyName: `${prefix}-rds-proxy`,
      secrets: [this.databaseSecret],
      vpc,
      vpcSubnets: { subnetType: ec2.SubnetType.PRIVATE_ISOLATED },
      securityGroups: [databaseSecurityGroup],
      requireTLS: true,
      idleClientTimeout: cdk.Duration.minutes(30),
    });

    this.rdsProxyEndpoint = proxy.endpoint;

    const postConfirmationLogGroup = new logs.LogGroup(this, 'PostConfirmationLogGroup', {
      logGroupName: `/aws/lambda/${prefix}-post-confirmation`,
      retention: logs.RetentionDays.ONE_MONTH,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });

    this.postConfirmationFunction = new lambdaNodejs.NodejsFunction(this, 'PostConfirmationFunction', {
      functionName: `${prefix}-post-confirmation`,
      runtime: lambda.Runtime.NODEJS_22_X,
      handler: 'handler',
      entry: path.join(__dirname, '../lambda/handlers/post-confirmation/index.ts'),
      bundling: {
        minify: true,
        sourceMap: true,
        target: 'node22',
        format: lambdaNodejs.OutputFormat.CJS,
        externalModules: ['@aws-sdk/*'],
      },
      vpc,
      vpcSubnets: { subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS },
      securityGroups: [lambdaSecurityGroup],
      environment: {
        NODE_OPTIONS: '--enable-source-maps',
        DB_HOST: this.rdsProxyEndpoint,
        DB_NAME: config.dbName,
        DB_SECRET_ARN: this.databaseSecret.secretArn,
      },
      timeout: cdk.Duration.seconds(15),
      memorySize: 256,
      logGroup: postConfirmationLogGroup,
    });
    this.databaseSecret.grantRead(this.postConfirmationFunction);

    new cdk.CfnOutput(this, 'ClusterEndpoint', {
      value: cluster.clusterEndpoint.hostname,
    });
    new cdk.CfnOutput(this, 'RdsProxyEndpoint', {
      value: this.rdsProxyEndpoint,
    });
    new cdk.CfnOutput(this, 'DatabaseSecretArn', {
      value: this.databaseSecret.secretArn,
    });
  }
}
