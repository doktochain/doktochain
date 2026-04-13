import {
  APIGatewayRequestAuthorizerEvent,
  APIGatewayAuthorizerResult,
} from 'aws-lambda';
import { CognitoJwtVerifier } from 'aws-jwt-verify';

let verifier: ReturnType<typeof CognitoJwtVerifier.create> | null = null;

function getVerifier() {
  if (!verifier) {
    verifier = CognitoJwtVerifier.create({
      userPoolId: process.env.COGNITO_USER_POOL_ID!,
      tokenUse: 'id',
      clientId: process.env.COGNITO_CLIENT_ID!,
    });
  }
  return verifier;
}

function generatePolicy(
  principalId: string,
  effect: 'Allow' | 'Deny',
  methodArn: string,
): APIGatewayAuthorizerResult {
  const arnParts = methodArn.split(':');
  const apiGatewayArnParts = arnParts[5].split('/');
  const region = arnParts[3];
  const accountId = arnParts[4];
  const apiId = apiGatewayArnParts[0];
  const stage = apiGatewayArnParts[1];

  const resourceArn = `arn:aws:execute-api:${region}:${accountId}:${apiId}/${stage}/*`;

  return {
    principalId,
    policyDocument: {
      Version: '2012-10-17',
      Statement: [
        {
          Action: 'execute-api:Invoke',
          Effect: effect,
          Resource: resourceArn,
        },
      ],
    },
  };
}

export const handler = async (
  event: APIGatewayRequestAuthorizerEvent,
): Promise<APIGatewayAuthorizerResult> => {
  const token =
    event.queryStringParameters?.token ||
    event.headers?.Authorization?.replace('Bearer ', '');

  if (!token) {
    return generatePolicy('anonymous', 'Deny', event.methodArn);
  }

  try {
    const payload = await getVerifier().verify(token);
    return generatePolicy(payload.sub, 'Allow', event.methodArn);
  } catch (err) {
    console.error('WebSocket auth failed:', err);
    return generatePolicy('anonymous', 'Deny', event.methodArn);
  }
};
