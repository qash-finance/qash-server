import {
  Controller,
  Post,
  Body,
  HttpCode,
  HttpStatus,
  Get,
  Req,
  Res,
  Logger,
  ForbiddenException,
  BadRequestException,
  UnauthorizedException,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBadRequestResponse,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { Request, Response } from 'express';
import { AuthService } from './auth.service';
import { Public } from './decorators/public.decorator';
import { Auth } from './decorators/auth.decorator';
import { CurrentUser } from './decorators/current-user.decorator';
import { JwtPayload } from '../../common/interfaces/jwt-payload';
import { ParaJwtPayload } from '../../common/interfaces/para-jwt-payload';
import {
  SendOtpDto,
  VerifyOtpDto,
  RefreshTokenDto,
  AuthResponseDto,
  MessageResponseDto,
  UserMeResponseDto,
  VerifySessionDto,
  VerifySessionResponseDto,
  SetJwtCookieDto,
  SetJwtCookieResponseDto,
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
    @CurrentUser()
    user: ParaJwtPayload & { internalUserId?: number; internalUser?: any },
  ): Promise<UserMeResponseDto> {
    // Use internal user ID from the guard (synced from Para token)
    const userId = user.internalUserId;

    if (!userId) {
      throw new BadRequestException('User not found in database');
    }

    return this.authService.getCurrentUserWithCompany(userId);
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

  @Public()
  @Post('logout')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Logout from current session',
    description: 'Clears the HTTP-only JWT cookie and logs out the user',
  })
  @ApiResponse({
    status: 200,
    description: 'Logged out successfully',
    type: MessageResponseDto,
  })
  async logout(
    @Res({ passthrough: true }) response: Response,
  ): Promise<MessageResponseDto> {
    try {
      // Clear the JWT cookie
      response.clearCookie('para-jwt', {
        httpOnly: true,
        secure: this.authService.isProduction(),
        sameSite: 'lax',
        path: '/',
      });

      this.logger.log('User logged out - cookie cleared');
      return { message: 'Logged out successfully' };
    } catch (error) {
      this.logger.error('Logout failed:', error);
      // Don't throw error for logout - always return success
      return { message: 'Logged out successfully' };
    }
  }

  @Public()
  @Post('set-cookie')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Set Para JWT cookie',
    description:
      'Validates Para JWT token and sets it as an HTTP-only cookie. Client should call this after getting JWT from Para.',
  })
  @ApiResponse({
    status: 200,
    description: 'Cookie set successfully',
    type: SetJwtCookieResponseDto,
  })
  @ApiBadRequestResponse({
    description: 'Invalid or missing JWT token',
  })
  @ApiUnauthorizedResponse({
    description: 'Invalid or expired JWT token',
  })
  async setJwtCookie(
    @Body() setJwtCookieDto: SetJwtCookieDto,
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ): Promise<SetJwtCookieResponseDto> {
    try {
      // Temporarily set token in Authorization header for Passport validation
      const originalAuth = request.headers.authorization;
      request.headers.authorization = `Bearer ${setJwtCookieDto.token}`;

      try {
        // Validate the JWT token using Passport strategy
        const paraPayload = await this.authService.validateParaJwt(
          setJwtCookieDto.token,
        );

        // Sync user to database
        const user = await this.authService.syncUserFromParaToken(paraPayload);

        // Set HTTP-only cookie
        const isProduction = this.authService.isProduction();
        response.cookie('para-jwt', setJwtCookieDto.token, {
          httpOnly: true,
          secure: isProduction, // Only send over HTTPS in production
          sameSite: 'lax', // CSRF protection
          maxAge: 30 * 60 * 1000, // 30 minutes (matches Para JWT expiry)
          path: '/',
        });

        this.logger.log(`JWT cookie set for user: ${user.email}`);
        return { message: 'Cookie set successfully' };
      } finally {
        // Restore original authorization header
        request.headers.authorization = originalAuth;
      }
    } catch (error) {
      this.logger.error('Failed to set JWT cookie:', error);
      if (error instanceof UnauthorizedException) {
        throw error;
      }
      throw new BadRequestException('Invalid JWT token');
    }
  }

  @Public()
  @Post('verify-session')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Verify Para session',
    description: 'Verifies a Para session using the verification token',
  })
  @ApiResponse({
    status: 200,
    description: 'Session verified successfully',
    type: VerifySessionResponseDto,
  })
  @ApiBadRequestResponse({
    description: 'Missing verification token',
    schema: {
      type: 'object',
      properties: {
        statusCode: { type: 'number', example: 400 },
        message: { type: 'string', example: 'Missing verification token' },
        error: { type: 'string', example: 'Bad Request' },
      },
    },
  })
  @ApiUnauthorizedResponse({
    description: 'Session expired or invalid',
    schema: {
      type: 'object',
      properties: {
        statusCode: { type: 'number', example: 403 },
        message: { type: 'string', example: 'Session expired' },
        error: { type: 'string', example: 'Forbidden' },
      },
    },
  })
  async verifySession(
    @Body() verifySessionDto: VerifySessionDto,
  ): Promise<VerifySessionResponseDto> {
    const userData = await this.authService.verifyParaSession(
      verifySessionDto.verificationToken,
    );
    return { userData };
  }

  //#endregion POST METHODS
}
