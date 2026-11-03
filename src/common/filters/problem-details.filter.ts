import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  Logger,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import {
  ProblemDetailsBody,
  ProblemDetailsException,
  internalServerProblem,
  notFoundProblem,
  validationProblem,
} from '../errors/problem-details';

/**
 * Mengubah semua exception menjadi body Problem Details (RFC 9457)
 * dengan Content-Type: application/problem+json.
 */
@Catch()
export class ProblemDetailsFilter implements ExceptionFilter {
  private readonly logger = new Logger(ProblemDetailsFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const request = ctx.getRequest<Request>();
    const response = ctx.getResponse<Response>();

    let problem: Omit<ProblemDetailsBody, 'instance'>;

    if (exception instanceof ProblemDetailsException) {
      problem = exception.problem;
    } else if (exception instanceof HttpException) {
      problem = this.fromHttpException(exception, request);
    } else {
      this.logger.error(
        `Unhandled error on ${request.method} ${request.originalUrl}`,
        exception instanceof Error ? exception.stack : String(exception),
      );
      problem = internalServerProblem().problem;
    }

    if (problem.status >= 500) {
      this.logger.error(
        `Server error on ${request.method} ${request.originalUrl}: ${problem.detail}`,
      );
    }

    const body: ProblemDetailsBody = {
      ...problem,
      instance: request.originalUrl.split('?')[0],
    };

    response.setHeader('Content-Type', 'application/problem+json');
    response.status(problem.status).json(body);
  }

  private fromHttpException(
    exception: HttpException,
    request: Request,
  ): Omit<ProblemDetailsBody, 'instance'> {
    const status = exception.getStatus();

    if (status === 404) {
      return notFoundProblem(
        `Endpoint ${request.method} ${request.originalUrl.split('?')[0]} tidak ditemukan.`,
      ).problem;
    }

    if (status === 400) {
      return validationProblem([]).problem;
    }

    const response = exception.getResponse();
    const message =
      typeof response === 'string'
        ? response
        : typeof (response as { message?: unknown }).message === 'string'
          ? ((response as { message: string }).message as string)
          : exception.message;

    return {
      type: 'https://api.parkirku.example/problems/http-error',
      title: exception.name,
      status,
      detail: message,
    };
  }
}
