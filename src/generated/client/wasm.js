
Object.defineProperty(exports, "__esModule", { value: true });

const {
  Decimal,
  objectEnumValues,
  makeStrictEnum,
  Public,
  getRuntime,
  skip
} = require('./runtime/index-browser.js')


const Prisma = {}

exports.Prisma = Prisma
exports.$Enums = {}

/**
 * Prisma Client JS version: 5.22.0
 * Query Engine version: 605197351a3c8bdd595af2d2a9bc3025bca48ea2
 */
Prisma.prismaVersion = {
  client: "5.22.0",
  engine: "605197351a3c8bdd595af2d2a9bc3025bca48ea2"
}

Prisma.PrismaClientKnownRequestError = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`PrismaClientKnownRequestError is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)};
Prisma.PrismaClientUnknownRequestError = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`PrismaClientUnknownRequestError is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.PrismaClientRustPanicError = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`PrismaClientRustPanicError is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.PrismaClientInitializationError = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`PrismaClientInitializationError is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.PrismaClientValidationError = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`PrismaClientValidationError is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.NotFoundError = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`NotFoundError is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.Decimal = Decimal

/**
 * Re-export of sql-template-tag
 */
Prisma.sql = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`sqltag is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.empty = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`empty is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.join = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`join is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.raw = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`raw is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.validator = Public.validator

/**
* Extensions
*/
Prisma.getExtensionContext = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`Extensions.getExtensionContext is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.defineExtension = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`Extensions.defineExtension is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}

/**
 * Shorthand utilities for JSON filtering
 */
Prisma.DbNull = objectEnumValues.instances.DbNull
Prisma.JsonNull = objectEnumValues.instances.JsonNull
Prisma.AnyNull = objectEnumValues.instances.AnyNull

Prisma.NullTypes = {
  DbNull: objectEnumValues.classes.DbNull,
  JsonNull: objectEnumValues.classes.JsonNull,
  AnyNull: objectEnumValues.classes.AnyNull
}



/**
 * Enums
 */

exports.Prisma.TransactionIsolationLevel = makeStrictEnum({
  ReadUncommitted: 'ReadUncommitted',
  ReadCommitted: 'ReadCommitted',
  RepeatableRead: 'RepeatableRead',
  Serializable: 'Serializable'
});

exports.Prisma.UserScalarFieldEnum = {
  id: 'id',
  name: 'name',
  email: 'email',
  password: 'password',
  authProvider: 'authProvider',
  avatar: 'avatar',
  timezone: 'timezone',
  username: 'username',
  brandColor: 'brandColor',
  logo: 'logo',
  emailVerified: 'emailVerified',
  verificationToken: 'verificationToken',
  resetPasswordToken: 'resetPasswordToken',
  resetPasswordExpires: 'resetPasswordExpires',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt',
  hiddenContactCols: 'hiddenContactCols',
  dodoApiKey: 'dodoApiKey',
  dodoWebhookSecret: 'dodoWebhookSecret',
  razorpayKeyId: 'razorpayKeyId',
  razorpayKeySecret: 'razorpayKeySecret',
  stripeAccountId: 'stripeAccountId',
  stripeSecretKey: 'stripeSecretKey',
  stripeWebhookSecret: 'stripeWebhookSecret',
  pageAboutMe: 'pageAboutMe',
  pageHeadline: 'pageHeadline',
  pageSocialYouTube: 'pageSocialYouTube',
  pageSocialFacebook: 'pageSocialFacebook',
  pageSocialWhatsApp: 'pageSocialWhatsApp',
  pageSocialInstagram: 'pageSocialInstagram',
  pageSocialLinkedIn: 'pageSocialLinkedIn',
  pageSidePanelColor: 'pageSidePanelColor',
  pageSelectedEventTypes: 'pageSelectedEventTypes',
  pageImage: 'pageImage',
  pageSchedulerHeader: 'pageSchedulerHeader',
  webhookUrl: 'webhookUrl',
  webhookEvents: 'webhookEvents'
};

exports.Prisma.IntegrationScalarFieldEnum = {
  id: 'id',
  provider: 'provider',
  accessToken: 'accessToken',
  refreshToken: 'refreshToken',
  expiresAt: 'expiresAt',
  email: 'email',
  userId: 'userId',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt',
  slackChannelId: 'slackChannelId',
  slackChannelName: 'slackChannelName',
  slackWebhookUrl: 'slackWebhookUrl'
};

