import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AddressBookEntity } from './address-book.entity';
import { CategoryEntity } from './category.entity';
import { AddressBookRepository } from './address-book.repository';
import { AddressBookService } from './address-book.service';
import { AddressBookController } from './address-book.controller';
import { WalletAuthModule } from '../wallet-auth/wallet-auth.module';
import { CategoryRepository } from './category.repository';

@Module({
  imports: [
    TypeOrmModule.forFeature([AddressBookEntity, CategoryEntity]),
    WalletAuthModule,
  ],
  providers: [AddressBookRepository, AddressBookService, CategoryRepository],
  controllers: [AddressBookController],
  exports: [AddressBookService, AddressBookRepository],
})
export class AddressBookModule {}
