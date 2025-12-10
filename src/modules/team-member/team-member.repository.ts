import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { TeamMemberModel } from '../../database/generated/models/TeamMember';
import { Prisma, TeamMemberRoleEnum } from '../../database/generated/client';
import {
  BaseRepository,
  PrismaTransactionClient,
} from 'src/database/base.repository';

export interface CreateTeamMemberData {
  firstName: string;
  lastName: string;
  email: string;
  position?: string;
  profilePicture?: string;
  role: TeamMemberRoleEnum;
  companyId: number;
  userId: number; // Required since TeamMember has 1:1 relationship with User
  invitedBy?: number;
  metadata?: any;
}

export interface UpdateTeamMemberData {
  firstName?: string;
  lastName?: string;
  email?: string;
  position?: string;
  profilePicture?: string;
  role?: TeamMemberRoleEnum;
  isActive?: boolean;
  joinedAt?: Date;
  metadata?: any;
}

export interface TeamMemberWithRelations extends TeamMemberModel {
  company?: any;
  user?: any;
  inviter?: any;
}

export interface TeamMemberFilters {
  companyId?: number;
  role?: TeamMemberRoleEnum;
  isActive?: boolean;
  hasUser?: boolean; // Filter by whether they have a user account
  search?: string; // Search in name or email
}

@Injectable()
export class TeamMemberRepository extends BaseRepository<
  TeamMemberModel,
  Prisma.TeamMemberWhereInput,
  Prisma.TeamMemberCreateInput,
  Prisma.TeamMemberUpdateInput
