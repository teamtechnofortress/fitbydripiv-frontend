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

const emit = defineEmits(['refreshJourney', 'refreshWorkflow'])

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
    emit('refreshJourney')
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
              <label class="dn-timezone-control">
                <span>Timezone</span>
                <input
                  v-model="timezone"
                  type="text"
                  @change="loadSlots"
                >
              </label>
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
            <div class="dn-slots-actions">
              <span>{{ selectedDateSlots.length }} slots</span>
              <button
                type="button"
                class="dn-refresh-button"
                :disabled="loading"
                @click="loadSlots"
              >
                {{ loading ? 'Loading...' : 'Refresh' }}
              </button>
            </div>
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
                <!-- <span>{{ slot.providerName }}</span> -->
              </span>
              <!-- <span class="dn-slot-provider">
                <img
                  v-if="slot.provider_details?.user_avatar || slot.provider?.user_avatar"
                  :src="slot.provider_details?.user_avatar || slot.provider?.user_avatar"
                  alt=""
                >
                <span v-else>{{ slot.providerName.slice(0, 1) }}</span>
                <small>{{ slot.providerId || 'Provider available' }}</small>
              </span> -->
            </button>
          </div>
        </div>
      </div>

      <Transition name="selection-expand">
        <div
          v-if="selectedSlot"
          class="dn-selection-summary"
        >
          <div>
            <span>Selected appointment</span>
            <!-- <strong>{{ formatSlotRange(selectedSlot) }} with {{ selectedSlot.providerName }}</strong> -->
            <strong>{{ formatSlotRange(selectedSlot) }}</strong>

          </div>
        </div>
      </Transition>

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
  --accent: #0071e3;
  --accent-soft: rgba(0, 113, 227, 0.1);
  --accent-soft-2: rgba(0, 113, 227, 0.06);
  --success: #0a7f45;
  --success-soft: rgba(52, 199, 89, 0.12);
  --danger: #d92d20;
  --danger-soft: rgba(255, 59, 48, 0.08);
  --ink: #1d1d1f;
  --muted: #637098;
  --line: #e4e8f5;
  --surface: #ffffff;
  --surface-soft: #f7f7fb;
  box-sizing: border-box;
  display: grid;
  gap: 0;
  width: min(1100px, 100%);
  padding: 1.15rem;
  margin: 0 auto;
  overflow: visible;
  background: rgba(255, 255, 255, 0.92);
  border: 1px solid var(--line);
  border-radius: 22px;
  box-shadow: 0 18px 48px rgba(26, 38, 74, 0.08), 0 2px 10px rgba(26, 38, 74, 0.04);
  backdrop-filter: blur(18px);
  -webkit-backdrop-filter: blur(18px);
  animation: scheduler-card-in 0.34s cubic-bezier(0.28, 0.11, 0.32, 1) both;
  transition: min-height 0.28s cubic-bezier(0.28, 0.11, 0.32, 1);
}

@keyframes scheduler-card-in {
  from {
    opacity: 0;
    transform: translateY(8px);
  }

  to {
    opacity: 1;
    transform: translateY(0);
  }
}

label {
  display: grid;
  gap: 0.38rem;
}

label span {
  color: var(--muted);
  font-size: 0.78rem;
  font-weight: 700;
  letter-spacing: 0.05em;
  text-transform: uppercase;
}

input {
  width: 100%;
  min-height: 44px;
  padding: 0 0.85rem;
  color: var(--ink);
  font-size: 0.9rem;
  font-weight: 520;
  background: var(--surface-soft);
  border: 1px solid var(--line);
  border-radius: 13px;
  outline: none;
  transition: border-color 0.18s ease, box-shadow 0.18s ease, background 0.18s ease;
}

input:focus {
  background: #ffffff;
  border-color: var(--accent);
  box-shadow: 0 0 0 4px rgba(0, 113, 227, 0.12);
}

