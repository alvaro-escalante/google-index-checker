// Timing function
export const timer = (duration) => {
  let seconds = Math.floor((duration / 1000) % 60)
  let minutes = Math.floor((duration / (1000 * 60)) % 60)
  let hours = Math.floor((duration / (1000 * 60 * 60)) % 24)
  let days = Math.floor((duration / (1000 * 60 * 60 * 24)) % 24)

  const daystext = days > 1 ? `${days} days and ` : days > 0 ? `${days} day and ` : ''
  hours = hours < 10 ? `0${hours}` : hours
  minutes = minutes < 10 ? `0${minutes}` : minutes
  seconds = seconds < 10 ? `0${seconds}` : seconds

  return `${daystext}${hours}:${minutes}:${seconds}s`
}
