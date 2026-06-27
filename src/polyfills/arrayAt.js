if (!Array.prototype.at) {
  Object.defineProperty(Array.prototype, 'at', {
    value(index) {
      const length = this.length >>> 0
      const numericIndex = Number(index) || 0
      const relativeIndex = numericIndex < 0 ? Math.ceil(numericIndex) : Math.floor(numericIndex)
      const resolvedIndex = relativeIndex < 0 ? length + relativeIndex : relativeIndex

      return resolvedIndex < 0 || resolvedIndex >= length ? undefined : this[resolvedIndex]
    },
    configurable: true,
    writable: true,
  })
}
