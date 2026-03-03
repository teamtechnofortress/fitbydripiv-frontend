import { postRequestNoAuth } from "@/network"
import {
  // FORGOT_PASSWORD_URL,
  LOGIN_URL,
  REGISTER_URL
} from "@/network/const"
import { defineStore } from "pinia"

export const useAuthDataStore = defineStore('authData', {
  state: () => ({
    loggedInUser: localStorage.getItem("userData") != null ? JSON.parse(localStorage.getItem("userData")) : null,
    userAbility: "",
    forgotPasswordEmail: "",
    newPassword: "",
    loading: false,
    error: null,
    profile: "",
    updatedProfile: "",
    users: "",
    userImport: "",
    newExAssigns: "",
  }),
  actions: {
    login(data) {
      //
      this.error = null
      this.loading = true
      let params = {
        email: data.email,
        password: data.password,
      }
      postRequestNoAuth(LOGIN_URL, null, params, response => {
        let res = response.data.success
        if (res) {
          const { user, token, userAbilities } = response.data.data

          localStorage.setItem("userData", JSON.stringify(user))
          localStorage.setItem("accessToken", token)
          localStorage.setItem("userAbilities", JSON.stringify(userAbilities))

          this.loggedInUser = user
          this.userAbility = userAbilities
          this.error = null
          this.loading = false
        } else {
          localStorage.removeItem("userData")
          localStorage.removeItem("accessToken")
          localStorage.removeItem("userAbilities")
          let err_msg = response.data.err_msg
          let error = {
            code: "Login Failed",
            message: err_msg,
          }

          //
          this.error = error
          this.loading = false
        }
      })
    },
    register({ commit }, data) {
      this.error = null
      this.loading = true
      let params = {
        firstName: data.firstName,
        lastName: data.lastName,
        email: data.email,
        password: data.password,
      }
      postRequestNoAuth(REGISTER_URL, null, params, response => {
        let res = response.data.success
        if (res) {
          const { user, token, userAbilities } = response.data.data

          localStorage.setItem("userData", JSON.stringify(user))
          localStorage.setItem("accessToken", token)
          localStorage.setItem("userAbilities", JSON.stringify(userAbilities))

          this.loggedInUser = user
          this.userAbility = userAbilities
          this.error = null
          this.loading = false
        } else {

          localStorage.removeItem("userData")
          localStorage.removeItem("accessToken")
          localStorage.removeItem("userAbilities")
          let err_msg = response.data.err_msg
          let error = {
            code: "Login Failed",
            message: err_msg,
          }

          //
          this.error = error
          this.loading = false                   
        }
      })
    },
    forgotPassword({ commit }, data) {
      commit("clearError")
      commit("setLoading", true)
      postRequestNoAuth(FORGOT_PASSWORD_URL, {}, data, response => {
        let res = response.data.success
        console.log("response: ", res)
        if (res) {
          let email = response.data.data.email
          commit("FORGOT_PASSWORD", email)
        } else {
          let err_msg = response.data.err_msg
          let error = {
            code: "Forgot Password Failed",
            message: err_msg,
          }
          commit("setError", error)
          console.log(err_msg)
        }
      })
    },
    resetPassword({ commit }, data) {
      commit("clearError")
      commit("setLoading", true)
      let params = {
        email: data.email,
        password: data.password,
        authKey: data.authKey,
      }
      postRequestNoAuth(RESET_PASSWORD_URL, null, params, response => {
        let res = response.data.success
        console.log("response: ", res)
        if (res) {
          let password = response.data.data.password
          commit("setNewPassword", password)
        } else {
          let err_msg = response.data.err_msg
          let error = {
            code: "Reset Password Failed",
            message: err_msg,
          }
          commit("setError", error)
          console.log(err_msg)
        }
      })
    },
  },
})

export const getUserInfo = () => {
  return localStorage.getItem("userData") != null ? JSON.parse(localStorage.getItem("userData")) : null
}

export const getApiToken = () => {
  return localStorage.getItem("accessToken") || null
}
