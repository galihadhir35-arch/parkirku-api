import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  Logger,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { QueryFailedError } from 'typeorm';
import {
  ProblemDetailsBody,
  ProblemDetailsException,
  duplicatePlateProblem,
  duplicateSlotCodeProblem,
  internalServerProblem,
  notFoundProblem,
  slotOccupiedProblem,
  validationProblem,
  vehicleInUseProblem,
} from '../errors/problem-details';

interface PostgresError {
  code?: string;
  constraint?: string;
  column?: string;
  detail?: string;
}

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
    } else if (exception instanceof QueryFailedError) {
      problem = this.fromDatabaseError(exception);
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

  /**
   * Terjemahkan error PostgreSQL menjadi Problem Details yang ramah client.
   * Detail SQL lengkap hanya masuk log, tidak pernah dikirim ke response.
   */
  private fromDatabaseError(
    exception: QueryFailedError,
  ): Omit<ProblemDetailsBody, 'instance'> {
    const driverError = exception.driverError as PostgresError;
    const constraint = driverError.constraint ?? '';
    const duplicatedValue =
      this.extractDuplicatedValue(driverError.detail) ?? 'data';

    switch (driverError.code) {
      case '23505':
        if (constraint.includes('plate_number')) {
          return duplicatePlateProblem(duplicatedValue).problem;
        }
        if (constraint.includes('slots_code')) {
          return duplicateSlotCodeProblem(duplicatedValue).problem;
        }
        if (constraint.includes('active_vehicle')) {
          return vehicleInUseProblem(
            'Kendaraan masih memiliki tiket ACTIVE.',
          ).problem;
        }
        if (constraint.includes('active_slot')) {
          return slotOccupiedProblem(
            'Slot masih memiliki tiket ACTIVE.',
          ).problem;
        }
        return slotOccupiedProblem(
          'Data bertentangan dengan data lain.',
        ).problem;

      case '23503':
        if (constraint.includes('vehicle')) {
          return notFoundProblem(
            'Kendaraan yang direferensikan tidak ditemukan.',
          ).problem;
        }
        if (constraint.includes('slot')) {
          return notFoundProblem(
            'Slot yang direferensikan tidak ditemukan.',
          ).problem;
        }
        return vehicleInUseProblem(
          'Data masih direferensikan oleh tiket.',
        ).problem;

      case '23502': {
        const field = driverError.column ?? 'field';
        return validationProblem([
          { field, message: `${field} tidak boleh kosong` },
        ]).problem;
      }

      case '23514':
        return validationProblem([
          {
            field: 'body',
            message: 'Data melanggar aturan yang berlaku di database.',
          },
        ]).problem;

      case '22P02':
        return validationProblem([
          { field: 'body', message: 'Format data tidak valid.' },
        ]).problem;

      default:
        this.logger.error(
          `Database error ${driverError.code ?? 'unknown'}: ${exception.message}`,
          exception.stack,
        );
        return internalServerProblem().problem;
    }
  }

  private extractDuplicatedValue(detail?: string): string | undefined {
    if (!detail) {
      return undefined;
    }

    const match = /Key \([^)]+\)=\(([^)]+)\) already exists/.exec(detail);

    return match?.[1];
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
