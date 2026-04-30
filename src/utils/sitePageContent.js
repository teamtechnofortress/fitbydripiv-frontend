export const sortByOrderOrIndex = (items = []) => (
  items
    .map((item, index) => ({ ...item, __index: index }))
    .sort((a, b) => {
      const aHasOrder = a.sort_order !== undefined && a.sort_order !== null
      const bHasOrder = b.sort_order !== undefined && b.sort_order !== null

      if (aHasOrder && bHasOrder)
        return a.sort_order - b.sort_order

      return a.__index - b.__index
    })
    .map(({ __index, ...item }) => item)
)

export const normalizeSection = section => ({
  ...section,
  content: {
    ...(section.content || {}),
    headline: section.content?.headline ?? section.headline,
    description: section.content?.description ?? section.description,
    alignment: section.content?.alignment ?? section.alignment,
    background: section.content?.background ?? section.background,
    cta: section.content?.cta ?? section.cta,
    button: section.content?.button ?? section.button,
    layout: section.content?.layout ?? section.layout,
    variant: section.content?.variant ?? section.variant,
    background_style: section.content?.background_style ?? section.background_style,
    limit: section.content?.limit ?? section.limit,
    cta_label: section.content?.cta_label ?? section.cta_label,
  },
  category: section.category || null,
  items: sortByOrderOrIndex(section.items || []),
  faqs: sortByOrderOrIndex(section.faqs || []),
  products: [...(section.products || [])],
})

export const normalizePage = page => {
  if (!page)
    return null

  return {
    ...page,
    sections: sortByOrderOrIndex(page.sections || []).map(normalizeSection),
  }
}
