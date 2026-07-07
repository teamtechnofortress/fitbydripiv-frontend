import axios from 'axios'
import { getOrderJourneyUrl } from '@/network/const'
import { logApiError, logApiRequest, logApiSuccess } from './apiDebugLogger'

export const getOrderJourney = async orderUuid => {
  const url = getOrderJourneyUrl(orderUuid)

  logApiRequest('Order journey', {
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

    logApiSuccess('Order journey', {
      method: 'GET',
      url,
      orderUuid,
      payload,
    })

    return payload
  } catch (error) {
    logApiError('Order journey', error, {
      method: 'GET',
      url,
      orderUuid,
    })
    throw error
  }
}
