import {
  Controller,
  Post,
  Get,
  Body,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { Request } from 'express';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBody,
  ApiQuery,
} from '@nestjs/swagger';
import { WalletAuthService } from './wallet-auth.service';
import {
  InitiateAuthDto,
  RegisterKeyDto,
  AuthenticateDto,
  RefreshTokenDto,
  RevokeKeyDto,
  RevokeSessionDto,
} from './wallet-auth.dto';
import { WalletAuthGuard } from './wallet-auth.guard';
import { NotificationType } from 'src/common/enums/notification';
import { NotificationService } from '../notification/notification.service';

@ApiTags('Wallet Authentication')
@Controller('wallet-auth')
export class WalletAuthController {
  constructor(
    private readonly walletAuthService: WalletAuthService,
    private readonly notificationService: NotificationService,
  ) {}

  @Post('/initiate')
  @ApiOperation({ summary: 'Initiate authentication process' })
  @ApiResponse({ status: 201, description: 'Challenge generated successfully' })
  @ApiBody({ type: InitiateAuthDto })
  async initiateAuth(@Body() dto: InitiateAuthDto, @Req() req: Request) {
    const ipAddress = req.ip || req.connection.remoteAddress;
    const userAgent = req.get('User-Agent');
    return this.walletAuthService.initiateAuth(dto, ipAddress, userAgent);
  }

  @Post('register-key')
  @ApiOperation({ summary: 'Register a new key pair for authentication' })
  @ApiResponse({ status: 201, description: 'Key registered successfully' })
  @ApiBody({ type: RegisterKeyDto })
  async registerKey(@Body() dto: RegisterKeyDto, @Req() req: Request) {
    const ipAddress = req.ip || req.connection.remoteAddress;
    const userAgent = req.get('User-Agent');
    const result = await this.walletAuthService.registerKey(
      dto,
      ipAddress,
      userAgent,
    );

    // Create notification for the wallet
    await this.notificationService.createNotification({
      walletAddress: dto.walletAddress,
      type: NotificationType.WALLET_CREATE,
      title: 'New Wallet Created',
      message: `Your new wallet has been created successfully`,
      metadata: {
        walletAddress: dto.walletAddress,
        publicKey: dto.publicKey,
      },
    });

    return result;
  }

  @Post('authenticate')
  @ApiOperation({ summary: 'Authenticate using registered key' })
  @ApiResponse({ status: 200, description: 'Authentication successful' })
  @ApiBody({ type: AuthenticateDto })
  async authenticate(@Body() dto: AuthenticateDto, @Req() req: Request) {
    const ipAddress = req.ip || req.connection.remoteAddress;
    const userAgent = req.get('User-Agent');
    return this.walletAuthService.authenticate(dto, ipAddress, userAgent);
  }

  @Post('refresh')
  @ApiOperation({ summary: 'Refresh authentication token' })
  @ApiResponse({ status: 200, description: 'Token refreshed successfully' })
  @ApiBody({ type: RefreshTokenDto })
  async refreshToken(@Body() dto: RefreshTokenDto, @Req() req: Request) {
    const ipAddress = req.ip || req.connection.remoteAddress;
    const userAgent = req.get('User-Agent');
    return this.walletAuthService.refreshToken(dto, ipAddress, userAgent);
  }

  @Post('revoke-keys')
  @UseGuards(WalletAuthGuard)
  @ApiOperation({ summary: 'Revoke authentication keys' })
  @ApiResponse({ status: 200, description: 'Keys revoked successfully' })
  @ApiBody({ type: RevokeKeyDto })
  async revokeKeys(@Body() dto: RevokeKeyDto) {
    return this.walletAuthService.revokeKeys(dto);
  }

  @Post('revoke-session')
  @UseGuards(WalletAuthGuard)
  @ApiOperation({ summary: 'Revoke authentication session' })
  @ApiResponse({ status: 200, description: 'Session revoked successfully' })
  @ApiBody({ type: RevokeSessionDto })
  async revokeSession(@Body() dto: RevokeSessionDto) {
    return this.walletAuthService.revokeSession(dto);
  }

  @Get('keys')
  @UseGuards(WalletAuthGuard)
  @ApiOperation({ summary: 'Get all keys for a wallet' })
  @ApiResponse({ status: 200, description: 'Keys retrieved successfully' })
  @ApiQuery({ name: 'walletAddress', description: 'Wallet address' })
  async getKeys(@Query('walletAddress') walletAddress: string) {
    return this.walletAuthService.getKeys(walletAddress);
  }

  @Get('sessions')
  @UseGuards(WalletAuthGuard)
  @ApiOperation({ summary: 'Get all sessions for a wallet' })
  @ApiResponse({ status: 200, description: 'Sessions retrieved successfully' })
  @ApiQuery({ name: 'walletAddress', description: 'Wallet address' })
  @ApiQuery({
    name: 'includeInactive',
    required: false,
    description: 'Include inactive sessions',
  })
  async getSessions(
    @Query('walletAddress') walletAddress: string,
    @Query('includeInactive') includeInactive?: boolean,
  ) {
    return this.walletAuthService.getSessions(walletAddress, includeInactive);
  }

  @Get('validate')
  @ApiOperation({ summary: 'Validate a session token' })
  @ApiResponse({ status: 200, description: 'Session validation result' })
  @ApiQuery({ name: 'sessionToken', description: 'Session token to validate' })
  async validateSession(@Query('sessionToken') sessionToken: string) {
    const result = await this.walletAuthService.validateSession(sessionToken);
    return {
      valid: !!result,
      walletAddress: result?.walletAddress || null,
      publicKey: result?.publicKey || null,
    };
  }

  @Get('health')
  @ApiOperation({ summary: 'Wallet auth service health check' })
  @ApiResponse({ status: 200, description: 'Service is healthy' })
  async healthCheck() {
    return {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      service: 'wallet-auth',
    };
  }
}
