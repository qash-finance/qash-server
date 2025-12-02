import { Injectable, Logger } from '@nestjs/common';
import { AppConfigService } from '../shared/config/config.service';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(private readonly appConfigService: AppConfigService) {}
}
