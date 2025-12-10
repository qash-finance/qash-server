import {
  Controller,
  Get,
  Post,
  Put,
  Body,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBadRequestResponse,
  ApiNotFoundResponse,
  ApiForbiddenResponse,
} from '@nestjs/swagger';
import { Auth } from '../auth/decorators/auth.decorator';
import {
  CurrentUser,
  UserWithCompany,
} from '../auth/decorators/current-user.decorator';
import { JwtPayload } from '../../common/interfaces/jwt-payload';
import { CompanyService } from './company.service';
import {
  CreateCompanyDto,
  UpdateCompanyDto,
  CompanyResponseDto,
} from './company.dto';
import { CompanyModel } from 'src/database/generated/models';
import { CompanyAuth } from '../auth/decorators/company-auth.decorator';

@ApiTags('Company')
@Controller('companies')
export class CompanyController {
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
    return this.companyService.getMyCompany(user.company.id);
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
  ): Promise<CompanyModel> {
    return this.companyService.createCompany(user.sub, createCompanyDto);
  }

  @Put()
  @CompanyAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Update company details',
    description: 'Update the current company information (owner/admin only)',
  })
  @ApiResponse({
    status: 200,
    description: 'Company updated successfully',
    type: CompanyResponseDto,
  })
  @ApiBadRequestResponse({ description: 'Invalid company data' })
  @ApiForbiddenResponse({ description: 'Insufficient permissions' })
  @ApiNotFoundResponse({ description: 'Company not found' })
  async updateCompany(
    @CurrentUser('withCompany') user: UserWithCompany,
    @Body() updateCompanyDto: UpdateCompanyDto,
  ): Promise<CompanyModel> {
    return this.companyService.updateCompany(
      user.company.id,
      user.sub,
      updateCompanyDto,
    );
  }
  //#endregion POST METHODS
}
