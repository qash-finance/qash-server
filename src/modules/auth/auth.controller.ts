import { Controller } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { AuthService } from './auth.service';

@ApiTags('Gift')
@ApiBearerAuth()
@Controller('gift')
export class AuthController {
  constructor(private readonly service: AuthService) {}

  // *************************************************
  // **************** GET METHODS *******************
  // *************************************************
}
