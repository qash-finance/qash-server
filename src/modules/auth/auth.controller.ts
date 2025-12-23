import {
  Controller,
  Post,
  Body,
  HttpCode,
  HttpStatus,
  Get,
  Req,
  Logger,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBadRequestResponse,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { Request } from 'express';
import { AuthService } from './auth.service';
import { Public } from './decorators/public.decorator';
import { Auth } from './decorators/auth.decorator';
import { CurrentUser } from './decorators/current-user.decorator';
import { JwtPayload } from '../../common/interfaces/jwt-payload';
import {
  SendOtpDto,
  VerifyOtpDto,
  RefreshTokenDto,
  AuthResponseDto,
  MessageResponseDto,
  UserMeResponseDto,
} from './dto/auth.dto';

@ApiTags('Authentication')
@Controller('auth')
export class AuthController {
  private readonly logger = new Logger(AuthController.name);

  constructor(private readonly authService: AuthService) {}

  //#region GET METHODS
  // *************************************************
  // **************** GET METHODS *******************
  // *************************************************

  @Auth()
  @Get('me')
  @ApiOperation({
    summary: 'Get current user details',
    description:
      'Returns the authenticated user details including team member and company information',
  })
  @ApiResponse({
    status: 200,
    description: 'User details retrieved successfully',
    type: UserMeResponseDto,
  })
  @ApiUnauthorizedResponse({
    description: 'Unauthorized - Invalid or missing token',
  })
  async getCurrentUser(
    @CurrentUser() user: JwtPayload,
  ): Promise<UserMeResponseDto> {
    return this.authService.getCurrentUserWithCompany(user.sub || user.userId);
  }

  //#endregion GET METHODS

  //#region POST METHODS
  // *************************************************
  // **************** POST METHODS *******************
  // *************************************************

  @Public()
  @Post('send-otp')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Send OTP to email',
    description:
      'Sends a 6-digit OTP code to the provided email address for authentication',
  })
  @ApiResponse({
    status: 200,
    description: 'OTP sent successfully',
    type: MessageResponseDto,
  })
  @ApiBadRequestResponse({
    description: 'Invalid email or rate limit exceeded',
    schema: {
      type: 'object',
      properties: {
        statusCode: { type: 'number', example: 400 },
        message: { type: 'string', example: 'Invalid email address' },
        error: { type: 'string', example: 'Bad Request' },
      },
    },
  })
  async sendOtp(@Body() sendOtpDto: SendOtpDto): Promise<MessageResponseDto> {
    return this.authService.sendOtp(sendOtpDto.email);
  }

  @Public()
  @Post('verify-otp')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Verify OTP and authenticate',
    description:
      'Verifies the OTP code and returns JWT tokens for authentication',
  })
  @ApiResponse({
    status: 200,
    description: 'OTP verified successfully, user authenticated',
    type: AuthResponseDto,
  })
  @ApiBadRequestResponse({
    description: 'Invalid OTP or email',
  })
  @ApiUnauthorizedResponse({
    description: 'Invalid or expired OTP',
  })
  async verifyOtp(
    @Body() verifyOtpDto: VerifyOtpDto,
    @Req() request: Request,
  ): Promise<AuthResponseDto> {
    const userAgent = request.headers['user-agent'];
    const ipAddress = request.ip || request.connection.remoteAddress;

    return this.authService.verifyOtpAndAuthenticate(
      verifyOtpDto.email,
      verifyOtpDto.otp,
      { userAgent, ipAddress },
    );
  }

  @Public()
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Refresh access token',
    description:
      'Generates new access and refresh tokens using a valid refresh token',
  })
  @ApiResponse({
    status: 200,
    description: 'Tokens refreshed successfully',
    type: AuthResponseDto,
  })
  @ApiUnauthorizedResponse({
    description: 'Invalid or expired refresh token',
  })
  async refreshToken(
    @Body() refreshTokenDto: RefreshTokenDto,
    @Req() request: Request,
  ): Promise<Omit<AuthResponseDto, 'user'>> {
    try {
      const userAgent = request.headers['user-agent'];
      const ipAddress = request.ip || request.connection.remoteAddress;

      const tokens = await this.authService.refreshTokens(
        refreshTokenDto.refreshToken,
        { userAgent, ipAddress },
      );

      return tokens;
    } catch (error) {
      this.logger.error('Refresh token failed:', error);
      throw error;
    }
  }

  @Auth()
  @Post('logout')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Logout from current session',
    description: 'Invalidates the current refresh token and logs out the user',
  })
  @ApiResponse({
    status: 200,
    description: 'Logged out successfully',
    type: MessageResponseDto,
  })
  async logout(
    @Body() refreshTokenDto: RefreshTokenDto,
  ): Promise<MessageResponseDto> {
    try {
      await this.authService.logout(refreshTokenDto.refreshToken);
      return { message: 'Logged out successfully' };
    } catch (error) {
      this.logger.error('Logout failed:', error);
      // Don't throw error for logout - always return success
      return { message: 'Logged out successfully' };
    }
  }

  //#endregion POST METHODS
}
