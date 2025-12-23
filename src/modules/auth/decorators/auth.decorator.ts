import { applyDecorators, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiUnauthorizedResponse } from '@nestjs/swagger';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';

/**
 * Combined decorator for authentication
 * Applies JWT guard and Swagger documentation
 *
 * @example
 * ```typescript
 * @Auth()
 * @Get('protected')
 * getProtectedResource(@CurrentUser() user: JwtPayload) {
 *   return { message: 'This is protected', user };
 * }
 * ```
 */
export function Auth() {
  return applyDecorators(
    UseGuards(JwtAuthGuard),
    ApiBearerAuth(),
    ApiUnauthorizedResponse({
      description: 'Unauthorized - Invalid or missing token',
      schema: {
        type: 'object',
        properties: {
          statusCode: { type: 'number', example: 401 },
          message: { type: 'string', example: 'Unauthorized' },
          error: { type: 'string', example: 'Unauthorized' },
        },
      },
    }),
  );
}
