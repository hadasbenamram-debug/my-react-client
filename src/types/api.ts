/**
 * טיפוסי ה-API של השרת - תרגום של פרויקט FoodRescue.DTOs (C#) ל-TypeScript.
 *
 * כללי ההמרה (ברירת המחדל של ASP.NET Core / System.Text.Json):
 *   - שמות שדות: PascalCase ב-C#  ->  camelCase ב-JSON
 *   - int / double / decimal       ->  number
 *   - DateTime                     ->  string בפורמט ISO (UTC)
 *   - TimeSpan                     ->  string בפורמט "HH:mm:ss"
 *   - int? / string? / DateTime?   ->  T | null
 *   - enum                         ->  number (שדות Status* שממופים עם ToString() מגיעים כמחרוזת)
 *
 * רשימות מעומדות (?page=1&pageSize=100) מחזירות מערך, וסך הרשומות בכותרת X-Total-Count.
 */

/** DateTime מה-C# - מחרוזת ISO 8601 */
export type IsoDateString = string;
/** TimeSpan מה-C# - מחרוזת "HH:mm:ss" */
export type TimeSpanString = string;

// ───────────────────────── Enums ─────────────────────────

export const MatchStatus = {
    AwaitingVolunteerConfirmation: 0,
    Confirmed: 1,
    InPickup: 2,
    InTransit: 3,
    TimedOut: 4,
    Completed: 5,
    Declined: 6,
    NoShow: 7,
    Cancelled: 8,
} as const;
export type MatchStatusName = keyof typeof MatchStatus;
export type MatchStatusValue = (typeof MatchStatus)[MatchStatusName];
export type MatchStatus = MatchStatusValue | MatchStatusName;

export const RequestedRole = {
    Supplier: 0,
    Ngo: 1,
    Volunteer: 2,
} as const;
export type RequestedRoleName = keyof typeof RequestedRole;
export type RequestedRole = (typeof RequestedRole)[RequestedRoleName];

export const ApprovalStatus = {
    Pending: 0,
    Approved: 1,
    Rejected: 2,
} as const;
export type ApprovalStatusName = keyof typeof ApprovalStatus;
export type ApprovalStatus = (typeof ApprovalStatus)[ApprovalStatusName];

export type DonationStatusName =
    | 'Pending'
    | 'Matched'
    | 'PickedUp'
    | 'Delivered'
    | 'Completed'
    | 'Expired'
    | 'Cancelled';

export type UserRoleName = 'User' | 'Admin' | 'Supplier' | 'Volunteer' | 'Ngo';

export type MapEntityType = 'supplier' | 'ngo' | 'volunteer';

// ───────────────────────── שגיאות ─────────────────────────

/** מבנה השגיאה האחיד של השרת (ExceptionHandlingMiddleware / ולידציה) */
export interface ApiErrorBody {
    status?: number;
    message?: string;
    /** למשל ValidationFailed, NotFound, Conflict, PasswordChangeRequired */
    code?: string;
    errors?: Record<string, string[]>;
    traceId?: string;
}

/** נשמר לתאימות - אותו מבנה כמו ApiErrorBody */
export type ValidationProblemBody = ApiErrorBody;

/** תשובה כללית של פעולה: { message } */
export interface ActionResultBody {
    message?: string;
}

// ───────────────────────── Auth ─────────────────────────

export interface LoginDto {
    email: string;
    password: string;
}

export interface RegisterDto {
    name: string;
    email: string;
    phone: string;
    password: string;
}

export interface AuthResponseDto {
    token: string;
    role: UserRoleName;
    expiresAt: IsoDateString;
    /** סיסמה זמנית מההרשמה - חובה להחליף לפני שימוש במערכת */
    mustChangePassword: boolean;
}

/** POST api/auth/change-password - מחזיר טוקן חדש (הקודמים בוטלו) */
export interface ChangePasswordResponse {
    message: string;
    token?: string;
    role?: UserRoleName;
    expiresAt?: IsoDateString;
    mustChangePassword: boolean;
}

export interface ForgotPasswordDto {
    email: string;
}

