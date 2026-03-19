export const yesNoOptions = [
  { label: 'Yes', value: 'yes' },
  { label: 'No', value: 'no' },
]

export const screeningQuestions = [
  { key: 'diabetes', title: 'Diabetes', prompt: 'Do you have Type 2 Diabetes or Diabetic Retinopathy?' },
  { key: 'bloodThinners', title: 'Blood Thinners', prompt: 'Are you currently taking any blood thinners?' },
  { key: 'alcohol', title: 'Alcohol Consumption', prompt: 'Do you drink alcohol?' },
]

export const riskQuestions = [
  {
    key: 'glpHistory',
    title: 'GLP Medication History',
    prompt: 'Have you previously taken a GLP medication with or without prescription?',
    helperList: ['Ozempic', 'Semaglutide', 'Mounjaro', 'Tirzepatide', 'Wegovy', 'Zepbound'],
  },
  { key: 'pancreatitis', title: 'Pancreatitis History', prompt: 'Do you have or have you ever had pancreatitis?' },
  { key: 'thyroidCancer', title: 'Thyroid Cancer', prompt: 'Do you have or ever had medullary thyroid cancer?' },
  { key: 'renalImpairment', title: 'Renal Impairment', prompt: 'Do you have renal (kidney) impairment?' },
]

export const currentConditionsOptions = [
  { label: 'High Blood Pressure', value: 'high-blood-pressure' },
  { label: 'High Cholesterol', value: 'high-cholesterol' },
  { label: 'High Blood Sugar', value: 'high-blood-sugar' },
  { label: 'None', value: 'none' },
]

export const additionalConditionsOptions = [
  { label: 'Sleep Apnea', value: 'sleep-apnea' },
  { label: 'Food Addiction', value: 'food-addiction' },
  { label: 'Obesity (History / Family)', value: 'obesity' },
  { label: 'None', value: 'none' },
]

export const goalsItems = [
  { label: 'Energy', value: 'energy-1' },
  { label: 'Supplements', value: 'supplements' },
  { label: 'Fatigue', value: 'fatigue-1' },
  { label: 'Recovery', value: 'recovery' },
  { label: 'Mood / Focus / Stress', value: 'mood-focus-stress' },
  { label: 'Weight Loss', value: 'weight-loss' },
  { label: 'Fatigue', value: 'fatigue-2' },
  { label: 'Soreness', value: 'soreness' },
  { label: 'Energy', value: 'energy-2' },
  { label: 'Inflammation', value: 'inflammation' },
  { label: 'Performance / Lean', value: 'performance-lean' },
  { label: 'Immune Boost', value: 'immune-boost' },
  { label: 'Pain', value: 'pain' },
  { label: 'Skin', value: 'skin' },
  { label: 'Detox', value: 'detox' },
]

export const medicalHistoryItems = [
  { label: 'None', value: 'none' },
  { label: 'Heart Problems', value: 'heart-problems' },
  { label: 'Hormone Issues', value: 'hormone-issues' },
  { label: 'Cancer', value: 'cancer' },
  { label: 'Chronic Fatigue Syndrome', value: 'chronic-fatigue-syndrome' },
  { label: 'High Blood Pressure', value: 'history-high-blood-pressure' },
  { label: 'Blood Clots', value: 'blood-clots' },
  { label: 'Stroke or Seizure', value: 'stroke-or-seizure' },
  { label: 'Liver or Kidney Problems', value: 'liver-kidney-problems' },
  { label: 'Thyroid Issues', value: 'thyroid-issues' },
  { label: 'Pre / Peri / Post Menopause', value: 'menopause' },
  { label: 'Under Doctor Care for Illness', value: 'under-doctor-care' },
]

export const genders = [
  { label: 'Female', value: 'female' },
  { label: 'Male', value: 'male' },
  { label: 'Non-binary', value: 'non-binary' },
  { label: 'Prefer not to say', value: 'prefer-not-to-say' },
]

export const ethnicityOptions = [
  { label: 'American Indian or Alaska Native', value: 'american-indian' },
  { label: 'Asian', value: 'asian' },
  { label: 'Black or African American', value: 'black' },
  { label: 'Hispanic or Latino', value: 'hispanic' },
  { label: 'Native Hawaiian or Pacific Islander', value: 'pacific-islander' },
  { label: 'White', value: 'white' },
  { label: 'Other / Prefer not to say', value: 'other' },
]
