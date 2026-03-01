// Plan definitions and limit enforcement for subscriptions
export const PLANS = {
    free: {
        name: 'Free',
        price: 0,
        currency: '₹',
        period: '',
        features: {
            maxEventTypes: 3,
            maxBookingsPerMonth: 50,
            maxTeamMembers: 1,
            googleCalendar: true,
            googleMeet: true,
            zoom: false,
            teams: false,
            customBranding: false,
            payments: false,
            coHosting: false,
            prioritySupport: false,
        },
    },
    pro: {
        name: 'Pro',
        price: 499,
        currency: '₹',
        period: '/month',
        features: {
            maxEventTypes: -1, // unlimited
            maxBookingsPerMonth: -1,
            maxTeamMembers: 5,
            googleCalendar: true,
            googleMeet: true,
            zoom: true,
            teams: true,
            customBranding: true,
            payments: true,
            coHosting: true,
            prioritySupport: false,
        },
    },
    enterprise: {
        name: 'Enterprise',
        price: 1499,
        currency: '₹',
        period: '/month',
        features: {
            maxEventTypes: -1,
            maxBookingsPerMonth: -1,
            maxTeamMembers: -1,
            googleCalendar: true,
            googleMeet: true,
            zoom: true,
            teams: true,
            customBranding: true,
            payments: true,
            coHosting: true,
            prioritySupport: true,
        },
    },
};

export function getPlanFeatures(plan) {
    return PLANS[plan]?.features || PLANS.free.features;
}

export function canCreateEventType(currentCount, plan) {
    const features = getPlanFeatures(plan);
    if (features.maxEventTypes === -1) return true;
    return currentCount < features.maxEventTypes;
}

export function canCreateBooking(currentMonthCount, plan) {
    const features = getPlanFeatures(plan);
    if (features.maxBookingsPerMonth === -1) return true;
    return currentMonthCount < features.maxBookingsPerMonth;
}

export function canUseIntegration(integration, plan) {
    const features = getPlanFeatures(plan);
    const integrationMap = {
        zoom: features.zoom,
        teams: features.teams,
        google_calendar: features.googleCalendar,
        google_meet: features.googleMeet,
    };
    return integrationMap[integration] ?? false;
}

export function canUseBranding(plan) {
    return getPlanFeatures(plan).customBranding;
}

export function canUsePayments(plan) {
    return getPlanFeatures(plan).payments;
}

export function canUseCoHosting(plan) {
    return getPlanFeatures(plan).coHosting;
}

export function getMaxTeamMembers(plan) {
    return getPlanFeatures(plan).maxTeamMembers;
}
