export function toPositiveNumber(number: number | string): string {
  return Math.abs(Number(number)).toString()
}
