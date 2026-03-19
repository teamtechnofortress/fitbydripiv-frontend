<template>
  <div class="patient-type-stage">
    <div class="stage-card">
      <div class="stage-header">
        <h2 class="stage-title">Are you an existing or new patient?</h2>
        <p class="stage-desc">This helps us retrieve your previous information or set up your profile.</p>
      </div>

      <div class="patient-choice-grid">
        <button class="patient-choice-btn" @click="$emit('selectExisting')">
          <div class="choice-icon existing">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z"/>
              <path d="M16 11h6M19 8v6" stroke-width="1.5" stroke-linecap="round"/>
            </svg>
          </div>
          <h3>Returning Patient</h3>
          <p>We have your records on file</p>
        </button>

        <button class="patient-choice-btn" @click="$emit('selectNew')">
          <div class="choice-icon new">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2M16 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8ZM12 7v6m3-3h-6" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
          </div>
          <h3>New Patient</h3>
          <p>First time registering</p>
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
defineEmits(['selectExisting', 'selectNew'])
</script>

<style scoped>
.patient-type-stage { margin-top: 32px; }
.stage-card {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius-lg);
  padding: 32px;
  box-shadow: var(--shadow-sm);
}
.stage-header {
  text-align: center;
  margin-bottom: 32px;
}
.stage-title {
  font-family: var(--font-display);
  font-size: 28px;
  font-weight: 700;
  color: var(--text);
  margin: 0 0 8px;
  letter-spacing: -.015em;
}
.stage-desc {
  font-size: 15px;
  color: var(--text-3);
  margin: 0;
  line-height: 1.5;
}
.patient-choice-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 20px;
}
@media (max-width: 600px) {
  .patient-choice-grid { grid-template-columns: 1fr; }
}
.patient-choice-btn {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
  padding: 32px 24px;
  background: var(--surface-2);
  border: 2px solid var(--border);
  border-radius: var(--radius-lg);
  font-family: var(--font-body);
  cursor: pointer;
  transition: all .25s;
  user-select: none;
  text-decoration: none;
}
.patient-choice-btn:hover {
  border-color: var(--green);
  background: var(--green-light);
  transform: translateY(-2px);
  box-shadow: 0 8px 24px rgba(5,150,105,.12);
}
.patient-choice-btn h3 {
  font-size: 18px;
  font-weight: 600;
  color: var(--text);
  margin: 0;
}
.patient-choice-btn p {
  font-size: 13px;
  color: var(--text-3);
  margin: 0;
  text-align: center;
}
.choice-icon {
  width: 56px;
  height: 56px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
  transition: all .25s;
}
.choice-icon.existing {
  background: linear-gradient(135deg, #059669, #10b981);
}
.choice-icon.new {
  background: linear-gradient(135deg, #2563eb, #3b82f6);
}
.patient-choice-btn:hover .choice-icon {
  transform: scale(1.1);
}
</style>
