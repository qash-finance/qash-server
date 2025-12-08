import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../database/prisma.service';
import { CompanyVerificationStatusEnum } from '../../../database/generated/client';
import { CompanyModel } from '../../../database/generated/models';

export interface AdminCompanyFilters {
  verificationStatus?: CompanyVerificationStatusEnum;
  country?: string;
  companyType?: string;
  search?: string; // Search by company name or registration number
}

export interface AdminCompanyStats {
  totalCompanies: number;
  pendingVerification: number;
  verifiedCompanies: number;
  rejectedCompanies: number;
  companiesByCountry: Record<string, number>;
  companiesByType: Record<string, number>;
}

@Injectable()
export class AdminCompanyRepository {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Update company verification status
   */
  async updateVerificationStatus(
    id: number,
    status: CompanyVerificationStatusEnum,
    adminNotes?: string,
  ): Promise<CompanyModel> {
    return this.prisma.company.update({
      where: { id },
      data: {
        verificationStatus: status,
        ...(adminNotes && { metadata: { adminNotes } }),
        updatedAt: new Date(),
      },
    });
  }

  /**
   * Get company by ID with full details for admin view
   */
  async findByIdWithFullDetails(id: number): Promise<CompanyModel | null> {
    return this.prisma.company.findUnique({
      where: { id },
      include: {
        teamMembers: {
          include: {
            user: true,
            inviter: true,
          },
          orderBy: { createdAt: 'asc' },
        },
        contacts: {
          include: {
            group: true,
          },
          orderBy: { createdAt: 'desc' },
          take: 10, // Latest 10 contacts
        },
        _count: {
          select: {
            teamMembers: true,
            contacts: true,
          },
        },
      },
    });
  }
}
