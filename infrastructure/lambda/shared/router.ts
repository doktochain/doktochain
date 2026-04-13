import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { error, getOrigin, ClientError } from './response';
import { AuthError } from './auth';

type RouteHandler = (
  event: APIGatewayProxyEvent,
  params: Record<string, string>
) => Promise<APIGatewayProxyResult>;

interface Route {
  method: string;
  pattern: RegExp;
  paramNames: string[];
  handler: RouteHandler;
}

export class Router {
  private routes: Route[] = [];
  private basePath: string;

  constructor(basePath: string) {
    this.basePath = basePath.startsWith('/') ? basePath : `/${basePath}`;
  }

  get(path: string, handler: RouteHandler) {
    this.addRoute('GET', path, handler);
  }

  post(path: string, handler: RouteHandler) {
    this.addRoute('POST', path, handler);
  }

  put(path: string, handler: RouteHandler) {
    this.addRoute('PUT', path, handler);
  }

  patch(path: string, handler: RouteHandler) {
    this.addRoute('PATCH', path, handler);
  }

  delete(path: string, handler: RouteHandler) {
    this.addRoute('DELETE', path, handler);
  }

  private addRoute(method: string, path: string, handler: RouteHandler) {
    const paramNames: string[] = [];
    const fullPath = path === '/' ? this.basePath : `${this.basePath}${path}`;

    const regexStr = fullPath
      .replace(/\//g, '\\/')
      .replace(/:(\w+)/g, (_, name) => {
        paramNames.push(name);
        return '([^/]+)';
      });

    this.routes.push({
      method,
      pattern: new RegExp(`^${regexStr}$`),
      paramNames,
      handler,
    });
  }

  async handle(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
    const origin = getOrigin(event.headers);
    const method = event.httpMethod;
    const path = event.path || event.resource;

    try {
      for (const route of this.routes) {
        if (route.method !== method) continue;

        const match = path.match(route.pattern);
        if (!match) continue;

        const params: Record<string, string> = {};
        route.paramNames.forEach((name, index) => {
          params[name] = decodeURIComponent(match[index + 1]);
        });

        return await route.handler(event, params);
      }

      return error(`Route not found: ${method} ${path}`, 404, origin);
    } catch (err) {
      if (err instanceof AuthError) {
        return error(err.message, err.statusCode, origin);
      }

      if (err instanceof ClientError) {
        return error(err.message, err.statusCode, origin);
      }

      console.error('Unhandled error:', err);
      return error(
        'Internal server error',
        500,
        origin,
        err instanceof Error ? err.message : undefined
      );
    }
  }
}
