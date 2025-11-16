<script>
export default {
  name: 'RegisteredMethodsComponent',
};
</script>

<template>
<div class="row items-center justify-center">
  <div class="text-style q-pa-md">or</div>
</div>
  <div class="row items-center justify-between">
    <q-btn label="Apple" rounded class="auth-btn"/>
    <q-btn label="Google" rounded class="auth-btn"/>
  </div>
</template>

<style scoped lang="scss">
.text-style {
  color: #767676;
  font-size: 14px;
  font-weight: 500;
  line-height: 20px;
}

.auth-btn{
  cursor: pointer;
  box-sizing: border-box;
  border-radius: 22px;
  box-shadow: 2px 2px 4px rgba(3,3,3,0.1) !important;
  background-color: #fefefe;
  color: #030303;
  font-size: 16px;
  line-height: 24px;
  outline: none;
  text-transform: capitalize;
  width: 156px;
}
</style>
