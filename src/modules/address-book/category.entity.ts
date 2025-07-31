import { BaseEntity } from '../../database/base.entity';
import { Column, Entity, OneToMany } from 'typeorm';
import { AddressBookEntity } from './address-book.entity';

@Entity({ name: 'categories' })
export class CategoryEntity extends BaseEntity {
  @Column({ type: 'varchar', unique: true })
  name: string;

  @OneToMany(() => AddressBookEntity, (addressBook) => addressBook.category)
  addressBooks: AddressBookEntity[];
}
