import { useAppointmentDataStore } from '@/store/appointmentData'
import { storeToRefs } from 'pinia'

const appointmentDataStore = useAppointmentDataStore()
const { appointment, appointments } = storeToRefs(appointmentDataStore)

export const useCalendarStore = defineStore('calendar', {
  // arrow function recommended for full type inference
  state: () => ({
    availableCalendars: [
      {
        color: 'error',
        label: 'Personal',
      },
      {
        color: 'primary',
        label: 'Business',
      },
      {
        color: 'warning',
        label: 'Family',
      },
      {
        color: 'success',
        label: 'Holiday',
      },
      {
        color: 'info',
        label: 'ETC',
      },
    ],
    availableColors: ['error', 'primary', 'warning', 'success', 'info', 'accent', 'teal'],
    selectedCalendars: ['Personal', 'Business', 'Family', 'Holiday', 'ETC'],
    selectedStaffs: [],
    staffList: [],
    isAdmin: false,
  }),
  actions: {
    async fetchEvents(info) {

      //let calendars = this.selectedCalendars.join(',')
      let staffs = this.selectedStaffs.join(',')

      let params = {
        //staff_id : JSON.parse(localStorage.getItem('userData'))?.id,
        //calendars : calendars,
        start: info.startStr,
        end: info.endStr,
        staffs: staffs,
      }

      await appointmentDataStore.getAppointments(params)
      
      return appointments
      
    },
    async addEvent(event) {
      await appointmentDataStore.addAppointment(event)
    },
    async updateEvent(event) {
      await appointmentDataStore.updateAppointment(event)
      
      return appointment
    },
    async removeEvent(eventId) {
      appointmentDataStore.removeAppointment(eventId)
      
      return eventId
    },
  },
})
