<script setup>
import { requiredValidator } from "@/@core/utils/validators"
import * as Network from "@/network"
import * as Const from "@/network/const"
import { getApiToken } from "@/store/authData"
import axios from "axios"
import { onMounted } from "vue"
import { useToast } from "vue-toastification"

const toast = useToast()
const refVForm = ref()
const isSaving = ref(false)
const isLoading = ref(false)

const categories = ref([])
const products = ref([])
const currentProduct = ref({})
const activeDetailTab = ref("faqs")
const productsSearch = ref("")
const faqsSearch = ref("")
const pricingSearch = ref("")
const researchSearch = ref("")
const discountsSearch = ref("")

const benefitsText = ref("")

const treatmentDetailsForm = ref({
  how_it_works: "",
  ingredientsText: "",
  duration: "",
  usage: "",
})

const isConfirmDialogVisible = ref(false)
const deletingProductId = ref(null)
const isUploadingImage = ref(false)
const productImageInputRef = ref(null)
const faqErrors = ref({})
const pricingErrors = ref({})
const researchErrors = ref({})
const discountErrors = ref({})

const faqDraft = ref({
  id: null,
  question: "",
  answer: "",
  category: "general",
  display_order: 0,
  is_active: true,
})

const pricingDraft = ref({
  id: null,
  plan_name: "",
  price: "",
  billing_cycle: "",
  supply_duration: "",
  description: "",
  featuresText: "",
  is_popular: false,
  display_order: 0,
})

const researchDraft = ref({
  id: null,
  title: "",
  authors: "",
  journal: "",
  publication_year: "",
  pubmed_id: "",
  doi: "",
  article_url: "",
  display_order: 0,
})

const discountDraft = ref({
  id: null,
  frequency_months: 1,
  discount_percentage: "",
})

const newProduct = () => ({
  id: null,
  category_id: "",
  name: "",
  slug: "",
  short_description: "",
  full_description: "",
  featured_image: "",
  portrait_image: "",
  landscape_image: "",
  base_price: "",
  micro_dose_price: "",
  sample_price: "",
  currency: "USD",
  display_order: 0,
  is_featured: false,
})

const selectedProduct = computed(() => {
  if (!currentProduct.value?.id) return null
  
  return products.value.find(p => p.id === currentProduct.value.id) || null
})

const filteredProducts = computed(() => {
  const q = productsSearch.value.trim().toLowerCase()
  if (!q) return products.value
  
  return products.value.filter(item =>
    [item.name, item.slug, item.category?.name].some(v => String(v || "").toLowerCase().includes(q)))
})

const filteredFaqs = computed(() => {
  const q = faqsSearch.value.trim().toLowerCase()
  const list = selectedProduct.value?.faqs || []
  if (!q) return list
  
  return list.filter(item =>
    [item.question, item.answer, item.category].some(v => String(v || "").toLowerCase().includes(q)))
})

const filteredPricing = computed(() => {
  const q = pricingSearch.value.trim().toLowerCase()
  const list = selectedProduct.value?.pricing_options || selectedProduct.value?.pricingOptions || []
  if (!q) return list
  
  return list.filter(item =>
    [item.plan_name, item.billing_cycle, item.description].some(v => String(v || "").toLowerCase().includes(q)))
})

const filteredResearch = computed(() => {
  const q = researchSearch.value.trim().toLowerCase()
  const list = selectedProduct.value?.research_links || selectedProduct.value?.researchLinks || []
  if (!q) return list
  
  return list.filter(item =>
    [item.title, item.authors, item.journal, item.pubmed_id, item.doi].some(v => String(v || "").toLowerCase().includes(q)))
})

const filteredDiscounts = computed(() => {
  const q = discountsSearch.value.trim().toLowerCase()
  const list = selectedProduct.value?.subscription_discounts || selectedProduct.value?.subscriptionDiscounts || []
  if (!q) return list
  
  return list.filter(item =>
    [item.frequency_months, item.discount_percentage].some(v => String(v || "").toLowerCase().includes(q)))
})

const resetForm = () => {
  currentProduct.value = newProduct()
  activeDetailTab.value = "faqs"
  benefitsText.value = ""
  treatmentDetailsForm.value = {
    how_it_works: "",
    ingredientsText: "",
    duration: "",
    usage: "",
  }
  faqDraft.value = {
    id: null,
    question: "",
    answer: "",
    category: "general",
    display_order: 0,
    is_active: true,
  }
  pricingDraft.value = {
    id: null,
    plan_name: "",
    price: "",
    billing_cycle: "",
    supply_duration: "",
    description: "",
    featuresText: "",
    is_popular: false,
    display_order: 0,
  }
  researchDraft.value = {
    id: null,
    title: "",
    authors: "",
    journal: "",
    publication_year: "",
    pubmed_id: "",
    doi: "",
    article_url: "",
    display_order: 0,
  }
  discountDraft.value = {
    id: null,
    frequency_months: 1,
    discount_percentage: "",
  }
  refVForm.value?.resetValidation()
}