.dn-timezone-control {
  width: min(220px, 100%);
  margin-top: 0.45rem;
}

.dn-timezone-control input {
  min-height: 34px;
  padding: 0 0.65rem;
  font-size: 0.78rem;
  border-radius: 10px;
}

.dn-empty {
  display: grid;
  flex: 1 1 auto;
  min-height: 0;
  padding: 1rem;
  place-items: center;
  color: var(--muted);
  font-size: 0.9rem;
  font-weight: 560;
  background: #ffffff;
  border: 1px dashed #ccd6eb;
  border-radius: 14px;
}

.dn-scheduler {
  display: grid;
  grid-template-columns: minmax(300px, 0.86fr) minmax(0, 1.14fr);
  gap: 1rem;
  height: clamp(460px, calc(100dvh - 320px), 590px);
  min-height: 0;
  transition: height 0.28s cubic-bezier(0.28, 0.11, 0.32, 1);
}

.dn-calendar-panel,
.dn-slots-panel {
  display: flex;
  flex-direction: column;
  min-width: 0;
  min-height: 0;
  padding: 1rem;
  overflow: hidden;
  background: var(--surface-soft);
  border: 1px solid var(--line);
  border-radius: 16px;
}

.dn-calendar-header,
.dn-slots-header {
  display: flex;
  gap: 0.75rem;
  flex: 0 0 auto;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 1rem;
}

.dn-calendar-header h3,
.dn-slots-header h3 {
  margin: 0;
  color: var(--ink);
  font-size: 1.02rem;
  font-weight: 670;
  line-height: 1.2;
}

.dn-calendar-header p,
.dn-slots-header p {
  margin: 0 0 0.2rem;
  color: var(--muted);
  font-size: 0.76rem;
  font-weight: 650;
}

.dn-slots-actions {
  display: inline-flex;
  flex: 0 0 auto;
  align-items: center;
  gap: 0.5rem;
}

.dn-slots-actions > span {
  padding: 0.36rem 0.64rem;
  color: var(--accent);
  font-size: 0.76rem;
  font-weight: 680;
  white-space: nowrap;
  background: var(--accent-soft);
  border-radius: 999px;
}

.dn-refresh-button {
  min-height: 34px;
  padding: 0 0.75rem;
  color: var(--ink);
  font: inherit;
  font-size: 0.78rem;
  font-weight: 680;
  line-height: 1;
  background: #ffffff;
  border: 1px solid var(--line);
  border-radius: 999px;
  cursor: pointer;
  transition: transform 0.18s ease, border-color 0.18s ease, background 0.18s ease;
}

.dn-refresh-button:hover:not(:disabled) {
  color: var(--accent);
  background: var(--accent-soft-2);
  border-color: rgba(0, 113, 227, 0.24);
  transform: translateY(-1px);
}

.dn-refresh-button:disabled {
  cursor: not-allowed;
  opacity: 0.62;
}

.dn-icon-button {
  display: inline-grid;
  place-items: center;
  width: 38px;
  height: 38px;
  color: var(--ink);
  background: #ffffff;
  border: 1px solid var(--line);
  border-radius: 12px;
  cursor: pointer;
  transition: transform 0.18s ease, border-color 0.18s ease, background 0.18s ease;
}

.dn-icon-button:hover {
  background: var(--accent-soft-2);
  border-color: rgba(0, 113, 227, 0.24);
  transform: translateY(-1px);
}

.dn-weekdays,
.dn-month-grid {
  display: grid;
  grid-template-columns: repeat(7, minmax(0, 1fr));
  gap: 0.34rem;
}

.dn-weekdays {
  flex: 0 0 auto;
  margin-bottom: 0.45rem;
}

.dn-month-grid {
  flex: 1 1 auto;
  grid-auto-rows: minmax(0, 1fr);
  min-height: 0;
}

