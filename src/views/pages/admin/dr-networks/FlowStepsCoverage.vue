<script setup>
import { computed, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useToast } from 'vue-toastification'
import {
  DR_NETWORK_FLOW_STEP_OPTIONS,
  extractAdminDrNetworkErrors,
  fetchDrNetworkFlowContentCoverage,
  unwrapAdminDrNetworkResponse,
} from '@/api/adminDrNetworksApi'

const route = useRoute()
const router = useRouter()
const toast = useToast()

const loading = ref(false)
const errors = ref([])
const coverage = ref(null)

const networkId = computed(() => route.params.networkId)
const flowId = computed(() => route.params.flowId)
const network = computed(() => coverage.value?.network || {})
const flow = computed(() => coverage.value?.flow || {})
const flowSteps = computed(() => Array.isArray(flow.value?.steps) ? flow.value.steps : [])

const orderedSteps = computed(() => {
  const fromFlow = flowSteps.value.length
    ? flowSteps.value.map((step, index) => ({
      step_key: step.step_key || step.key || step,
      name: step.name || DR_NETWORK_FLOW_STEP_OPTIONS.find(item => item.value === (step.step_key || step.key || step))?.title || step.step_key || step,
      order: step.order || index + 1,
    }))
    : DR_NETWORK_FLOW_STEP_OPTIONS.map((step, index) => ({
      step_key: step.value,
      name: step.title,
      order: index + 1,
    }))

  return fromFlow.slice().sort((a, b) => Number(a.order || 0) - Number(b.order || 0))
})

const contentCoverageByStep = computed(() => coverage.value?.steps || {})

const showErrors = error => {
  errors.value = extractAdminDrNetworkErrors(error)
  toast.error(errors.value[0])
}

const loadCoverage = async () => {
  loading.value = true
  errors.value = []

  try {
    const body = await fetchDrNetworkFlowContentCoverage(networkId.value, flowId.value)
    coverage.value = unwrapAdminDrNetworkResponse(body)
  } catch (error) {
    showErrors(error)
  } finally {
    loading.value = false
  }
}

const getStepCoverage = stepKey => contentCoverageByStep.value?.[stepKey] || null
const isContentStep = stepKey => ['intake_questions', 'document_upload'].includes(stepKey)

const formatProduct = product => product?.product_name || product?.name || product?.product_slug || product?.slug || product?.product_id || 'Product'

const configureProduct = product => {
  if (!product?.product_id) return

  router.push(`/admin/dr-networks/${networkId.value}/products/${product.product_id}/flows/${flowId.value}`)
}

const openQuestionSet = set => {
  const setId = set?.id || set?.question_set_id
  if (!setId) return

  router.push(`/admin/dr-networks/${networkId.value}/question-sets/${setId}`)
}

const openFlowDefaults = tab => {
  router.push({
    path: `/admin/dr-networks/${networkId.value}/flows/${flowId.value}/defaults`,
    query: tab ? { tab } : {},
  })
}

const getStepTone = stepCoverage => {
  if (!stepCoverage?.step_enabled) return 'info'
  if (stepCoverage.products_without_content) return 'error'
  if (stepCoverage.products_using_default) return 'warning'

  return 'success'
}

const getStepMessage = (stepKey, stepCoverage) => {
  if (!isContentStep(stepKey)) return 'Structural step. No product-specific content is configured here.'
  if (!stepCoverage) return 'No coverage data returned for this content step.'
  if (!stepCoverage.step_enabled) return 'This flow does not include this content-bearing step.'
  if (stepCoverage.products_without_content) return `${stepCoverage.products_without_content} products have no override and no all-state fallback.`
  if (stepCoverage.products_using_default) return `${stepCoverage.products_using_default} products are safely using the all-state fallback.`

  return 'All mapped products have content coverage.'
}

onMounted(loadCoverage)
</script>

