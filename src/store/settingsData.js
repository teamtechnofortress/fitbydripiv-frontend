import { getRequest, postRequest } from "@/network"
import {
  GET_BANKING_URL,
  GET_BUSINESS_HOURS_URL,
  SAVE_BANKING_DATA_URL,
  SAVE_BUSINESS_HOURS_URL,
} from "@/network/const"
import { defineStore } from "pinia"
import { useToast } from 'vue-toastification'
const toast = useToast()
export const useSettingsStore = defineStore('settingsData', {
  state: () => ({
    bankingData: {},
    businessHours: {},
    loading: false,
    error: null,
  }),
  actions: {           
    async saveBankingData(params) {
      //
      this.error = null
      this.loading = true
      console.log(params)
      postRequest(SAVE_BANKING_DATA_URL, {}, params, response => {
        let res = response.data.success
        if (res) {
          const data = response.data.data

          this.bankingData = data.bankingData//text campaigns
          this.error = null
          this.loading = false
        } else {
          let err_msg = response.data.err_msg
          let error = {
            code: "Save Banking Data Failed",
            message: err_msg,
          }

          //
          this.error = error
          this.loading = false
        }
      })
    },    
    async getBankingData(params) {
        //
        this.error = null;
        this.loading = true;
        this.bankingData = {};        
        try {
          const response = await new Promise((resolve, reject) => {
            getRequest(GET_BANKING_URL, {}, params, res => {
              if (res.data.success) resolve(res)
              else reject(res)
            })
          })
  
          const data = response.data.data
  
          this.bankingData = data.bankingData
          this.error = null
        } catch (err) {
          let err_msg = err.data?.err_msg || 'Unknown error'
          this.error = {
            code: "Get Banking Data Failed",
            message: err_msg,
          }
        } finally {
          this.loading = false
        }        
    }, 
    async saveBusinessHours(params) {
      //
      this.error = null
      this.loading = true
      console.log(params)
      postRequest(SAVE_BUSINESS_HOURS_URL, {}, params, response => {
        let res = response.data.success
        if (res) {
          const data = response.data.data

          this.businessHours = data.businessHours//text campaigns
          this.error = null
          this.loading = false
        } else {
          let err_msg = response.data.err_msg
          let error = {
            code: "Save businessHours Failed",
            message: err_msg,
          }

          //
          this.error = error
          this.loading = false
        }
      })
    },    
    async getBusinessHours(params) {
        //
        this.error = null;
        this.loading = true;
        this.businessHours = {};        
        try {
          const response = await new Promise((resolve, reject) => {
            getRequest(GET_BUSINESS_HOURS_URL, {}, params, res => {
              if (res.data.success) resolve(res)
              else reject(res)
            })
          })
  
          const data = response.data.data
  
          this.businessHours = data.businessHours
          this.error = null
        } catch (err) {
          let err_msg = err.data?.err_msg || 'Unknown error'
          this.error = {
            code: "Get businessHours Failed",
            message: err_msg,
          }
        } finally {
          this.loading = false
        }        
    }, 
  },
})
