export enum ErrorToken {
  NotFound = 'Token not found',
  InvalidFormat = 'Invalid token format',
  Expired = 'Token expired',
}
export enum ErrorMail {
  EmailNotSent = 'Email was not sent1',
}
export enum ErrorUser {
  NotFound = 'User not found',
  RoleSelfAssign = 'Cannot assign role to self',
  EmailExists = 'Email already in use',
  InvalidReferralCode = 'Invalid referral code',
  ReferralCodeMaxedOut = 'Referral code maxed out',
  UserAlreadyActive = 'User already active',
  UserNotActive = 'User is not active, verify your email',
  NoRole = 'User has no role',
  AdminRoleCannotBeChanged = 'Admin role cannot be changed',
  RoleCannotBeChanged = 'Role cannot be changed',
}

export enum ErrorQuery {
  BadIdString = 'Bad id string',
}
export enum ErrorReferralCode {
  ReferralCodeNotFound = 'Referral code not found',
}

export enum ErrorTransaction {
  InvalidSenderOrRecipient = 'Invalid sender or recipient',
  InvalidRecallableTime = 'Invalid recallable time',
  InvalidAssetsLength = 'Invalid assets length',
  InvalidAssets = 'Invalid assets',
  InvalidSerialNumber = 'Invalid serial number',
  TransactionNotFound = 'Transaction not found',
  InvalidTransactionId = 'Invalid transaction id',
  SenderRecipientSame = 'Sender and recipient cannot be the same',
  InvalidAddress = 'Invalid address format',
  InvalidAmount = 'Invalid amount',
  InvalidToken = 'Invalid token address',
  NotOwner = 'Sender is not the owner of the transactions',
  NotRecipient = 'Caller is not the recipient of the transactions',
  ItemsArrayRequired = 'Items array is required and cannot be empty',
}

export enum ErrorAddressBook {
  NameAlreadyExists = 'Name already exists',
  InvalidAddress = 'Invalid address format',
  InvalidName = 'Invalid name format',
  InvalidCategory = 'Invalid category format',
  AddressAlreadyExists = 'Address already exists in this category',
  SelfAddressNotAllowed = 'Cannot add your own address to address book',
  CategoryNotFound = 'Category not found',
  CategoryAlreadyExists = 'Category already exists',
}

export enum ErrorRequestPayment {
  NotFound = 'Request payment not found',
  NotPending = 'Request payment is not pending',
  InvalidAddress = 'Invalid address format',
  InvalidAmount = 'Invalid amount',
  InvalidToken = 'Invalid token address',
  InvalidTxid = 'Invalid txid',
  InvalidMessage = 'Invalid message',
  SelfRequestNotAllowed = 'Cannot request payment from yourself',
  NotAccepted = 'Request payment is not accepted',
  NotGroupPayment = 'Request payment is not a group payment',
  InvalidRequestID = 'Invalid request ID',
  MembersArrayRequired = 'Members array is required and cannot be empty',
  DuplicateMembers = 'Duplicate members are not allowed',
  OwnerInGroupPayment = 'Owner cannot be a member in their own group payment',
}

export enum ErrorGift {
  GiftNotFound = 'Gift not found',
  InvalidAddress = 'Invalid address format',
  InvalidAmount = 'Invalid amount',
  InvalidToken = 'Invalid token address',
  InvalidSerialNumber = 'Invalid serial number',
  GiftAlreadyOpened = 'Gift has already been opened',
  GiftExpired = 'Gift has expired',
  SelfGiftNotAllowed = 'Cannot send gift to yourself',
}

export enum ErrorGroupPayment {
  GroupNotFound = 'Group not found',
  GroupNameAlreadyExists = 'Group name already exists',
  MembersOrGroupIdRequired = 'Members or groupId required',
  InvalidGroupName = 'Invalid group name format',
  InvalidAddress = 'Invalid address format',
  InvalidAmount = 'Invalid amount',
  InvalidToken = 'Invalid token address',
  DuplicateMembers = 'Duplicate members are not allowed',
  EmptyMembersList = 'Members list cannot be empty',
  OwnerInMembersList = 'Owner cannot be included in members list',
  InsufficientMembers = 'At least 2 members are required for group payment',
  TooManyMembers = 'Maximum 50 members allowed per group',
  PaymentNotFound = 'Payment not found',
  PaymentAlreadyCompleted = 'Payment has already been completed',
  PaymentExpired = 'Payment has expired',
  MemberNotInGroup = 'Member is not part of this group',
  InvalidLinkCode = 'Invalid link code',
  NotOwner = 'Only the group owner can view payments for this group',
  InvalidGroupId = 'Invalid group ID',
  InvalidMemberCount = 'Invalid member count',
  InvalidQuickSharePayment = 'This endpoint is only for Quick Share payments',
  PaymentNotPending = 'Cannot add members to a completed or expired payment',
  UserAlreadyMember = 'User is already a member of this Quick Share',
  NoAvailableSlots = 'No available slots in this Quick Share payment',
  InvalidMemberIndex = 'Invalid member index',
}

export enum ErrorWalletAuth {
  InvalidChallenge = 'Invalid or expired challenge',
  InvalidChallengeResponse = 'Invalid challenge response',
  PublicKeyAlreadyRegistered = 'Public key already registered',
  MaximumKeysPerWallet = 'Maximum keys per wallet reached',
  InvalidKey = 'Invalid or expired key',
  InvalidSignature = 'Invalid signature',
  SignatureTimestampTooOld = 'Signature timestamp too old',
  InvalidSession = 'Invalid or expired session',
  KeyNoLongerActive = 'Key no longer active',
}

export enum ErrorSchedulePayment {
  NotFound = 'Schedule payment not found',
  InvalidId = 'Invalid schedule payment ID',
  InvalidFrequency = 'Invalid frequency',
  InvalidNextExecutionDate = 'Next execution date must be in the future',
  InvalidEndDate = 'End date must be after next execution date',
  InvalidMaxExecutions = 'Max executions must be at least 1',
  InvalidTransactionIds = 'Transaction IDs are required',
  CannotDeleteActiveWithExecutions = 'Cannot delete active schedule payment with executions. Cancel it instead.',
}
