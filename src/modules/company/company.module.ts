import { Module, forwardRef } from '@nestjs/common';
import { PrismaModule } from '../../database/prisma.module';
import { AuthModule } from '../auth/auth.module';
import { CompanyRepository } from './company.repository';
import { CompanyService } from './company.service';
import { CompanyController } from './company.controller';
import { TeamMemberModule } from '../team-member/team-member.module';

@Module({
  imports: [PrismaModule, AuthModule, forwardRef(() => TeamMemberModule)],
  providers: [CompanyRepository, CompanyService],
  controllers: [CompanyController],
  exports: [CompanyService, CompanyRepository],
})
export class CompanyModule {}
