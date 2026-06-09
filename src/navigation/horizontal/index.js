import admin from './admin'
import appointments from './appointments'
import lobby from './lobby'
import marketing from './marketing'
import patientChart from './patient-chart'
import patientEncounter from './patient-encounter'

export default [...lobby, ...patientChart, ...patientEncounter, ...appointments, ...marketing, ...admin]