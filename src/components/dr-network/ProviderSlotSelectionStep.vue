<script setup>
import { computed, onMounted, ref } from 'vue'
import { bookProviderSlot, getProviderSlots } from '@/api/drNetworkApi'
import DrNetworkStepShell from './DrNetworkStepShell.vue'

const props = defineProps({
  orderUuid: {
    type: String,
    required: true,
  },
})

const emit = defineEmits(['refresh-journey', 'refresh-workflow'])

const toDateKey = value => {
  const dateValue = value instanceof Date ? value : new Date(value)

  if (Number.isNaN(dateValue.getTime())) return ''

  const year = dateValue.getFullYear()
  const month = String(dateValue.getMonth() + 1).padStart(2, '0')
  const day = String(dateValue.getDate()).padStart(2, '0')

  return `${year}-${month}-${day}`
}

const parseDateKey = value => {
  const [year, month, day] = String(value || '').split('-').map(Number)

  return new Date(year || 0, (month || 1) - 1, day || 1)
}

const today = toDateKey(new Date())
const selectedDate = ref(today)
const monthCursor = ref(new Date(new Date().getFullYear(), new Date().getMonth(), 1))
const timezone = ref(Intl.DateTimeFormat().resolvedOptions().timeZone || 'America/New_York')
const slots = ref([])
const selectedSlotKey = ref('')
const loading = ref(false)
const booking = ref(false)
const error = ref('')
const message = ref('')

const slotStart = slot => slot?.scheduled_time || slot?.start_datetime || slot?.start_time || slot?.starts_at || null
const slotEnd = slot => slot?.end_datetime || slot?.end_time || slot?.ends_at || null
const slotProviderId = slot => slot?.provider_id || slot?.provider_guid || slot?.provider?.id || null
const slotProviderName = slot => {
  const details = slot?.provider_details || slot?.provider || {}
  const fullName = [details.first_name, details.last_name].filter(Boolean).join(' ').trim()

  return fullName || slot?.provider_name || 'Ola Health provider'
}

const slotBookingId = slot => (
  slot?.id
  || slot?.slot_id
  || slot?.schedule_id
  || slot?.slot_schedule_id
  || slot?.provider_schedule_id
  || slot?.guid
  || slot?.uuid
  || slotProviderId(slot)
  || slotStart(slot)
)

const slotDateKey = slot => {
  if (slot?.schedule_date) return slot.schedule_date

  const start = slotStart(slot)

  return start ? toDateKey(start) : selectedDate.value
}

const normalizedSlots = computed(() => slots.value.map((slot, index) => {
  const start = slotStart(slot)
  const end = slotEnd(slot)
  const providerId = slotProviderId(slot)
  const bookingId = slotBookingId(slot)
  const stableKey = `${bookingId || providerId || 'slot'}-${start || index}`

  return {
    ...slot,
    bookingId,
    dateKey: slotDateKey(slot),
    end,
    providerId,
    providerName: slotProviderName(slot),
    stableKey,
    start,
  }
}))

const slotsByDate = computed(() => normalizedSlots.value.reduce((groups, slot) => {
  if (!groups[slot.dateKey]) groups[slot.dateKey] = []
  groups[slot.dateKey].push(slot)

  return groups
}, {}))

const selectedDateSlots = computed(() => (slotsByDate.value[selectedDate.value] || []).slice().sort((a, b) => {
  const aTime = new Date(a.start || 0).getTime()
  const bTime = new Date(b.start || 0).getTime()

  return aTime - bTime
}))

const selectedSlot = computed(() => selectedDateSlots.value.find(slot => slot.stableKey === selectedSlotKey.value) || null)

const monthTitle = computed(() => new Intl.DateTimeFormat('en-US', {
  month: 'long',
  year: 'numeric',
}).format(monthCursor.value))

const selectedDateTitle = computed(() => new Intl.DateTimeFormat('en-US', {
  weekday: 'long',
  month: 'long',
  day: 'numeric',
  year: 'numeric',
  timeZone: 'UTC',
}).format(parseDateKey(selectedDate.value)))

