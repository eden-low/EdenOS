export type BmiCategory = 'Underweight' | 'Healthy range' | 'Overweight' | 'Obesity'

export function calculateBmi(weightKg: number | null, heightCm: number | null): number | null {
  if (weightKg === null || heightCm === null || !Number.isFinite(weightKg) || !Number.isFinite(heightCm) || weightKg <= 0 || heightCm <= 0) return null
  const heightMetres = heightCm / 100
  return Math.round((weightKg / (heightMetres * heightMetres)) * 10) / 10
}

export function getBmiCategory(bmi: number): BmiCategory {
  if (bmi < 18.5) return 'Underweight'
  if (bmi < 25) return 'Healthy range'
  if (bmi < 30) return 'Overweight'
  return 'Obesity'
}
