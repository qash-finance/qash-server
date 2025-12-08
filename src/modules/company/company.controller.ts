import {
  Controller,
  Get,
  Post,
  Body,
  HttpCode,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBadRequestResponse,
  ApiNotFoundResponse,
  ApiForbiddenResponse,
  ApiQuery,
} from '@nestjs/swagger';
import { Auth } from '../auth/decorators/auth.decorator';
import {
  CurrentUser,
  UserWithCompany,
} from '../auth/decorators/current-user.decorator';
import { JwtPayload } from '../../common/interfaces/jwt-payload';
import { CompanyService } from './company.service';
import { CreateCompanyDto, CompanyResponseDto } from './company.dto';
import { CompanyModel } from 'src/database/generated/models';
import { CompanyAuth } from '../auth/decorators/company-auth.decorator';

@ApiTags('Company Management')
@Controller('companies')
export class CompanyController {
  private readonly logger = new Logger(CompanyController.name);

  constructor(private readonly companyService: CompanyService) {}

  //#region GET METHODS
  // *************************************************
  // **************** GET METHODS ********************
  // *************************************************
  @Get()
  @CompanyAuth()
  @ApiOperation({
    summary: 'Get my company',
    description: 'Get my company information',
  })
  @ApiResponse({
    status: 200,
    description: 'Company retrieved successfully',
    type: CompanyResponseDto,
  })
  @ApiNotFoundResponse({ description: 'Company not found' })
  @ApiForbiddenResponse({ description: 'Access denied to this company' })
  async getMyCompany(
    @CurrentUser('withCompany') user: UserWithCompany,
  ): Promise<CompanyModel> {
    try {
      return this.companyService.getMyCompany(user.company.id);
    } catch (error) {
      throw error;
    }
  }
  //#endregion GET METHODS

  //#region POST METHODS
  // *************************************************
  // **************** POST METHODS *******************
  // *************************************************

  @Post()
  @Auth()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Create new company',
    description: 'Register a new company for KYB verification',
  })
  @ApiResponse({
    status: 201,
    description: 'Company created successfully',
    type: CompanyResponseDto,
  })
  @ApiBadRequestResponse({
    description: 'Invalid company data or registration number already exists',
  })
  async createCompany(
    @CurrentUser() user: JwtPayload,
    @Body() createCompanyDto: CreateCompanyDto,
  ): Promise<CompanyResponseDto> {
    try {
      const company = await this.companyService.createCompany(
        user.sub,
        createCompanyDto,
      );
      return company as CompanyResponseDto;
    } catch (error) {
      this.logger.error(`Create company failed for user ${user.sub}:`, error);
      throw error;
    }
  }
  //#endregion POST METHODS
}