const calendarDays = computed(() => {
  const year = monthCursor.value.getFullYear()
  const month = monthCursor.value.getMonth()
  const firstDay = new Date(year, month, 1)
  const lastDay = new Date(year, month + 1, 0)
  const days = []

  for (let index = 0; index < firstDay.getDay(); index += 1) {
    days.push({ key: `blank-${index}`, blank: true })
  }

  for (let day = 1; day <= lastDay.getDate(); day += 1) {
    const dateValue = new Date(year, month, day)
    const key = toDateKey(dateValue)
    const availableCount = slotsByDate.value[key]?.length || 0

    days.push({
      key,
      label: day,
      isToday: key === today,
      isSelected: key === selectedDate.value,
      availableCount,
    })
  }

  return days
})

const selectedProvider = computed(() => selectedSlot.value?.provider_details || selectedSlot.value?.provider || null)

const loadSlots = async () => {
  loading.value = true
  error.value = ''
  message.value = ''

  try {
    const data = await getProviderSlots(props.orderUuid, {
      date: selectedDate.value,
      timezone: timezone.value,
    })

    slots.value = Array.isArray(data?.slots) ? data.slots : []
    selectedSlotKey.value = ''
  } catch (err) {
    error.value = err?.response?.data?.message || 'Unable to load provider slots.'
  } finally {
    loading.value = false
  }
}

const formatSlot = slot => {
  if (!slot?.start) return 'Time not specified'

  return new Intl.DateTimeFormat('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    timeZone: timezone.value,
  }).format(new Date(slot.start))
}

const formatSlotRange = slot => {
  if (!slot?.start) return 'Time not specified'
  if (!slot?.end) return formatSlot(slot)

  const formatter = new Intl.DateTimeFormat('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    timeZone: timezone.value,
  })

  return `${formatter.format(new Date(slot.start))} - ${formatter.format(new Date(slot.end))}`
}

const formatDuration = slot => {
  if (slot?.appt_length) return `${slot.appt_length} min`
  if (!slot?.start || !slot?.end) return 'Consultation'

  const duration = Math.round((new Date(slot.end).getTime() - new Date(slot.start).getTime()) / 60000)

  return duration > 0 ? `${duration} min` : 'Consultation'
}

const selectDate = key => {
  if (!key || key === selectedDate.value) return

  selectedDate.value = key
  monthCursor.value = new Date(parseDateKey(key).getFullYear(), parseDateKey(key).getMonth(), 1)
  loadSlots()
}

const moveMonth = direction => {
  const next = new Date(monthCursor.value.getFullYear(), monthCursor.value.getMonth() + direction, 1)

  monthCursor.value = next
  selectedDate.value = toDateKey(next)
  loadSlots()
}

const bookSlot = async () => {
  if (!selectedSlot.value || booking.value) return

  booking.value = true
  error.value = ''
  message.value = ''

  try {
    await bookProviderSlot(props.orderUuid, selectedSlot.value.bookingId, {
      provider_guid: selectedSlot.value.provider_guid || selectedSlot.value.providerId,
      start_datetime: selectedSlot.value.start,
      end_datetime: selectedSlot.value.end,
      appt_length: selectedSlot.value.appt_length || null,
      timezone: timezone.value,
    })

    message.value = 'Slot booked. Checking your next consultation step.'
    emit('refresh-journey')
  } catch (err) {
    if (err?.response?.status === 409 || err?.response?.data?.action === 'refresh_slots') {
      error.value = err?.response?.data?.message || 'This time slot is no longer available. Please select another.'
      await loadSlots()

      return
    }

    error.value = err?.response?.data?.message || 'Unable to book this provider slot.'
  } finally {
    booking.value = false
  }
}

onMounted(loadSlots)
</script>

