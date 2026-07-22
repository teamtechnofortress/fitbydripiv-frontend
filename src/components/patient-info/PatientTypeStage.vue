<template>
  <div class="patient-type-stage">
    <div class="stage-card">
      <p class="stage-eyebrow">Get started</p>
      <h2 class="stage-title">
        Are you a new or returning patient?
      </h2>
      <p class="stage-desc">
        This helps us pull up your saved details or set up a new profile for you.
      </p>

      <div class="choice-grid">
        <button
          type="button"
          class="choice-card"
          @click="$emit('selectExisting')"
        >
          <span class="choice-icon">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75">
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
              <circle cx="12" cy="7" r="4" />
            </svg>
          </span>
          <span class="choice-copy">
            <strong>Returning patient</strong>
            <span>We already have your records</span>
          </span>
          <svg class="choice-chevron" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M9 6l6 6-6 6" stroke-linecap="round" stroke-linejoin="round" />
          </svg>
        </button>

        <button
          type="button"
          class="choice-card"
          @click="$emit('selectNew')"
        >
          <span class="choice-icon">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75">
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
              <circle cx="9" cy="7" r="4" />
              <path d="M19 8v6M22 11h-6" stroke-linecap="round" />
            </svg>
          </span>
          <span class="choice-copy">
            <strong>New patient</strong>
            <span>First time registering with us</span>
          </span>
          <svg class="choice-chevron" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M9 6l6 6-6 6" stroke-linecap="round" stroke-linejoin="round" />
          </svg>
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
defineEmits(['selectExisting', 'selectNew'])
</script>

<style scoped>
.patient-type-stage {
  width: min(620px, 100%);
  margin: 0 auto;
}

.stage-card {
  background: var(--surface, #fff);
  border: 1px solid rgba(229, 229, 234, 0.8);
  border-radius: 20px;
  box-shadow: 0 18px 44px rgba(15, 23, 42, 0.055), 0 2px 7px rgba(15, 23, 42, 0.035);
  padding: 1.45rem 1.5rem;
  text-align: center;
}

.stage-eyebrow {
  margin: 0 0 0.4rem;
  font-size: 0.7rem;
  font-weight: 650;
  letter-spacing: 0.075em;
  text-transform: uppercase;
  color: var(--accent, #0071e3);
}

.stage-title {
  margin: 0;
  font-size: 1.28rem;
  font-weight: 640;
  letter-spacing: -0.02em;
  line-height: 1.25;
  color: var(--ink, #1d1d1f);
}

.stage-desc {
  margin: 0.5rem auto 0;
  max-width: 40ch;
  font-size: 0.9rem;
  line-height: 1.4;
  color: #66739a;
}

.choice-grid {
  display: flex;
  flex-direction: column;
  gap: 0.65rem;
  margin-top: 1.25rem;
  text-align: left;
}

.choice-card {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  width: 100%;
  padding: 0.85rem 0.95rem;
  background: #fafafe;
  border: 1px solid rgba(229, 229, 234, 0.55);
  border-radius: 14px;
  font: inherit;
  cursor: pointer;
  text-align: left;
  transition: border-color 0.16s ease, background 0.16s ease, transform 0.16s ease;
}

.choice-card:hover {
  border-color: rgba(0, 113, 227, 0.22);
  background: var(--surface, #fff);
  transform: translateY(-1px);
}

.choice-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  flex: 0 0 auto;
  color: #0071e3;
  background: rgba(0, 113, 227, 0.09);
  border-radius: 11px;
}

.choice-copy {
  display: flex;
  flex-direction: column;
  gap: 0.15rem;
  flex: 1;
  min-width: 0;
}

.choice-copy strong {
  font-size: 0.98rem;
  font-weight: 590;
  color: #20232a;
}

.choice-copy span {
  font-size: 0.85rem;
  color: #66739a;
}

.choice-chevron {
  flex: 0 0 auto;
  color: var(--ink-3, #a1a1a6);
  transition: transform 0.16s ease, color 0.16s ease;
}

.choice-card:hover .choice-chevron {
  color: var(--accent, #0071e3);
  transform: translateX(2px);
}

@media (max-width: 640px) {
  .stage-card {
    padding: 1.2rem 1rem;
    border-radius: var(--radius-md, 14px);
  }

  .stage-title {
    font-size: 1.3rem;
  }
}
</style>
