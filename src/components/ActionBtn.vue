<script>
export default {
  name: 'ActionBtn',
  emits: ['onClick'],

  props: {
    btnLabel: {
      type: String,
      default: '',
    },
    loading: {
      type: Boolean,
      default: false,
    }
  },

  methods: {
    handleClick(){
      this.$emit('onClick');
    }
  }
};
</script>

<template>
  <q-btn :label="btnLabel" class="action-btn" :loading="loading" @click="handleClick" />
</template>

<style scoped lang="scss">
.action-btn {
  cursor: pointer;
  padding: 0 8px;
  border: 0;
  box-sizing: border-box;
  border-radius: 22px;
  background-color: #030303;
  color: #fefefe;
  font-size: 16px;
  font-weight: 500;
  line-height: 20px;
  outline: none;
  width: 100%;
  height: 56px;
  text-transform: capitalize;
}

</style>
