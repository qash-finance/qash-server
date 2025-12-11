export enum ErrorQuery {
  BadIdString = 'Bad id string',
  InvalidSearchTerm = 'Search term must be at least 2 characters',
  NotExists = 'Not exists',
}

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

export enum ErrorCompany {
  RegistrationNumberAlreadyExists = 'Company with this registration number already exists',
  UserAlreadyTeamMember = 'User is already a team member of another company',
  CompanyNotFound = 'Company not found',
}

export enum ErrorEmployeeGroup {
  NotFound = 'Group not found or access denied',
}

export enum ErrorEmployee {
  NameAlreadyExists = 'Name already exists',
  InvalidAddress = 'Invalid address format',
  InvalidName = 'Invalid name format',
  InvalidCategory = 'Invalid category format',
  AddressAlreadyExists = 'Address already exists in this category',
  SelfAddressNotAllowed = 'Cannot add your own address to address book',
  CategoryAlreadyExists = 'Category already exists',
  NoContactIdsProvided = 'No contact IDs provided',
  ContactNotFound = 'Employee not found',
}

export enum ErrorPayroll {
  HaveActivePayroll = 'Employee already has an active payroll. Please pause or complete the existing payroll first.',
  PayStartDateBeforeJoiningDate = 'Pay start date must be after joining date',
  PayStartDateInThePast = 'Pay start date cannot be in the past',
  PayrollNotFound = 'Payroll not found',
  PayEndDateBeforePayStartDate = 'Pay end date must be after pay start date',
}

export enum ErrorInvoice {
  InvoiceNotFound = 'Invoice not found',
  InvoiceAlreadyExistsThisMonth = 'An invoice for this payroll already exists this month',
  NotOwner = 'Only the employee can update their own invoices',
  InvoiceNotUpdatable = 'Invoice can only be updated when in SENT or REVIEWED status',
  InvoiceNotSendable = 'Only draft invoices can be sent',
  InvoiceNotReviewable = 'Only sent invoices can be reviewed',
  InvoiceNotConfirmable = 'Only reviewed invoices can be confirmed',
  InvoiceNotCancelable = 'Cannot cancel confirmed invoices',
}

export enum ErrorInvoiceSchedule {
  InvoiceScheduleNotFound = 'Invoice schedule not found',
  InvoiceScheduleAlreadyExists = 'Invoice schedule already exists for this payroll',
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
