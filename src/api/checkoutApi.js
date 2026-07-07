import axios from 'axios'
import { CHECKOUT_CREATE_URL, CHECKOUT_PAYMENT_CONFIRMATION_URL } from '@/network/const'
import { logApiError, logApiRequest, logApiSuccess } from './apiDebugLogger'

const unwrap = response => response?.data || response

export const createCheckout = async orderUuid => {
  const body = { order_uuid: orderUuid }

  logApiRequest('Checkout create', {
    method: 'POST',
    url: CHECKOUT_CREATE_URL,
    body,
  })

  try {
    const response = await axios.post(
      CHECKOUT_CREATE_URL,
      body,
      { headers: { Accept: 'application/json' } },
    )

    const payload = unwrap(response)

    logApiSuccess('Checkout create', {
      method: 'POST',
      url: CHECKOUT_CREATE_URL,
      payload,
    })

    return payload
  } catch (error) {
    logApiError('Checkout create', error, {
      method: 'POST',
      url: CHECKOUT_CREATE_URL,
      body,
    })
    throw error
  }
}

export const confirmCheckoutPayment = async sessionId => {
  const body = { session_id: sessionId }

  logApiRequest('Checkout payment confirmation', {
    method: 'POST',
    url: CHECKOUT_PAYMENT_CONFIRMATION_URL,
    body,
  })

  try {
    const response = await axios.post(
      CHECKOUT_PAYMENT_CONFIRMATION_URL,
      body,
      { headers: { Accept: 'application/json' } },
    )

    const payload = unwrap(response)

    logApiSuccess('Checkout payment confirmation', {
      method: 'POST',
      url: CHECKOUT_PAYMENT_CONFIRMATION_URL,
      payload,
    })

    return payload
  } catch (error) {
    logApiError('Checkout payment confirmation', error, {
      method: 'POST',
      url: CHECKOUT_PAYMENT_CONFIRMATION_URL,
      body,
    })
    throw error
  }
}
