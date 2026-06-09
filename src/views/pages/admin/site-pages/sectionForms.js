const createProcessItem = sortOrder => ({
  title: '',
  description: '',
  icon: 'clipboard-list',
  image: '',
  sort_order: sortOrder,
})

const createFaqItem = sortOrder => ({
  question: '',
  answer: '',
  sort_order: sortOrder,
  is_active: true,
})

const createContentRow = () => ({
  label: '',
  value: '',
})

const createPdfDocument = () => ({
  key: 'document_1',
  label: '',
  view_url: '',
  download_url: '',
  pdf_url: '',
  download_label: 'Download PDF',
})

export const sectionTypeOptions = [
  { title: 'Hero', value: 'hero' },
  { title: 'Section Header', value: 'section_header' },
  { title: 'Featured Products', value: 'featured_products' },
  { title: 'Category Cards', value: 'category_cards' },
  { title: 'Process', value: 'process' },
  { title: 'Content Block', value: 'content_block' },
  { title: 'Spacer', value: 'spacer' },
  { title: 'FAQ', value: 'faq' },
  { title: 'Telehealth CTA', value: 'telehealth_cta' },
  { title: 'PDF Library', value: 'pdf_library' },
]

export const createSectionDraft = (type = 'section_header', sortOrder = 1) => {
  const safeType = type || 'section_header'
  const timestamp = Date.now()

  const base = {
    id: '',
    page_id: '',
    type: safeType,
    section_key: `${safeType}_${timestamp}`,
    title: '',
    subtitle: '',
    sort_order: sortOrder,
    content: {},
    items: [],
    faqs: [],
  }

  if (safeType === 'hero') {
    base.content = {
      headline: '',
      description: '',
      background: {
        type: 'video',
        url: '',
        poster: '',
      },
      cta: {
        label: '',
        link: '',
        style: 'primary',
      },
    }
  } else if (safeType === 'featured_products') {
    base.content = {
      limit: 6,
      variant: 'carousel_cards',
      cta_label: 'View Details',
      source: 'featured',
    }
  } else if (safeType === 'category_cards') {
    base.content = {
      cta_label: 'View Products',
    }
  } else if (safeType === 'process') {
    base.content = {
      variant: 'icon_steps',
      background_style: 'soft_gradient',
    }
    base.items = [
      createProcessItem(1),
      createProcessItem(2),
      createProcessItem(3),
    ]
  } else if (safeType === 'content_block') {
    base.content = {
      headline: '',
      intro: '',
      paragraphs: [''],
      bullets: [],
      rows: [],
      alignment: 'left',
      max_width: 'content',
      background_style: null,
    }
  } else if (safeType === 'spacer') {
    base.content = {
      height: 48,
      desktop: 64,
      tablet: 48,
      mobile: 32,
    }
  } else if (safeType === 'faq') {
    base.content = {
      layout: 'accordion',
    }
    base.faqs = [createFaqItem(1)]
  } else if (safeType === 'telehealth_cta') {
    base.content = {
      layout: 'centered_cta',
      button: {
        label: 'Learn More',
        link: '/telehealth',
        style: 'outline',
      },
    }
  } else if (safeType === 'pdf_library' || safeType === 'pen_instruction_library') {
    base.content = {
      headline: 'Instruction PDFs',
      description: '',
      upload_help: '',
      settings: {
        viewer_enabled: true,
        viewer_embed_mode: 'iframe',
      },
      document: createPdfDocument(),
    }
  } else {
    base.content = {
      headline: '',
      description: '',
      alignment: 'center',
    }
  }

  return base
}

export const cloneEditableSection = (section, sortOrder = 1) => {
  const draft = createSectionDraft(section?.type, sortOrder)

  return {
    ...draft,
    ...deepClone({
      ...section,
      content: section?.content || draft.content,
      items: section?.items || draft.items,
      faqs: section?.faqs || draft.faqs,
    }),
  }
}

export const buildSectionPayload = section => {
  const normalizedType = section.type === 'pen_instruction_library' ? 'pdf_library' : section.type

  const payload = {
    id: section.id || undefined,
    page_id: section.page_id || undefined,
    section_key: section.section_key,
    type: normalizedType,
    title: section.title || '',
    subtitle: section.subtitle || '',
    sort_order: Number(section.sort_order || 1),
    content: deepClone(section.content || {}),
  }

  if (section.type === 'pdf_library' || section.type === 'pen_instruction_library') {
    const sourceContent = section.content || {}
    const sourceSettings = sourceContent.settings || {}

    const sourceDocuments = Array.isArray(sourceContent.documents)
      ? sourceContent.documents
      : (Array.isArray(section.documents) ? section.documents : [])

    const sourceDocument = sourceContent.document || sourceDocuments[0] || {}

    const normalizedDocument = {
      key: sourceDocument?.key || 'document_1',
      label: sourceDocument?.label || sourceDocument?.title || '',
      view_url: sourceDocument?.view_url || sourceDocument?.pdf_url || '',
      download_url: sourceDocument?.download_url || sourceDocument?.pdf_url || '',
      pdf_url: sourceDocument?.pdf_url || sourceDocument?.view_url || sourceDocument?.download_url || '',
      download_label: sourceDocument?.download_label || sourceDocument?.item?.label || 'Download PDF',
    }

    payload.content = {
      headline: sourceContent.headline || '',
      description: sourceContent.description || '',
      upload_help: sourceContent.upload_help || '',
      settings: {
        viewer_enabled: sourceSettings.viewer_enabled ?? true,
        viewer_embed_mode: sourceSettings.viewer_embed_mode || 'iframe',
      },
      document: normalizedDocument,
      documents: [normalizedDocument],
    }
  }

  if (section.type === 'process') {
    payload.items = (section.items || []).map((item, index) => ({
      id: item.id || undefined,
      title: item.title || '',
      description: item.description || '',
      icon: item.icon || '',
      image: item.image || '',
      sort_order: index + 1,
    }))
  }

  if (section.type === 'faq') {
    payload.faqs = (section.faqs || []).map((faq, index) => ({
      id: faq.id || undefined,
      question: faq.question || '',
      answer: faq.answer || '',
      sort_order: index + 1,
      is_active: faq.is_active !== false,
    }))
  }

  return payload
}

export const createSectionItemDraft = (type, sortOrder) => {
  return createProcessItem(sortOrder)
}

export const createFaqDraft = sortOrder => createFaqItem(sortOrder)
export const createContentRowDraft = () => createContentRow()
const deepClone = value => JSON.parse(JSON.stringify(value ?? null))
