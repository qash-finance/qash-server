import { Module } from '@nestjs/common';
import { CompanyContactService } from './services/company-contact.service';
import { ContactController } from './contact.controller';
import { CompanyContactRepository } from './repositories/company-contact.repository';
import { CompanyGroupRepository } from './repositories/company-group.repository';
import { PrismaModule } from '../../database/prisma.module';
import { CompanyGroupService } from './services/company-group.service';
import { CompanyModule } from '../company/company.module';
import { TeamMemberModule } from '../team-member/team-member.module';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [
    PrismaModule,
    AuthModule, // Import AuthModule for JwtAuthService and guards
    CompanyModule,
    TeamMemberModule,
  ],
  providers: [
    CompanyGroupService,
    CompanyContactService,
    CompanyContactRepository,
    CompanyGroupRepository,
  ],
  controllers: [ContactController],
  exports: [
    CompanyContactService,
    CompanyGroupService,
    CompanyContactRepository,
    CompanyGroupRepository,
  ],
})
export class ContactModule {}