export interface ResetPasswordDto {
    token: string;
    newPassword: string;
}

export interface VerifyCodeDto {
    code: string;
}

export interface MyProfileDto {
    name: string;
    email: string;
    phone: string;
    role: UserRoleName;
    isEmailVerified: boolean;
    isPhoneVerified: boolean;
    mustChangePassword: boolean;
}

export interface UserDto {
    id: number;
    name: string;
    email: string;
    phone: string;
    role: UserRoleName;
    isEmailVerified: boolean;
    isPhoneVerified: boolean;
    createdAt: IsoDateString;
}

// ───────────────────────── Admin ─────────────────────────

export interface AdminNgoListItemDto {
    id: number;
    name: string;
    phone: string;
    city: string;
    status: ApprovalStatusName;
}

export interface AdminSupplierListItemDto {
    id: number;
    name: string;
    phone: string;
    address: string;
    status: ApprovalStatusName;
}

export interface AdminVolunteerListItemDto {
    id: number;
    userId: number;
    name: string;
    phone: string;
    email: string;
    vehicleType: string;
    maxCapacityKg: number;
    isAvailable: boolean;
    idNumber: string;
    driverLicenseNumber: string;
    dateOfBirth: IsoDateString;
    driverLicenseExpiry: IsoDateString | null;
    reliabilityScore: number;
    status: ApprovalStatusName;
}

export interface TopVolunteerDto {
    name: string;
    deliveriesCount: number;
}

export interface SystemReportDto {
    totalDonationsVolume: number;
    averageResponseTime: string;
    successRate: string;
    topVolunteers: TopVolunteerDto[];
}

export interface DashboardStatsDto {
    openDonations: number;
    availableVolunteers: number;
    activeAssignments: number;
    noShowAlerts: number;
}

export interface VolunteerAvailabilitySummaryDto {
    volunteerId: number;
    volunteerName: string;
    day: string;
    timeSlot: string;
}

/** GET api/admin/live-monitor - מסלול פעיל לכל מתנדב */
export interface LiveMissionDto {
    /** מזהה המסלול */
    id: number;
    volunteerId: number;
    volunteerName: string;
    destination: string;
    supplierName: string;
    status: string;
    stopsCount: number;
    latitude: number | null;
    longitude: number | null;
    locationUpdatedAt: IsoDateString | null;
}

export interface UserSummaryDto {
    id: number;
    name: string;
    email: string;
    phone: string;
}

/** GET api/approvalrequests/pending?role=... - כולל פרטי הפרופיל */
export interface PendingApprovalRequestDto {
    id: number;
    profileId: number | null;
    profileName: string | null;
    address: string | null;
    vehicleType: string | null;
    maxCapacityKg: number | null;
    driverLicenseExpiry: IsoDateString | null;
    taxId: string | null;
    registrationNumber: string | null;
    hasLicenseFile: boolean;
    userId: number;
    user: UserSummaryDto | null;
    requestedRole: RequestedRole;
    status: ApprovalStatus;
    passedAutomaticValidation: boolean;
    validationDetails: string;
    handledByManagerId: number | null;
    rejectionReason: string;
    createdAt: IsoDateString;
    handledAt: IsoDateString | null;
}

export interface ApprovalRequestResponseDto {
    id: number;
    userId: number;
    requestedRole: RequestedRole;
    status: ApprovalStatus;
    passedAutomaticValidation: boolean;
    validationDetails: string | null;
    handledByManagerId: number | null;
    rejectionReason: string | null;
    createdAt: IsoDateString;
    handledAt: IsoDateString | null;
}

// ───────────────────────── אזורים וקטגוריות ─────────────────────────

export interface CreateRegionDto {
    regionName: string;
    centerLatitude: number;
    centerLongitude: number;
    radiusKm: number;
}

export interface RegionResponseDto extends CreateRegionDto {
    id: number;
}

export interface CreateFoodCategoryDto {
    categoryName: string;
    perishabilityFactor: number;
}

/** GET api/categories */
export interface FoodCategoryResponseDto extends CreateFoodCategoryDto {
    id: number;
}

