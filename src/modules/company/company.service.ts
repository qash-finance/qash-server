import {
  Injectable,
  Logger,
  NotFoundException,
  ConflictException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { CompanyRepository } from './company.repository';
import { TeamMemberRepository } from '../team-member/team-member.repository';
import {
  CreateCompanyDto,
  UpdateCompanyDto,
  CompanySearchQueryDto,
} from './company.dto';
import { TeamMemberRoleEnum } from '../../database/generated/client';
import { CompanyModel } from 'src/database/generated/models';
import { UserRepository } from '../auth/repositories/user.repository';
import { handleError } from 'src/common/utils/errors';

@Injectable()
export class CompanyService {
  private readonly logger = new Logger(CompanyService.name);

  constructor(
    private readonly companyRepository: CompanyRepository,
    private readonly teamMemberRepository: TeamMemberRepository,
    private readonly userRepository: UserRepository,
  ) {}

  /**
   * Create new company
   */
  async createCompany(userId: number, dto: CreateCompanyDto) {
    const existingCompany =
      await this.companyRepository.findByRegistrationNumber(
        dto.registrationNumber,
      );

    if (existingCompany) {
      throw new ConflictException(
        'Company with this registration number already exists',
      );
    }

    try {
      // get user email by userId
      const user = await this.userRepository.findById(userId);

      // Find if the user is already a team member of any company
      const existingTeamMember =
        await this.teamMemberRepository.findByUserId(userId);
      console.log('existingTeamMember', existingTeamMember);
      if (existingTeamMember) {
        throw new ConflictException(
          'User is already a team member of another company',
        );
      }

      const company = await this.companyRepository.create({
        ...(({ companyOwnerFirstName, companyOwnerLastName, ...rest }) => rest)(
          dto,
        ),
      });

      await this.teamMemberRepository.create({
        firstName: dto.companyOwnerFirstName,
        lastName: dto.companyOwnerLastName,
        email: user.email,
        role: TeamMemberRoleEnum.OWNER,
        companyId: company.id,
        userId,
      });

      return company;
    } catch (error) {
      handleError(error, this.logger);
    }
  }

  /**
   * Get company by ID
   */
  async getCompanyById(companyId: number, userId?: number) {
    const company = await this.companyRepository.findById(companyId);

    if (!company) {
      throw new NotFoundException('Company not found');
    }

    // Check if user has access to this company
    if (userId) {
      const hasAccess = await this.hasCompanyAccess(companyId, userId);
      if (!hasAccess) {
        throw new ForbiddenException('Access denied to this company');
      }
    }

    return company;
  }

  async getMyCompany(companyId: number): Promise<CompanyModel | null> {
    // find company details, its team members and creator
    return this.companyRepository.findByIdWithTeamMembers(companyId);
  }

  async getCompanyByUserId(userId: number): Promise<CompanyModel | null> {
    const teamMember = await this.teamMemberRepository.findByUserId(userId);
    return teamMember?.company || null;
  }

  /**
   * Update company
   */
  async updateCompany(
    companyId: number,
    userId: number,
    updateCompanyDto: UpdateCompanyDto,
  ) {
    // Check if user is owner or admin
    const hasPermission = await this.teamMemberRepository.hasPermission(
      companyId,
      userId,
      [TeamMemberRoleEnum.OWNER, TeamMemberRoleEnum.ADMIN],
    );

    if (!hasPermission) {
      throw new ForbiddenException(
        'Insufficient permissions to update company',
      );
    }

    const company = await this.companyRepository.findById(companyId);
    if (!company) {
      throw new NotFoundException('Company not found');
    }

    this.logger.log(`Updating company ${companyId} by user ${userId}`);
    return this.companyRepository.updateById(companyId, updateCompanyDto);
  }

  /**
   * Deactivate company
   */
  async deactivateCompany(companyId: number, userId: number) {
    // Only company owner can deactivate
    const isOwner = await this.companyRepository.isCompanyOwner(
      companyId,
      userId,
    );
    if (!isOwner) {
      throw new ForbiddenException('Only company owner can deactivate company');
    }

    this.logger.log(`Deactivating company ${companyId} by owner ${userId}`);
    return this.companyRepository.deactivate(companyId);
  }

  /**
   * Activate company
   */
  async activateCompany(companyId: number, userId: number) {
    // Only company owner can activate
    const isOwner = await this.companyRepository.isCompanyOwner(
      companyId,
      userId,
    );
    if (!isOwner) {
      throw new ForbiddenException('Only company owner can activate company');
    }

    this.logger.log(`Activating company ${companyId} by owner ${userId}`);
    return this.companyRepository.activate(companyId);
  }

  /**
   * Get company statistics
   */
  async getCompanyStats(userId?: number) {
    return this.companyRepository.getStats(userId);
  }

  /**
   * Search companies (admin function)
   */
  async searchCompanies(
    filters: CompanySearchQueryDto & { skip?: number; take?: number },
  ) {
    return this.companyRepository.searchCompanies(filters);
  }

  /**
   * Check if user has access to company
   */
  async hasCompanyAccess(companyId: number, userId: number): Promise<boolean> {
    // Check if user is company creator
    const isOwner = await this.companyRepository.isCompanyOwner(
      companyId,
      userId,
    );
    if (isOwner) {
      return true;
    }

    // Check if user is team member
    const teamMember = await this.teamMemberRepository.findByCompany(
      companyId,
      {
        // This would need to be implemented to filter by userId
      },
    );

    // For now, let's check if user has any role in the company
    const hasRole = await this.teamMemberRepository.hasPermission(
      companyId,
      userId,
      [
        TeamMemberRoleEnum.OWNER,
        TeamMemberRoleEnum.ADMIN,
        TeamMemberRoleEnum.VIEWER,
      ],
    );

    return hasRole;
  }

  /**
   * Get user's role in company
   */
  async getUserRoleInCompany(companyId: number, userId: number) {
    return this.teamMemberRepository.getUserRoleInCompany(companyId, userId);
  }

  /**
   * Check if user can manage team (owner or admin)
   */
  async canManageTeam(companyId: number, userId: number): Promise<boolean> {
    return this.teamMemberRepository.hasPermission(companyId, userId, [
      TeamMemberRoleEnum.OWNER,
      TeamMemberRoleEnum.ADMIN,
    ]);
  }

  /**
   * Check if user is company owner
   */
  async isCompanyOwner(companyId: number, userId: number): Promise<boolean> {
    return this.companyRepository.isCompanyOwner(companyId, userId);
  }

  /**
   * Get company where user is a team member (single company since 1:1 relationship)
   */
  async getUserMemberCompanies(userId: number) {
    const teamMember = await this.teamMemberRepository.findByUserId(userId);
    return teamMember ? [teamMember] : []; // Return as array for backward compatibility
  }

  /**
   * Validate company exists and user has access
   */
  async validateCompanyAccess(companyId: number, userId: number) {
    const company = await this.companyRepository.findById(companyId);
    if (!company) {
      throw new NotFoundException('Company not found');
    }

    if (!company.isActive) {
      throw new BadRequestException('Company is deactivated');
    }

    const hasAccess = await this.hasCompanyAccess(companyId, userId);
    if (!hasAccess) {
      throw new ForbiddenException('Access denied to this company');
    }

    return company;
  }
}