const loadCategories = () => {
  Network.getRequest(Const.CMS_ADMIN_CATEGORIES, {}, {}, response => {
    if (response.data?.success) {
      categories.value = response.data.data || []
      
      return
    }
    toast.error(`Failed to load categories: ${response.data?.err_msg || "Unknown error"}`)
  })
}

const loadProducts = afterLoad => {
  isLoading.value = true
  Network.getRequest(Const.CMS_ADMIN_PRODUCTS, {}, {}, response => {
    isLoading.value = false
    if (response.data?.success) {
      products.value = response.data.data || []
      if (afterLoad) afterLoad()
      
      return
    }
    toast.error(`Failed to load products: ${response.data?.err_msg || "Unknown error"}`)
  })
}

const refreshAndKeepSelected = () => {
  const currentId = currentProduct.value?.id

  loadProducts(() => {
    if (!currentId) return
    const latest = products.value.find(p => p.id === currentId)
    if (latest) editProduct(latest)
  })
}

const editProduct = item => {
  currentProduct.value = {
    ...newProduct(),
    ...item,
  }

  benefitsText.value = Array.isArray(item.benefits) ? item.benefits.join("\n") : ""

  const details = item.treatment_details || {}

  treatmentDetailsForm.value = {
    how_it_works: details.how_it_works || "",
    ingredientsText: Array.isArray(details.ingredients) ? details.ingredients.join("\n") : "",
    duration: details.duration || "",
    usage: details.usage || "",
  }
}

const saveProduct = () => {
  refVForm.value?.validate().then(({ valid: isValid }) => {
    if (!isValid) {
      toast.error("Please fill required fields.")
      
      return
    }

    const benefits = benefitsText.value
      .split("\n")
      .map(v => v.trim())
      .filter(Boolean)

    const ingredients = treatmentDetailsForm.value.ingredientsText
      .split("\n")
      .map(v => v.trim())
      .filter(Boolean)

    const treatmentDetails = {}
    if (treatmentDetailsForm.value.how_it_works?.trim()) treatmentDetails.how_it_works = treatmentDetailsForm.value.how_it_works.trim()
    if (ingredients.length) treatmentDetails.ingredients = ingredients
    if (treatmentDetailsForm.value.duration?.trim()) treatmentDetails.duration = treatmentDetailsForm.value.duration.trim()
    if (treatmentDetailsForm.value.usage?.trim()) treatmentDetails.usage = treatmentDetailsForm.value.usage.trim()

    const payload = {
      ...currentProduct.value,
      id: currentProduct.value.id || undefined,
      slug: currentProduct.value.slug || undefined,
      benefits,
      image_gallery: [],
      treatment_details: Object.keys(treatmentDetails).length ? treatmentDetails : null,
      base_price: currentProduct.value.base_price === "" ? null : Number(currentProduct.value.base_price),
      micro_dose_price: currentProduct.value.micro_dose_price === "" ? null : Number(currentProduct.value.micro_dose_price),
      sample_price: currentProduct.value.sample_price === "" ? null : Number(currentProduct.value.sample_price),
      display_order: Number(currentProduct.value.display_order || 0),
      is_featured: !!currentProduct.value.is_featured,
    }

    isSaving.value = true
    Network.postRequest(Const.CMS_ADMIN_PRODUCTS, {}, payload, response => {
      isSaving.value = false
      if (response.data?.success) {
        const savedId = response.data?.data?.id

        toast.success(currentProduct.value.id ? "Product updated" : "Product created")
        loadProducts(() => {
          const latest = products.value.find(p => p.id === savedId)
          if (latest) {
            editProduct(latest)
            
            return
          }
          resetForm()
        })
        
        return
      }
      toast.error(`Failed to save product: ${response.data?.err_msg || "Unknown error"}`)
    })
  })
}

const askDelete = id => {
  deletingProductId.value = id
  isConfirmDialogVisible.value = true
}

const doDelete = async value => {
  if (!value || !deletingProductId.value) return

  try {
    await axios.delete(`${Const.CMS_ADMIN_PRODUCTS}/${deletingProductId.value}`, {
      headers: {
        Authorization: `Bearer ${getApiToken()}`,
      },
    })
    toast.success("Product deleted")
    if (currentProduct.value.id === deletingProductId.value) resetForm()
    loadProducts()
  } catch (error) {
    const message = error?.response?.data?.message || error?.message || "Delete failed"

    toast.error(`Failed to delete product: ${message}`)
  } finally {
    deletingProductId.value = null
  }
}

const withProductId = payload => {
  if (!currentProduct.value?.id) {
    toast.error("Please save/select a product first.")
    
    return null
  }
  
  return { ...payload, product_id: currentProduct.value.id }
}

