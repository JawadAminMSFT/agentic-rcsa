export function formatStepData(step: string, data: any): any {
  // Format data based on step type
  if (typeof data === "string") {
    try {
      return JSON.parse(data)
    } catch (e) {
      return data
    }
  }

  return data
}
