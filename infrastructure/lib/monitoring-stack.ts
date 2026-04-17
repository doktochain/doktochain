import * as cdk from 'aws-cdk-lib';
import * as cloudwatch from 'aws-cdk-lib/aws-cloudwatch';
import * as cloudtrail from 'aws-cdk-lib/aws-cloudtrail';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as apigateway from 'aws-cdk-lib/aws-apigateway';
import * as sns from 'aws-cdk-lib/aws-sns';
import * as snsSubscriptions from 'aws-cdk-lib/aws-sns-subscriptions';
import * as cloudwatch_actions from 'aws-cdk-lib/aws-cloudwatch-actions';
import * as logs from 'aws-cdk-lib/aws-logs';
import { Construct } from 'constructs';
import { EnvironmentConfig } from './config';

interface MonitoringStackProps extends cdk.StackProps {
  config: EnvironmentConfig;
  apiGateway: apigateway.RestApi;
  lambdaFunctions: lambda.Function[];
  lambdaNames: string[];
  auroraClusterIdentifier: string;
}

export class MonitoringStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props: MonitoringStackProps) {
    super(scope, id, props);

    const { config, apiGateway, lambdaFunctions, lambdaNames, auroraClusterIdentifier } = props;
    const prefix = `${config.projectName}-${config.environment}`;

    const trailBucket = new s3.Bucket(this, 'CloudTrailBucket', {
      bucketName: `${prefix}-cloudtrail-logs`,
      encryption: s3.BucketEncryption.S3_MANAGED,
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      enforceSSL: true,
      lifecycleRules: [
        {
          transitions: [
            {
              storageClass: s3.StorageClass.INFREQUENT_ACCESS,
              transitionAfter: cdk.Duration.days(90),
            },
            {
              storageClass: s3.StorageClass.GLACIER,
              transitionAfter: cdk.Duration.days(365),
            },
          ],
        },
      ],
      removalPolicy: config.environment === 'production'
        ? cdk.RemovalPolicy.RETAIN
        : cdk.RemovalPolicy.DESTROY,
      autoDeleteObjects: config.environment !== 'production',
    });

    const trailLogGroup = new logs.LogGroup(this, 'CloudTrailLogGroup', {
      logGroupName: `/aws/cloudtrail/${prefix}`,
      retention: logs.RetentionDays.ONE_YEAR,
      removalPolicy: config.environment === 'production'
        ? cdk.RemovalPolicy.RETAIN
        : cdk.RemovalPolicy.DESTROY,
    });

    new cloudtrail.Trail(this, 'CloudTrail', {
      trailName: `${prefix}-trail`,
      bucket: trailBucket,
      isMultiRegionTrail: false,
      includeGlobalServiceEvents: true,
      sendToCloudWatchLogs: true,
      cloudWatchLogGroup: trailLogGroup,
    });

    const alertTopic = new sns.Topic(this, 'AlertTopic', {
      topicName: `${prefix}-alerts`,
      displayName: 'DoktoChain Alerts',
    });

    if (config.alertEmail) {
      alertTopic.addSubscription(
        new snsSubscriptions.EmailSubscription(config.alertEmail)
      );
    }

    const apiErrorAlarm = new cloudwatch.Alarm(this, 'Api5xxAlarm', {
      alarmName: `${prefix}-api-5xx-errors`,
      metric: apiGateway.metricServerError({
        period: cdk.Duration.minutes(5),
        statistic: 'Sum',
      }),
      threshold: 10,
      evaluationPeriods: 2,
      treatMissingData: cloudwatch.TreatMissingData.NOT_BREACHING,
    });
    apiErrorAlarm.addAlarmAction(new cloudwatch_actions.SnsAction(alertTopic));

    const apiLatencyAlarm = new cloudwatch.Alarm(this, 'ApiLatencyAlarm', {
      alarmName: `${prefix}-api-high-latency`,
      metric: apiGateway.metricLatency({
        period: cdk.Duration.minutes(5),
        statistic: 'p95',
      }),
      threshold: 3000,
      evaluationPeriods: 3,
      treatMissingData: cloudwatch.TreatMissingData.NOT_BREACHING,
    });
    apiLatencyAlarm.addAlarmAction(new cloudwatch_actions.SnsAction(alertTopic));

