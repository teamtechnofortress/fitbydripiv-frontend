import axios from 'axios'
import {
  getDrNetworkBookProviderSlotUrl,
  getDrNetworkCurrentStepUrl,
  getDrNetworkDocumentsCompleteUrl,
  getDrNetworkDocumentsUrl,
  getDrNetworkIntakeAnswersUrl,
  getDrNetworkProviderSlotsUrl,
  getDrNetworkStatusUrl,
  getDrNetworkSubmitUrl,
} from '@/network/const'
import { logApiError, logApiRequest, logApiSuccess } from './apiDebugLogger'

const unwrap = response => response?.data?.data || response?.data || response

export const normalizeCurrentStep = response => {
  const data = unwrap(response) || {}
  const stepData = data.step_data || {}

  return {
    ...data,
    status: data.status || data.flow_status || null,
    current_step_key: data.current_step_key || data.step || null,
    failed_step_key: data.failed_step_key || stepData.failed_step_key || null,
    step_data: {
      ...stepData,
      document_requirements: stepData.document_requirements ?? data.document_requirements ?? null,
      question_set: stepData.question_set ?? data.question_set ?? null,
      slots: stepData.slots ?? data.slots ?? null,
      pause_reason: stepData.pause_reason ?? data.pause_reason ?? null,
      failure_reason: stepData.failure_reason ?? data.failure_reason ?? null,
      failed_step_key: stepData.failed_step_key ?? data.failed_step_key ?? null,
    },
  }
}

export const getCurrentStep = async orderUuid => {
  const url = getDrNetworkCurrentStepUrl(orderUuid)

  logApiRequest('Dr Network current step', {
    method: 'GET',
    url,
    orderUuid,
  })

  try {
    const response = await axios.get(
      url,
      { headers: { Accept: 'application/json' } },
    )

    const normalized = normalizeCurrentStep(response)

    logApiSuccess('Dr Network current step', {
      method: 'GET',
      url,
      orderUuid,
      raw: response?.data,
      normalized,
    })

    return normalized
  } catch (error) {
    logApiError('Dr Network current step', error, {
      method: 'GET',
      url,
      orderUuid,
    })
    throw error
  }
}

export const uploadDocument = async (orderUuid, file, documentTypeId) => {
  const url = getDrNetworkDocumentsUrl(orderUuid)
  const form = new FormData()
  form.append('document', file)
  form.append('document_type_id', documentTypeId)

  logApiRequest('Dr Network document upload', {
    method: 'POST',
    url,
    orderUuid,
    body: form,
  })

  try {
    const { data } = await axios.post(
      url,
      form,
      { headers: { Accept: 'application/json' } },
    )

    const payload = data?.data || data

    logApiSuccess('Dr Network document upload', {
      method: 'POST',
      url,
      orderUuid,
      payload,
    })

    return payload
  } catch (error) {
    logApiError('Dr Network document upload', error, {
      method: 'POST',
      url,
      orderUuid,
    })
    throw error
  }
}

export const completeDocumentUpload = async orderUuid => {
  const url = getDrNetworkDocumentsCompleteUrl(orderUuid)

  logApiRequest('Dr Network complete document upload', {
    method: 'POST',
    url,
    orderUuid,
    body: {},
  })

  try {
    const { data } = await axios.post(
      url,
      {},
      { headers: { Accept: 'application/json' } },
    )

    const payload = data?.data || data

    logApiSuccess('Dr Network complete document upload', {
      method: 'POST',
      url,
      orderUuid,
      payload,
    })

    return payload
  } catch (error) {
    logApiError('Dr Network complete document upload', error, {
      method: 'POST',
      url,
      orderUuid,
    })
    throw error
  }
}

export const saveIntakeAnswer = async (orderUuid, questionId, answerValue) => {
  const url = getDrNetworkIntakeAnswersUrl(orderUuid)
  const body = {
    question_id: questionId,
    answer_value: answerValue,
  }

  logApiRequest('Dr Network intake answer', {
    method: 'POST',
    url,
    orderUuid,
    body,
  })

  try {
    const { data } = await axios.post(
      url,
      body,
      { headers: { Accept: 'application/json' } },
    )

    const payload = data?.data || data

    logApiSuccess('Dr Network intake answer', {
      method: 'POST',
      url,
      orderUuid,
      payload,
    })

    return payload
  } catch (error) {
    logApiError('Dr Network intake answer', error, {
      method: 'POST',
      url,
      orderUuid,
      body,
    })
    throw error
  }
}

export const getProviderSlots = async (orderUuid, params = {}) => {
  const url = getDrNetworkProviderSlotsUrl(orderUuid)

  logApiRequest('Dr Network provider slots', {
    method: 'GET',
    url,
    orderUuid,
    params,
  })

  try {
    const { data } = await axios.get(
      url,
      {
        headers: { Accept: 'application/json' },
        params,
      },
    )

    const payload = data?.data || data

    logApiSuccess('Dr Network provider slots', {
      method: 'GET',
      url,
      orderUuid,
      params,
      payload,
    })

    return payload
  } catch (error) {
    logApiError('Dr Network provider slots', error, {
      method: 'GET',
      url,
      orderUuid,
      params,
    })
    throw error
  }
}

export const bookProviderSlot = async (orderUuid, slotId, payload) => {
  const url = getDrNetworkBookProviderSlotUrl(orderUuid, slotId)

  logApiRequest('Dr Network book provider slot', {
    method: 'POST',
    url,
    orderUuid,
    slotId,
    body: payload,
  })

  try {
    const { data } = await axios.post(
      url,
      payload,
      { headers: { Accept: 'application/json' } },
    )

    const responsePayload = data?.data || data

    logApiSuccess('Dr Network book provider slot', {
      method: 'POST',
      url,
      orderUuid,
      slotId,
      payload: responsePayload,
    })

    return responsePayload
  } catch (error) {
    logApiError('Dr Network book provider slot', error, {
      method: 'POST',
      url,
      orderUuid,
      slotId,
      body: payload,
    })
    throw error
  }
}

export const submitDrNetworkWorkflow = async orderUuid => {
  const url = getDrNetworkSubmitUrl(orderUuid)

  logApiRequest('Dr Network submit workflow', {
    method: 'POST',
    url,
    orderUuid,
    body: {},
  })

  try {
    const { data } = await axios.post(
      url,
      {},
      { headers: { Accept: 'application/json' } },
    )

    const payload = data?.data || data

    logApiSuccess('Dr Network submit workflow', {
      method: 'POST',
      url,
      orderUuid,
      payload,
    })

    return payload
  } catch (error) {
    logApiError('Dr Network submit workflow', error, {
      method: 'POST',
      url,
      orderUuid,
    })
    throw error
  }
}

export const getDrNetworkStatus = async orderUuid => {
  const url = getDrNetworkStatusUrl(orderUuid)

  logApiRequest('Dr Network status', {
    method: 'GET',
    url,
    orderUuid,
  })

  try {
    const { data } = await axios.get(
      url,
      { headers: { Accept: 'application/json' } },
    )

    const payload = data?.data || data

    logApiSuccess('Dr Network status', {
      method: 'GET',
      url,
      orderUuid,
      payload,
    })

    return payload
  } catch (error) {
    logApiError('Dr Network status', error, {
      method: 'GET',
      url,
      orderUuid,
    })
    throw error
  }
}
