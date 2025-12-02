import { Module } from '@nestjs/common';
import { AddressBookService } from './address-book.service';
import { AddressBookController } from './address-book.controller';
import { AddressBookRepository } from './address-book.repository';
import { CategoryRepository } from './category.repository';
import { PrismaModule } from '../../database/prisma.module';

@Module({
  imports: [PrismaModule],
  providers: [AddressBookService, AddressBookRepository, CategoryRepository],
  controllers: [AddressBookController],
  exports: [AddressBookService, AddressBookRepository, CategoryRepository],
})
export class AddressBookModule {}
