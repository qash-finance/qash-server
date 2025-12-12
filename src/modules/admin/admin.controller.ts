import { Controller, Put, Param, Body, ParseIntPipe } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam } from '@nestjs/swagger';
import { AdminAuth } from '../shared/decorators/admin-auth.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtPayload } from '../../common/interfaces/jwt-payload';
import { AdminCompanyService } from './services/admin-company.service';
import { UpdateVerificationStatusDto } from './admin.dto';

@ApiTags('Admin')
@AdminAuth()
@Controller('admin')
export class AdminController {
  constructor(private readonly adminCompanyService: AdminCompanyService) {}

  @Put('companies/:id/verification-status')
  @ApiOperation({
    summary: 'Update company verification status',
    description:
      'Updates the verification status of a specific company with optional admin notes.',
  })
  @ApiParam({
    name: 'id',
    description: 'Company ID',
    example: 1,
  })
  @ApiResponse({
    status: 200,
    description: 'Verification status updated successfully',
  })
  @ApiResponse({
    status: 404,
    description: 'Company not found',
  })
  async updateVerificationStatus(
    @CurrentUser() user: JwtPayload,
    @Param('id', ParseIntPipe) companyId: number,
    @Body() dto: UpdateVerificationStatusDto,
  ) {
    return this.adminCompanyService.updateVerificationStatus(
      user.sub,
      companyId,
      dto.status,
      dto.adminNotes,
    );
  }
}
