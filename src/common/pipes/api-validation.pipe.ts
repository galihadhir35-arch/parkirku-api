import { Injectable, PipeTransform, ValidationPipe } from '@nestjs/common';
import { ValidationError } from 'class-validator';
import {
  ProblemFieldError,
  invalidQueryProblem,
  validationProblem,
} from '../errors/problem-details';

function flattenValidationErrors(
  errors: ValidationError[],
  parent = '',
): ProblemFieldError[] {
  return errors.flatMap((error) => {
    const field = parent ? `${parent}.${error.property}` : error.property;
    const ownErrors = Object.values(error.constraints ?? {}).map((message) => ({
      field,
      message: localizeMessage(field, message),
    }));

    return [...ownErrors, ...flattenValidationErrors(error.children ?? [], field)];
  });
}

function localizeMessage(field: string, message: string): string {
  if (message.includes('should not exist')) {
    return `${field} tidak dikenal`;
  }

  return message;
}

/**
 * Satu ValidationPipe global dengan dua jenis pesan error:
 * - body/param  -> 400 validation-error
 * - query       -> 400 invalid-query
 */
@Injectable()
export class ApiValidationPipe implements PipeTransform {
  private readonly bodyPipe = new ValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: true,
    transform: true,
    exceptionFactory: (errors) =>
      validationProblem(flattenValidationErrors(errors)),
  });

  private readonly queryPipe = new ValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: true,
    transform: true,
    exceptionFactory: (errors) =>
      invalidQueryProblem(flattenValidationErrors(errors)),
  });

  transform(value: unknown, metadata: Parameters<PipeTransform['transform']>[1]) {
    const pipe = metadata.type === 'query' ? this.queryPipe : this.bodyPipe;

    return pipe.transform(value, metadata);
  }
}