exports.Prisma.EventTypeScalarFieldEnum = {
  id: 'id',
  title: 'title',
  slug: 'slug',
  description: 'description',
  duration: 'duration',
  type: 'type',
  color: 'color',
  locationType: 'locationType',
  location: 'location',
  countryCode: 'countryCode',
  phoneCallSource: 'phoneCallSource',
  bufferTimeBefore: 'bufferTimeBefore',
  bufferTimeAfter: 'bufferTimeAfter',
  dateRangeType: 'dateRangeType',
  dateRangeDays: 'dateRangeDays',
  dateRangeStart: 'dateRangeStart',
  dateRangeEnd: 'dateRangeEnd',
  maxBookingsPerDay: 'maxBookingsPerDay',
  minNotice: 'minNotice',
  isActive: 'isActive',
  isSingleUse: 'isSingleUse',
  requiresPayment: 'requiresPayment',
  price: 'price',
  currency: 'currency',
  dodoProductId: 'dodoProductId',
  paymentProvider: 'paymentProvider',
  inviteeLimit: 'inviteeLimit',
  roundRobinIndex: 'roundRobinIndex',
  userId: 'userId',
  webhookUrl: 'webhookUrl',
  webhookEvents: 'webhookEvents',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.ScheduleScalarFieldEnum = {
  id: 'id',
  name: 'name',
  isDefault: 'isDefault',
  userId: 'userId',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.AvailabilityScalarFieldEnum = {
  id: 'id',
  dayOfWeek: 'dayOfWeek',
  startTime: 'startTime',
  endTime: 'endTime',
  scheduleId: 'scheduleId'
};

exports.Prisma.DateOverrideScalarFieldEnum = {
  id: 'id',
  date: 'date',
  startTime: 'startTime',
  endTime: 'endTime',
  isBlocked: 'isBlocked',
  scheduleId: 'scheduleId'
};

exports.Prisma.BookingScalarFieldEnum = {
  id: 'id',
  eventTypeId: 'eventTypeId',
  hostId: 'hostId',
  inviteeName: 'inviteeName',
  inviteeEmail: 'inviteeEmail',
  startTime: 'startTime',
  endTime: 'endTime',
  status: 'status',
  manageToken: 'manageToken',
  timezone: 'timezone',
  notes: 'notes',
  cancelReason: 'cancelReason',
  location: 'location',
  rescheduledFromStart: 'rescheduledFromStart',
  rescheduledFromEnd: 'rescheduledFromEnd',
  executedWorkflows: 'executedWorkflows',
  isSingleUse: 'isSingleUse',
  paymentStatus: 'paymentStatus',
  paymentSessionId: 'paymentSessionId',
  contactId: 'contactId',
  calendarEventId: 'calendarEventId',
  meetingId: 'meetingId',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.CustomQuestionScalarFieldEnum = {
  id: 'id',
  eventTypeId: 'eventTypeId',
  question: 'question',
  type: 'type',
  required: 'required',
  options: 'options',
  order: 'order'
};

exports.Prisma.BookingAnswerScalarFieldEnum = {
  id: 'id',
  bookingId: 'bookingId',
  questionId: 'questionId',
  answer: 'answer'
};

exports.Prisma.NotificationScalarFieldEnum = {
  id: 'id',
  userId: 'userId',
  type: 'type',
  title: 'title',
  message: 'message',
  read: 'read',
  bookingId: 'bookingId',
  createdAt: 'createdAt'
};

exports.Prisma.TeamScalarFieldEnum = {
  id: 'id',
  name: 'name',
  slug: 'slug',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.TeamMemberScalarFieldEnum = {
  id: 'id',
  teamId: 'teamId',
  userId: 'userId',
  role: 'role'
};

exports.Prisma.InvitationScalarFieldEnum = {
  id: 'id',
  email: 'email',
  teamId: 'teamId',
  role: 'role',
  invitedBy: 'invitedBy',
  token: 'token',
  status: 'status',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.ContactScalarFieldEnum = {
  id: 'id',
  name: 'name',
  email: 'email',
  phone: 'phone',
  company: 'company',
  notes: 'notes',
  userId: 'userId',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.ContactCustomFieldScalarFieldEnum = {
  id: 'id',
  name: 'name',
  type: 'type',
  userId: 'userId',
  order: 'order',
  createdAt: 'createdAt'
};

exports.Prisma.ContactFieldValueScalarFieldEnum = {
  id: 'id',
  contactId: 'contactId',
  fieldId: 'fieldId',
  value: 'value'
};

exports.Prisma.SingleUseLinkScalarFieldEnum = {
  id: 'id',
  token: 'token',
  eventTypeId: 'eventTypeId',
  userId: 'userId',
  contactName: 'contactName',
  contactEmail: 'contactEmail',
  isUsed: 'isUsed',
  bookingId: 'bookingId',
  expiresAt: 'expiresAt',
  createdAt: 'createdAt'
};

exports.Prisma.SubscriptionScalarFieldEnum = {
  id: 'id',
  userId: 'userId',
  plan: 'plan',
  status: 'status',
  transactionId: 'transactionId',
  amount: 'amount',
  validUntil: 'validUntil',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.WorkflowScalarFieldEnum = {
  id: 'id',
  name: 'name',
  userId: 'userId',
  trigger: 'trigger',
  timeValue: 'timeValue',
  timeUnit: 'timeUnit',
  action: 'action',
  sendTo: 'sendTo',
  senderEmail: 'senderEmail',
  subject: 'subject',
  body: 'body',
  isActive: 'isActive',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.RoutingFormScalarFieldEnum = {
  id: 'id',
  name: 'name',
  slug: 'slug',
  description: 'description',
  userId: 'userId',
  isActive: 'isActive',
  headlessToken: 'headlessToken',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.RoutingQuestionScalarFieldEnum = {
  id: 'id',
  formId: 'formId',
  type: 'type',
  label: 'label',
  identifier: 'identifier',
  placeholder: 'placeholder',
  required: 'required',
  options: 'options',
  order: 'order'
};

exports.Prisma.RoutingRuleScalarFieldEnum = {
  id: 'id',
  formId: 'formId',
  questionId: 'questionId',
  operator: 'operator',
  value: 'value',
  logicType: 'logicType',
  conditions: 'conditions',
  destination: 'destination',
  isFallback: 'isFallback',
  order: 'order'
};

exports.Prisma.RoutingSubmissionScalarFieldEnum = {
  id: 'id',
  formId: 'formId',
  inviteeName: 'inviteeName',
  inviteeEmail: 'inviteeEmail',
  answers: 'answers',
  destination: 'destination',
  source: 'source',
  createdAt: 'createdAt'
};

exports.Prisma.ReviewScalarFieldEnum = {
  id: 'id',
  rating: 'rating',
  comment: 'comment',
  isPublic: 'isPublic',
  bookingId: 'bookingId',
  hostId: 'hostId',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.SortOrder = {
  asc: 'asc',
  desc: 'desc'
};

exports.Prisma.NullableJsonNullValueInput = {
  DbNull: Prisma.DbNull,
  JsonNull: Prisma.JsonNull
};

exports.Prisma.JsonNullValueInput = {
  JsonNull: Prisma.JsonNull
};

exports.Prisma.QueryMode = {
  default: 'default',
  insensitive: 'insensitive'
};

exports.Prisma.NullsOrder = {
  first: 'first',
  last: 'last'
};

exports.Prisma.JsonNullValueFilter = {
  DbNull: Prisma.DbNull,
  JsonNull: Prisma.JsonNull,
  AnyNull: Prisma.AnyNull
};


exports.Prisma.ModelName = {
  User: 'User',
  Integration: 'Integration',
  EventType: 'EventType',
  Schedule: 'Schedule',
  Availability: 'Availability',
  DateOverride: 'DateOverride',
  Booking: 'Booking',
  CustomQuestion: 'CustomQuestion',
  BookingAnswer: 'BookingAnswer',
  Notification: 'Notification',
  Team: 'Team',
  TeamMember: 'TeamMember',
  Invitation: 'Invitation',
  Contact: 'Contact',
  ContactCustomField: 'ContactCustomField',
  ContactFieldValue: 'ContactFieldValue',
  SingleUseLink: 'SingleUseLink',
  Subscription: 'Subscription',
  Workflow: 'Workflow',
  RoutingForm: 'RoutingForm',
  RoutingQuestion: 'RoutingQuestion',
  RoutingRule: 'RoutingRule',
  RoutingSubmission: 'RoutingSubmission',
  Review: 'Review'
};

/**
 * This is a stub Prisma Client that will error at runtime if called.
 */
class PrismaClient {
  constructor() {
    return new Proxy(this, {
      get(target, prop) {
        let message
        const runtime = getRuntime()
        if (runtime.isEdge) {
          message = `PrismaClient is not configured to run in ${runtime.prettyName}. In order to run Prisma Client on edge runtime, either:
- Use Prisma Accelerate: https://pris.ly/d/accelerate
- Use Driver Adapters: https://pris.ly/d/driver-adapters
`;
        } else {
          message = 'PrismaClient is unable to run in this browser environment, or has been bundled for the browser (running in `' + runtime.prettyName + '`).'
        }
        
        message += `
If this is unexpected, please open an issue: https://pris.ly/prisma-prisma-bug-report`

        throw new Error(message)
      }
    })
  }
}

exports.PrismaClient = PrismaClient

Object.assign(exports, Prisma)