<template>
  <DrNetworkStepShell
    title="Choose a provider time"
    subtitle="Select an available appointment slot. If a slot is taken before booking, the list will refresh."
    badge="Provider scheduling"
    :order-uuid="orderUuid"
  >
    <section class="dn-card">
      <div class="dn-controls">
        <label>
          <span>Timezone</span>
          <input
            v-model="timezone"
            type="text"
            @change="loadSlots"
          >
        </label>
        <button
          class="dn-button dn-button--secondary"
          :disabled="loading"
          @click="loadSlots"
        >
          {{ loading ? 'Loading...' : 'Refresh slots' }}
        </button>
      </div>

      <div class="dn-scheduler">
        <div class="dn-calendar-panel">
          <div class="dn-calendar-header">
            <button
              type="button"
              class="dn-icon-button"
              aria-label="Previous month"
              @click="moveMonth(-1)"
            >
              <VIcon icon="tabler-chevron-left" />
            </button>
            <div>
              <h3>{{ monthTitle }}</h3>
              <p>{{ timezone }}</p>
            </div>
            <button
              type="button"
              class="dn-icon-button"
              aria-label="Next month"
              @click="moveMonth(1)"
            >
              <VIcon icon="tabler-chevron-right" />
            </button>
          </div>

          <div class="dn-weekdays">
            <span>Sun</span>
            <span>Mon</span>
            <span>Tue</span>
            <span>Wed</span>
            <span>Thu</span>
            <span>Fri</span>
            <span>Sat</span>
          </div>

          <div class="dn-month-grid">
            <div
              v-for="day in calendarDays"
              :key="day.key"
              class="dn-day-cell"
              :class="{
                blank: day.blank,
                selected: day.isSelected,
                today: day.isToday,
                available: day.availableCount,
              }"
            >
              <button
                v-if="!day.blank"
                type="button"
                @click="selectDate(day.key)"
              >
                <span>{{ day.label }}</span>
                <small v-if="day.availableCount">{{ day.availableCount }}</small>
              </button>
            </div>
          </div>
        </div>

        <div class="dn-slots-panel">
          <div class="dn-slots-header">
            <div>
              <p>Selected date</p>
              <h3>{{ selectedDateTitle }}</h3>
            </div>
            <span>{{ selectedDateSlots.length }} slots</span>
          </div>

          <div
            v-if="loading"
            class="dn-empty"
          >
            Loading provider availability...
          </div>

          <div
            v-else-if="!selectedDateSlots.length"
            class="dn-empty"
          >
            No slots are available for this date.
          </div>

          <div
            v-else
            class="dn-slots"
          >
            <button
              v-for="slot in selectedDateSlots"
              :key="slot.stableKey"
              type="button"
              class="dn-slot"
              :class="{ active: selectedSlotKey === slot.stableKey }"
              @click="selectedSlotKey = slot.stableKey"
            >
              <span class="dn-slot-time">{{ formatSlotRange(slot) }}</span>
              <span class="dn-slot-meta">
                <span>{{ formatDuration(slot) }}</span>
                <span>{{ slot.providerName }}</span>
              </span>
              <span class="dn-slot-provider">
                <img
                  v-if="slot.provider_details?.user_avatar || slot.provider?.user_avatar"
                  :src="slot.provider_details?.user_avatar || slot.provider?.user_avatar"
                  alt=""
                >
                <span v-else>{{ slot.providerName.slice(0, 1) }}</span>
                <small>{{ slot.providerId || 'Provider available' }}</small>
              </span>
            </button>
          </div>
        </div>
      </div>

      <div
        v-if="selectedSlot"
        class="dn-selection-summary"
      >
        <div>
          <span>Selected appointment</span>
          <strong>{{ formatSlotRange(selectedSlot) }} with {{ selectedSlot.providerName }}</strong>
        </div>
        <img
          v-if="selectedProvider?.user_avatar"
          :src="selectedProvider.user_avatar"
          alt=""
        >
      </div>

      <p
        v-if="message"
        class="dn-message dn-message--success"
      >
        {{ message }}
      </p>
      <p
        v-if="error"
        class="dn-message dn-message--error"
      >
        {{ error }}
      </p>

      <button
        class="dn-button"
        :disabled="!selectedSlot || booking"
        @click="bookSlot"
      >
        {{ booking ? 'Booking...' : 'Book selected slot' }}
      </button>
    </section>
  </DrNetworkStepShell>
