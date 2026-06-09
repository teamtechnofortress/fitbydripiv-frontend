import { getRequest, postRequest } from "@/network"
import {
  ADD_APPOINTMENT_URL,
  DELETE_APPOINTMENT_URL,
  GET_APPOINTMENTS_URL,
  GET_APPOINTMENT_URL,
  UPDATE_APPOINTMENT_URL,
} from "@/network/const"
import { defineStore } from "pinia"
import { useToast } from 'vue-toastification'

const toast = useToast()

export const useAppointmentDataStore = defineStore('appointmentData', {
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
          getRequest(GET_APPOINTMENTS_URL, {}, params, res => {
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
          code: "Get Appointment Data Failed",
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
      let userInfo = JSON.parse(localStorage.getItem('userData'))
      let params = {
        staff_id: userInfo.role === "admin" ? event.extendedProps.staff_id : userInfo.id,
        title: event.title,
        start: event.start,
        end: event.end,
        isAllDay: event.allDay,
        url: event.url,
        label: '',
        guests: event.extendedProps.guests.join(','),
        location: event.extendedProps.location,
        description: event.extendedProps.description,
        goal:event.extendedProps.goal,
        treatment: event.extendedProps.treatment,
      }

      postRequest(ADD_APPOINTMENT_URL, {}, params, response => {
        let res = response.data.success
        if (res) {
          const data = response.data.data

          this.appointments = data.appointments//appointments
          this.error = null
          this.loading = false
          this.isAddedNewAppointment = true
          toast.success("New Appointment is created!")
        } else {
          let err_msg = response.data.err_msg
          let error = {
            code: "Add New Appointment Failed",
            message: err_msg,
          }
          toast.error("Add new Appointment is failed!")

          //
          this.error = error
          this.loading = false
          this.isAddedNewAppointment = false
        }
      })
    },  
    getAppointment(params) {
      //
      this.error = null
      this.loading = true
      getRequest(`${GET_APPOINTMENT_URL}/${params.id}`, {}, params, response => {
        let res = response.data.success
        if (res) {
          const data = response.data.data

          this.appointment = data.appointment//appointment
          this.error = null
          this.loading = false
          toast.success("Appointment is updated!")
        } else {
          let err_msg = response.data.err_msg
          let error = {
            code: "GET Appointment Failed",
            message: err_msg,
          }
          toast.error("Appointment Update is failed!")

          //
          this.error = error
          this.loading = false
        }
      })
    },  
    async updateAppointment(event) {
      //
      this.error = null
      this.loading = true
      this.appointments = []

      let params = {
        staff_id: event.extendedProps.staff_id,
        title: event.title,
        start: event.start,
        end: event.end,
        isAllDay: event.allDay,
        url: event.url,
        label: '',
        guests: event.extendedProps.guests.join(','),
        location: event.extendedProps.location,
        description: event.extendedProps.description,
        goal:event.extendedProps.goal,
        treatment: event.extendedProps.treatment,
      }

      try {
        const response = await new Promise((resolve, reject) => {
          postRequest(`${UPDATE_APPOINTMENT_URL}/${event.id}`, {}, params, res => {
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
          code: "UPDATE Appointment Data Failed",
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
      postRequest(`${DELETE_APPOINTMENT_URL}/${id}`, {}, params, response => {
        let res = response.data.success
        if (res) {
          const data = response.data.data

          this.error = null
          this.loading = false
          this.isDeletedAppointment = true
        } else {
          let err_msg = response.data.err_msg
          let error = {
            code: "Delete Appointment Failed",
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
