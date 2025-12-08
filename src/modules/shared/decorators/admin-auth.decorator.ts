import { applyDecorators, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiUnauthorizedResponse,
  ApiForbiddenResponse,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { AdminGuard } from '../guards/admin.guard';
import { Admin } from './admin.decorator';

/**
 * Composite decorator for routes that require admin access.
 * This decorator:
 * 1. Validates JWT token
 * 2. Checks if user has ADMIN role OR matches admin email from environment
 * 3. Enriches the user object with role information
 *
 * @example
 * ```typescript
 * @AdminAuth()
 * @Get('admin-only')
 * adminOnlyEndpoint(@CurrentUser() user: JwtPayload) {
 *   // Only admins can access this endpoint
 *   return this.service.getAdminData();
 * }
 * ```
 */
export function AdminAuth() {
  return applyDecorators(
    UseGuards(JwtAuthGuard, AdminGuard),
    Admin(),
    ApiBearerAuth(),
    ApiUnauthorizedResponse({
      description: 'Unauthorized - Invalid or missing token',
    }),
    ApiForbiddenResponse({
      description: 'Forbidden - Admin access required',
    }),
  );
}
