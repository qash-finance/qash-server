import {
  Injectable,
  Logger,
  NotFoundException,
  ConflictException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { TeamMemberRepository } from './team-member.repository';
import { CompanyRepository } from '../company/company.repository';
import { MailService } from '../mail/mail.service';
import { UserRepository } from '../auth/repositories/user.repository';
import {
  CreateTeamMemberDto,
  UpdateTeamMemberDto,
  InviteTeamMemberDto,
  TeamMemberSearchQueryDto,
  AcceptInvitationDto,
  BulkInviteTeamMembersDto,
} from './team-member.dto';
import { TeamMemberRoleEnum } from '../../database/generated/client';

@Injectable()
export class TeamMemberService {
  private readonly logger = new Logger(TeamMemberService.name);

  constructor(
    private readonly teamMemberRepository: TeamMemberRepository,
    private readonly companyRepository: CompanyRepository,
    private readonly mailService: MailService,
    private readonly userRepository: UserRepository,
  ) {}

  /**
   * Create team member directly (internal use)
   */
  async createTeamMember(
    userId: number,
    createTeamMemberDto: CreateTeamMemberDto,
  ) {
    const { companyId } = createTeamMemberDto;

    // Check if user can manage team
    const canManage = await this.teamMemberRepository.hasPermission(
      companyId,
      userId,
      [TeamMemberRoleEnum.OWNER, TeamMemberRoleEnum.ADMIN],
    );

    if (!canManage) {
      throw new ForbiddenException(
        'Insufficient permissions to add team members',
      );
    }

    // Check if email is already invited
    const existing = await this.teamMemberRepository.findByCompanyAndEmail(
      companyId,
      createTeamMemberDto.email,
    );

    if (existing) {
      throw new ConflictException('Email already exists in this company');
    }

    this.logger.log(
      `Creating team member for company ${companyId}: ${createTeamMemberDto.email}`,
    );

    // Create user first (required for 1:1 relationship)
    const user = await this.userRepository.create({
      email: createTeamMemberDto.email,
    });

    return this.teamMemberRepository.create({
      ...createTeamMemberDto,
      userId: user.id,
      invitedBy: userId,
    });
  }

  /**
   * Invite team member via email
   */
  async inviteTeamMember(
    userId: number,
    companyId: number,
    inviteDto: InviteTeamMemberDto,
  ) {
    // Check if user can manage team
    const canManage = await this.teamMemberRepository.hasPermission(
      companyId,
      userId,
      [TeamMemberRoleEnum.OWNER, TeamMemberRoleEnum.ADMIN],
    );

    if (!canManage) {
      throw new ForbiddenException(
        'Insufficient permissions to invite team members',
      );
    }

    // Get company details
    const company = await this.companyRepository.findById(companyId);
    if (!company) {
      throw new NotFoundException('Company not found');
    }

    // Check if email is already invited
    const existing = await this.teamMemberRepository.findByCompanyAndEmail(
      companyId,
      inviteDto.email,
    );

    if (existing) {
      throw new ConflictException('Email already invited to this company');
    }

    this.logger.log(
      `Inviting team member to company ${companyId}: ${inviteDto.email}`,
    );

    // Create user first (required for 1:1 relationship)
    const user = await this.userRepository.create({
      email: inviteDto.email,
    });

    // Create team member record
    const teamMember = await this.teamMemberRepository.create({
      firstName: inviteDto.firstName,
      lastName: inviteDto.lastName,
      email: inviteDto.email,
      position: inviteDto.position,
      role: inviteDto.role,
      companyId,
      userId: user.id,
      invitedBy: userId,
      metadata: inviteDto.metadata,
    });

    // Send invitation email
    try {
      await this.sendInvitationEmail(teamMember, company);
    } catch (error) {
      this.logger.error('Failed to send invitation email:', error);
      // Don't throw error, invitation is created but email failed
    }

    return teamMember;
  }

  /**
   * Bulk invite team members
   */
  async bulkInviteTeamMembers(
    userId: number,
    companyId: number,
    bulkInviteDto: BulkInviteTeamMembersDto,
  ) {
    // Check if user can manage team
    const canManage = await this.teamMemberRepository.hasPermission(
      companyId,
      userId,
      [TeamMemberRoleEnum.OWNER, TeamMemberRoleEnum.ADMIN],
    );

    if (!canManage) {
      throw new ForbiddenException(
        'Insufficient permissions to invite team members',
      );
    }

    const results = [];
    const errors = [];

    for (const memberDto of bulkInviteDto.members) {
      try {
        const result = await this.inviteTeamMember(
          userId,
          companyId,
          memberDto,
        );
        results.push(result);
      } catch (error) {
        errors.push({
          email: memberDto.email,
          error: error.message,
        });
      }
    }

    return {
      successful: results,
      failed: errors,
      totalProcessed: bulkInviteDto.members.length,
      successCount: results.length,
      failureCount: errors.length,
    };
  }

  /**
   * Get team member by ID
   */
  async getTeamMemberById(teamMemberId: number, userId: number) {
    const teamMember =
      await this.teamMemberRepository.findByIdWithRelations(teamMemberId);

    if (!teamMember) {
      throw new NotFoundException('Team member not found');
    }

    // Check if user has access to this company
    const hasAccess = await this.teamMemberRepository.hasPermission(
      teamMember.companyId,
      userId,
      [
        TeamMemberRoleEnum.OWNER,
        TeamMemberRoleEnum.ADMIN,
        TeamMemberRoleEnum.VIEWER,
      ],
    );

    if (!hasAccess) {
      throw new ForbiddenException('Access denied');
    }

    return teamMember;
  }

  /**
   * Get team members for company
   */
  async getCompanyTeamMembers(
    companyId: number,
    userId: number,
    filters?: TeamMemberSearchQueryDto,
  ) {
    // Check if user has access to company
    const hasAccess = await this.teamMemberRepository.hasPermission(
      companyId,
      userId,
      [
        TeamMemberRoleEnum.OWNER,
        TeamMemberRoleEnum.ADMIN,
        TeamMemberRoleEnum.VIEWER,
      ],
    );

    if (!hasAccess) {
      throw new ForbiddenException('Access denied to this company');
    }

    return this.teamMemberRepository.findByCompany(companyId, filters);
  }

  /**
   * Update team member
   */
  async updateTeamMember(
    teamMemberId: number,
    userId: number,
    updateDto: UpdateTeamMemberDto,
  ) {
    const teamMember = await this.teamMemberRepository.findById(teamMemberId);
    if (!teamMember) {
      throw new NotFoundException('Team member not found');
    }

    // Check if user can manage team or is updating their own profile
    const canManage = await this.teamMemberRepository.hasPermission(
      teamMember.companyId,
      userId,
      [TeamMemberRoleEnum.OWNER, TeamMemberRoleEnum.ADMIN],
    );

    const isOwnProfile = teamMember.userId === userId;

    if (!canManage && !isOwnProfile) {
      throw new ForbiddenException(
        'Insufficient permissions to update team member',
      );
    }

    // If updating email, check for conflicts
    if (updateDto.email && updateDto.email !== teamMember.email) {
      const existing = await this.teamMemberRepository.findByCompanyAndEmail(
        teamMember.companyId,
        updateDto.email,
      );

      if (existing && existing.id !== teamMemberId) {
        throw new ConflictException('Email already exists in this company');
      }
    }

    this.logger.log(`Updating team member ${teamMemberId} by user ${userId}`);
    return this.teamMemberRepository.updateById(teamMemberId, updateDto);
  }

  /**
   * Update team member role
   */
  async updateTeamMemberRole(
    teamMemberId: number,
    userId: number,
    newRole: TeamMemberRoleEnum,
  ) {
    const teamMember = await this.teamMemberRepository.findById(teamMemberId);
    if (!teamMember) {
      throw new NotFoundException('Team member not found');
    }

    // Only owners can change roles, and admins can change viewer roles
    const userRole = await this.teamMemberRepository.getUserRoleInCompany(
      teamMember.companyId,
      userId,
    );

    if (!userRole) {
      throw new ForbiddenException('Access denied');
    }

    // Role change permissions
    if (userRole === TeamMemberRoleEnum.OWNER) {
      // Owners can change any role
    } else if (userRole === TeamMemberRoleEnum.ADMIN) {
      // Admins can only change viewer roles and cannot promote to owner
      if (
        teamMember.role !== TeamMemberRoleEnum.VIEWER ||
        newRole === TeamMemberRoleEnum.OWNER
      ) {
        throw new ForbiddenException(
          'Insufficient permissions to change this role',
        );
      }
    } else {
      throw new ForbiddenException('Insufficient permissions to change roles');
    }

    // Prevent removing the last owner
    if (
      teamMember.role === TeamMemberRoleEnum.OWNER &&
      newRole !== TeamMemberRoleEnum.OWNER
    ) {
      const ownerCount = await this.teamMemberRepository.countByCompany(
        teamMember.companyId,
        { role: TeamMemberRoleEnum.OWNER, isActive: true },
      );

      if (ownerCount <= 1) {
        throw new BadRequestException(
          'Cannot remove the last owner of the company',
        );
      }
    }

    this.logger.log(
      `Updating role of team member ${teamMemberId} from ${teamMember.role} to ${newRole}`,
    );

    return this.teamMemberRepository.updateRole(teamMemberId, newRole);
  }

  /**
   * Remove team member
   */
  async removeTeamMember(teamMemberId: number, userId: number) {
    const teamMember = await this.teamMemberRepository.findById(teamMemberId);
    if (!teamMember) {
      throw new NotFoundException('Team member not found');
    }

    // Check permissions
    const canManage = await this.teamMemberRepository.hasPermission(
      teamMember.companyId,
      userId,
      [TeamMemberRoleEnum.OWNER, TeamMemberRoleEnum.ADMIN],
    );

    if (!canManage) {
      throw new ForbiddenException(
        'Insufficient permissions to remove team member',
      );
    }

    // Prevent removing the last owner
    if (teamMember.role === TeamMemberRoleEnum.OWNER) {
      const ownerCount = await this.teamMemberRepository.countByCompany(
        teamMember.companyId,
        { role: TeamMemberRoleEnum.OWNER, isActive: true },
      );

      if (ownerCount <= 1) {
        throw new BadRequestException(
          'Cannot remove the last owner of the company',
        );
      }
    }

    this.logger.log(`Removing team member ${teamMemberId} by user ${userId}`);
    return this.teamMemberRepository.deactivate(teamMemberId);
  }

  /**
   * Accept invitation (when user creates account)
   */
  async acceptInvitation(
    teamMemberId: number,
    userId: number,
    acceptDto?: AcceptInvitationDto,
  ) {
    const teamMember = await this.teamMemberRepository.findById(teamMemberId);
    if (!teamMember) {
      throw new NotFoundException('Invitation not found');
    }

    if (teamMember.userId) {
      throw new BadRequestException('Invitation already accepted');
    }

    if (!teamMember.isActive) {
      throw new BadRequestException('Invitation is no longer active');
    }

    this.logger.log(`User ${userId} accepting invitation ${teamMemberId}`);

    // Link team member to user account
    const updateData: any = {
      joinedAt: new Date(),
    };

    if (acceptDto?.profilePicture) {
      updateData.profilePicture = acceptDto.profilePicture;
    }

    if (acceptDto?.metadata) {
      const existingMetadata =
        teamMember.metadata && typeof teamMember.metadata === 'object'
          ? teamMember.metadata
          : {};
      updateData.metadata = {
        ...existingMetadata,
        ...acceptDto.metadata,
      };
    }

    return this.teamMemberRepository.linkToUser(teamMemberId, userId);
  }

  /**
   * Get pending invitations for user email
   */
  async getPendingInvitations(email: string) {
    return this.teamMemberRepository.findPendingInvitationsByEmail(email);
  }

  /**
   * Get team member statistics for company
   */
  async getTeamStats(companyId: number, userId: number) {
    // Check access
    const hasAccess = await this.teamMemberRepository.hasPermission(
      companyId,
      userId,
      [
        TeamMemberRoleEnum.OWNER,
        TeamMemberRoleEnum.ADMIN,
        TeamMemberRoleEnum.VIEWER,
      ],
    );

    if (!hasAccess) {
      throw new ForbiddenException('Access denied');
    }

    return this.teamMemberRepository.getCompanyStats(companyId);
  }

  /**
   * Get user's team membership (single company since 1:1 relationship)
   */
  async getUserMemberships(userId: number) {
    const teamMember = await this.teamMemberRepository.findByUserId(userId);
    return teamMember ? [teamMember] : []; // Return as array for backward compatibility
  }

  /**
   * Get user's single team membership
   */
  async getUserMembership(userId: number) {
    return this.teamMemberRepository.findByUserId(userId);
  }

  /**
   * Send invitation email
   */
  private async sendInvitationEmail(teamMember: any, company: any) {
    const subject = `Invitation to join ${company.companyName}`;
    const html = this.getInvitationEmailTemplate(teamMember, company);

    await this.mailService.sendEmail({
      to: teamMember.email,
      subject,
      html,
    });
  }

  /**
   * Get invitation email template
   */
  private getInvitationEmailTemplate(teamMember: any, company: any): string {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Team Invitation</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { text-align: center; margin-bottom: 30px; }
          .invitation-box { 
            background: #f8f9fa; 
            border: 2px solid #007bff; 
            border-radius: 8px; 
            padding: 20px; 
            margin: 20px 0; 
          }
          .company-info {
            background: #e9ecef;
            padding: 15px;
            border-radius: 4px;
            margin: 15px 0;
          }
          .role-badge {
            display: inline-block;
            background: #007bff;
            color: white;
            padding: 4px 12px;
            border-radius: 20px;
            font-size: 14px;
            font-weight: bold;
          }
          .cta-button {
            display: inline-block;
            background: #007bff;
            color: white;
            padding: 12px 24px;
            text-decoration: none;
            border-radius: 4px;
            margin: 20px 0;
          }
          .footer { 
            text-align: center; 
            margin-top: 30px; 
            font-size: 14px; 
            color: #666; 
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>You're Invited to Join a Team!</h1>
          </div>
          
          <p>Hello ${teamMember.firstName} ${teamMember.lastName},</p>
          
          <p>You have been invited to join <strong>${company.companyName}</strong> as a team member.</p>
          
          <div class="invitation-box">
            <h3>Invitation Details</h3>
            <div class="company-info">
              <strong>Company:</strong> ${company.companyName}<br>
              <strong>Registration:</strong> ${company.registrationNumber}<br>
              <strong>Your Role:</strong> <span class="role-badge">${teamMember.role}</span><br>
              ${teamMember.position ? `<strong>Position:</strong> ${teamMember.position}<br>` : ''}
            </div>
          </div>
          
          <p>To accept this invitation and join the team:</p>
          <ol>
            <li>Create an account or sign in with this email address</li>
            <li>Navigate to your pending invitations</li>
            <li>Accept the invitation from ${company.companyName}</li>
          </ol>
          
          <div style="text-align: center;">
            <a href="#" class="cta-button">Accept Invitation</a>
          </div>
          
          <p><strong>What you'll be able to do:</strong></p>
          <ul>
            ${teamMember.role === 'OWNER' ? '<li>Full company management access</li><li>Manage team members and permissions</li><li>Update company information</li>' : ''}
            ${teamMember.role === 'ADMIN' ? '<li>Manage team members</li><li>Update company information</li><li>View all company data</li>' : ''}
            ${teamMember.role === 'VIEWER' ? '<li>View company information</li><li>Access team directory</li>' : ''}
          </ul>
          
          <p>If you have any questions, please contact the person who invited you.</p>
          
          <div class="footer">
            <p>This invitation was sent to ${teamMember.email}</p>
            <p>If you didn't expect this invitation, you can safely ignore this email.</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }
}
