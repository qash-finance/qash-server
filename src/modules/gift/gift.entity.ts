import { NoteStatus, NoteType } from '../../common/enums/note';
import { BaseEntity } from '../../database/base.entity';
import { Entity, Column } from 'typeorm';
import { FaucetMetadata } from '../transactions/transaction.dto';

@Entity({ name: 'gift' })
export class GiftEntity extends BaseEntity {
  @Column({ type: 'varchar' })
  public sender: string;

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

  @Column({ type: 'jsonb' })
  public serialNumber: string[];

  @Column({ type: 'enum', enum: NoteType, default: NoteType.GIFT })
  public noteType: NoteType;

  @Column({ type: 'enum', enum: NoteStatus, default: NoteStatus.PENDING })
  public status: NoteStatus;

  @Column({ type: 'varchar' })
  public secretNumber: string;

  @Column({ type: 'timestamp', nullable: true })
  public recalledAt: Date | null;

  @Column({ type: 'timestamp', nullable: true })
  public openedAt: Date | null;

  @Column({ type: 'varchar', nullable: true })
  public noteId: string;
}
