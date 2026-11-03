import { HttpException } from '@nestjs/common';

export interface ProblemFieldError {
  field: string;
  message: string;
}

export interface ProblemDetailsBody {
  type: string;
  title: string;
  status: number;
  detail: string;
  instance?: string;
  errors?: ProblemFieldError[];
}

const PROBLEM_BASE_URL = 'https://api.parkirku.example/problems';

/**
 * Exception khusus yang membawa payload Problem Details (RFC 9457).
 * Exception filter global akan menambahkan field `instance`.
 */
export class ProblemDetailsException extends HttpException {
  constructor(public readonly problem: Omit<ProblemDetailsBody, 'instance'>) {
    super(problem, problem.status);
  }
}

export function validationProblem(
  errors: ProblemFieldError[],
): ProblemDetailsException {
  return new ProblemDetailsException({
    type: `${PROBLEM_BASE_URL}/validation-error`,
    title: 'Data tidak valid',
    status: 400,
    detail: 'Satu atau lebih field tidak memenuhi aturan validasi.',
    errors,
  });
}

export function invalidQueryProblem(
  detailOrErrors: string | ProblemFieldError[],
): ProblemDetailsException {
  const errors = Array.isArray(detailOrErrors) ? detailOrErrors : undefined;

  return new ProblemDetailsException({
    type: `${PROBLEM_BASE_URL}/invalid-query`,
    title: 'Query tidak valid',
    status: 400,
    detail: errors
      ? 'Satu atau lebih parameter query tidak valid.'
      : (detailOrErrors as string),
    ...(errors ? { errors } : {}),
  });
}

export function notFoundProblem(detail: string): ProblemDetailsException {
  return new ProblemDetailsException({
    type: `${PROBLEM_BASE_URL}/not-found`,
    title: 'Data tidak ditemukan',
    status: 404,
    detail,
  });
}

export function duplicatePlateProblem(plateNumber: string): ProblemDetailsException {
  return new ProblemDetailsException({
    type: `${PROBLEM_BASE_URL}/duplicate-plate`,
    title: 'Plat nomor sudah terdaftar',
    status: 409,
    detail: `Kendaraan dengan plat nomor ${plateNumber} sudah terdaftar.`,
  });
}

export function duplicateSlotCodeProblem(code: string): ProblemDetailsException {
  return new ProblemDetailsException({
    type: `${PROBLEM_BASE_URL}/duplicate-slot-code`,
    title: 'Kode slot sudah terdaftar',
    status: 409,
    detail: `Slot dengan kode ${code} sudah terdaftar.`,
  });
}

export function slotOccupiedProblem(detail: string): ProblemDetailsException {
  return new ProblemDetailsException({
    type: `${PROBLEM_BASE_URL}/slot-occupied`,
    title: 'Slot tidak tersedia',
    status: 409,
    detail,
  });
}

export function vehicleInUseProblem(detail: string): ProblemDetailsException {
  return new ProblemDetailsException({
    type: `${PROBLEM_BASE_URL}/vehicle-in-use`,
    title: 'Kendaraan masih digunakan',
    status: 409,
    detail,
  });
}

export function ticketAlreadyCompletedProblem(
  detail: string,
): ProblemDetailsException {
  return new ProblemDetailsException({
    type: `${PROBLEM_BASE_URL}/ticket-already-completed`,
    title: 'Tiket sudah selesai',
    status: 409,
    detail,
  });
}

export function internalServerProblem(): ProblemDetailsException {
  return new ProblemDetailsException({
    type: `${PROBLEM_BASE_URL}/internal-error`,
    title: 'Terjadi kesalahan pada server',
    status: 500,
    detail: 'Terjadi kesalahan tak terduga. Silakan coba lagi.',
  });
}
