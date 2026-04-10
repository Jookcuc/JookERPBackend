import { BadRequestException } from '@nestjs/common';

type DateInput = string | Date | null | undefined;

interface AssertDateRangeOptions {
  allowEqual?: boolean;
}

const DAY_IN_MS = 1000 * 60 * 60 * 24;

export function assertDateRange(
  startDate: DateInput,
  endDate: DateInput,
  message: string,
  options: AssertDateRangeOptions = {},
): void {
  if (!startDate || !endDate) {
    return;
  }

  const comparison = compareDateOnly(startDate, endDate);
  const allowEqual = options.allowEqual ?? true;

  if (allowEqual ? comparison > 0 : comparison >= 0) {
    throw new BadRequestException(message);
  }
}

export function calculateInclusiveDays(
  startDate: DateInput,
  endDate: DateInput,
): number {
  const diffTime =
    toDateOnlyTimestamp(endDate) - toDateOnlyTimestamp(startDate);

  return Math.floor(diffTime / DAY_IN_MS) + 1;
}

function compareDateOnly(startDate: DateInput, endDate: DateInput): number {
  return toDateOnlyTimestamp(startDate) - toDateOnlyTimestamp(endDate);
}

function toDateOnlyTimestamp(value: DateInput): number {
  if (!value) {
    throw new BadRequestException('La fecha es obligatoria');
  }

  if (value instanceof Date) {
    return Date.UTC(
      value.getUTCFullYear(),
      value.getUTCMonth(),
      value.getUTCDate(),
    );
  }

  const dateOnlyMatch = value.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (dateOnlyMatch) {
    const [, year, month, day] = dateOnlyMatch;
    return Date.UTC(Number(year), Number(month) - 1, Number(day));
  }

  const parsedDate = new Date(value);
  if (Number.isNaN(parsedDate.getTime())) {
    throw new BadRequestException('La fecha no tiene un formato valido');
  }

  return Date.UTC(
    parsedDate.getUTCFullYear(),
    parsedDate.getUTCMonth(),
    parsedDate.getUTCDate(),
  );
}
