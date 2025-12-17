import {
  Injectable,
  ExecutionContext,
  UnauthorizedException,
  Logger,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Reflector } from '@nestjs/core';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';
import { JwtAuthService } from '../services/jwt.service';
import { ErrorAuth } from 'src/common/constants/errors';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  private readonly logger = new Logger(JwtAuthGuard.name);

  constructor(
    protected reflector: Reflector,
    private jwtAuthService: JwtAuthService,
  ) {
    super();
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const token = this.extractTokenFromHeader(request);

    if (!token) {
      throw new UnauthorizedException(ErrorAuth.AccessTokenRequired);
    }

    try {
      const payload = await this.jwtAuthService.validateToken(token);
      request.user = payload;
      return true;
    } catch (error) {
      this.logger.error('JWT validation failed:', error);
      throw new UnauthorizedException(ErrorAuth.InvalidToken);
    }
  }

  private extractTokenFromHeader(request: any): string | undefined {
    const [type, token] = request.headers.authorization?.split(' ') ?? [];
    return type === 'Bearer' ? token : undefined;
  }

  handleRequest(err: any, user: any, info: any, _context: ExecutionContext) {
    if (err || !user) {
      const errorMessage =
        info?.message || err?.message || 'Unauthorized access';
      this.logger.error(`Authentication failed: ${errorMessage}`);
      throw new UnauthorizedException(errorMessage);
    }
    return user;
  }
}
