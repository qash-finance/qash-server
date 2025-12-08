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

@Injectable()
export class CompanyAuthGuard extends JwtAuthGuard {
  private readonly companyLogger = new Logger(CompanyAuthGuard.name);

  constructor(
    reflector: Reflector,
    jwtAuthService: JwtAuthService,
    private readonly companyService: CompanyService,
  ) {
    super(reflector, jwtAuthService);
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    // First, run the JWT authentication
    const canActivate = await super.canActivate(context);
    if (!canActivate) {
      return false;
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user || !user.sub) {
      throw new UnauthorizedException('User not authenticated');
    }

    try {
      const company = await this.companyService.getCompanyByUserId(user.sub);

      if (!company) {
        throw new UnauthorizedException(
          'User is not associated with any company',
        );
      }

      request.user = {
        ...user,
        company,
      };

      return true;
    } catch (error) {
      this.companyLogger.error(
        `Failed to fetch company for user ${user.sub}:`,
        error,
      );
      throw new UnauthorizedException(
        `Failed to fetch company: ${error.message}`,
      );
    }
  }
}