</template>

<style scoped>
.dn-card {
  padding: 1.25rem;
  background: #ffffff;
  border: 1px solid #e2e8f0;
  border-radius: 18px;
  box-shadow: 0 1px 3px rgba(15, 23, 42, 0.06), 0 4px 12px rgba(15, 23, 42, 0.04);
}

.dn-controls {
  display: grid;
  grid-template-columns: minmax(220px, 1fr) auto;
  gap: 0.8rem;
  align-items: end;
  padding-bottom: 1rem;
  margin-bottom: 1rem;
  border-bottom: 1px solid #e2e8f0;
}

label {
  display: grid;
  gap: 0.4rem;
}

label span {
  color: #475569;
  font-size: 0.86rem;
  font-weight: 800;
}

input {
  width: 100%;
  min-height: 44px;
  padding: 0.65rem 0.75rem;
  color: #0f172a;
  background: #f8fafc;
  border: 1.5px solid #e2e8f0;
  border-radius: 12px;
}

.dn-empty {
  padding: 1rem;
  color: #475569;
  background: #f8fafc;
  border: 1px dashed #cbd5e1;
  border-radius: 14px;
}

.dn-scheduler {
  display: grid;
  grid-template-columns: minmax(320px, 0.85fr) minmax(0, 1.15fr);
  gap: 1rem;
}

.dn-calendar-panel,
.dn-slots-panel {
  min-width: 0;
  padding: 1rem;
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 16px;
}

.dn-calendar-header,
.dn-slots-header {
  display: flex;
  gap: 0.75rem;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 1rem;
}

.dn-calendar-header h3,
.dn-slots-header h3 {
  margin: 0;
  color: #0f172a;
  font-size: 1.05rem;
  font-weight: 900;
}

.dn-calendar-header p,
.dn-slots-header p {
  margin: 0;
  color: #64748b;
  font-size: 0.8rem;
  font-weight: 750;
}

.dn-slots-header > span {
  flex: 0 0 auto;
  padding: 0.35rem 0.65rem;
  color: #075985;
  font-size: 0.78rem;
  font-weight: 850;
  background: #e0f2fe;
  border: 1px solid #bae6fd;
  border-radius: 999px;
}

.dn-icon-button {
  display: inline-grid;
  place-items: center;
  width: 40px;
  height: 40px;
  color: #0f172a;
  background: #ffffff;
  border: 1px solid #dbeafe;
  border-radius: 12px;
  cursor: pointer;
}

.dn-weekdays,
.dn-month-grid {
  display: grid;
  grid-template-columns: repeat(7, minmax(0, 1fr));
  gap: 0.35rem;
}

.dn-weekdays {
  margin-bottom: 0.45rem;
}

.dn-weekdays span {
  color: #64748b;
  font-size: 0.72rem;
  font-weight: 850;
  text-align: center;
}

.dn-day-cell {
  aspect-ratio: 1;
}

.dn-day-cell.blank {
  pointer-events: none;
}

.dn-day-cell button {
  position: relative;
  display: grid;
  place-items: center;
  width: 100%;
  height: 100%;
  color: #334155;
  font-weight: 850;
  background: #ffffff;
  border: 1px solid #e2e8f0;
  border-radius: 12px;
  cursor: pointer;
}

.dn-day-cell.today button {
  color: #075985;
  border-color: #7dd3fc;
}

.dn-day-cell.selected button {
  color: #ffffff;
  background: #0f172a;
  border-color: #0f172a;
  box-shadow: 0 12px 25px rgba(15, 23, 42, 0.18);
}

.dn-day-cell.available:not(.selected) button {
  border-color: #86efac;
}

