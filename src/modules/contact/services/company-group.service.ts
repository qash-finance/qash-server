import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { CreateCompanyGroupDto } from '../contact.dto';
import { PrismaService } from '../../../database/prisma.service';
import { sanitizeInput } from 'src/common/utils/sanitize';
import { CompanyGroupRepository } from '../repositories/company-group.repository';
import { CompanyModel } from 'src/database/generated/models';

@Injectable()
export class CompanyGroupService {
  private readonly logger = new Logger(CompanyGroupService.name);

  constructor(
    private readonly companyGroupRepository: CompanyGroupRepository,
    private readonly prisma: PrismaService,
  ) {}

  /**
   * Get all groups for a company
   */
  async getAllCompanyGroups(companyId: number) {
    this.logger.log(`Getting all groups for company: ${companyId}`);

    return this.companyGroupRepository.findMany(
      { companyId },
      { orderBy: { order: 'asc' } },
    );
  }

  /**
   * Create a new group
   */
  async createNewCompanyGroup(
    dto: CreateCompanyGroupDto,
    company: CompanyModel,
  ) {
    return this.prisma.executeInTransaction(async (tx) => {
      dto = sanitizeInput(dto);
      // Check if group already exists
      const existingCompanyGroup = await this.companyGroupRepository.findOne({
        name: dto.name,
        shape: dto.shape,
        color: dto.color,
        companyId: company.id,
      });
      if (existingCompanyGroup) {
        throw new BadRequestException('Company group already exists');
      }
      // Get next order
      const order = await this.companyGroupRepository.getNextOrder(
        company.id,
        tx,
      );
      const newCompanyGroup = await this.companyGroupRepository.create(
        {
          name: dto.name,
          shape: dto.shape,
          color: dto.color,
          order,
          company: { connect: { id: company.id } },
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        tx,
      );
      return newCompanyGroup;
    }, 'createNewCompanyGroup');
  }
}