/** נשמר לתאימות */
export interface CategoryOptionDto {
    id: number;
    name: string;
}

export interface MapEntityDto {
    id: number;
    name: string;
    latitude: number;
    longitude: number;
    address: string;
    type: MapEntityType;
}

// ───────────────────────── תרומות ─────────────────────────

export interface DonationCategoryLineDto {
    categoryId: number;
    quantity: number;
    weightKg: number;
    categoryName?: string | null;
}

export interface CreateDonationDto {
    regionId: number;
    latitude: number;
    longitude: number;
    googlePlaceId?: string | null;
    imageFilePath: string | null;
    latestPickupTime: TimeSpanString;
    /** אופציונלי. בלי ערך - סוף היום (שעון ישראל) */
    expirationTime?: IsoDateString | null;
    categories: DonationCategoryLineDto[];
}

/** PUT api/donations/{id} - עריכה כל עוד התרומה ממתינה לשיבוץ */
export interface UpdateDonationDto {
    latestPickupTime: TimeSpanString;
    expirationTime?: IsoDateString | null;
    categories: DonationCategoryLineDto[];
}

export interface DonationResponseDto {
    id: number;
    supplierId: number;
    supplierName: string | null;
    regionId: number;
    regionName: string | null;
    status: DonationStatusName;
    priorityScore: number;
    latitude: number;
    longitude: number;
    googlePlaceId: string | null;
    imageFilePath: string | null;
    latestPickupTime: TimeSpanString;
    expirationTime: IsoDateString;
    createdAt: IsoDateString;
    receivedAt: IsoDateString | null;
    totalWeightKg: number;
    categories: DonationCategoryLineDto[];
    // השיבוץ הנוכחי (אם יש)
    matchId: number | null;
    matchStatus: MatchStatusName | null;
    ngoId: number | null;
    ngoName: string | null;
    volunteerId: number | null;
    volunteerName: string | null;
    estimatedArrival: IsoDateString | null;
}

export interface SupplierDonationSummaryDto {
    id: number;
    status: DonationStatusName;
    regionId: number;
    regionName: string;
    priorityScore: number;
    createdAt: IsoDateString;
    expirationTime: IsoDateString;
    latestPickupTime: TimeSpanString;
}

export interface AdminDonationSummaryDto {
    id: number;
    status: DonationStatusName;
    supplierId: number;
    supplierName: string;
    createdAt: IsoDateString;
    expirationTime: IsoDateString;
    urgencyScore: number;
    priorityScore: number;
}

export interface ImageAnalysisResponseDto {
    filePath: string;
    aiParsedData: string | null;
    message: string | null;
}

// ───────────────────────── שידוכים ומסלולים ─────────────────────────

export interface MatchResponseDto {
    id: number;
    donationId: number;
    volunteerId: number;
    ngoId: number;
    status: MatchStatusValue;
    statusName: MatchStatusName;
    createdAt: IsoDateString;
    volunteerRouteId: number | null;
    isActive: boolean;
    matchScore: number;
    estimatedArrival: IsoDateString | null;
    responseDeadline: IsoDateString | null;
    pickedUpAt: IsoDateString | null;
    deliveredAt: IsoDateString | null;
    googleMapsDistanceKm: number | null;
    googleMapsDurationMinutes: number | null;
    volunteerName: string | null;
    supplierName: string | null;
    pickupAddress: string | null;
    pickupLatitude: number;
    pickupLongitude: number;
    ngoName: string | null;
    ngoAddress: string | null;
    ngoLatitude: number;
    ngoLongitude: number;
}

export interface RouteStopDto {
    order: number;
    matchId: number;
    donationId: number;
    /** שם הסטטוס של השידוך (Confirmed, InPickup, InTransit, Completed...) */
    status: string;
    supplierName: string | null;
    address: string | null;
    latitude: number;
    longitude: number;
    estimatedArrival: IsoDateString | null;
    latestPickupTime: TimeSpanString;
    weightKg: number;
    items: DonationCategoryLineDto[];
}

