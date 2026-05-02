export const normalizePublicSitePath = path => {
  if (!path)
    return ''

  const value = String(path).trim()

  if (!value)
    return ''

  if (/^https?:\/\//i.test(value))
    return value

  if (value === '/new' || value === '/new/' || value === 'new' || value === 'new/')
    return '/'

  if (value.startsWith('/new/'))
    return value.slice(4)

  if (value.startsWith('new/'))
    return `/${value.slice(4)}`

  return value
}
