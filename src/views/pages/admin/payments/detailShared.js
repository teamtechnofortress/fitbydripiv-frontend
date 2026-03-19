export const formatMoney = (amount, currency = 'USD') => {
  if (amount == null || amount === '') return '-'
  const value = Number(amount)
  if (Number.isNaN(value)) return amount
  
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    maximumFractionDigits: 2,
  }).format(value)
}

export const formatDate = value => {
  if (!value) return '-'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(date)
}

export const formatDateTime = value => {
  if (!value) return '-'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(date)
}

export const statusColor = status => {
  if (!status) return 'secondary'

  const normalized = String(status).toLowerCase()
  if (['paid', 'active', 'completed', 'processed', 'succeeded'].includes(normalized)) return 'success'
  if (['pending', 'unpaid', 'processing'].includes(normalized)) return 'warning'
  if (['failed', 'cancelled', 'canceled', 'error'].includes(normalized)) return 'error'

  return 'info'
}

export const prettyLabel = value => {
  if (!value) return '-'
  
  return String(value)
    .replace(/_/g, ' ')
    .replace(/\b\w/g, char => char.toUpperCase())
}
