import { getRequest, postRequest } from "@/network"
import {
  ADD_STAFF_URL,
  DELETE_STAFF_URL,
  GET_ALL_INVENTORY,
  GET_ALL_STAFFS,
  GET_STAFF_PAYROLL,
  UPDATE_STAFF_URL,
} from "@/network/const"
import { defineStore } from "pinia"

export const useStaffDataStore = defineStore('staffData', {
  state: () => ({
    isAddedNewStaff: false,
    isDeletedStaff: false,
    staff: null,
    payroll: null,
    staffList: [],
    inventoryList: [],
    loading: false,
    error: null,
  }),
  actions: {
    getAllStaff(params) {
      //
      this.error = null
      this.loading = true
      this.staffList = []
      getRequest(GET_ALL_STAFFS, {}, params, response => {
        let res = response.data.success
        if (res) {
          const data = response.data.data

          this.staffList = data.staffList//staff list
          this.error = null
          this.loading = false
        } else {
          let err_msg = response.data.err_msg
          let error = {
            code: "Get Staff Data Failed",
            message: err_msg,
          }

          //
          this.error = error
          this.loading = false
        }
      })
    },                      
    addNewStaff(params) {
      //
      this.error = null
      this.loading = true
      this.staffList = []
      this.isAddedNewStaff = false
      postRequest(ADD_STAFF_URL, {}, params, response => {
        let res = response.data.success
        if (res) {
          const data = response.data.data

          this.staffList = data.staffList//staff list
          this.error = null
          this.loading = false
          this.isAddedNewStaff = true
        } else {
          let err_msg = response.data.err_msg
          let error = {
            code: "Add New Staff Failed",
            message: err_msg,
          }

          //
          this.error = error
          this.loading = false
          this.isAddedNewStaff = false
        }
      })
    },                      
    updateStaff(params) {
      //
      this.error = null
      this.loading = true
      this.staffList = []
      this.isAddedNewStaff = false
      postRequest(`${UPDATE_STAFF_URL}/${params.id}`, {}, params, response => {
        let res = response.data.success
        if (res) {
          const data = response.data.data

          this.staffList = data.staffList//staff list
          this.error = null
          this.loading = false
          this.isAddedNewStaff = true
        } else {
          let err_msg = response.data.err_msg
          let error = {
            code: "Add New Staff Failed",
            message: err_msg,
          }

          //
          this.error = error
          this.loading = false
          this.isAddedNewStaff = false
        }
      })
    },                      
    removeStaff(params) {
      //
      this.error = null
      this.loading = true
      this.isDeletedStaff = false
      postRequest(`${DELETE_STAFF_URL}/${params.id}`, {}, params, response => {
        let res = response.data.success
        if (res) {
          const data = response.data.data

          this.error = null
          this.loading = false
          this.isDeletedStaff = true
        } else {
          let err_msg = response.data.err_msg
          let error = {
            code: "Delete Staff Failed",
            message: err_msg,
          }

          //
          this.error = error
          this.loading = false
          this.isDeletedStaff = false
        }
      })
    },  
    getStaffPayroll(params){
      this.error = null
      this.loading = true
      this.staff = null
      this.payroll = null
      getRequest(GET_STAFF_PAYROLL, {}, params, response => {
        let res = response.data.success
        if (res) {
          const data = response.data.data

          this.staff = data.staff    
          this.payroll = data.payroll                
          this.error = null
          this.loading = false
        } else {
          let err_msg = response.data.err_msg
          let error = {
            code: "Get Staff Payroll Failed",
            message: err_msg,
          }
          this.error = error
          this.loading = false
        }
      }) 
    },
    getAllInventory(params) {
      //
      this.error = null
      this.loading = true
      this.inventoryList = []
      getRequest(GET_ALL_INVENTORY, {}, params, response => {
        let res = response.data.success
        if (res) {
          const data = response.data.data

          this.inventoryList = data.inventoryList
          this.error = null
          this.loading = false
        } else {
          let err_msg = response.data.err_msg
          let error = {
            code: "Get All Inventory Failed",
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
