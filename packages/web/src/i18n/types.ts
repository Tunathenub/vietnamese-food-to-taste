export type SupportedLanguage = 'vi' | 'en' | 'ko' | 'ja' | 'zh';

export interface LanguageOption {
  code: SupportedLanguage;
  name: string;
  nativeName: string;
  flag: string;
  currencySymbol: string;
  currencyCode: string;
  exchangeRateFromVND: number; // e.g. 1 USD = ~25,400 VND -> rate = 1 / 25400
}

export interface TranslationDictionary {
  nav: {
    brandName: string;
    brandTagline: string;
    home: string;
    tasteProfile: string;
    menu: string;
    orderLookup: string;
    staffPortal: string;
    login: string;
    logout: string;
    profile: string;
    cart: string;
    changeTaste: string;
    roleAdmin: string;
    roleStaff: string;
  };
  common: {
    loading: string;
    search: string;
    searchPlaceholder: string;
    all: string;
    filter: string;
    save: string;
    cancel: string;
    confirm: string;
    back: string;
    backToMenu: string;
    viewDetails: string;
    addToCart: string;
    addedToCart: string;
    quantity: string;
    price: string;
    total: string;
    subtotal: string;
    empty: string;
    optional: string;
    required: string;
    minutes: string;
    items: string;
    checkout: string;
    error: string;
    retry: string;
    close: string;
  };
  taste: {
    title: string;
    subtitle: string;
    activeBadge: string;
    resetDefaults: string;
    applyProfile: string;
    aiCustomTag: string;
    attributes: {
      spice_level: {
        name: string;
        desc: string;
        levels: [string, string, string, string, string, string];
      };
      sweetness: {
        name: string;
        desc: string;
        levels: [string, string, string, string, string, string];
      };
      sourness: {
        name: string;
        desc: string;
        levels: [string, string, string, string, string, string];
      };
      fish_sauce_intensity: {
        name: string;
        desc: string;
        levels: [string, string, string, string, string, string];
      };
      herb_intensity: {
        name: string;
        desc: string;
        levels: [string, string, string, string, string, string];
      };
      oil_richness: {
        name: string;
        desc: string;
        levels: [string, string, string, string, string, string];
      };
    };
    presetProfiles: {
      AUTHENTIC_VN: {
        name: string;
        description: string;
      };
      KR_INSPIRED: {
        name: string;
        description: string;
      };
      WESTERN_MILD: {
        name: string;
        description: string;
      };
      JP_DELICATE: {
        name: string;
        description: string;
      };
    };
  };
  dish: {
    categories: {
      ALL: string;
      NOODLE_SOUP: string;
      NOODLE: string;
      SANDWICH: string;
      RICE: string;
      APPETIZER: string;
    };
    filters: {
      vegetarianOnly: string;
      priceAll: string;
      priceUnder50k: string;
      price50kTo70k: string;
      priceOver70k: string;
    };
    prepTime: string;
    customizationTitle: string;
    customizationSubtitle: string;
    ingredientsTitle: string;
    substitutionsTitle: string;
    substitutionsDesc: string;
    allergensWarningTitle: string;
    allergensNotice: string;
    specialNotes: string;
    specialNotesPlaceholder: string;
    quickAdd: string;
    customizedForYou: string;
    matchedProfile: string;
  };
  cart: {
    title: string;
    emptyTitle: string;
    emptySubtitle: string;
    exploreMenu: string;
    orderSummary: string;
    deliveryFee: string;
    freeDelivery: string;
    totalAmount: string;
    proceedCheckout: string;
    removeItem: string;
    tasteAdjusted: string;
    ingredientsAdjusted: string;
  };
  checkout: {
    title: string;
    subtitle: string;
    touristNoticeTitle: string;
    touristNoticeDesc: string;
    customerInfoTitle: string;
    fullName: string;
    fullNamePlaceholder: string;
    email: string;
    emailPlaceholder: string;
    phone: string;
    phonePlaceholder: string;
    phoneNotice: string;
    contactMethodTitle: string;
    whatsappCheckbox: string;
    zaloCheckbox: string;
    fulfillmentTitle: string;
    delivery: string;
    pickup: string;
    deliveryAddress: string;
    deliveryAddressPlaceholder: string;
    hotelNotesTitle: string;
    hotelNotesPlaceholder: string;
    hotelNotesHelp: string;
    paymentTitle: string;
    cod: string;
    codDesc: string;
    prepaid: string;
    prepaidDesc: string;
    prepaidHotelBadge: string;
    orderNotes: string;
    orderNotesPlaceholder: string;
    submitOrder: string;
    submitting: string;
    agreeTerms: string;
  };
  orderSuccess: {
    title: string;
    subtitle: string;
    orderNumber: string;
    statusLabel: string;
    touristTipTitle: string;
    touristTipContent: string;
    viewOrderDetails: string;
    backHome: string;
    orderPlacedAt: string;
  };
  orderStatus: {
    PENDING: string;
    CONFIRMED: string;
    PREPARING: string;
    READY: string;
    DELIVERING: string;
    COMPLETED: string;
    CANCELLED: string;
    timelineOrderPlaced: string;
    timelineConfirmed: string;
    timelinePreparing: string;
    timelineReady: string;
    timelineDelivering: string;
    timelineCompleted: string;
  };
  orderLookup: {
    title: string;
    subtitle: string;
    orderNumberLabel: string;
    orderNumberPlaceholder: string;
    phoneLabel: string;
    phonePlaceholder: string;
    lookupButton: string;
    searching: string;
    notFoundError: string;
    guestNotice: string;
  };
  staff: {
    portalTitle: string;
    portalSubtitle: string;
    queueTab: string;
    readyTab: string;
    completedTab: string;
    allTab: string;
    orderId: string;
    customer: string;
    hotelRoom: string;
    whatsappChat: string;
    tasteSummary: string;
    kitchenActions: string;
    startCooking: string;
    markReady: string;
    completeOrder: string;
    cancelOrder: string;
    emptyQueue: string;
  };
  onboarding: {
    welcomeTitle: string;
    welcomeSubtitle: string;
    nationalityLabel: string;
    nationalityPlaceholder: string;
    analyzeButton: string;
    analyzing: string;
    skip: string;
    quickPicks: string;
  };
}
