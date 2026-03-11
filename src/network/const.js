// In local Vite dev (localhost:5173), API runs on Laravel localhost:8001.
// In staging/prod, same-origin is preferred.
const isLocalDevHost = ["localhost", "127.0.0.1"].includes(window.location.hostname)
const defaultApiBase = isLocalDevHost
  ? "http://localhost:8001/api/v1"
  : `${window.location.origin}/api/v1`
const SERVER_URL = (
  import.meta.env.VITE_API_BASE_URL
  || defaultApiBase
).replace(/\/+$/, "")

// Auth & User

export const SERVER_DOMAIN = SERVER_URL.replace(/\/api\/v1$/, '')
export const LOGIN_URL = SERVER_URL + "/auth/login"
export const LOGOUT_URL = SERVER_URL + "/auth/logout"
export const REGISTER_URL = SERVER_URL + "/auth/register"
export const SIMPLE_REGISTER_URL = SERVER_URL + "/auth/simple-register"
export const FORGOT_PASSWORD_URL = SERVER_URL + "/auth/forgot-password"
export const RESET_PASSWORD_URL  = SERVER_URL + "/auth/reset-password"
export const CHANGE_PASSWORD_URL  = SERVER_URL + "/auth/change-password"
export const CONFIRM_PASSWORD_URL  = SERVER_URL + "/auth/confirm-password"
export const VERIFY_2FA_URL = SERVER_URL + "/auth/verify-2fa"
export const ENABLE_2FA_URL = SERVER_URL + "/auth/enable-2fa"
export const CONFIRM_2FA_URL = SERVER_URL + "/auth/confirm-2fa"
export const DISABLE_2FA_URL = SERVER_URL + "/auth/disable-2fa"
export const REGENERATE_2FA_URL = SERVER_URL + "/auth/regenerate-2fa"
export const GET_EMAIL_STATUS_URL = SERVER_URL + "/auth/email/status"
export const SEND_EMAIL_VERIFICATION_URL = SERVER_URL + "/auth/email/send-verification"
export const SECURITY_SAVE_URL  = SERVER_URL + "/auth/security-save"
export const GET_PATIENT_BY_NAME = SERVER_URL + "/get/patient-by-name"
export const GET_PATIENT_BY_PHONE = SERVER_URL + "/get/patient-by-phone"
export const GET_PATIENT_AND_HISTORY_BY_NAME = SERVER_URL + "/get/patient-history-by-name"
export const GET_PATIENT_AND_HISTORY_BY_ID   = SERVER_URL + "/get/patient-history-by-id"
export const GET_PATIENT_AND_ENCOUNTER_BY_ID = SERVER_URL + "/get/patient-encounter-by-id"
export const SAVE_INTAKE1_URL = SERVER_URL + "/save/intake1"
export const SAVE_INTAKE2_URL = SERVER_URL + "/save/intake2"
export const SAVE_INTAKE3_URL = SERVER_URL + "/save/intake3"
export const GET_TWO_FACTOR_STATUS_URL = SERVER_URL + "/auth/2fa-status"

export const GET_ALL_MEMBERS    = SERVER_URL + "/get/members"
export const GET_ALL_STAFFS    = SERVER_URL + "/get/staffs"
export const ADD_STAFF_URL    = SERVER_URL + "/add/staff"
export const UPDATE_STAFF_URL    = SERVER_URL + "/update/staff"
export const DELETE_STAFF_URL    = SERVER_URL + "/delete/staff"
export const GET_STAFF_BY_NAME = SERVER_URL + "/get/staff-by-name"
export const GET_PATIENT_QUE = SERVER_URL + "/get/patient-que"
export const DELETE_PATIENT_URL = SERVER_URL + "/delete/patient"
export const SAVE_STAFF_SCHEDULE= SERVER_URL + "/save/staff-schedule"
export const GET_STAFF_SCHEDULE = SERVER_URL + "/get/staff-schedule"
export const SAVE_STAFF_PAYROLL = SERVER_URL + "/save/staff-payroll"
export const GET_STAFF_PAYROLL  = SERVER_URL + "/get/staff-payroll"
export const GET_SALES_METRICS  = SERVER_URL + "/get/sales-metrics"

