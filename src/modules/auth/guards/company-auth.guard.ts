import {
  Injectable,
  ExecutionContext,
  UnauthorizedException,
  Logger,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtAuthGuard } from './jwt-auth.guard';
import { JwtAuthService } from '../services/jwt.service';
import { CompanyService } from '../../company/company.service';
import { ErrorAuth, ErrorCompany } from 'src/common/constants/errors';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';

@Injectable()
export class CompanyAuthGuard extends JwtAuthGuard {
  private readonly companyAuthLogger = new Logger(CompanyAuthGuard.name);

  constructor(
    reflector: Reflector,
    jwtAuthService: JwtAuthService,
    private readonly companyService: CompanyService,
  ) {
    super(reflector, jwtAuthService);
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    // Check if route is public - if so, skip authentication
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) {
      return true;
    }

    // First, run the JWT authentication
    const canActivate = await super.canActivate(context);
    if (!canActivate) {
      return false;
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user || !user.sub) {
      throw new UnauthorizedException(ErrorAuth.NotAuthenticated);
    }

    try {
      const company = await this.companyService.getCompanyByUserId(user.sub);

      if (!company) {
        throw new UnauthorizedException(
          ErrorCompany.UserNotAssociatedWithCompany,
        );
      }

      request.user = {
        ...user,
        company,
      };

      return true;
    } catch (error) {
      this.companyAuthLogger.error(
        `Failed to fetch company for user ${user.sub}:`,
        error,
      );
      throw new UnauthorizedException(ErrorCompany.FailedToFetchCompany);
    }
  }
}
