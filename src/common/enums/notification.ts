export enum NotificationType {
  SEND = 'SEND',
  CONSUME = 'CLAIM',
  REFUND = 'REFUND',
  BATCH_SEND = 'BATCH_SEND',
  WALLET_CREATE = 'WALLET_CREATE',
  GIFT_SEND = 'GIFT_SEND',
  GIFT_OPEN = 'GIFT_OPEN',
}

export enum NotificationStatus {
  UNREAD = 'UNREAD',
  READ = 'READ',
}