export const GET_ALL_INVENTORY  = SERVER_URL + "/get/inventories"
export const ADD_INVENTORY_URL  = SERVER_URL + "/add/inventory"
export const UPDATE_INVENTORY_URL  = SERVER_URL + "/update/inventory"
export const DELETE_INVENTORY_URL  = SERVER_URL + "/delete/inventory"

export const GET_ALL_PATIENT    = SERVER_URL + "/patients"
export const UPDATE_PATIENT_URL = SERVER_URL + "/update/patient"
export const SAVE_ENCOUNTER_URL = SERVER_URL + "/save/encounter"
export const DELETE_ENCOUNTER_URL = SERVER_URL + "/delete/encounter"
export const GET_REPORTS_URL = SERVER_URL + "/get/reports"
export const SAVE_INVOICE_URL   = SERVER_URL + "/save/invoice"
export const INVOICE_SEND_URL   = SERVER_URL + "/send/invoice"

export const GET_APPOINTMENTS_URL   = SERVER_URL + "/get/appointments"
export const GET_APPOINTMENT_URL    = SERVER_URL + "/get/appointment"
export const ADD_APPOINTMENT_URL    = SERVER_URL + "/add/appointment"
export const UPDATE_APPOINTMENT_URL    = SERVER_URL + "/update/appointment"
export const DELETE_APPOINTMENT_URL    = SERVER_URL + "/delete/appointment"

export const SAVE_TEXT_CAMPAIGN_URL     = SERVER_URL + "/save/text-campaign"
export const GET_TEXT_CAMPAIGNS_URL     = SERVER_URL + "/get/text-campaigns"
export const SAVE_EMAIL_CAMPAIGN_URL    = SERVER_URL + "/save/email-campaign"
export const GET_EMAIL_CAMPAIGNS_URL     = SERVER_URL + "/get/email-campaigns"
export const SAVE_SPECIAL_PROMO_URL     = SERVER_URL + "/save/special-promo"
export const GET_SPECIAL_PROMOS_URL     = SERVER_URL + "/get/special-promos"
export const UPDATE_SPECIAL_PROMO_URL   = SERVER_URL + "/update/special-promo"
export const DELETE_SPECIAL_PROMO_URL   = SERVER_URL + "/delete/special-promo"
export const DELETE_TEXT_CAMPAIGN_URL   = SERVER_URL + "/delete/text-campaign"
export const DELETE_EMAIL_CAMPAIGN_URL   = SERVER_URL + "/delete/email-campaign"

export const UPLOAD_ENDPOINT_URL        = SERVER_URL + '/upload-endpoint'
export const LOGO_UPLOAD_URL            = SERVER_URL + '/logo-upload'
export const GET_LOGO_URL               = SERVER_URL + '/get-logo'
export const INSTRUCTION_UPLOAD_URL     = SERVER_URL + '/instruction-upload'
export const GET_INSTRUCTION_URL        = SERVER_URL + '/get-instruction'

export const GET_PATIENT_APPOINTMENTS_URL       = SERVER_URL + '/get/patient-appointments'
export const GET_ALL_PATIENT_APPOINTMENTS_URL       = SERVER_URL + '/all/patient-appointments'
export const ADD_PATIENT_APPOINTMENT_URL       = SERVER_URL + '/add/patient-appointment'
export const UPDATE_PATIENT_APPOINTMENT_URL    = SERVER_URL + "/update/patient-appointment"
export const DELETE_PATIENT_APPOINTMENT_URL    = SERVER_URL + "/delete/patient-appointment"

export const ADD_ADMIN_SUBJECT_NOTES   = SERVER_URL + "/add/admin-subject-notes"
export const ADD_ADMIN_OBJECT_NOTES   = SERVER_URL + "/add/admin-object-notes"
export const ADD_ADMIN_ASSESSMENT_NOTES   = SERVER_URL + "/add/admin-assessment-notes"
export const ADD_ADMIN_PLAN_NOTES   = SERVER_URL + "/add/admin-plan-notes"
export const ADD_ADMIN_RISK_BENEFIT_REWARD   = SERVER_URL + "/add/admin-risk-benefit-reward"

