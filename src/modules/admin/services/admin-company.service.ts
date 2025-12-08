import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { CompanyVerificationStatusEnum } from '../../../database/generated/client';
import { AdminCompanyRepository } from '../repositories/admin-company.repository';

@Injectable()
export class AdminCompanyService {
  private readonly logger = new Logger(AdminCompanyService.name);

  constructor(
    private readonly adminCompanyRepository: AdminCompanyRepository,
  ) {}

  /**
   * Update company verification status
   */
  async updateVerificationStatus(
    companyId: number,
    status: CompanyVerificationStatusEnum,
    adminNotes?: string,
  ) {
    const company =
      await this.adminCompanyRepository.findByIdWithFullDetails(companyId);
    if (!company) {
      throw new NotFoundException(`Company with ID ${companyId} not found`);
    }

    const updatedCompany =
      await this.adminCompanyRepository.updateVerificationStatus(
        companyId,
        status,
        adminNotes,
      );

    this.logger.log(
      `Successfully updated company ${companyId} verification status to ${status}`,
    );
    return updatedCompany;
  }
}
