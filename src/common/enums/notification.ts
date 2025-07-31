export enum NotificationType {
  SEND = 'SEND',
  CONSUME = 'CLAIM',
  REFUND = 'REFUND',
  BATCH_SEND = 'BATCH_SEND',
  WALLET_CREATE = 'WALLET_CREATE',
}

export enum NotificationStatus {
  UNREAD = 'UNREAD',
  READ = 'READ',
}
