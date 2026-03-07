import axios from "axios"

export const verifyEmailRequest = async signedUrl => {
  if (!signedUrl) {
    throw new Error("Missing verification link.")
  }

  try {
    const response = await axios.get(signedUrl, {
      headers: {
        Accept: "application/json",
      },
      withCredentials: false,
    })

    return response?.data
  } catch (error) {
    const message = error?.response?.data?.message || error?.message || "Unable to verify email."
    const normalizedError = new Error(message)
    normalizedError.response = error?.response
    normalizedError.data = error?.response?.data
    throw normalizedError
  }
}
