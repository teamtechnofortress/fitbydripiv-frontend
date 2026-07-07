import { devLog } from '@/utils/devLogger'

const serializeFormData = formData => {
  if (typeof FormData === 'undefined' || !(formData instanceof FormData)) return formData

  return Array.from(formData.entries()).reduce((acc, [key, value]) => {
    const isFile = typeof File !== 'undefined' && value instanceof File

    acc[key] = isFile
      ? {
        name: value.name,
        size: value.size,
        type: value.type,
      }
      : value

    return acc
  }, {})
}

const serializePayload = payload => serializeFormData(payload)

export const logApiRequest = (label, details = {}) => {
  devLog(`${label} request`, {
    ...details,
    body: serializePayload(details.body),
  })
}

export const logApiSuccess = (label, details = {}) => {
  devLog(`${label} response`, details)
}

export const logApiError = (label, error, details = {}) => {
  devLog(`${label} error`, {
    ...details,
    message: error?.message,
    status: error?.response?.status,
    response: error?.response?.data,
  })
}
