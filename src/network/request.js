import { getApiToken } from "@/store/authData"
import axios from "axios"

export function getRequest(url, headers, params, callback) {    
  headers.token = getApiToken()
  axios({
    method: 'get',
    url: url,        
    headers: { Authorization: `Bearer ${headers.token}` },
    params: params,
  })
    .then(function (response) {
      callback(response)
    })
    .catch(function (error) {
      console.log("failed: ", error.toLocaleString(), url)
      callback({
        data: {
          res: "failed",
          err_msg: error.toLocaleString(),
        },
      })            
    })
}

export function getRequestNoAuth(url, headers, params, callback) {
  axios({
    method: 'get',
    url: url,
    headers: headers,
    params: params,
  })
    .then(function (response) {
      callback(response)
    })
    .catch(function (error) {
      console.log("failed: ", error.toLocaleString(), url)
      callback({
        data: {
          res: "failed",
          err_msg: error.toLocaleString(),
        },
      })
    })
}

export function postRequest(url, headers, params, callback) {
  headers.token = getApiToken()
  axios({
    method: 'post',
    url: url,
    data: params,
    headers: { Authorization: `Bearer ${headers.token}` },
  })
    .then(function (response) {
      callback(response)
    })
    .catch(function (error) {            
      let message = ""
      if(error.response?.data?.data){
        const data = error.response?.data?.data;

        message = Object.values(data)[0].toLocaleString()
      }else{
        const data = error.response.data

        message = data.message.toLocaleString()
      }
      callback({
        data: {
          res: "failed",                    
          err_msg: message,
        },
      })
    })
}

export function putRequest(url, headers, params, callback) {
  headers.token = getApiToken()
  axios({
    method: 'put',
    url: url,
    data: params,
    headers: { Authorization: `Bearer ${headers.token}` },
  })
    .then(function (response) {
      callback(response)
    })
    .catch(function (error) {            
      let message = ""
      if(error.response.data.data){
        const data = error.response.data.data

        message = Object.values(data)[0].toLocaleString()
      }else{
        const data = error.response.data

        message = data.message.toLocaleString()
      }
      callback({
        data: {
          res: "failed",                    
          err_msg: message,
        },
      })
    })
}

export function patchRequest(url, headers, params, callback) {
  headers.token = getApiToken()
  axios({
    method: 'patch',
    url: url,
    data: params,
    headers: { Authorization: `Bearer ${headers.token}` },
  })
    .then(function (response) {
      callback(response)
    })
    .catch(function (error) {            
      let message = ""
      if(error.response.data.data){
        const data = error.response.data.data

        message = Object.values(data)[0].toLocaleString()
      }else{
        const data = error.response.data

        message = data.message.toLocaleString()
      }
      callback({
        data: {
          res: "failed",                    
          err_msg: message,
        },
      })
    })
}

export function postRequestNoAuth(url, headers, params, callback) {
  axios({
    method: 'post',
    url: url,
    data: params,
    headers: headers,
  })
    .then(function (response) {
      callback(response)
    })
    .catch(function (error) {            
      let message = ""
      if(error.response.data.data){
        const data = error.response.data.data

        message = Object.values(data)[0].toLocaleString()
      }else{
        const data = error.response.data

        message = data.message.toLocaleString()
      }
      callback({
        data: {
          res: "failed",                    
          err_msg: message,
        },
      })
    })
}

export function multiPartFormRequest(url, headers, params, callback) {
  headers.token = getApiToken()
  let file = params["file"]
  let formData = new FormData()
  if (file && file.name) {
    formData.append("document", file)
  }
  Object.keys(params).forEach(function(key) {
    if (key !== "file") {
      formData.append(key, params[key])
    }
  })
  headers['Content-Type'] = 'multipart/form-data'
  headers['Accept'] = '*/*'
  axios.post(url,
    formData,
    {
      headers: headers,
    })
    .then(function (response) {
      callback(response)
    })
    .catch(function (error) {
      const data = error.response.data

      console.log("failed: ", error.toLocaleString())
      callback({
        data: {
          res: "failed",
          err_msg: data.message.toLocaleString(),
        },
      })
    })
}

export function multiPartFormRequestMultipleFiles(url, headers, params, callback) {
  headers.token = getApiToken()
  let files = params["files"] ?? ""
  let formData = new FormData()
  for (const file of files) {
    formData.append("documents", file)
  }
  Object.keys(params).forEach(function(key) {
    if (key !== "files") {
      formData.append(key, params[key])
    }
  })
  headers['Content-Type'] = 'multipart/form-data'
  headers['Accept'] = '*/*'
  axios.post(url,
    formData,
    {
      headers: headers,
    })
    .then(function (response) {
      callback(response)
    })
    .catch(function (error) {
      const data = error.response.data

      console.log("failed: ", error.toLocaleString())
      callback({
        data: {
          res: "failed",
          err_msg: data.message.toLocaleString(),
        },
      })
    })
}