<template>
  <section class="flow-coverage-page">
    <div class="coverage-header">
      <div>
        <VBtn
          variant="text"
          prepend-icon="tabler-arrow-left"
          class="mb-2"
          @click="router.push('/admin/dr-networks')"
        >
          Dr Networks
        </VBtn>
        <div class="text-h5 font-weight-bold">
          {{ flow.name || flow.flow_key || 'Flow Steps' }}
        </div>
        <p class="mb-0 text-body-2 text-medium-emphasis">
          {{ network.name || 'Network' }} · content coverage across {{ coverage?.products_total || 0 }} mapped products
        </p>
      </div>

      <VBtn
        variant="tonal"
        prepend-icon="tabler-refresh"
        :loading="loading"
        @click="loadCoverage"
      >
        Refresh
      </VBtn>
    </div>

    <VAlert
      v-if="errors.length"
      type="error"
      variant="tonal"
      class="mb-4"
    >
      <ul class="mb-0">
        <li
          v-for="error in errors"
          :key="error"
        >
          {{ error }}
        </li>
      </ul>
    </VAlert>

    <VProgressLinear
      v-if="loading"
      indeterminate
      color="primary"
      rounded
      class="mb-4"
    />

    <div class="coverage-list">
      <VCard
        v-for="step in orderedSteps"
        :key="step.step_key"
        class="coverage-step"
      >
        <VCardText class="pa-5">
          <div class="coverage-step__header">
            <div>
              <div class="text-subtitle-1 font-weight-bold">
                {{ step.order }}. {{ step.name }}
              </div>
              <div class="text-caption text-medium-emphasis">
                {{ step.step_key }}
              </div>
            </div>
            <VChip
              :color="getStepTone(getStepCoverage(step.step_key))"
              variant="tonal"
              size="small"
            >
              {{ isContentStep(step.step_key) ? 'Content Step' : 'Structural' }}
            </VChip>
          </div>

          <VAlert
            :type="getStepTone(getStepCoverage(step.step_key))"
            variant="tonal"
            class="mt-4"
          >
            {{ getStepMessage(step.step_key, getStepCoverage(step.step_key)) }}
          </VAlert>

          <template v-if="isContentStep(step.step_key) && getStepCoverage(step.step_key)">
            <div class="coverage-metrics">
              <div>
                <span>Products total</span>
                <strong>{{ getStepCoverage(step.step_key).products_total || 0 }}</strong>
              </div>
              <div>
                <span>Overrides</span>
                <strong>{{ getStepCoverage(step.step_key).products_with_override || 0 }}</strong>
              </div>
              <div>
                <span>Using default</span>
                <strong>{{ getStepCoverage(step.step_key).products_using_default || 0 }}</strong>
              </div>
              <div>
                <span>Without content</span>
                <strong>{{ getStepCoverage(step.step_key).products_without_content || 0 }}</strong>
              </div>
            </div>

            <div
              v-if="step.step_key === 'intake_questions'"
              class="coverage-default"
            >
              <div>
                <div class="font-weight-semibold">
                  Flow Default Questions
                </div>
                <div class="text-body-2 text-medium-emphasis">
                  {{ getStepCoverage(step.step_key).has_default_set ? `${getStepCoverage(step.step_key).default_set_count || 0} all-state default set(s)` : 'No all-state default set' }}
                  <span v-if="getStepCoverage(step.step_key).state_specific_default_set_count">
                    · {{ getStepCoverage(step.step_key).state_specific_default_set_count }} state-specific default(s)
                  </span>
                </div>
              </div>
              <VBtn
                size="small"
                variant="tonal"
                prepend-icon="tabler-list-details"
                @click="getStepCoverage(step.step_key).default_set ? openQuestionSet(getStepCoverage(step.step_key).default_set) : openFlowDefaults('questions')"
              >
                {{ getStepCoverage(step.step_key).default_set ? 'Open Default' : 'Configure Defaults' }}
              </VBtn>
            </div>

            <div
              v-if="step.step_key === 'document_upload'"
              class="coverage-default"
            >
              <div>
                <div class="font-weight-semibold">
                  Flow Default Documents
                </div>
                <div class="text-body-2 text-medium-emphasis">
                  {{ getStepCoverage(step.step_key).has_default_rules || getStepCoverage(step.step_key).has_default_set ? `${getStepCoverage(step.step_key).default_rule_count || 0} all-state default rule(s)` : 'No all-state default rules' }}
                  <span v-if="getStepCoverage(step.step_key).state_specific_default_rule_count">
                    · {{ getStepCoverage(step.step_key).state_specific_default_rule_count }} state-specific default(s)
                  </span>
                </div>
              </div>
              <VBtn
                size="small"
                variant="tonal"
                prepend-icon="tabler-file-description"
                @click="openFlowDefaults('documents')"
              >
                Configure Defaults
              </VBtn>
            </div>

            <div
              v-if="getStepCoverage(step.step_key).without_content?.length"
              class="coverage-products"
            >
              <div class="text-subtitle-2 font-weight-bold mb-3">
                Blocking Risk
              </div>
              <div
                v-for="product in getStepCoverage(step.step_key).without_content"
                :key="`${step.step_key}-risk-${product.product_id}`"
                class="coverage-product-row"
              >
                <span>{{ formatProduct(product) }}</span>
                <VBtn
                  size="small"
                  variant="text"
                  append-icon="tabler-arrow-right"
                  @click="configureProduct(product)"
                >
                  Configure
                </VBtn>
              </div>
            </div>

            <div
              v-if="getStepCoverage(step.step_key).using_default?.length"
              class="coverage-products"
            >
              <div class="text-subtitle-2 font-weight-bold mb-3">
                Using Flow Default
              </div>
              <VChip
                v-for="product in getStepCoverage(step.step_key).using_default"
                :key="`${step.step_key}-default-${product.product_id}`"
                size="small"
                variant="tonal"
                class="me-2 mb-2"
              >
                {{ formatProduct(product) }}
              </VChip>
            </div>
          </template>
        </VCardText>
      </VCard>
    </div>
  </section>
</template>

<style scoped>
.flow-coverage-page {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.coverage-header,
.coverage-step__header,
.coverage-default,
.coverage-product-row {
  display: flex;
  gap: 1rem;
  align-items: flex-start;
  justify-content: space-between;
}

.coverage-list {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.coverage-metrics {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 0.75rem;
  margin-block-start: 1rem;
}

.coverage-metrics > div,
.coverage-default,
.coverage-products {
  padding: 0.85rem;
  border: 1px solid rgba(var(--v-theme-on-surface), 0.08);
  border-radius: 8px;
}

.coverage-metrics span {
  display: block;
  color: rgba(var(--v-theme-on-surface), 0.68);
  font-size: 0.78rem;
}

.coverage-metrics strong {
  display: block;
  margin-block-start: 0.2rem;
  font-size: 1.15rem;
}

.coverage-default,
.coverage-products {
  margin-block-start: 1rem;
}

@media (max-width: 960px) {
  .coverage-header,
  .coverage-step__header,
  .coverage-default,
  .coverage-product-row {
    flex-direction: column;
  }

  .coverage-metrics {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}
</style>