    const auroraDimensions = { DBClusterIdentifier: auroraClusterIdentifier };

    const dbCpuAlarm = new cloudwatch.Alarm(this, 'AuroraCpuAlarm', {
      alarmName: `${prefix}-aurora-high-cpu`,
      metric: new cloudwatch.Metric({
        namespace: 'AWS/RDS',
        metricName: 'CPUUtilization',
        dimensionsMap: auroraDimensions,
        period: cdk.Duration.minutes(5),
        statistic: 'Average',
      }),
      threshold: 80,
      evaluationPeriods: 3,
      treatMissingData: cloudwatch.TreatMissingData.NOT_BREACHING,
    });
    dbCpuAlarm.addAlarmAction(new cloudwatch_actions.SnsAction(alertTopic));

    lambdaFunctions.forEach((fn, index) => {
      const name = lambdaNames[index];
      const errorAlarm = new cloudwatch.Alarm(this, `LambdaErrorAlarm-${name}`, {
        alarmName: `${prefix}-lambda-errors-${prefix}-${name}`,
        metric: fn.metricErrors({
          period: cdk.Duration.minutes(5),
          statistic: 'Sum',
        }),
        threshold: 5,
        evaluationPeriods: 2,
        treatMissingData: cloudwatch.TreatMissingData.NOT_BREACHING,
      });
      errorAlarm.addAlarmAction(new cloudwatch_actions.SnsAction(alertTopic));
    });

    const dashboard = new cloudwatch.Dashboard(this, 'Dashboard', {
      dashboardName: `${prefix}-overview`,
    });

    dashboard.addWidgets(
      new cloudwatch.GraphWidget({
        title: 'API Gateway Requests',
        left: [apiGateway.metricCount({ period: cdk.Duration.minutes(5) })],
        right: [apiGateway.metricServerError({ period: cdk.Duration.minutes(5) })],
        width: 12,
      }),
      new cloudwatch.GraphWidget({
        title: 'API Latency (p50, p95, p99)',
        left: [
          apiGateway.metricLatency({ period: cdk.Duration.minutes(5), statistic: 'p50' }),
          apiGateway.metricLatency({ period: cdk.Duration.minutes(5), statistic: 'p95' }),
          apiGateway.metricLatency({ period: cdk.Duration.minutes(5), statistic: 'p99' }),
        ],
        width: 12,
      }),
    );

    dashboard.addWidgets(
      new cloudwatch.GraphWidget({
        title: 'Aurora CPU & Connections',
        left: [new cloudwatch.Metric({
          namespace: 'AWS/RDS',
          metricName: 'CPUUtilization',
          dimensionsMap: auroraDimensions,
          period: cdk.Duration.minutes(5),
          statistic: 'Average',
        })],
        right: [new cloudwatch.Metric({
          namespace: 'AWS/RDS',
          metricName: 'DatabaseConnections',
          dimensionsMap: auroraDimensions,
          period: cdk.Duration.minutes(5),
          statistic: 'Sum',
        })],
        width: 12,
      }),
      new cloudwatch.GraphWidget({
        title: 'Aurora Serverless Capacity',
        left: [
          new cloudwatch.Metric({
            namespace: 'AWS/RDS',
            metricName: 'ServerlessDatabaseCapacity',
            dimensionsMap: auroraDimensions,
            period: cdk.Duration.minutes(5),
            statistic: 'Average',
          }),
        ],
        width: 12,
      }),
    );

    new cdk.CfnOutput(this, 'AlertTopicArn', {
      value: alertTopic.topicArn,
    });
    new cdk.CfnOutput(this, 'DashboardUrl', {
      value: `https://${this.region}.console.aws.amazon.com/cloudwatch/home?region=${this.region}#dashboards:name=${prefix}-overview`,
    });
  }
}
