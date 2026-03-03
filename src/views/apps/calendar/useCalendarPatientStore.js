import { usePatientAppointmentDataStore } from '@/store/patientAppointmentData'
import { storeToRefs } from 'pinia'

const appointmentDataStore = usePatientAppointmentDataStore()
const { appointment, appointments } = storeToRefs(appointmentDataStore)

export const useCalendarPatientStore = defineStore('calendarPatient', {
  // arrow function recommended for full type inference
  state: () => ({
    availableColors: ['error', 'primary', 'warning', 'success', 'info', 'accent', 'teal'],
    selectedPatients: [],
    patientList: [],
    isAdmin: false,
  }),
  actions: {
    async fetchEvents(info) {

      let patients = this.selectedPatients.join(',')

      let params = {
        //staff_id : JSON.parse(localStorage.getItem('userData'))?.id,
        //calendars : calendars,
        start: info.startStr,
        end: info.endStr,
        patients: patients,
      }

      await appointmentDataStore.getAppointments(params)
      
      return appointments
      
    },
    async addEvent(event) {
      console.log(event)
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