> {
  constructor(prisma: PrismaService) {
    super(prisma);
  }

  protected getModel(tx?: PrismaTransactionClient) {
    return tx ? tx.teamMember : this.prisma.teamMember;
  }

  protected getModelName(): string {
    return 'TeamMember';
  }

  /**
   * Find team member by ID
   */
  async findById(
    id: number,
    tx?: PrismaTransactionClient,
  ): Promise<TeamMemberModel | null> {
    return this.findOne({ id }, tx);
  }

  /**
   * Find team member by ID with relations
   */
  async findByIdWithRelations(
    id: number,
  ): Promise<TeamMemberWithRelations | null> {
    return this.prisma.teamMember.findUnique({
      where: { id },
      include: {
        company: {
          select: {
            id: true,
            companyName: true,
            registrationNumber: true,
          },
        },
        user: {
          select: {
            id: true,
            email: true,
          },
        },
        inviter: {
          select: {
            id: true,
            email: true,
          },
        },
      },
    });
  }

  /**
   * Find team member by company and email
   */
  async findByCompanyAndEmail(
    companyId: number,
    email: string,
  ): Promise<TeamMemberModel | null> {
    return this.prisma.teamMember.findFirst({
      where: {
        companyId,
        user: {
          email,
        },
      },
      include: {
        user: true,
        company: true,
      },
    }) as Promise<TeamMemberModel | null>;
  }

  /**
   * Find team members by company
   */
  async findByCompany(
    companyId: number,
    filters?: TeamMemberFilters,
  ): Promise<TeamMemberModel[]> {
    const whereClause: any = {
      companyId,
    };

    if (filters) {
      if (filters.role) {
        whereClause.role = filters.role;
      }
      if (typeof filters.isActive === 'boolean') {
        whereClause.isActive = filters.isActive;
      }
      if (typeof filters.hasUser === 'boolean') {
        whereClause.userId = filters.hasUser ? { not: null } : null;
      }
      if (filters.search) {
        whereClause.OR = [
          { firstName: { contains: filters.search, mode: 'insensitive' } },
          { lastName: { contains: filters.search, mode: 'insensitive' } },
          { email: { contains: filters.search, mode: 'insensitive' } },
          { position: { contains: filters.search, mode: 'insensitive' } },
        ];
      }
    }

    return this.prisma.teamMember.findMany({
      where: whereClause,
      orderBy: [{ role: 'asc' }, { createdAt: 'asc' }],
    });
  }

  /**
   * Find team member by user ID (returns single company since 1:1 relationship)
   */
  async findByUserId(
    userId: number,
    tx?: PrismaTransactionClient,
  ): Promise<TeamMemberWithRelations | null> {
    return this.prisma.teamMember.findUnique({
      where: {
        userId,
      },
      include: {
        company: {
          select: {
            id: true,
            companyName: true,
            registrationNumber: true,
            verificationStatus: true,
            isActive: true,
          },
        },
      },
    });
  }

  /**
   * Update team member by ID
   */
  async updateById(
    id: number,
    data: UpdateTeamMemberData,
  ): Promise<TeamMemberModel> {
    return this.prisma.teamMember.update({
      where: { id },
      data,
    });
  }

  /**
   * Check if user has permission in company
   */
  async hasPermission(
    companyId: number,
    userId: number,
    requiredRoles: TeamMemberRoleEnum[],
  ): Promise<boolean> {
    const teamMember = await this.prisma.teamMember.findFirst({
      where: {
        companyId,
        userId,
        isActive: true,
        role: { in: requiredRoles },
      },
    });
    return !!teamMember;
  }

  /**
   * Get user's role in company
   */
  async getUserRoleInCompany(
    companyId: number,
    userId: number,
  ): Promise<TeamMemberRoleEnum | null> {
    const teamMember = await this.prisma.teamMember.findFirst({
      where: {
        companyId,
        userId,
        isActive: true,
      },
      select: { role: true },
    });
    return teamMember?.role || null;
  }

  /**
   * Count team members by company
   */
  async countByCompany(
    companyId: number,
    filters?: TeamMemberFilters,
  ): Promise<number> {
    const whereClause: any = { companyId };

    if (filters) {
      if (filters.role) {
        whereClause.role = filters.role;
      }
      if (typeof filters.isActive === 'boolean') {
        whereClause.isActive = filters.isActive;
      }
    }

    return this.prisma.teamMember.count({ where: whereClause });
  }

  /**
   * Get team member statistics for company
   */
  async getCompanyStats(companyId: number) {
    const [total, owners, admins, viewers, active, pending] = await Promise.all(
      [
        this.prisma.teamMember.count({ where: { companyId } }),
        this.prisma.teamMember.count({
          where: { companyId, role: 'OWNER' },
        }),
        this.prisma.teamMember.count({
          where: { companyId, role: 'ADMIN' },
        }),
        this.prisma.teamMember.count({
          where: { companyId, role: 'VIEWER' },
        }),
        this.prisma.teamMember.count({
          where: { companyId, isActive: true },
        }),
        this.prisma.teamMember.count({
          where: { companyId, userId: null, isActive: true },
        }),
      ],
    );

    return {
      total,
      owners,
      admins,
      viewers,
      active,
      pending, // Members without user accounts (invited but not joined)
    };
  }

  /**
   * Link team member to user account
   */
  async linkToUser(id: number, userId: number): Promise<TeamMemberModel> {
    return this.prisma.teamMember.update({
      where: { id },
      data: {
        userId,
        joinedAt: new Date(),
      },
    });
  }

  /**
   * Deactivate team member
   */
  async deactivate(id: number): Promise<TeamMemberModel> {
    return this.prisma.teamMember.update({
      where: { id },
      data: { isActive: false },
    });
  }

  /**
   * Activate team member
   */
  async activate(id: number): Promise<TeamMemberModel> {
    return this.prisma.teamMember.update({
      where: { id },
      data: { isActive: true },
    });
  }

  /**
   * Find pending invitations by email
   */
  async findPendingInvitationsByEmail(
    email: string,
  ): Promise<TeamMemberWithRelations[]> {
    return this.prisma.teamMember.findMany({
      where: {
        user: {
          email,
        },
        isActive: true,
      },
      include: {
        company: {
          select: {
            id: true,
            companyName: true,
            registrationNumber: true,
          },
        },
        inviter: {
          select: {
            id: true,
            email: true,
          },
        },
      },
      orderBy: { invitedAt: 'desc' },
    });
  }

  /**
   * Update team member role
   */
  async updateRole(
    id: number,
    role: TeamMemberRoleEnum,
  ): Promise<TeamMemberModel> {
    return this.prisma.teamMember.update({
      where: { id },
      data: { role },
    });
  }

  /**
   * Check if email is already invited to company
   */
  async isEmailInvited(companyId: number, email: string): Promise<boolean> {
    const existing = await this.prisma.teamMember.findFirst({
      where: {
        companyId,
        user: {
          email,
        },
      },
      include: {
        user: true,
        company: true,
      },
    });
    return !!existing;
  }
}