.dn-day-cell small {
  position: absolute;
  right: 0.25rem;
  bottom: 0.25rem;
  display: inline-grid;
  place-items: center;
  min-width: 18px;
  height: 18px;
  padding: 0 0.25rem;
  color: #065f46;
  font-size: 0.68rem;
  font-weight: 900;
  background: #dcfce7;
  border-radius: 999px;
}

.dn-day-cell.selected small {
  color: #0f172a;
  background: #ffffff;
}

.dn-slots {
  display: grid;
  gap: 0.7rem;
  max-height: 480px;
  padding-right: 0.25rem;
  overflow: auto;
}

.dn-slot {
  display: grid;
  grid-template-columns: 1fr auto;
  gap: 0.55rem 0.8rem;
  align-items: center;
  min-height: 92px;
  padding: 0.9rem;
  text-align: left;
  background: #ffffff;
  border: 1.5px solid #e2e8f0;
  border-radius: 14px;
  cursor: pointer;
}

.dn-slot.active {
  background: #ecfdf5;
  border-color: #059669;
  box-shadow: 0 0 0 4px rgba(5, 150, 105, 0.12);
}

.dn-slot-time {
  color: #0f172a;
  font-size: 1rem;
  font-weight: 850;
}

.dn-slot-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 0.4rem;
  grid-column: 1 / -1;
}

.dn-slot-meta span {
  padding: 0.3rem 0.55rem;
  color: #334155;
  font-size: 0.78rem;
  font-weight: 800;
  background: #f1f5f9;
  border-radius: 999px;
}

.dn-slot-provider {
  display: flex;
  gap: 0.45rem;
  align-items: center;
  justify-content: flex-end;
}

.dn-slot-provider img,
.dn-slot-provider > span {
  display: inline-grid;
  place-items: center;
  width: 32px;
  height: 32px;
  color: #0f172a;
  font-weight: 900;
  background: #e0f2fe;
  border-radius: 999px;
}

.dn-slot-provider img {
  object-fit: cover;
}

.dn-slot-provider small {
  max-width: 150px;
  overflow: hidden;
  color: #64748b;
  font-size: 0.72rem;
  font-weight: 700;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.dn-selection-summary {
  display: flex;
  gap: 1rem;
  align-items: center;
  justify-content: space-between;
  padding: 1rem;
  margin-top: 1rem;
  background: #f0fdf4;
  border: 1px solid #bbf7d0;
  border-radius: 16px;
}

.dn-selection-summary span {
  display: block;
  color: #047857;
  font-size: 0.8rem;
  font-weight: 850;
}

.dn-selection-summary strong {
  color: #0f172a;
  font-weight: 900;
}

.dn-selection-summary img {
  width: 48px;
  height: 48px;
  object-fit: cover;
  border: 2px solid #ffffff;
  border-radius: 999px;
}

.dn-button {
  min-height: 48px;
  padding: 0.75rem 1.15rem;
  margin-top: 1rem;
  color: #ffffff;
  font-weight: 850;
  background: linear-gradient(135deg, #059669, #0284c7);
  border: 0;
  border-radius: 999px;
  cursor: pointer;
}

.dn-button--secondary {
  margin-top: 0;
  color: #065f46;
  background: #ecfdf5;
  border: 1px solid #a7f3d0;
}

.dn-button:disabled {
  cursor: not-allowed;
  opacity: 0.62;
}

.dn-card > .dn-button:not(.dn-button--secondary) {
  width: 100%;
}

.dn-message {
  margin: 1rem 0 0;
  font-weight: 750;
}

.dn-message--success {
  color: #065f46;
}

.dn-message--error {
  color: #b91c1c;
}

@media (max-width: 780px) {
  .dn-controls {
    grid-template-columns: 1fr;
  }

  .dn-scheduler {
    grid-template-columns: 1fr;
  }

  .dn-slot {
    grid-template-columns: 1fr;
  }

  .dn-slot-provider {
    justify-content: flex-start;
  }
}
</style>