const makeSlug = value => String(value || "")
  .toLowerCase()
  .trim()
  .replace(/[^a-z0-9]+/g, "-")
  .replace(/^-+|-+$/g, "")

const getProductSlugForUpload = () => currentProduct.value.slug || makeSlug(currentProduct.value.name)

const triggerImageUpload = () => {
  if (!currentProduct.value.id) {
    toast.error("Please save the product first, then upload images.")
    
    return
  }
  productImageInputRef.value?.click()
}

const uploadImage = async event => {
  const file = event?.target?.files?.[0]
  if (!file) return
  const slug = getProductSlugForUpload()
  if (!slug) {
    toast.error("Please enter product name or slug before upload.")
    
    return
  }

  try {
    isUploadingImage.value = true

    const formData = new FormData()

    formData.append("image", file)
    formData.append("type", "featured")
    formData.append("product_slug", slug)

    const response = await axios.post(Const.CMS_ADMIN_UPLOAD_PRODUCT_IMAGE, formData, {
      headers: {
        Authorization: `Bearer ${getApiToken()}`,
        "Content-Type": "multipart/form-data",
      },
    })

    const url = response?.data?.data?.url
    if (!url) throw new Error("Upload response missing URL")

    // Keep one upload source but mirror to all image fields for compatibility.
    currentProduct.value.featured_image = url
    currentProduct.value.portrait_image = url
    currentProduct.value.landscape_image = url

    toast.success("Product image uploaded")
  } catch (error) {
    toast.error(`Failed to upload product image: ${error?.response?.data?.message || error?.message || "Unknown error"}`)
  } finally {
    isUploadingImage.value = false
    if (event?.target) event.target.value = ""
  }
}

const editFaq = faq => {
  faqDraft.value = {
    id: faq.id,
    question: faq.question || "",
    answer: faq.answer || "",
    category: faq.category || "general",
    display_order: faq.display_order ?? 0,
    is_active: faq.is_active ?? true,
  }
  activeDetailTab.value = "faqs"
}

const saveFaq = () => {
  faqErrors.value = {}

  const payload = withProductId({
    id: faqDraft.value.id || undefined,
    question: faqDraft.value.question,
    answer: faqDraft.value.answer,
    category: faqDraft.value.category || "general",
    display_order: Number(faqDraft.value.display_order || 0),
    is_active: !!faqDraft.value.is_active,
  })

  if (!payload) return
  if (!payload.question) faqErrors.value.question = "Question is required."
  if (!payload.answer) faqErrors.value.answer = "Answer is required."
  if (Object.keys(faqErrors.value).length) {
    toast.error("Please fix FAQ form errors.")
    
    return
  }

  Network.postRequest(Const.CMS_ADMIN_FAQS, {}, payload, response => {
    if (response.data?.success) {
      toast.success(faqDraft.value.id ? "FAQ updated" : "FAQ added")
      faqDraft.value = {
        id: null,
        question: "",
        answer: "",
        category: "general",
        display_order: 0,
        is_active: true,
      }
      refreshAndKeepSelected()
      
      return
    }
    toast.error(`Failed to save FAQ: ${response.data?.err_msg || "Unknown error"}`)
  })
}

const deleteFaq = async id => {
  if (!confirm("Delete this FAQ?")) return
  try {
    await axios.delete(`${Const.CMS_ADMIN_FAQS}/${id}`, {
      headers: { Authorization: `Bearer ${getApiToken()}` },
    })
    toast.success("FAQ deleted")
    refreshAndKeepSelected()
  } catch (error) {
    toast.error(`Failed to delete FAQ: ${error?.response?.data?.message || error?.message || "Unknown error"}`)
  }
}

const editPricingOption = option => {
  pricingDraft.value = {
    id: option.id,
    plan_name: option.plan_name || "",
    price: option.price ?? "",
    billing_cycle: option.billing_cycle || "",
    supply_duration: option.supply_duration || "",
    description: option.description || "",
    featuresText: Array.isArray(option.features) ? option.features.join("\n") : "",
    is_popular: option.is_popular ?? false,
    display_order: option.display_order ?? 0,
  }
  activeDetailTab.value = "pricing"
}

