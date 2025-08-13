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

export enum ErrorAuth {
  UserNotActive = 'User is not active, verify your email',
  InvalidCredentials = 'Invalid credentials',
  InvalidTwoFactorCode = 'Invalid two-factor code',
  InvalidRefreshToken = 'Invalid refresh token',
  TwoFactorAuthAlreadyEnabled = 'Two factor auth already enabled',
  TwoFactorAuthDisabled = 'Two factor auth was not enabled',
  TwoFactorAuthRequired = 'Two factor auth required',
  Unauthorized = 'Unauthorized',
  SandboxDisabled = 'Sandbox is disabled',
  ResendInterval = 'Resend time too short',
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
}

export enum ErrorAddressBook {
  NameAlreadyExists = 'Name already exists',
  InvalidAddress = 'Invalid address format',
  InvalidName = 'Invalid name format',
  InvalidCategory = 'Invalid category format',
  AddressAlreadyExists = 'Address already exists in this category',
  SelfAddressNotAllowed = 'Cannot add your own address to address book',
  CategoryNotFound = 'Category not found',
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
  DuplicateRequest = 'Duplicate request already exists',
  NotAccepted = 'Request payment is not accepted',
  NotGroupPayment = 'Request payment is not a group payment',
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
}
