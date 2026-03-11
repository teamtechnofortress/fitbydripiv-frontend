import axios from "axios"
import { postRequestNoAuth } from "@/network"
import {
  // FORGOT_PASSWORD_URL,
  LOGIN_URL,
  REGISTER_URL,
  SIMPLE_REGISTER_URL,
  VERIFY_2FA_URL,
  ENABLE_2FA_URL,
  CONFIRM_2FA_URL,
  DISABLE_2FA_URL,
  REGENERATE_2FA_URL,
} from "@/network/const"
import { defineStore } from "pinia"
import { devLog } from '@/utils/devLogger'

const getStoredToken = () => localStorage.getItem("accessToken") || null

const extractPayload = response => {
  const raw = response?.data ?? {}
  if (raw && typeof raw === "object" && Object.prototype.hasOwnProperty.call(raw, "success")) {
    if (raw.success === false) {
      const message = raw.err_msg || raw.message || "Request failed"
      throw new Error(message)
    }
    if (raw.data !== undefined) return raw.data
  }
  return raw?.data !== undefined ? raw.data : raw
}

const buildErrorMessage = (error, fallback) => {
  const responseData = error?.response?.data
  if (typeof responseData === "string") return responseData
  if (responseData?.message) return responseData.message
  if (responseData?.err_msg) return responseData.err_msg
  if (responseData?.errors) {
    const firstKey = Object.keys(responseData.errors)[0]
    if (firstKey) {
      const entry = responseData.errors[firstKey]
      return Array.isArray(entry) ? entry[0] : entry
    }
  }
  if (responseData?.data && typeof responseData.data === "object") {
    const nested = Object.values(responseData.data)[0]
    if (nested) return Array.isArray(nested) ? nested[0] : nested
  }
  if (error?.message) return error.message
  return fallback
}

