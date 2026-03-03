import { getRequest, postRequest } from "@/network"
import {
  ADD_PATIENT_APPOINTMENT_URL,
  DELETE_PATIENT_APPOINTMENT_URL,
  GET_PATIENT_APPOINTMENTS_URL,
  UPDATE_PATIENT_APPOINTMENT_URL,
} from "@/network/const"
import { defineStore } from "pinia"

export const usePatientAppointmentDataStore = defineStore('patientAppointmentData', {
  state: () => ({
    isAddedNewAppointment: false,
    isDeletedAppointment: false,
    appointment: null,
    appointments: [],
    loading: false,
    error: null,
  }),
  actions: {
    async getAppointments(params) {
      //
      this.error = null
      this.loading = true
      this.appointments = []
      try {
        const response = await new Promise((resolve, reject) => {
          getRequest(GET_PATIENT_APPOINTMENTS_URL, {}, params, res => {
            if (res.data.success) resolve(res)
            else reject(res)
          })
        })

        const data = response.data.data

        this.appointments = data.appointments
        this.error = null
      } catch (err) {
        let err_msg = err.data?.err_msg || 'Unknown error'
        this.error = {
          code: "Get Patient Appointment Data Failed",
          message: err_msg,
        }
      } finally {
        this.loading = false
      }
    },                      
    async addAppointment(event) {
      //
      this.error = null
      this.loading = true
      this.appointments = []
      this.isAddedNewAppointment = false
      let params = {
        name: event.title,
        start: event.start,
        end: event.end,
        goal: event.extendedProps.goal,
        patient_id: event.extendedProps.patient_id,
        therapy: event.extendedProps.therapy,
        inventory_id: event.extendedProps.inventory_id,
        appointed_type: event.extendedProps.appointed_type,
      }

      postRequest(ADD_PATIENT_APPOINTMENT_URL, {}, params, response => {
        let res = response.data.success
        if (res) {
          const data = response.data.data

          this.appointments = data.appointments//appointments
          this.error = null
          this.loading = false
          this.isAddedNewAppointment = true
        } else {
          let err_msg = response.data.err_msg
          let error = {
            code: "Add New Appointment Failed",
            message: err_msg,
          }

          //
          this.error = error
          this.loading = false
          this.isAddedNewAppointment = false
        }
      })
    },  
    async updateAppointment(event) {
      //
      this.error = null
      this.loading = true
      this.appointments = []

      let params = {
        name: event.title,
        start: event.start,
        end: event.end,
        goal: event.extendedProps.goal,
        patient_id: event.extendedProps.patient_id,
        therapy: event.extendedProps.therapy,
        inventory_id: event.extendedProps.inventory_id,
        appointed_type: event.extendedProps.appointed_type,
      }

      try {
        const response = await new Promise((resolve, reject) => {
          postRequest(`${UPDATE_PATIENT_APPOINTMENT_URL}/${event.id}`, {}, params, res => {
            if (res.data.success) resolve(res)
            else reject(res)
          })
        })

        const data = response.data.data

        this.appointment = data.appointment
        this.error = null
      } catch (err) {
        let err_msg = err.data?.err_msg || 'Unknown error'
        this.error = {
          code: "UPDATE Patient Appointment Data Failed",
          message: err_msg,
        }
      } finally {
        this.loading = false
      }      
    },                               
    removeAppointment(id) {
      //
      this.error = null
      this.loading = true
      this.isDeletedAppointment = false
      let params = {}
      console.log("delete Id", id)
      postRequest(`${DELETE_PATIENT_APPOINTMENT_URL}/${id}`, {}, params, response => {
        let res = response.data.success
        if (res) {
          const data = response.data.data

          this.error = null
          this.loading = false
          this.isDeletedAppointment = true
        } else {
          let err_msg = response.data.err_msg
          let error = {
            code: "Delete Patient Appointment Failed",
            message: err_msg,
          }

          //
          this.error = error
          this.loading = false
          this.isDeletedAppointment = false
        }
      })
    },      
  },
})
