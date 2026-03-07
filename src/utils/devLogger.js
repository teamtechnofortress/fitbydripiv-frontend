export const devLog = (message, payload) => {
  if (!import.meta.env.DEV) return
  try {
    if (import.meta.hot) {
      import.meta.hot.send('custom:debug-log', { message, payload })
    }
  } catch (err) {
    // ignore communication failures
  }
}
