import { getRequest, postRequest } from "@/network"
import {
  DELETE_EMAIL_CAMPAIGN_URL,
  DELETE_SPECIAL_PROMO_URL,
  DELETE_TEXT_CAMPAIGN_URL,
  GET_EMAIL_CAMPAIGNS_URL,
  GET_SPECIAL_PROMOS_URL,
  GET_TEXT_CAMPAIGNS_URL,
  SAVE_EMAIL_CAMPAIGN_URL,
  SAVE_SPECIAL_PROMO_URL,
  SAVE_TEXT_CAMPAIGN_URL,
  UPDATE_SPECIAL_PROMO_URL,
} from "@/network/const"
import { defineStore } from "pinia"
import { useToast } from 'vue-toastification'

const toast = useToast()
export const useMarketingStore = defineStore('marketingData', {
  state: () => ({
    isAddedNewCampaign: false,
    isDeletedCampaign: false,
    textCampaign: null,
    emailCampaign: null,
    specialPromos: [],
    textCampaigns: [],
    emailCampaigns: [],
    selectedPromoId: -1,
    selectedTextCampaign: -1,
    selectedEmailCampaign: -1,
    loading: false,
    error: null,
  }),
  actions: {           
    async saveTextCampaign(params) {
      //
      this.error = null
      this.loading = true
      this.isAddedNewCampaign = false

      postRequest(SAVE_TEXT_CAMPAIGN_URL, {}, params, response => {
        let res = response.data.success
        if (res) {
          const data = response.data.data

          this.textCampaigns = data.textCampaigns//text campaigns
          this.error = null
          this.loading = false
          this.isAddedNewCampaign = true
        } else {
          let err_msg = response.data.err_msg
          let error = {
            code: "Add New Text Campaign Failed",
            message: err_msg,
          }

          //
          this.error = error
          this.loading = false
          this.isAddedNewCampaign = false
        }
      })
    }, 
    
    async saveEmailCampaign(params) {
      //
      this.error = null
      this.loading = true
      this.isAddedNewCampaign = false

      postRequest(SAVE_EMAIL_CAMPAIGN_URL, {}, params, response => {
        let res = response.data.success
        if (res) {
          const data = response.data.data

          this.emailCampaigns = data.emailCampaigns//email campaigns
          this.error = null
          this.loading = false
          this.isAddedNewCampaign = true;
          toast.success('Email Campaign scheduled successfully!')
        } else {
          let err_msg = response.data.err_msg
          let error = {
            code: "Add New Email Campaign Failed",
            message: err_msg,
          }

          //
          this.error = error
          this.loading = false
          this.isAddedNewCampaign = false
        }
      })
    }, 
    
    async saveSpecialPromo(params) {
      //
      this.error = null
      this.loading = true
      this.isAddedNewCampaign = false
      this.specialPromos = []

      postRequest(SAVE_SPECIAL_PROMO_URL, {}, params, response => {
        let res = response.data.success
        if (res) {
          const data = response.data.data

          this.specialPromos = data.specialPromos//promos
          this.error = null
          this.loading = false
          this.isAddedNewCampaign = true
          toast.success("New Special Promo is created!")
        } else {
          let err_msg = response.data.err_msg
          let error = {
            code: "Add New Promo Failed",
            message: err_msg,
          }
          toast.error("New Special Promo is Failed!")
          //
          this.error = error
          this.loading = false
          this.isAddedNewCampaign = false
        }
      })
    },

    async getSpecialPromos(params) {
      //
      this.error = null
      this.loading = true
      this.specialPromos = []
      try {
        const response = await new Promise((resolve, reject) => {
          getRequest(GET_SPECIAL_PROMOS_URL, {}, params, res => {
            if (res.data.success) resolve(res)
            else reject(res)
          })
        })
    
        const data = response.data.data
        this.specialPromos = data.specialPromos
        this.error = null
      } catch (err) {
        let err_msg = err.data?.err_msg || 'Unknown error'
        this.error = {
          code: "Get Special Promo Data Failed",
          message: err_msg,
        }
      } finally {
        this.loading = false
      }           
    },   

    async getTextCampaigns(params) {
      //
      this.error = null
      this.loading = true
      this.textCampaigns = []
      try {
        const response = await new Promise((resolve, reject) => {
          getRequest(GET_TEXT_CAMPAIGNS_URL, {}, params, res => {
            if (res.data.success) resolve(res)
            else reject(res)
          })
        })
    
        const data = response.data.data
        this.textCampaigns = data.textCampaigns
        this.error = null
      } catch (err) {
        let err_msg = err.data?.err_msg || 'Unknown error'
        this.error = {
          code: "Get Text Campaign Data Failed",
          message: err_msg,
        }
      } finally {
        this.loading = false
      }           
    },   

    async getEmailCampaigns(params) {
      //
      this.error = null
      this.loading = true
      this.emailCampaigns = []
      try {
        const response = await new Promise((resolve, reject) => {
          getRequest(GET_EMAIL_CAMPAIGNS_URL, {}, params, res => {
            if (res.data.success) resolve(res)
            else reject(res)
          })
        })
    
        const data = response.data.data;
        this.emailCampaigns = data.emailCampaigns
        this.error = null
      } catch (err) {
        let err_msg = err.data?.err_msg || 'Unknown error'
        this.error = {
          code: "Get Email Campaign Data Failed",
          message: err_msg,
        }
      } finally {
        this.loading = false
      }           
    },   
    
    async updateSpecialPromo(params) {
      //
      this.error = null
      this.loading = true
      this.specialPromos = []
      console.log(params)
      try {
        const response = await new Promise((resolve, reject) => {
          postRequest(`${UPDATE_SPECIAL_PROMO_URL}/${params.id}`, {}, params, res => {
            if (res.data.success) resolve(res)
            else reject(res)
          })
        })
    
        const data = response.data.data

        toast.success("Special Promo is successfully updated!")
        this.specialPromos = data.specialPromos
        this.error = null
      } catch (err) {
        let err_msg = err.data?.err_msg || 'Unknown error'
        this.error = {
          code: "UPDATE Special Promo Data Failed",
          message: err_msg,
        }
      } finally {
        this.loading = false
      }      
    }, 
    
    removeSpecialPromo(id) {
      //
      this.error = null
      this.loading = true
      this.isDeletedCampaign = false
      let params = {}
      console.log("delete Id", id)
      postRequest(`${DELETE_SPECIAL_PROMO_URL}/${id}`, {}, params, response => {
        let res = response.data.success
        if (res) {
          const data = response.data.data

          this.specialPromos = data.specialPromos

          this.error = null
          this.loading = false
          this.isDeletedCampaign = true
          toast.success("Special Promo is successfully deleted!")
        } else {
          let err_msg = response.data.err_msg
          let error = {
            code: "Delete SpecialPromo Failed",
            message: err_msg,
          }
    
          //
          this.error = error
          this.loading = false
          this.isDeletedCampaign = false
        }
      })
    },  

    removeTextCampaign(id) {
      //
      this.error = null
      this.loading = true
      this.isDeletedCampaign = false
      let params = {}
      console.log("delete Id", id)
      postRequest(`${DELETE_TEXT_CAMPAIGN_URL}/${id}`, {}, params, response => {
        let res = response.data.success
        if (res) {
          const data = response.data.data

          this.textCampaigns = data.textCampaigns

          this.error = null
          this.loading = false
          this.isDeletedCampaign = true
          toast.success("Text Campaign is successfully deleted!")
        } else {
          let err_msg = response.data.err_msg
          let error = {
            code: "Delete Text Campaign Failed",
            message: err_msg,
          }
    
          //
          this.error = error
          this.loading = false
          this.isDeletedCampaign = false
        }
      })
    },  

    removeEmailCampaign(id) {
      //
      this.error = null
      this.loading = true
      this.isDeletedCampaign = false
      let params = {}
      console.log("delete Id", id)
      postRequest(`${DELETE_EMAIL_CAMPAIGN_URL}/${id}`, {}, params, response => {
        let res = response.data.success
        if (res) {
          const data = response.data.data

          this.emailCampaigns = data.emailCampaigns

          this.error = null
          this.loading = false
          this.isDeletedCampaign = true
          toast.success("EmailCampaign is successfully deleted!")
        } else {
          let err_msg = response.data.err_msg
          let error = {
            code: "Delete EmailCampaign Failed",
            message: err_msg,
          }
    
          //
          this.error = error
          this.loading = false
          this.isDeletedCampaign = false
        }
      })
    },  
  },
})