const savePricingOption = () => {
  pricingErrors.value = {}

  const features = pricingDraft.value.featuresText
    .split("\n")
    .map(v => v.trim())
    .filter(Boolean)

  const payload = withProductId({
    id: pricingDraft.value.id || undefined,
    plan_name: pricingDraft.value.plan_name,
    price: Number(pricingDraft.value.price || 0),
    billing_cycle: pricingDraft.value.billing_cycle,
    supply_duration: pricingDraft.value.supply_duration,
    description: pricingDraft.value.description,
    features,
    is_popular: !!pricingDraft.value.is_popular,
    display_order: Number(pricingDraft.value.display_order || 0),
  })

  if (!payload) return
  if (!payload.plan_name) pricingErrors.value.plan_name = "Plan name is required."
  if (!payload.price) pricingErrors.value.price = "Price is required."
  if (Object.keys(pricingErrors.value).length) {
    toast.error("Please fix pricing form errors.")
    
    return
  }

  Network.postRequest(Const.CMS_ADMIN_PRICING_OPTIONS, {}, payload, response => {
    if (response.data?.success) {
      toast.success(pricingDraft.value.id ? "Pricing option updated" : "Pricing option added")
      pricingDraft.value = {
        id: null,
        plan_name: "",
        price: "",
        billing_cycle: "",
        supply_duration: "",
        description: "",
        featuresText: "",
        is_popular: false,
        display_order: 0,
      }
      refreshAndKeepSelected()
      
      return
    }
    toast.error(`Failed to save pricing option: ${response.data?.err_msg || "Unknown error"}`)
  })
}

const deletePricingOption = async id => {
  if (!confirm("Delete this pricing option?")) return
  try {
    await axios.delete(`${Const.CMS_ADMIN_PRICING_OPTIONS}/${id}`, {
      headers: { Authorization: `Bearer ${getApiToken()}` },
    })
    toast.success("Pricing option deleted")
    refreshAndKeepSelected()
  } catch (error) {
    toast.error(`Failed to delete pricing option: ${error?.response?.data?.message || error?.message || "Unknown error"}`)
  }
}

const editResearchLink = link => {
  researchDraft.value = {
    id: link.id,
    title: link.title || "",
    authors: link.authors || "",
    journal: link.journal || "",
    publication_year: link.publication_year ?? "",
    pubmed_id: link.pubmed_id || "",
    doi: link.doi || "",
    article_url: link.article_url || "",
    display_order: link.display_order ?? 0,
  }
  activeDetailTab.value = "research"
}

const saveResearchLink = () => {
  researchErrors.value = {}

  const payload = withProductId({
    id: researchDraft.value.id || undefined,
    title: researchDraft.value.title,
    authors: researchDraft.value.authors,
    journal: researchDraft.value.journal,
    publication_year: researchDraft.value.publication_year
      ? Number(researchDraft.value.publication_year)
      : null,
    pubmed_id: researchDraft.value.pubmed_id,
    doi: researchDraft.value.doi,
    article_url: researchDraft.value.article_url,
    display_order: Number(researchDraft.value.display_order || 0),
  })

  if (!payload) return
  if (!payload.title) researchErrors.value.title = "Title is required."
  if (Object.keys(researchErrors.value).length) {
    toast.error("Please fix research form errors.")
    
    return
  }

  Network.postRequest(Const.CMS_ADMIN_RESEARCH_LINKS, {}, payload, response => {
    if (response.data?.success) {
      toast.success(researchDraft.value.id ? "Research link updated" : "Research link added")
      researchDraft.value = {
        id: null,
        title: "",
        authors: "",
        journal: "",
        publication_year: "",
        pubmed_id: "",
        doi: "",
        article_url: "",
        display_order: 0,
      }
      refreshAndKeepSelected()
      
      return
    }
    toast.error(`Failed to save research link: ${response.data?.err_msg || "Unknown error"}`)
  })
}

const deleteResearchLink = async id => {
  if (!confirm("Delete this research link?")) return
  try {
    await axios.delete(`${Const.CMS_ADMIN_RESEARCH_LINKS}/${id}`, {
      headers: { Authorization: `Bearer ${getApiToken()}` },
    })
    toast.success("Research link deleted")
    refreshAndKeepSelected()
  } catch (error) {
    toast.error(`Failed to delete research link: ${error?.response?.data?.message || error?.message || "Unknown error"}`)
  }
}

const editDiscount = discount => {
  discountDraft.value = {
    id: discount.id,
    frequency_months: discount.frequency_months ?? 1,
    discount_percentage: discount.discount_percentage ?? "",
  }
  activeDetailTab.value = "discounts"
}

const saveDiscount = () => {
  discountErrors.value = {}

  const payload = withProductId({
    id: discountDraft.value.id || undefined,
    frequency_months: Number(discountDraft.value.frequency_months || 1),
    discount_percentage: Number(discountDraft.value.discount_percentage || 0),
  })

  if (!payload) return
  if (discountDraft.value.discount_percentage === "" || Number.isNaN(payload.discount_percentage)) {
    discountErrors.value.discount_percentage = "Discount percentage is required."
  }
  if (Object.keys(discountErrors.value).length) {
    toast.error("Please fix discount form errors.")
    
    return
  }

  Network.postRequest(Const.CMS_ADMIN_SUBSCRIPTION_DISCOUNTS, {}, payload, response => {
    if (response.data?.success) {
      toast.success(discountDraft.value.id ? "Discount updated" : "Discount added")
      discountDraft.value = {
        id: null,
        frequency_months: 1,
        discount_percentage: "",
      }
      refreshAndKeepSelected()
      
      return
    }
    toast.error(`Failed to save discount: ${response.data?.err_msg || "Unknown error"}`)
  })
}

