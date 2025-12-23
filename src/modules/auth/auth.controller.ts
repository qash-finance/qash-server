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
import { AuthenticatedUser } from '../../common/interfaces/para-jwt-payload';
import {
  MessageResponseDto,
  UserMeResponseDto,
  SetJwtCookieDto,
  SetJwtCookieResponseDto,
} from './dto/auth.dto';
import { ErrorAuth } from 'src/common/constants/errors';

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
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<UserMeResponseDto> {
    return this.authService.getCurrentUserWithCompany(user.internalUserId);
  }

  //#endregion GET METHODS

  //#region POST METHODS
  // *************************************************
  // **************** POST METHODS *******************
  // *************************************************

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

      return { message: 'Logged out successfully' };
    } catch (error) {
      this.logger.error('Logout failed:', error);
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
      const originalAuth = request.headers.authorization;
      request.headers.authorization = `Bearer ${setJwtCookieDto.token}`;

      try {
        // Validate the JWT token using Passport strategy
        const paraPayload = await this.authService.validateParaJwt(
          setJwtCookieDto.token,
        );

        // Sync user to database
        await this.authService.syncUserFromParaToken(paraPayload);

        // Set HTTP-only cookie
        const isProduction = this.authService.isProduction();
        response.cookie('para-jwt', setJwtCookieDto.token, {
          httpOnly: true,
          secure: isProduction,
          sameSite: 'lax',
          maxAge: 60 * 60 * 1000,
          path: '/',
        });

        return { message: 'Cookie set successfully' };
      } finally {
        // Restore original authorization header
        request.headers.authorization = originalAuth;
      }
    } catch (error) {
      if (error instanceof UnauthorizedException) {
        throw error;
      }
      throw new BadRequestException(ErrorAuth.JwtValidationFailed);
    }
  }

  //#endregion POST METHODS
}
