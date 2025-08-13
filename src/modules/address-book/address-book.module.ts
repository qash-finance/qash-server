import { Module } from '@nestjs/common';
import { AddressBookService } from './address-book.service';
import { AddressBookController } from './address-book.controller';
import { WalletAuthModule } from '../wallet-auth/wallet-auth.module';
import { PrismaModule } from '../../common/prisma/prisma.module';

@Module({
  imports: [PrismaModule, WalletAuthModule],
  providers: [AddressBookService],
  controllers: [AddressBookController],
  exports: [AddressBookService],
})
export class AddressBookModule {}