.dn-weekdays span {
  color: var(--muted);
  font-size: 0.68rem;
  font-weight: 700;
  letter-spacing: 0.02em;
  text-align: center;
}

.dn-day-cell {
  min-height: 0;
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
  min-height: 0;
  color: #3f4652;
  font-size: 0.86rem;
  font-weight: 650;
  background: #ffffff;
  border: 1px solid var(--line);
  border-radius: 12px;
  cursor: pointer;
  transition: transform 0.16s ease, border-color 0.16s ease, background 0.16s ease, box-shadow 0.16s ease;
}

.dn-day-cell button:hover {
  border-color: rgba(0, 113, 227, 0.24);
  transform: translateY(-1px);
}

.dn-day-cell.today button {
  color: var(--accent);
  border-color: rgba(0, 113, 227, 0.35);
}

.dn-day-cell.selected button {
  color: #ffffff;
  background: var(--accent);
  border-color: var(--accent);
  box-shadow: 0 10px 22px rgba(0, 113, 227, 0.18);
}

.dn-day-cell.available:not(.selected) button {
  background: #ffffff;
  border-color: rgba(0, 113, 227, 0.22);
}

.dn-day-cell small {
  position: absolute;
  right: 0.22rem;
  bottom: 0.22rem;
  display: inline-grid;
  place-items: center;
  min-width: 17px;
  height: 17px;
  padding: 0 0.24rem;
  color: var(--accent);
  font-size: 0.64rem;
  font-weight: 720;
  background: var(--accent-soft);
  border-radius: 999px;
}

.dn-day-cell.selected small {
  color: var(--accent);
  background: #ffffff;
}

.dn-slots {
  display: grid;
  align-content: start;
  flex: 1 1 auto;
  gap: 0.65rem;
  min-height: 0;
  max-height: none;
  padding-right: 0.2rem;
  overflow: auto;
}

.dn-slots::-webkit-scrollbar {
  width: 8px;
}

.dn-slots::-webkit-scrollbar-thumb {
  background: #d9dfef;
  border-radius: 999px;
}

.dn-slot {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 0.55rem 0.8rem;
  align-items: center;
  min-height: 88px;
  padding: 0.85rem;
  text-align: left;
  background: #ffffff;
  border: 1px solid var(--line);
  border-radius: 14px;
  cursor: pointer;
  transition: transform 0.18s ease, border-color 0.18s ease, box-shadow 0.18s ease, background 0.18s ease;
}

.dn-slot:hover {
  border-color: rgba(0, 113, 227, 0.24);
  transform: translateY(-1px);
}

.dn-slot.active {
  background: rgba(0, 113, 227, 0.045);
  border-color: var(--accent);
  box-shadow: 0 0 0 4px rgba(0, 113, 227, 0.11);
}

.dn-slot-time {
  min-width: 0;
  color: var(--ink);
  font-size: 0.98rem;
  font-weight: 680;
}

.dn-slot-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 0.38rem;
  grid-column: 1 / -1;
}

.dn-slot-meta span {
  padding: 0.3rem 0.55rem;
  color: var(--muted);
  font-size: 0.76rem;
  font-weight: 620;
  background: var(--surface-soft);
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
  color: var(--accent);
  font-weight: 720;
  background: var(--accent-soft);
  border-radius: 999px;
}

.dn-slot-provider img {
  object-fit: cover;
}

