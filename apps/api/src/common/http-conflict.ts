import { HttpException, HttpStatus } from '@nestjs/common';

export function conflict(code: string, message: string): never {
  throw new HttpException({ code, message, statusCode: 409 }, HttpStatus.CONFLICT);
}