/** מסלול: כמה תחנות איסוף ועמותה אחת. אישור / דחייה - לכל המסלול יחד */
export interface RouteDto {
    id: number;
    status: string;
    volunteerId: number;
    volunteerName: string | null;
    scheduledAt: IsoDateString;
    responseDeadline: IsoDateString | null;
    awaitingResponse: boolean;
    totalWeightKg: number;
    estimatedTotalDurationMinutes: number | null;
    estimatedTotalDistanceKm: number | null;
    matchScore: number;
    polyline: string | null;
    ngoId: number;
    ngoName: string | null;
    ngoAddress: string | null;
    ngoLatitude: number;
    ngoLongitude: number;
    estimatedNgoArrival: IsoDateString | null;
    volunteerLatitude: number | null;
    volunteerLongitude: number | null;
    stops: RouteStopDto[];
}

export interface RespondByLinkDto {
    token: string;
    accept: boolean;
}

export interface AssignDonationResultDto {
    matched: boolean;
    matchId?: number | null;
    routeId?: number | null;
    message: string;
}

export interface EngineStatusDto {
    status: 'Running' | 'Idle' | string;
    lastRunAt: IsoDateString | null;
    lastRunTime: string;
    lastRunTrigger: string | null;
    matchedCount: number;
    routesCreated: number;
    donationsProcessed: number;
    lastRunDurationSeconds: number | null;
    pendingDonations: number;
    awaitingVolunteerResponse: number;
    activeAssignments: number;
    schedule: string;
    failedConstraints: string[];
}

export interface EngineRunResultDto {
    started: boolean;
    message: string;
    donationsProcessed: number;
    matchedCount: number;
    routesCreated: number;
    durationSeconds: number;
    failedConstraints: string[];
}

// ───────────────────────── מתנדבים וזמינות ─────────────────────────

export interface VolunteerResponseDto {
    id: number;
    userId: number;
    vehicleType: string;
    maxCapacityKg: number;
    isAvailable: boolean;
    currentLatitude: number;
    currentLongitude: number;
    idNumber: string;
    dateOfBirth: IsoDateString;
    driverLicenseExpiry: IsoDateString | null;
    reliabilityScore: number;
    approvalStatus: ApprovalStatus;
    name: string;
    email: string;
    phone: string;
}

export interface CreateAvailabilitySlotDto {
    regionId: number;
    /** אזור יעד (לנסיעה בין אזורים). null = אותו אזור */
    toRegionId: number | null;
    /** 0 = ראשון ... 6 = שבת */
    day: number;
    /** "HH:mm" */
    startTime: string;
    /** "HH:mm" */
    endTime: string;
}

export interface AvailabilitySlotResponseDto {
    id: number;
    volunteerId: number;
    regionId: number;
    regionName: string | null;
    toRegionId: number | null;
    toRegionName: string | null;
    day: number;
    startTime: string;
    endTime: string;
}

// ───────────────────────── ספקים ועמותות ─────────────────────────

export interface SupplierResponseDto {
    id: number;
    userId: number;
    businessName: string;
    address: string;
    latitude: number;
    longitude: number;
    taxId: string;
    businessLicenseFilePath: string;
    approvalStatus: number;
}

interface NgoHoursFields {
    receivesOnFriday: boolean;
    fridayOpenTime: TimeSpanString | null;
    fridayCloseTime: TimeSpanString | null;
}

export interface NgoResponseDto extends NgoHoursFields {
    id: number;
    userId: number;
    ngoName: string;
    dailyCapacity: number;
    address: string;
    latitude: number;
    longitude: number;
    regionId: number;
    registrationNumber: string;
    sunToThuOpenTime: TimeSpanString;
    sunToThuCloseTime: TimeSpanString;
    approvalStatus: number;
}

/** PUT api/ngos/my-hours */
export interface UpdateNgoHoursDto extends NgoHoursFields {
    address: string;
    latitude: number;
    longitude: number;
    sunToThuOpenTime: TimeSpanString | null;
    sunToThuCloseTime: TimeSpanString | null;
}

// ───────────────────────── משובים, לוגים, תגובות ─────────────────────────

