import { getRequest, postRequest } from "@/network"
import {
  GET_ALL_PATIENT,
  SAVE_ENCOUNTER_URL,
  SAVE_INVOICE_URL,
  UPDATE_PATIENT_URL,
} from "@/network/const"
import { defineStore } from "pinia"

export const usePatientDataStore = defineStore('patientData', {
  state: () => ({
    patientList: [],
    updatedPatient: null,
    isSavedEncounter: null,
    isSavedInvoice: null,
    loading: false,
    error: null,
  }),
  actions: {
    getAllPatient(params) {
      //
      this.error = null
      this.loading = true
      this.patientList = []
      getRequest(GET_ALL_PATIENT, {}, params, response => {
        let res = response.data.success
        if (res) {
          const data = response.data.data

          this.patientList = data.patients//patient list
          this.error = null
          this.loading = false
        } else {
          let err_msg = response.data.err_msg
          let error = {
            code: "Get Patient Data Failed",
            message: err_msg,
          }

          //
          this.error = error
          this.loading = false
        }
      })
    }, 
    savePatient(params){
      this.error = null
      this.loading = true               
      postRequest(`${UPDATE_PATIENT_URL}/${params.id}`, {}, params, response => {
        let res = response.data.success
        if (res) {
          const data = response.data.data

          this.updatedPatient = data.patient//patient list
          this.error = null
          this.loading = false
        } else {
          let err_msg = response.data.err_msg
          let error = {
            code: "Get Patient Data Failed",
            message: err_msg,
          }

          //
          this.error = error
          this.loading = false
        }
      })
    },              
    saveEncounter(params){
      this.error = null
      this.loading = true     
      this.isSavedEncounter = null          
      postRequest(SAVE_ENCOUNTER_URL, {}, params, response => {
        let res = response.data.success
        if (res) {
          this.isSavedEncounter = response.data.data
          this.error = null
          this.loading = false
        } else {
          let err_msg = response.data.err_msg
          let error = {
            code: "Get Patient Data Failed",
            message: err_msg,
          }

          //
          this.error = error
          this.loading = false
        }
      })
    },              
    saveInvoice(params){
      this.error = null
      this.loading = true     
      this.isSavedInvoice = null          
      postRequest(SAVE_INVOICE_URL, {}, params, response => {
        let res = response.data.success
        if (res) {
          this.isSavedInvoice = response.data.data
          this.error = null
          this.loading = false
        } else {
          let err_msg = response.data.err_msg
          let error = {
            code: "Patient Invoice Data Failed",
            message: err_msg,
          }

          //
          this.error = error
          this.loading = false
        }
      })
    },              
  },
})