export const GET_ADMIN_NOTES   = SERVER_URL + "/get/admin-notes"
export const ADD_PROCEDURE_PLAN_NOTES   = SERVER_URL + "/add/procedure-plan-notes"
export const GET_PROCEDURE_PLAN_NOTES   = SERVER_URL + "/get/procedure-plan-notes"
export const ADD_CHIEF_COMPLIANT_URL     = SERVER_URL + "/add/chief-complaint"
export const GET_CHIEF_COMPLIANT_URL     = SERVER_URL + "/get/chief-complaint"
export const UPDATE_PHYSICAL_EXAM_URL  = SERVER_URL + "/update/physical-exam"
export const DELETE_CHIEF_COMPLIANT_URL  = SERVER_URL + "/delete/chief-complaint"
export const ADD_PATIENT_PHYSICAL_EXAM   = SERVER_URL + "/add/physical-exam"
export const GET_PATIENT_PHYSICAL_EXAM  = SERVER_URL + "/get/physical-exam"
export const ADD_PATIENT_PLAN   = SERVER_URL + "/add/patient-plan"
export const GET_PATIENT_PLAN   = SERVER_URL + "/get/patient-plan"
export const ADD_PATIENT_PROCEDURE   = SERVER_URL + "/add/patient-procedure"
export const GET_PATIENT_PROCEDURE   = SERVER_URL + "/get/patient-procedure"
export const ADD_ASSESSMENT_URL  = SERVER_URL + "/add/assessment"
export const GET_ASSESSMENT_BY_DATE_URL  = SERVER_URL + "/get/assessment-by-date"
export const SAVE_BANKING_DATA_URL = SERVER_URL + "/save/banking"
export const GET_BANKING_URL = SERVER_URL + "/get/banking"
export const SAVE_BUSINESS_HOURS_URL = SERVER_URL + "/save/business-hours"
export const GET_BUSINESS_HOURS_URL = SERVER_URL + "/get/business-hours"
export const SAVE_CHART_HISTORY = SERVER_URL + "/save/chart-history"
export const ALL_CHART_HISTORY = SERVER_URL + "/get/all-chart-history"
export const DELETE_CHART_HISTORY = SERVER_URL + "/delete/chart-history"
export const SAVE_CUSTOMER_SERVICE_REPORT = SERVER_URL + "/save/customer-service-report"
export const ALL_CUSTOMER_SERVICE_REPORT = SERVER_URL + "/get/all-customer-service-report"
export const DELETE_CUSTOMER_SERVICE_REPORT = SERVER_URL + "/delete/customer-service-report"
export const SAVE_PATIENT_METRICS = SERVER_URL + "/save/patient-metrics"
export const ALL_PATIENT_METRICS = SERVER_URL + "/get/all-patient-metrics"
export const DELETE_PATIENT_METRICS = SERVER_URL + "/delete/patient-metrics"
export const SAVE_PRODUCT_METRICS = SERVER_URL + "/save/product-metrics"
export const ALL_PRODUCT_METRICS = SERVER_URL + "/get/all-product-metrics"
export const DELETE_PRODUCT_METRICS = SERVER_URL + "/delete/product-metrics"
export const SAVE_APPOINTMENT_REPORT = SERVER_URL + "/save/appointment-report"
export const ALL_APPOINTMENT_REPORT = SERVER_URL + "/get/all-appointment-report"
export const DELETE_APPOINTMENT_REPORT = SERVER_URL + "/delete/appointment-report"
export const SAVE_REWARD_REPORT = SERVER_URL + "/save/reward-report"
export const ALL_REWARD_REPORT = SERVER_URL + "/get/all-reward-report"
export const DELETE_REWARD_REPORT = SERVER_URL + "/delete/reward-report"