const deleteDiscount = async id => {
  if (!confirm("Delete this discount?")) return
  try {
    await axios.delete(`${Const.CMS_ADMIN_SUBSCRIPTION_DISCOUNTS}/${id}`, {
      headers: { Authorization: `Bearer ${getApiToken()}` },
    })
    toast.success("Discount deleted")
    refreshAndKeepSelected()
  } catch (error) {
    toast.error(`Failed to delete discount: ${error?.response?.data?.message || error?.message || "Unknown error"}`)
  }
}

onMounted(() => {
  resetForm()
  loadCategories()
  loadProducts()
})
</script>

<template>
  <section>
    <VRow>
      <VCol cols="12">
        <VCard>
          <VCardText>
            <VRow>
              <VCol
                cols="12"
                md="5"
              >
                <div class="d-flex align-center justify-space-between mb-3">
                  <h4>CMS PRODUCTS</h4>
                  <VBtn
                    color="primary"
                    size="small"
                    @click="resetForm"
                  >
                    + New
                  </VBtn>
                </div>
                <VTextField
                  v-model="productsSearch"
                  label="Search products"
                  density="compact"
                  class="mb-3"
                />

                <VProgressLinear
                  v-if="isLoading"
                  indeterminate
                  class="mb-3"
                />

                <VTable class="border rounded">
                  <thead>
                    <tr>
                      <th>Name</th>
                      <th>Category</th>
                      <th>Featured</th>
                      <th class="text-right">
                        Action
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr
                      v-for="item in filteredProducts"
                      :key="item.id"
                      class="cursor-pointer"
                      @click="editProduct(item)"
                    >
                      <td>{{ item.name }}</td>
                      <td>{{ item.category?.name || "-" }}</td>
                      <td>{{ item.is_featured ? "Yes" : "No" }}</td>
                      <td class="text-right">
                        <VBtn
                          icon
                          variant="text"
                          color="default"
                          size="x-small"
                          @click.stop="askDelete(item.id)"
                        >
                          <VIcon
                            icon="tabler-trash"
                            :size="20"
                            color="error"
                          />
                        </VBtn>
                      </td>
                    </tr>
                    <tr v-if="!filteredProducts.length && !isLoading">
                      <td
                        colspan="4"
                        class="text-center py-6"
                      >
                        No products found.
                      </td>
                    </tr>
                  </tbody>
                </VTable>
              </VCol>

              <VCol
                cols="12"
                md="7"
              >
                <h4 class="mb-3">
                  {{ currentProduct.id ? "EDIT PRODUCT" : "ADD PRODUCT" }}
                </h4>
                <VForm
                  ref="refVForm"
                  @submit.prevent="saveProduct"
                >
                  <VRow>
                    <VCol
                      cols="12"
                      md="6"
                    >
                      <VSelect
                        v-model="currentProduct.category_id"
                        :items="categories"
                        item-title="name"
                        item-value="id"
                        label="Category"
                        :rules="[requiredValidator]"
                      />
                    </VCol>
                    <VCol
                      cols="12"
                      md="6"
                    >
                      <VTextField
                        v-model="currentProduct.name"
                        label="Name"
                        :rules="[requiredValidator]"
                      />
                    </VCol>

                    <VCol cols="12">
                      <VTextField
                        v-model="currentProduct.slug"
                        label="Slug (optional)"
                      />
                    </VCol>

                    <VCol cols="12">
                      <VTextarea
                        v-model="currentProduct.short_description"
                        label="Short Description"
                        rows="2"
                      />
                    </VCol>

                    <VCol cols="12">
                      <VTextarea
                        v-model="currentProduct.full_description"
                        label="Full Description"
                        rows="4"
                      />
                    </VCol>

                    <VCol cols="12">
                      <div class="d-flex align-center gap-3 mb-2">
                        <VBtn
                          size="small"
                          variant="tonal"
                          :loading="isUploadingImage"
                          @click="triggerImageUpload"
                        >
                          Upload Product Image
                        </VBtn>
                        <span class="text-caption text-medium-emphasis">
                          One image used across product cards/details.
                        </span>
                      </div>
                      <input
                        ref="productImageInputRef"
                        type="file"
                        class="d-none"
                        accept="image/png,image/jpeg,image/jpg,image/webp"
                        @change="uploadImage($event)"
                      >
                      <VTextField
                        :model-value="currentProduct.featured_image"
                        label="Uploaded Image URL"
                        readonly
                      />
                    </VCol>

                    <VCol
                      cols="12"
                      md="4"
                    >
                      <VTextField
                        v-model="currentProduct.base_price"
                        label="Base Price"
                        type="number"
                        step="0.01"
                      />
                    </VCol>
                    <VCol
                      cols="12"
                      md="4"
                    >
                      <VTextField
                        v-model="currentProduct.micro_dose_price"
                        label="Micro Dose Price"
                        type="number"
                        step="0.01"
                      />
                    </VCol>
                    <VCol
                      cols="12"
                      md="4"
                    >
                      <VTextField
                        v-model="currentProduct.sample_price"
                        label="Sample Price"
                        type="number"
                        step="0.01"
                      />
                    </VCol>

                    <VCol
                      cols="12"
                      md="4"
                    >
                      <VTextField
                        v-model="currentProduct.currency"
                        label="Currency"
                      />
                    </VCol>
                    <VCol
                      cols="12"
                      md="4"
                    >
                      <VTextField
                        v-model="currentProduct.display_order"
                        label="Display Order"
                        type="number"
                      />
                    </VCol>
                    <VCol
                      cols="12"
                      md="4"
                      class="d-flex align-center"
                    >
                      <VCheckbox
                        v-model="currentProduct.is_featured"
                        label="Featured Product"
                      />
                    </VCol>

                    <VCol cols="12">
                      <VTextarea
                        v-model="benefitsText"
                        label="Benefits (one per line)"
                        rows="4"
                      />
                    </VCol>

                    <VCol cols="12">
                      <h5 class="mb-2">
                        Treatment Details
                      </h5>
                    </VCol>
                    <VCol cols="12">
                      <VTextarea
                        v-model="treatmentDetailsForm.how_it_works"
                        label="How It Works"
                        rows="3"
                      />
                    </VCol>
                    <VCol cols="12">
                      <VTextarea
                        v-model="treatmentDetailsForm.ingredientsText"
                        label="Ingredients (one per line)"
                        rows="3"
                      />
                    </VCol>
                    <VCol
                      cols="12"
                      md="6"
                    >
                      <VTextField
                        v-model="treatmentDetailsForm.duration"
                        label="Treatment Duration"
                      />
                    </VCol>
                    <VCol
                      cols="12"
                      md="6"
                    >
                      <VTextField
                        v-model="treatmentDetailsForm.usage"
                        label="Usage Instructions"
                      />
                    </VCol>

                    <VCol
                      cols="12"
                      class="d-flex justify-end gap-2"
                    >
                      <VBtn
                        color="secondary"
                        variant="tonal"
                        @click="resetForm"
                      >
                        Cancel
                      </VBtn>
                      <VBtn
                        color="primary"
                        type="submit"
                        :loading="isSaving"
                      >
                        {{ currentProduct.id ? "Update" : "Save" }}
                      </VBtn>
                    </VCol>
                  </VRow>
                </VForm>

                <template v-if="currentProduct.id">
                  <VDivider class="my-6" />
                  <h4 class="mb-2">
                    PRODUCT DETAILS MANAGEMENT
                  </h4>

                  <VTabs
                    v-model="activeDetailTab"
                    class="v-tabs-pill mb-4"
                  >
                    <VTab value="faqs">
                      FAQs
                    </VTab>
                    <VTab value="pricing">
                      Pricing
                    </VTab>
                    <VTab value="research">
                      Research
                    </VTab>
                    <VTab value="discounts">
                      Discounts
                    </VTab>
                  </VTabs>

                  <VWindow
                    v-model="activeDetailTab"
                    :touch="false"
                  >
                    <VWindowItem value="faqs">
                      <VRow>
                        <VCol
                          cols="12"
                          md="7"
                        >
                          <VTextField
                            v-model="faqsSearch"
                            label="Search FAQs"
                            density="compact"
                            class="mb-3"
                          />
                          <VTable class="border rounded">
                            <thead>
                              <tr>
                                <th>Question</th>
                                <th>Active</th>
                                <th class="text-right">
                                  Action
                                </th>
                              </tr>
                            </thead>
                            <tbody>
                              <tr
                                v-for="item in filteredFaqs"
                                :key="item.id"
                              >
                                <td
                                  class="text-truncate"
                                  style="max-width: 260px;"
                                >
                                  {{ item.question }}
                                </td>
                                <td>{{ item.is_active ? "Yes" : "No" }}</td>
                                <td class="text-right">
                                  <VBtn
                                    icon
                                    variant="text"
                                    size="x-small"
                                    @click="editFaq(item)"
                                  >
                                    <VIcon
                                      icon="tabler-edit"
                                      :size="18"
                                    />
                                  </VBtn>
                                  <VBtn
                                    icon
                                    variant="text"
                                    size="x-small"
                                    @click="deleteFaq(item.id)"
                                  >
                                    <VIcon
                                      icon="tabler-trash"
                                      :size="18"
                                      color="error"
                                    />
                                  </VBtn>
                                </td>
                              </tr>
                            </tbody>
                          </VTable>
                        </VCol>
                        <VCol
                          cols="12"
                          md="5"
                        >
                          <VTextField
                            v-model="faqDraft.question"
                            label="Question"
                            class="mb-3"
                            :error-messages="faqErrors.question"
                          />
                          <VTextarea
                            v-model="faqDraft.answer"
                            label="Answer"
                            rows="3"
                            class="mb-3"
                            :error-messages="faqErrors.answer"
                          />
                          <VTextField
                            v-model="faqDraft.category"
                            label="Category"
                            class="mb-3"
                          />
                          <VRow>
                            <VCol cols="6">
                              <VTextField
                                v-model="faqDraft.display_order"
                                type="number"
                                label="Order"
                              />
                            </VCol>
                            <VCol
                              cols="6"
                              class="d-flex align-center"
                            >
                              <VCheckbox
                                v-model="faqDraft.is_active"
                                label="Active"
                              />
                            </VCol>
                          </VRow>
                          <VBtn
                            color="primary"
                            @click="saveFaq"
                          >
                            {{ faqDraft.id ? "Update FAQ" : "Add FAQ" }}
                          </VBtn>
                        </VCol>
                      </VRow>
                    </VWindowItem>

                    <VWindowItem value="pricing">
                      <VRow>
                        <VCol
                          cols="12"
                          md="7"
                        >
                          <VTextField
                            v-model="pricingSearch"
                            label="Search pricing options"
                            density="compact"
                            class="mb-3"
                          />
                          <VTable class="border rounded">
                            <thead>
                              <tr>
                                <th>Plan</th>
                                <th>Price</th>
                                <th class="text-right">
                                  Action
                                </th>
                              </tr>
                            </thead>
                            <tbody>
                              <tr
                                v-for="item in filteredPricing"
                                :key="item.id"
                              >
                                <td>{{ item.plan_name }}</td>
                                <td>{{ item.price }}</td>
                                <td class="text-right">
                                  <VBtn
                                    icon
                                    variant="text"
                                    size="x-small"
                                    @click="editPricingOption(item)"
                                  >
                                    <VIcon
                                      icon="tabler-edit"
                                      :size="18"
                                    />
                                  </VBtn>
                                  <VBtn
                                    icon
                                    variant="text"
                                    size="x-small"
                                    @click="deletePricingOption(item.id)"
                                  >
                                    <VIcon
                                      icon="tabler-trash"
                                      :size="18"
                                      color="error"
                                    />
                                  </VBtn>
                                </td>
                              </tr>
                            </tbody>
                          </VTable>
                        </VCol>
                        <VCol
                          cols="12"
                          md="5"
                        >
                          <VTextField
                            v-model="pricingDraft.plan_name"
                            label="Plan Name"
                            class="mb-3"
                            :error-messages="pricingErrors.plan_name"
                          />
                          <VTextField
                            v-model="pricingDraft.price"
                            type="number"
                            step="0.01"
                            label="Price"
                            class="mb-3"
                            :error-messages="pricingErrors.price"
                          />
                          <VTextField
                            v-model="pricingDraft.billing_cycle"
                            label="Billing Cycle"
                            class="mb-3"
                          />
                          <VTextField
                            v-model="pricingDraft.supply_duration"
                            label="Supply Duration"
                            class="mb-3"
                          />
                          <VTextarea
                            v-model="pricingDraft.description"
                            label="Description"
                            rows="2"
                            class="mb-3"
                          />
                          <VTextarea
                            v-model="pricingDraft.featuresText"
                            label="Features (one per line)"
                            rows="3"
                            class="mb-3"
                          />
                          <VRow>
                            <VCol cols="6">
                              <VTextField
                                v-model="pricingDraft.display_order"
                                type="number"
                                label="Order"
                              />
                            </VCol>
                            <VCol
                              cols="6"
                              class="d-flex align-center"
                            >
                              <VCheckbox
                                v-model="pricingDraft.is_popular"
                                label="Popular"
                              />
                            </VCol>
                          </VRow>
                          <VBtn
                            color="primary"
                            @click="savePricingOption"
                          >
                            {{ pricingDraft.id ? "Update Pricing" : "Add Pricing" }}
                          </VBtn>
                        </VCol>
                      </VRow>
                    </VWindowItem>

                    <VWindowItem value="research">
                      <VRow>
                        <VCol
                          cols="12"
                          md="7"
                        >
                          <VTextField
                            v-model="researchSearch"
                            label="Search research links"
                            density="compact"
                            class="mb-3"
                          />
                          <VTable class="border rounded">
                            <thead>
                              <tr>
                                <th>Title</th>
                                <th>Year</th>
                                <th class="text-right">
                                  Action
                                </th>
                              </tr>
                            </thead>
                            <tbody>
                              <tr
                                v-for="item in filteredResearch"
                                :key="item.id"
                              >
                                <td
                                  class="text-truncate"
                                  style="max-width: 260px;"
                                >
                                  {{ item.title }}
                                </td>
                                <td>{{ item.publication_year || "-" }}</td>
                                <td class="text-right">
                                  <VBtn
                                    icon
                                    variant="text"
                                    size="x-small"
                                    @click="editResearchLink(item)"
                                  >
                                    <VIcon
                                      icon="tabler-edit"
                                      :size="18"
                                    />
                                  </VBtn>
                                  <VBtn
                                    icon
                                    variant="text"
                                    size="x-small"
                                    @click="deleteResearchLink(item.id)"
                                  >
                                    <VIcon
                                      icon="tabler-trash"
                                      :size="18"
                                      color="error"
                                    />
                                  </VBtn>
                                </td>
                              </tr>
                            </tbody>
                          </VTable>
                        </VCol>
                        <VCol
                          cols="12"
                          md="5"
                        >
                          <VTextField
                            v-model="researchDraft.title"
                            label="Title"
                            class="mb-3"
                            :error-messages="researchErrors.title"
                          />
                          <VTextField
                            v-model="researchDraft.authors"
                            label="Authors"
                            class="mb-3"
                          />
                          <VTextField
                            v-model="researchDraft.journal"
                            label="Journal"
                            class="mb-3"
                          />
                          <VTextField
                            v-model="researchDraft.publication_year"
                            type="number"
                            label="Publication Year"
                            class="mb-3"
                          />
                          <VTextField
                            v-model="researchDraft.pubmed_id"
                            label="PubMed ID"
                            class="mb-3"
                          />
                          <VTextField
                            v-model="researchDraft.doi"
                            label="DOI"
                            class="mb-3"
                          />
                          <VTextField
                            v-model="researchDraft.article_url"
                            label="Article URL"
                            class="mb-3"
                          />
                          <VTextField
                            v-model="researchDraft.display_order"
                            type="number"
                            label="Order"
                            class="mb-3"
                          />
                          <VBtn
                            color="primary"
                            @click="saveResearchLink"
                          >
                            {{ researchDraft.id ? "Update Research" : "Add Research" }}
                          </VBtn>
                        </VCol>
                      </VRow>
                    </VWindowItem>

                    <VWindowItem value="discounts">
                      <VRow>
                        <VCol
                          cols="12"
                          md="7"
                        >
                          <VTextField
                            v-model="discountsSearch"
                            label="Search discounts"
                            density="compact"
                            class="mb-3"
                          />
                          <VTable class="border rounded">
                            <thead>
                              <tr>
                                <th>Months</th>
                                <th>Discount %</th>
                                <th class="text-right">
                                  Action
                                </th>
                              </tr>
                            </thead>
                            <tbody>
                              <tr
                                v-for="item in filteredDiscounts"
                                :key="item.id"
                              >
                                <td>{{ item.frequency_months }}</td>
                                <td>{{ item.discount_percentage }}</td>
                                <td class="text-right">
                                  <VBtn
                                    icon
                                    variant="text"
                                    size="x-small"
                                    @click="editDiscount(item)"
                                  >
                                    <VIcon
                                      icon="tabler-edit"
                                      :size="18"
                                    />
                                  </VBtn>
                                  <VBtn
                                    icon
                                    variant="text"
                                    size="x-small"
                                    @click="deleteDiscount(item.id)"
                                  >
                                    <VIcon
                                      icon="tabler-trash"
                                      :size="18"
                                      color="error"
                                    />
                                  </VBtn>
                                </td>
                              </tr>
                            </tbody>
                          </VTable>
                        </VCol>
                        <VCol
                          cols="12"
                          md="5"
                        >
                          <VSelect
                            v-model="discountDraft.frequency_months"
                            :items="[1, 2, 3]"
                            label="Frequency Months"
                            class="mb-3"
                          />
                          <VTextField
                            v-model="discountDraft.discount_percentage"
                            type="number"
                            step="0.01"
                            label="Discount Percentage"
                            class="mb-3"
                            :error-messages="discountErrors.discount_percentage"
                          />
                          <VBtn
                            color="primary"
                            @click="saveDiscount"
                          >
                            {{ discountDraft.id ? "Update Discount" : "Add Discount" }}
                          </VBtn>
                        </VCol>
                      </VRow>
                    </VWindowItem>
                  </VWindow>
                </template>
              </VCol>
            </VRow>

            <ConfirmDialog
              v-model:isDialogVisible="isConfirmDialogVisible"
              confirmation-msg="Are you sure you want to delete this product?"
              @confirm="doDelete"
            />
          </VCardText>
        </VCard>
      </VCol>
    </VRow>
  </section>
</template>
