<template>
  <div class="code-row" :class="{ 'code-row--focus': isFocused }" @click="focusInput">
    <!-- прихований “справжній” інпут -->
    <input
      ref="hiddenInput"
      v-model="code"
      class="code-hidden-input"
      inputmode="numeric"
      autocomplete="one-time-code"
      :maxlength="length"
      @input="onInput"
      @focus="onFocus"
      @blur="onBlur"
    />

    <!-- 5 “слотів” під точки/цифри -->
    <div
      v-for="(slot, index) in length"
      :key="index"
      class="code-slot"
    >
      <span v-if="code[index]" class="code-digit">
        {{ code[index] }}
      </span>
      <span v-else class="code-dot"></span>
    </div>
  </div>
</template>

<script>
import { Haptics, ImpactStyle } from '@capacitor/haptics';
import { Capacitor } from '@capacitor/core';

export default {
  name: 'CodeInput',
  props: {
    modelValue: {
      type: String,
      default: '',
    },
    length: {
      type: Number,
      default: 6,
    },
  },
  data() {
    return {
      code: this.modelValue,
      isFocused: false,
    };
  },
  watch: {
    code(val) {
      this.$emit('update:modelValue', val);
    },
    modelValue(val) {
      if (val !== this.code) this.code = val;
    },
  },
  methods: {
    onInput(e) {
      this.code = (e.target.value || '').replace(/\D/g, '').slice(0, this.length);

    },
    async focusInput() {
      this.$refs.hiddenInput?.focus();
      if (!Capacitor.isNativePlatform()) return;
      try {
        await Haptics.impact({ style: ImpactStyle.Light });
      } catch (e) {
        console.error(e);
      }
    },
    onFocus() {
      this.isFocused = true;
    },
    onBlur() {
      this.isFocused = false;
    },
  },
};
</script>

<style lang="scss" scoped>
.code-row {
  box-sizing: border-box;
  display: flex;
  flex-direction: row;
  justify-content: center;
  align-items: center;
  padding: 16px 0;
  gap: 16px;

  width: 100%;
  height: 53px;
  border-bottom: 1px solid #142632;
  margin: 0 auto;
  position: relative;
}

.code-row--focus {
  border-bottom-color: rgba(180, 220, 255, 0.75);
  box-shadow: 0 10px 24px rgba(120, 170, 255, 0.12);
}

// реальний інпут — невидимий, але отримує фокус і paste
.code-hidden-input {
  position: absolute;
  left: 50%;
  top: 50%;
  width: 1px;
  height: 1px;
  transform: translate(-50%, -50%);
  opacity: 0;
  pointer-events: none;
  caret-color: transparent;
}

// кожен “слот” під крапку/цифру
.code-slot {
  width: 16px;
  height: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
}

// сіра крапка (коли цифри ще нема)
.code-dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: #444f67;
}

// стиль цифри (коли користувач ввів код)
.code-digit {
  font-size: 16px;
  line-height: 22px;
  color: #e4e8f4;
}

</style>
