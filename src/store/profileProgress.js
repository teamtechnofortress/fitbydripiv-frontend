import axios from 'axios'
import { defineStore } from 'pinia'
import { devLog } from '@/utils/devLogger'
import {
  PROFILE_PROGRESS_URL,
  PROFILE_PROGRESS_STEP2_URL,
  PROFILE_PROGRESS_STEP3_URL,
  PROFILE_PROGRESS_STEP4_URL,
  PROFILE_PROGRESS_STEP5_URL,
  PROFILE_PROGRESS_SKIP_URL,
} from '@/network/const'
import { getApiToken } from '@/store/authData'

const STEP_ENDPOINTS = {
  2: PROFILE_PROGRESS_STEP2_URL,
  3: PROFILE_PROGRESS_STEP3_URL,
  4: PROFILE_PROGRESS_STEP4_URL,
  5: PROFILE_PROGRESS_STEP5_URL,
}

const extractPayload = response => response?.data?.data ?? response?.data ?? null

const buildErrorMessage = error => {
  const responseData = error?.response?.data
  if (typeof responseData === 'string') return responseData
  if (responseData?.message) return responseData.message
  if (responseData?.errors) {
    const firstKey = Object.keys(responseData.errors)[0]
    if (firstKey) {
      const firstValue = responseData.errors[firstKey]
      
      return Array.isArray(firstValue) ? firstValue[0] : firstValue
    }
  }
  if (error?.message) return error.message
  
  return 'Request failed. Please try again.'
}

const getAuthHeaders = () => {
  const token = getApiToken()
  if (!token) throw new Error('Authentication token missing. Please login again.')
  
  return { Authorization: `Bearer ${token}` }
}

export const useProfileProgressStore = defineStore('profileProgress', {
  state: () => ({
    progress: null,
    loading: false,
    error: null,
  }),
  actions: {
    setProgress(payload) {
      if (payload) {
        this.progress = payload
        this.error = null
      }
    },
    async fetchProgress() {
      this.loading = true
      this.error = null
      try {
        devLog('Profile progress fetch start')

        const response = await axios.get(PROFILE_PROGRESS_URL, { headers: getAuthHeaders() })
        const payload = extractPayload(response)

        this.setProgress(payload)
        
        return payload
      } catch (error) {
        const message = buildErrorMessage(error)

        this.error = message
        devLog('Profile progress fetch failed', { message })
        throw new Error(message)
      } finally {
        this.loading = false
      }
    },
    async completeStep(step, data) {
      const endpoint = STEP_ENDPOINTS[step]
      if (!endpoint) throw new Error(`Unsupported step ${step}`)
      this.loading = true
      this.error = null
      try {
        devLog('Profile progress submit', { step })

        const response = await axios.post(endpoint, data, { headers: getAuthHeaders() })
        const payload = extractPayload(response)

        this.setProgress(payload)
        
        return response?.data ?? { data: payload }
      } catch (error) {
        const message = buildErrorMessage(error)

        this.error = message
        devLog('Profile progress submit failed', { step, message })
        throw new Error(message)
      } finally {
        this.loading = false
      }
    },
    async skipStep(step) {
      this.loading = true
      this.error = null
      try {
        devLog('Profile progress skip', { step })

        const response = await axios.post(PROFILE_PROGRESS_SKIP_URL, { step }, { headers: getAuthHeaders() })
        const payload = extractPayload(response)

        this.setProgress(payload)
        
        return response?.data ?? { data: payload }
      } catch (error) {
        const message = buildErrorMessage(error)

        this.error = message
        devLog('Profile progress skip failed', { step, message })
        throw new Error(message)
      } finally {
        this.loading = false
      }
    },
    async fetchStepData(step) {
      try {
        devLog('Profile progress step fetch', { step })

        const response = await axios.get(`${PROFILE_PROGRESS_URL}/step/${step}`, {
          headers: getAuthHeaders(),
        })

        
        return response?.data ?? null
      } catch (error) {
        const message = buildErrorMessage(error)

        devLog('Profile progress step fetch failed', { step, message })
        throw new Error(message)
      }
    },
  },
})