export const SAVE_STAFF_REPORT = SERVER_URL + "/save/staff-report"
export const ALL_STAFF_REPORT = SERVER_URL + "/get/all-staff-report"
export const DELETE_STAFF_REPORT = SERVER_URL + "/delete/staff-report"

export const SAVE_PAYROLL_REPORT = SERVER_URL + "/save/payroll-report"
export const ALL_PAYROLL_REPORT = SERVER_URL + "/get/all-payroll-report"
export const DELETE_PAYROLL_REPORT = SERVER_URL + "/delete/payroll-report"

export const SAVE_MEDRX_REPORT = SERVER_URL + "/save/medrx-report"
export const ALL_MEDRX_REPORT = SERVER_URL + "/get/all-medrx-report"
export const DELETE_MEDRX_REPORT = SERVER_URL + "/delete/medrx-report"

export const SAVE_EMAIL_TEXT_REWARD_REPORT = SERVER_URL + "/save/email-text-reward-report"
export const ALL_EMAIL_TEXT_REWARD_REPORT = SERVER_URL + "/get/all-email-text-reward-report"
export const DELETE_EMAIL_TEXT_REWARD_REPORT = SERVER_URL + "/delete/email-text-reward-report"

export const SAVE_INVOICING_SALES_REPORT = SERVER_URL + "/save/invoicing-sales-report"
export const ALL_INVOICING_SALES_REPORT = SERVER_URL + "/get/all-invoicing-sales-report"
export const DELETE_INVOICING_SALES_REPORT = SERVER_URL + "/delete/invoicing-sales-report"

export const SAVE_SIGNATURE_URL = SERVER_URL + "/save/signature"
export const GET_SIGNATURE_URL = SERVER_URL + "/get/signature"

// CMS Public Endpoints
export const CMS_GET_CATEGORIES = SERVER_URL + "/cms/categories"
export const CMS_GET_CATEGORY_BY_SLUG = SERVER_URL + "/cms/categories"
export const CMS_GET_PRODUCTS_BY_CATEGORY = SERVER_URL + "/cms/categories"
export const CMS_GET_FEATURED_PRODUCTS = SERVER_URL + "/cms/products/featured"
export const CMS_GET_PRODUCT_BY_SLUG = SERVER_URL + "/cms/products"
export const CMS_GET_PRODUCT_PRICING = SERVER_URL + "/cms/products"
export const CMS_GET_PRODUCTS_SELECTOR = SERVER_URL + "/cms/products/selector"
export const CMS_GET_FAQS = SERVER_URL + "/cms/faqs"
export const CMS_GET_SITE_SETTINGS = SERVER_URL + "/cms/site-settings"
export const CMS_SUBMIT_CONTACT = SERVER_URL + "/cms/contact"

// CMS Admin Endpoints
export const CMS_ADMIN_CATEGORIES = SERVER_URL + "/cms/admin/categories"
export const CMS_ADMIN_PRODUCTS = SERVER_URL + "/cms/admin/products"
export const CMS_ADMIN_RESEARCH_LINKS = SERVER_URL + "/cms/admin/research-links"
export const CMS_ADMIN_PRICING_OPTIONS = SERVER_URL + "/cms/admin/pricing-options"
export const CMS_ADMIN_FAQS = SERVER_URL + "/cms/admin/faqs"
export const CMS_ADMIN_SUBSCRIPTION_DISCOUNTS = SERVER_URL + "/cms/admin/subscription-discounts"
export const CMS_ADMIN_SITE_SETTINGS = SERVER_URL + "/cms/admin/site-settings"
export const CMS_ADMIN_CONTACT_SUBMISSIONS = SERVER_URL + "/cms/admin/contact-submissions"
export const CMS_ADMIN_UPLOAD_PRODUCT_IMAGE = SERVER_URL + "/cms/admin/upload/product-image"
export const CMS_ADMIN_UPLOAD_CATEGORY_VIDEO = SERVER_URL + "/cms/admin/upload/category-video"
export const CMS_ADMIN_UPLOAD_HERO_VIDEO = SERVER_URL + "/cms/admin/upload/hero-video"
