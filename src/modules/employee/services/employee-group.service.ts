import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { CreateCompanyGroupDto } from '../employee.dto';
import { PrismaService } from '../../../database/prisma.service';
import { sanitizeInput } from 'src/common/utils/sanitize';
import { EmployeeGroupRepository } from '../repositories/employee-group.repository';
import { CompanyModel } from 'src/database/generated/models';

@Injectable()
export class EmployeeGroupService {
  private readonly logger = new Logger(EmployeeGroupService.name);

  constructor(
    private readonly employeeGroupRepository: EmployeeGroupRepository,
    private readonly prisma: PrismaService,
  ) {}

  /**
   * Get all groups for a company
   */
  async getAllEmployeeGroups(companyId: number) {
    return this.employeeGroupRepository.findMany(
      { companyId },
      { orderBy: { order: 'asc' } },
    );
  }

  /**
   * Create a new group
   */
  async createNewEmployeeGroup(
    dto: CreateCompanyGroupDto,
    company: CompanyModel,
  ) {
    return this.prisma.executeInTransaction(async (tx) => {
      dto = sanitizeInput(dto);
      // Check if group already exists
      const existingCompanyGroup = await this.employeeGroupRepository.findOne({
        name: dto.name,
        shape: dto.shape,
        color: dto.color,
        companyId: company.id,
      });
      if (existingCompanyGroup) {
        throw new BadRequestException('Company group already exists');
      }
      // Get next order
      const order = await this.employeeGroupRepository.getNextOrder(
        company.id,
        tx,
      );
      const newCompanyGroup = await this.employeeGroupRepository.create(
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
    }, 'createNewEmployeeGroup');
  }
}
