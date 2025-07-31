import { BaseEntity } from 'src/database/base.entity';
import { Column, Entity, ManyToOne, JoinColumn } from 'typeorm';
import { CategoryEntity } from './category.entity';

@Entity({ name: 'address_book' })
export class AddressBookEntity extends BaseEntity {
  @Column({ type: 'varchar' })
  userAddress: string;

  @ManyToOne(() => CategoryEntity, (category) => category.addressBooks)
  @JoinColumn({ name: 'categoryId' })
  category: CategoryEntity;

  @Column({ type: 'varchar' })
  name: string;

  @Column({ type: 'varchar' })
  address: string;

  @Column({ type: 'varchar', nullable: true })
  token?: string;
}
