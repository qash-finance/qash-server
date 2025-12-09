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
  InvalidSearchTerm = 'Search term must be at least 2 characters',
  NotExists = 'Not exists',
}

export enum ErrorCompanyGroup {
  NotFound = 'Group not found or access denied',
}

export enum ErrorCompanyContact {
  NameAlreadyExists = 'Name already exists',
  InvalidAddress = 'Invalid address format',
  InvalidName = 'Invalid name format',
  InvalidCategory = 'Invalid category format',
  AddressAlreadyExists = 'Address already exists in this category',
  SelfAddressNotAllowed = 'Cannot add your own address to address book',
  CategoryAlreadyExists = 'Category already exists',
  NoContactIdsProvided = 'No contact IDs provided',
  ContactNotFound = 'Contact not found',
}

export enum ErrorPaymentLink {
  NotFound = 'Payment link not found',
  InvalidCode = 'Invalid payment link code',
  CodeAlreadyExists = 'Payment link code already exists',
  InvalidTitle = 'Invalid title',
  InvalidDescription = 'Invalid description',
  InvalidAmount = 'Invalid amount',
  InvalidPayee = 'Invalid payee address',
  InvalidPayer = 'Invalid payer address',
  AlreadyDeactivated = 'Payment link is already deactivated',
  AlreadyActive = 'Payment link is already active',
  NotOwner = 'Only the payee can modify this payment link',
  InvalidTokens = 'Invalid accepted tokens',
  InvalidChains = 'Invalid accepted chains',
  PaymentRecordNotFound = 'Payment record not found',
}
