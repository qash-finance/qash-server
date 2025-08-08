import { Column, Entity } from 'typeorm';
import { BaseEntity } from '../../database/base.entity';
import { NoteStatus, NoteType } from '../../common/enums/note';
import { FaucetMetadata } from './transaction.dto';

@Entity({ name: 'transactions' })
export class TransactionEntity extends BaseEntity {
  @Column({ type: 'varchar' })
  public sender: string;

  @Column({ type: 'varchar' })
  public recipient: string;

  @Column({ type: 'jsonb' })
  public assets: {
    faucetId: string;
    amount: string;
    metadata: FaucetMetadata;
  }[];

  @Column({ type: 'boolean', default: true })
  public private: boolean;

  @Column({ type: 'boolean', default: true })
  public recallable: boolean;

  @Column({ type: 'timestamp', nullable: true })
  public recallableTime: Date | null;

  @Column({ type: 'integer', nullable: true })
  public recallableHeight: number | null;

  @Column({ type: 'jsonb' })
  public serialNumber: string[];

  @Column({ type: 'enum', enum: NoteType, nullable: true })
  public noteType: NoteType | null;

  @Column({ type: 'varchar', nullable: true })
  public noteId: string;

  @Column({ type: 'enum', enum: NoteStatus, default: NoteStatus.PENDING })
  public status: NoteStatus;

  @Column({ type: 'int', nullable: true })
  public requestPaymentId: number | null;
}