.dn-slot-provider small {
  max-width: 150px;
  overflow: hidden;
  color: var(--muted);
  font-size: 0.72rem;
  font-weight: 620;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.dn-selection-summary {
  display: flex;
  gap: 1rem;
  align-items: center;
  justify-content: space-between;
  padding: 0.95rem 1rem;
  margin-top: 0.9rem;
  background: var(--accent-soft-2);
  border: 1px solid rgba(0, 113, 227, 0.18);
  border-radius: 16px;
}

.dn-selection-summary span {
  display: block;
  color: var(--accent);
  font-size: 0.76rem;
  font-weight: 700;
  letter-spacing: 0.05em;
  text-transform: uppercase;
}

.dn-selection-summary strong {
  color: var(--ink);
  font-size: 0.92rem;
  font-weight: 670;
}

.dn-selection-summary img {
  width: 46px;
  height: 46px;
  object-fit: cover;
  border: 2px solid #ffffff;
  border-radius: 999px;
}

.selection-expand-enter-active,
.selection-expand-leave-active {
  overflow: hidden;
  transition: opacity 0.24s cubic-bezier(0.28, 0.11, 0.32, 1), max-height 0.28s cubic-bezier(0.28, 0.11, 0.32, 1), margin-top 0.28s cubic-bezier(0.28, 0.11, 0.32, 1);
}

.selection-expand-enter-from,
.selection-expand-leave-to {
  max-height: 0;
  margin-top: 0;
  opacity: 0;
}

.selection-expand-enter-to,
.selection-expand-leave-from {
  max-height: 140px;
  opacity: 1;
}

.dn-button {
  min-height: 44px;
  padding: 0 1.05rem;
  color: #ffffff;
  font-size: 0.9rem;
  font-weight: 680;
  line-height: 1;
  background: var(--accent);
  border: 0;
  border-radius: 999px;
  cursor: pointer;
  box-shadow: 0 10px 22px rgba(0, 113, 227, 0.18);
  transition: transform 0.18s ease, box-shadow 0.18s ease, background 0.18s ease, border-color 0.18s ease;
}

.dn-button:hover:not(:disabled) {
  background: #0068d6;
  transform: translateY(-1px);
  box-shadow: 0 14px 28px rgba(0, 113, 227, 0.22);
}

.dn-button--secondary {
  color: var(--ink);
  background: #ffffff;
  border: 1px solid var(--line);
  box-shadow: none;
}

.dn-button--secondary:hover:not(:disabled) {
  color: var(--accent);
  background: var(--accent-soft-2);
  border-color: rgba(0, 113, 227, 0.24);
  box-shadow: none;
}

.dn-button:disabled {
  cursor: not-allowed;
  opacity: 0.62;
  transform: none;
  box-shadow: none;
}

.dn-card > .dn-button:not(.dn-button--secondary) {
  width: 100%;
  margin-top: 0.9rem;
}

.dn-message {
  margin: 0.9rem 0 0;
  padding: 0.72rem 0.85rem;
  font-size: 0.84rem;
  font-weight: 620;
  line-height: 1.4;
  border-radius: 12px;
}

.dn-message--success {
  color: var(--success);
  background: var(--success-soft);
}

.dn-message--error {
  color: var(--danger);
  background: var(--danger-soft);
}

@media (max-width: 780px) {
  .dn-card {
    height: auto;
    padding: 1rem;
    overflow: visible;
    border-radius: 18px;
  }

  .dn-scheduler {
    grid-template-columns: 1fr;
    height: auto;
  }

  .dn-slots {
    max-height: 360px;
  }

  .dn-day-cell {
    aspect-ratio: 1;
  }

  .dn-slot {
    grid-template-columns: 1fr;
  }

  .dn-slot-provider {
    justify-content: flex-start;
  }
}

@media (max-width: 480px) {
  .dn-card {
    padding: 0.85rem;
  }

  .dn-calendar-panel,
  .dn-slots-panel {
    padding: 0.85rem;
  }

  .dn-weekdays,
  .dn-month-grid {
    gap: 0.25rem;
  }

  .dn-day-cell button {
    border-radius: 10px;
  }

  .dn-selection-summary {
    align-items: flex-start;
    flex-direction: column;
  }
}

@media (prefers-reduced-motion: reduce) {
  .dn-card {
    animation: none;
  }

  .dn-button,
  .dn-day-cell button,
  .dn-icon-button,
  .dn-slot {
    transition: none;
  }
}
</style>
