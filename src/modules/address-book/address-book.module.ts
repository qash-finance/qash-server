import { Module } from '@nestjs/common';
import { AddressBookService } from './address-book.service';
import { AddressBookController } from './address-book.controller';
import { AddressBookRepository } from './address-book.repository';
import { CategoryRepository } from './category.repository';
import { WalletAuthModule } from '../wallet-auth/wallet-auth.module';
import { PrismaModule } from '../../database/prisma.module';

@Module({
  imports: [PrismaModule, WalletAuthModule],
  providers: [AddressBookService, AddressBookRepository, CategoryRepository],
  controllers: [AddressBookController],
  exports: [AddressBookService, AddressBookRepository, CategoryRepository],
})
export class AddressBookModule {}
