import * as cdk from 'aws-cdk-lib';
import * as cognito from 'aws-cdk-lib/aws-cognito';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import { Construct } from 'constructs';
import { EnvironmentConfig } from './config';

interface AuthStackProps extends cdk.StackProps {
  config: EnvironmentConfig;
  postConfirmationLambda?: lambda.IFunction;
}

export class AuthStack extends cdk.Stack {
  public readonly userPool: cognito.UserPool;
  public readonly userPoolClient: cognito.UserPoolClient;

  constructor(scope: Construct, id: string, props: AuthStackProps) {
    super(scope, id, props);

    const { config } = props;
    const prefix = `${config.projectName}-${config.environment}`;

    this.userPool = new cognito.UserPool(this, 'UserPool', {
      userPoolName: `${prefix}-users`,
      selfSignUpEnabled: true,
      signInAliases: {
        email: true,
      },
      autoVerify: {
        email: true,
      },
      standardAttributes: {
        email: { required: true, mutable: true },
        givenName: { required: true, mutable: true },
        familyName: { required: true, mutable: true },
        phoneNumber: { required: false, mutable: true },
      },
      customAttributes: {
        role: new cognito.StringAttribute({ mutable: true }),
        tenant_id: new cognito.StringAttribute({ mutable: true }),
      },
      passwordPolicy: {
        minLength: 8,
        requireLowercase: true,
        requireUppercase: true,
        requireDigits: true,
        requireSymbols: true,
        tempPasswordValidity: cdk.Duration.days(7),
      },
      accountRecovery: cognito.AccountRecovery.EMAIL_ONLY,
      removalPolicy: config.environment === 'production'
        ? cdk.RemovalPolicy.RETAIN
        : cdk.RemovalPolicy.DESTROY,
      mfa: cognito.Mfa.OPTIONAL,
      mfaSecondFactor: {
        sms: false,
        otp: true,
      },
    });

    if (props.postConfirmationLambda) {
      this.userPool.addTrigger(
        cognito.UserPoolOperation.POST_CONFIRMATION,
        props.postConfirmationLambda
      );
    }

    this.userPool.addDomain('CognitoDomain', {
      cognitoDomain: {
        domainPrefix: `${prefix}-auth`,
      },
    });

    ['patient', 'provider', 'pharmacy', 'admin', 'clinic'].forEach(role => {
      new cognito.CfnUserPoolGroup(this, `Group${role}`, {
        userPoolId: this.userPool.userPoolId,
        groupName: role,
        description: `${role.charAt(0).toUpperCase() + role.slice(1)} users`,
      });
    });

    this.userPoolClient = this.userPool.addClient('AppClient', {
      userPoolClientName: `${prefix}-web-client`,
      authFlows: {
        userPassword: true,
        userSrp: true,
      },
      oAuth: {
        flows: {
          authorizationCodeGrant: true,
        },
        scopes: [cognito.OAuthScope.OPENID, cognito.OAuthScope.EMAIL, cognito.OAuthScope.PROFILE],
        callbackUrls: config.environment === 'production'
          ? ['https://doktochain.ca/auth/callback']
          : ['https://staging.doktochain.ca/auth/callback', 'http://localhost:5173/auth/callback'],
        logoutUrls: config.environment === 'production'
          ? ['https://doktochain.ca']
          : ['https://staging.doktochain.ca', 'http://localhost:5173'],
      },
      accessTokenValidity: cdk.Duration.hours(1),
      idTokenValidity: cdk.Duration.hours(1),
      refreshTokenValidity: cdk.Duration.days(30),
      preventUserExistenceErrors: true,
    });

    new cdk.CfnOutput(this, 'UserPoolId', {
      value: this.userPool.userPoolId,
    });
    new cdk.CfnOutput(this, 'UserPoolClientId', {
      value: this.userPoolClient.userPoolClientId,
    });
  }
}
