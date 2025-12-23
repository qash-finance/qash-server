import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { JwtPayload } from '../../../common/interfaces/jwt-payload';
import { CompanyModel } from 'src/database/generated/models';

export interface UserWithCompany extends JwtPayload {
  company: CompanyModel;
}

/**
 * Decorator to extract current user from request
 *
 * @example
 * ```typescript
 * // Basic usage - returns JwtPayload
 * @Get('profile')
 * getProfile(@CurrentUser() user: JwtPayload) {
 *   return { userId: user.sub, email: user.email };
 * }
 *
 * // With company info - returns UserWithCompany
 * @Get('contacts')
 * getContacts(@CurrentUser('withCompany') user: UserWithCompany) {
 *   const companyId = user.company.id; // Auto-attached!
 *   return this.contactService.getContacts(companyId);
 * }
 *
 * // Get specific field
 * @Get('user-id')
 * getUserId(@CurrentUser('sub') userId: number) {
 *   return { userId };
 * }
 * ```
 */
export const CurrentUser = createParamDecorator(
  (
    data: string | undefined,
    ctx: ExecutionContext,
  ): JwtPayload | UserWithCompany | any => {
    const request = ctx.switchToHttp().getRequest();
    const user = request.user;

    if (!user) {
      return null;
    }

    if (data === 'withCompany') {
      if (user.company) {
        return user as UserWithCompany;
      } else {
        console.warn(
          'Company not attached to user. Make sure to use @CompanyAuth() decorator.',
        );
        return user;
      }
    }

    if (data && data !== 'withCompany') {
      return user?.[data as keyof JwtPayload];
    }

    return user;
  },
);