export const useAuthDataStore = defineStore('authData', {
  state: () => ({
    loggedInUser: localStorage.getItem("userData") != null ? JSON.parse(localStorage.getItem("userData")) : null,
    userAbility: "",
    forgotPasswordEmail: "",
    newPassword: "",
    loading: false,
    error: null,
    twoFactorRequired: false,
    twoFactorEmail: "",
    twoFactorSetup: null,
    profile: "",
    updatedProfile: "",
    users: "",
    userImport: "",
    newExAssigns: "",
  }),
  actions: {
    async login(data) {
      this.error = null
      this.loading = true
      this.twoFactorRequired = false
      this.twoFactorEmail = ""
      devLog('Auth login attempt', { email: data?.email })
      try {
        const response = await axios.post(LOGIN_URL, {
          email: data.email,
          password: data.password,
        })
        const payload = extractPayload(response)
        devLog('Auth login success payload', {
          email: data?.email,
          requiresTwoFactor: payload?.requires_2fa ?? payload?.requiresTwoFactor ?? payload?.requires2fa ?? false,
        })

        const requiresTwoFactor = payload?.requires_2fa ?? payload?.requiresTwoFactor ?? payload?.requires2fa
        if (requiresTwoFactor) {
          this.twoFactorRequired = true
          this.twoFactorEmail = payload.email || data.email
          devLog('Auth login requires two-factor', { email: this.twoFactorEmail })
          return { requiresTwoFactor: true, email: this.twoFactorEmail }
        }

        this.persistAuthSession(payload)
        return { requiresTwoFactor: false, user: payload.user }
      } catch (error) {
        devLog('Auth login failed', { message: error?.message })
        const message = buildErrorMessage(error, "Unable to login")
        this.setAuthError("Login Failed", message)
        this.clearPersistedSession()
        throw new Error(message)
      } finally {
        this.loading = false
      }
    },
    async verifyTwoFactorCode(code) {
      this.error = null
      this.loading = true
      try {
        if (!this.twoFactorEmail) {
          throw new Error("Two-factor verification requires a pending email.")
        }
        devLog('Auth verifying two-factor', { email: this.twoFactorEmail })
        const response = await axios.post(VERIFY_2FA_URL, {
          email: this.twoFactorEmail,
          code,
        })
        const payload = extractPayload(response)
        devLog('Auth two-factor verified', { email: this.twoFactorEmail })
        this.persistAuthSession(payload)
        this.twoFactorRequired = false
        this.twoFactorEmail = ""
        return payload
      } catch (error) {
        devLog('Auth two-factor verification failed', { message: error?.message })
        const message = buildErrorMessage(error, "Invalid verification code")
        this.setAuthError("Two Factor Verification Failed", message)
        throw new Error(message)
      } finally {
        this.loading = false
      }
    },
    async enableTwoFactor() {
      this.error = null
      try {
        const token = getStoredToken()
        if (!token) {
          throw new Error("Authentication token missing. Please login again.")
        }
        devLog('Auth enable two-factor request', { tokenExists: !!token })
        const response = await axios.post(ENABLE_2FA_URL, null, {
          headers: { Authorization: `Bearer ${token}` },
        })
        const payload = extractPayload(response)
        const setup = {
          secret: payload.secret,
          qr: payload.qr,
          recoveryCodes: payload.recovery_codes ?? payload.recoveryCodes ?? [],
        }
        this.twoFactorSetup = setup
        return setup
      } catch (error) {
        const message = buildErrorMessage(error, "Unable to enable two-factor authentication")
        this.setAuthError("Enable 2FA Failed", message)
        throw new Error(message)
      }
    },
    async confirmTwoFactor(code) {
      this.error = null
      try {
        const token = getStoredToken()
        if (!token) {
          throw new Error("Authentication token missing. Please login again.")
        }
        devLog('Auth confirm two-factor request', { tokenExists: !!token })
        const response = await axios.post(CONFIRM_2FA_URL, { code }, {
          headers: { Authorization: `Bearer ${token}` },
        })
        const payload = extractPayload(response)
        this.twoFactorSetup = null
        return payload
      } catch (error) {
        const message = buildErrorMessage(error, "Unable to confirm two-factor authentication")
        this.setAuthError("Confirm 2FA Failed", message)
        throw new Error(message)
      }
    },
    async disableTwoFactor(code) {
      this.error = null
      try {
        const token = getStoredToken()
        if (!token) throw new Error("Authentication token missing. Please login again.")
        devLog('Auth disable two-factor request', { tokenExists: !!token })
        const response = await axios.post(DISABLE_2FA_URL, {}, {
          headers: { Authorization: `Bearer ${token}` },
        })
        const payload = extractPayload(response)
        return payload
      } catch (error) {
        const message = buildErrorMessage(error, "Unable to disable two-factor authentication")
        this.setAuthError("Disable 2FA Failed", message)
        throw new Error(message)
      }
    },
    async regenerateTwoFactor(code) {
      this.error = null
      try {
        const token = getStoredToken()
        if (!token) throw new Error("Authentication token missing. Please login again.")
        devLog('Auth regenerate two-factor request', { tokenExists: !!token })
        const response = await axios.post(REGENERATE_2FA_URL, {}, {
          headers: { Authorization: `Bearer ${token}` },
        })
        const payload = extractPayload(response)
        return {
          secret: payload.secret,
          qr: payload.qr,
          recoveryCodes: payload.recovery_codes ?? payload.recoveryCodes ?? [],
        }
      } catch (error) {
        const message = buildErrorMessage(error, "Unable to regenerate two-factor secret")
        this.setAuthError("Regenerate 2FA Failed", message)
        throw new Error(message)
      }
    },
    async register(data) {
      this.error = null
      this.loading = true
      try {
        const response = await axios.post(REGISTER_URL, {
          firstName: data.firstName,
          lastName: data.lastName,
          email: data.email,
          password: data.password,
        })
        const payload = extractPayload(response)
        this.persistAuthSession(payload)
        return payload
      } catch (error) {
        const message = buildErrorMessage(error, "Unable to register")
        this.setAuthError("Register Failed", message)
        this.clearPersistedSession()
        throw new Error(message)
      } finally {
        this.loading = false
      }
    },
    async simpleRegister(data) {
      this.error = null
      this.loading = true
      try {
        devLog('Auth simple register attempt', { email: data?.email })
        const response = await axios.post(SIMPLE_REGISTER_URL, {
          firstName: data.firstName,
          lastName: data.lastName,
          email: data.email,
          password: data.password,
        })
        const payload = extractPayload(response)
        devLog('Auth simple register success', { userId: payload?.user?.id })
        this.persistAuthSession(payload)
        return payload
      } catch (error) {
        devLog('Auth simple register failed', { message: error?.message })
        const message = buildErrorMessage(error, "Unable to register")
        this.setAuthError("Simple Register Failed", message)
        this.clearPersistedSession()
        throw new Error(message)
      } finally {
        this.loading = false
      }
    },
    forgotPassword({ commit }, data) {
      commit("clearError")
      commit("setLoading", true)
      postRequestNoAuth(FORGOT_PASSWORD_URL, {}, data, response => {
        let res = response.data.success
        console.log("response: ", res)
        if (res) {
          let email = response.data.data.email
          commit("FORGOT_PASSWORD", email)
        } else {
          let err_msg = response.data.err_msg
          let error = {
            code: "Forgot Password Failed",
            message: err_msg,
          }
          commit("setError", error)
          console.log(err_msg)
        }
      })
    },
    resetPassword({ commit }, data) {
      commit("clearError")
      commit("setLoading", true)
      let params = {
        email: data.email,
        password: data.password,
        authKey: data.authKey,
      }
      postRequestNoAuth(RESET_PASSWORD_URL, null, params, response => {
        let res = response.data.success
        console.log("response: ", res)
        if (res) {
          let password = response.data.data.password
          commit("setNewPassword", password)
        } else {
          let err_msg = response.data.err_msg
          let error = {
            code: "Reset Password Failed",
            message: err_msg,
          }
          commit("setError", error)
          console.log(err_msg)
        }
      })
    },
    persistAuthSession(payload = {}) {
      const resolved = payload?.data ?? payload
      const user = resolved?.user
      const token = resolved?.token
      const userAbilities = resolved?.userAbilities ?? resolved?.user_abilities ?? []
      if (!user || !token) {
        throw new Error("Authentication response missing user or token")
      }
      localStorage.setItem("userData", JSON.stringify(user))
      localStorage.setItem("accessToken", token)
      localStorage.setItem("userAbilities", JSON.stringify(userAbilities))

      this.loggedInUser = user
      this.userAbility = userAbilities
      this.error = null
    },
    clearPersistedSession() {
      localStorage.removeItem("userData")
      localStorage.removeItem("accessToken")
      localStorage.removeItem("userAbilities")
      this.loggedInUser = null
      this.userAbility = ""
    },
    setAuthError(code, message) {
      this.error = {
        code,
        message,
      }
    },
  },
})

export const getUserInfo = () => {
  return localStorage.getItem("userData") != null ? JSON.parse(localStorage.getItem("userData")) : null
}

export const getApiToken = () => getStoredToken()
