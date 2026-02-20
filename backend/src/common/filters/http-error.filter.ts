import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Request, Response } from 'express';

type ErrorBody = {
  statusCode: number;
  code: string;
  message: string;
  correlationId: string;
};

@Catch()
export class HttpErrorFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const request = ctx.getRequest<Request>();
    const response = ctx.getResponse<Response>();

    const correlationId =
      this.readCorrelationId(response, request) ?? 'missing-correlation-id';

    if (exception instanceof HttpException) {
      const statusCode = exception.getStatus();
      const exceptionResponse = exception.getResponse() as
        | string
        | { message?: string | string[]; code?: string };

      const message =
        typeof exceptionResponse === 'string'
          ? exceptionResponse
          : this.normalizeMessage(exceptionResponse.message, exception.message);
      const code =
        typeof exceptionResponse === 'object' && exceptionResponse?.code
          ? exceptionResponse.code
          : this.statusCodeToCode(statusCode);

      response.status(statusCode).json({
        statusCode,
        code,
        message,
        correlationId,
      } satisfies ErrorBody);
      return;
    }

    response.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
      statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
      code: 'INTERNAL_SERVER_ERROR',
      message: 'Unexpected server error.',
      correlationId,
    } satisfies ErrorBody);
  }

  private readCorrelationId(response: Response, request: Request): string | undefined {
    const headerValue = response.getHeader('x-correlation-id');
    if (typeof headerValue === 'string' && headerValue.trim()) {
      return headerValue;
    }

    const requestHeader = request.header('x-correlation-id');
    if (typeof requestHeader === 'string' && requestHeader.trim()) {
      return requestHeader;
    }

    return undefined;
  }

  private normalizeMessage(
    message: string | string[] | undefined,
    fallback: string,
  ): string {
    if (Array.isArray(message)) {
      return message.join(', ');
    }
    if (typeof message === 'string' && message.trim()) {
      return message;
    }
    return fallback;
  }

  private statusCodeToCode(statusCode: number): string {
    const statusName = HttpStatus[statusCode];
    if (typeof statusName !== 'string') {
      return 'HTTP_ERROR';
    }
    return statusName.toUpperCase();
  }
}
