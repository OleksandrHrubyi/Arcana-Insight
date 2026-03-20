<template>
  <q-dialog v-model="isOpen" persistent>
    <q-card class="delete-account-card">
      <q-card-section class="delete-card-header">
        <div class="delete-card-title">{{ tt('accountPage.deleteAccountTitle') }}</div>
      </q-card-section>

      <q-card-section class="q-pt-none delete-card-body">
        <p class="delete-card-text">{{ tt('accountPage.deleteAccountBody') }}</p>
        <p class="delete-card-hint">{{ tt('accountPage.deleteAccountHint') }}</p>
      </q-card-section>

      <q-card-actions class="delete-card-actions">
        <q-btn
          flat
          no-caps
          class="delete-card-btn delete-card-btn--cancel"
          :label="tt('common.cancel')"
          :disable="loading"
          @click="onCancel"
        />
        <q-btn
          flat
          no-caps
          class="delete-card-btn delete-card-btn--delete"
          :label="tt('accountPage.deleteAccountConfirm')"
          :loading="loading"
          :disable="loading"
          @click="onConfirm"
        />
      </q-card-actions>
    </q-card>
  </q-dialog>
</template>

<script>
import { defineComponent } from 'vue'
import { t, currentLocale } from 'src/i18n'

export default defineComponent({
  name: 'DeleteAccountDialog',

  props: {
    modelValue: {
      type: Boolean,
      required: true
    },
    loading: {
      type: Boolean,
      default: false
    }
  },

  emits: ['update:modelValue', 'confirm', 'cancel'],

  computed: {
    isOpen: {
      get() {
        return this.modelValue
      },
      set(value) {
        this.$emit('update:modelValue', value)
      }
    },

    locale() {
      return currentLocale.value || 'en'
    },

    tt() {
      return (key) => t(this.locale, key)
    }
  },

  methods: {
    onConfirm() {
      console.log('[DeleteAccountDialog] Confirm clicked')
      this.$emit('confirm')
    },

    onCancel() {
      console.log('[DeleteAccountDialog] Cancel clicked')
      this.$emit('cancel')
    }
  }
})
</script>

<style scoped lang="scss">
.delete-account-card {
  width: min(420px, calc(100vw - 24px));
  background: linear-gradient(180deg, rgba(18, 24, 38, 0.95), rgba(10, 14, 22, 0.98));
  color: rgba(235, 242, 255, 0.94);
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 16px;
  box-shadow:
    0 14px 36px rgba(0, 0, 0, 0.4),
    inset 0 1px 0 rgba(255, 255, 255, 0.06);
}

.delete-card-header {
  padding-bottom: 8px;
}

.delete-card-title {
  font-size: 16px;
  font-weight: 600;
  color: #ffffff;
}

.delete-card-body {
  padding-top: 0;
}

.delete-card-text {
  margin: 10px 0 6px;
  font-size: 13px;
  line-height: 1.5;
  color: rgba(224, 234, 248, 0.82);
}

.delete-card-hint {
  margin: 0 0 14px;
  font-size: 12px;
  line-height: 1.45;
  color: rgba(255, 173, 173, 0.88);
}

.delete-card-actions {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
  padding: 0 16px 16px;
}

.delete-card-btn {
  min-height: 40px;
  border-radius: 10px;
  font-size: 13px;
  font-weight: 500;
  transition: all 180ms ease;
}

.delete-card-btn:active:not(:disabled) {
  transform: scale(0.97);
}

.delete-card-btn--cancel {
  border: 1px solid rgba(156, 184, 235, 0.28);
  color: rgba(214, 225, 242, 0.84);
  background: transparent;
}

.delete-card-btn--delete {
  border: 1px solid rgba(255, 96, 96, 0.52);
  color: rgba(255, 106, 106, 0.95);
  background: rgba(42, 8, 12, 0.5);
}
</style>