export interface CreateFeedbackDto {
    matchId: number;
    /** דירוג התרומה 1-5 */
    rating: number;
    /** דירוג המתנדב 1-5 (משפיע על ציון האמינות שלו) */
    volunteerRating: number;
    comments?: string | null;
}

export interface FeedbackResponseDto {
    id: number;
    matchId: number;
    rating: number;
    volunteerRating: number;
    comments: string | null;
    createdAt: IsoDateString;
    volunteerId: number | null;
    volunteerName: string | null;
}

export interface CreateDeliveryLogDto {
    volunteerRouteId: number;
    status: string;
    notes: string;
    latitude: number | null;
    longitude: number | null;
}

export interface DeliveryLogResponseDto extends CreateDeliveryLogDto {
    id: number;
    timestamp: IsoDateString;
}

/** POST api/comments - תגובה חדשה על תרומה (donationId) או שידוך (matchId), או תשובה (parentCommentId) */
export interface CreateCommentDto {
    content: string;
    parentCommentId?: number | null;
    donationId?: number | null;
    matchId?: number | null;
}

/** GET api/comments/tree, GET api/comments (Admin) */
export interface CommentDto {
    id: number;
    parentCommentId: number | null;
    donationId: number | null;
    matchId: number | null;
    authorName: string;
    text: string;
    createdAt: IsoDateString;
    replies: CommentDto[];
}

// ───────────────────────── הגדרות והתראות ─────────────────────────

/** GET/PUT api/settings - שדה null לא משתנה */
export interface SystemSettingsDto {
    matchingTimeoutMinutes: number | null;
    distanceWeight: number | null;
    urgencyWeight: number | null;
    capacityWeight: number | null;
    reliabilityWeight: number | null;
    maxSearchRadiusKm: number | null;
    clusterRadiusKm: number | null;
    maxRoutesEvaluatedPerDonation: number | null;
    maxItemsPerCategory: number | null;
    autoNoShowGraceMinutes: number | null;
    noShowReliabilityPenalty: number | null;
    averageSpeedKmH: number | null;
}

/** GET api/notifications, וגם האירוע ReceiveNotification ב-SignalR */
export interface NotificationDto {
    id: number;
    type: 'info' | 'success' | 'warning' | 'request' | string;
    subject: string | null;
    content: string | null;
    link: string | null;
    createdAt: IsoDateString;
    isRead: boolean;
}

/** נשמר לתאימות */
export type NotificationMessage = Partial<NotificationDto>;

// ═════════════════════════════════════════════════════════════════════════════
// שמות שהמסכים משתמשים בהם - כולם מצביעים עכשיו על ה-DTO האמיתי
// ═════════════════════════════════════════════════════════════════════════════

export type MatchView = MatchResponseDto;
export type LiveMissionView = LiveMissionDto;
export type UserListItemView = UserDto;
export type AdminNgoListItemView = AdminNgoListItemDto;
export type AdminSupplierListItemView = AdminSupplierListItemDto;
export type FeedbackView = FeedbackResponseDto;
export type DonationDetailsView = DonationResponseDto;
export type AdminDonationView = AdminDonationSummaryDto;
export type VolunteerAvailabilityView = VolunteerAvailabilitySummaryDto;
export type NgoDonationView = DonationResponseDto;
export type AdminCommentItem = CommentDto;

export interface MapEntityView extends MapEntityDto {
    entityType?: string;
    role?: string;
    title?: string;
    lat?: number;
    lng?: number;
    lon?: number;
}

/** GET api/suppliers/current */
export interface CurrentSupplierView extends SupplierResponseDto {
    donations?: SupplierDonationItem[];
    completedDonations?: SupplierDonationItem[];
}

export interface SupplierDonationItem {
    id: number;
    status: DonationStatusName;
    regionId?: number;
}

/** נשמר לתאימות למסך המפה (נבנה עכשיו מ-RouteDto) */
export interface RoutePlan {
    routeId: number;
    stops?: RouteStop[];
}

export interface RouteStop {
    locationName?: string;
    /** 'Pickup' = איסוף מספק, אחרת מסירה לעמותה */
    actionType?: string;
    address?: string | null;
    latitude?: number | string | null;
    longitude?: number | string | null;
}
