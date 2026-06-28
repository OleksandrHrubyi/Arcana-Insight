<template>
  <span class="card-back" aria-hidden="true">
    <span class="card-back__frame"></span>
    <span class="card-back__frame card-back__frame--inner"></span>
    <span class="card-back__band"></span>
    <span class="card-back__center">
      <span class="card-back__core"></span>
      <span class="card-back__core-ring"></span>
      <img class="card-back__logo" :src="logo" alt="" />
    </span>
  </span>
</template>

<script setup>
// Shared tarot card back (the deck "рубашка"). Same design language as the home
// hero card + menu daily card, but with size-relative geometry so it scales onto
// the smaller cards of a tarot spread. Drop it into any card face: it fills the
// parent (inset:0) and inherits its border-radius.
import logo from 'src/assets/images/logo.svg'
</script>

<style scoped>
.card-back {
  position: absolute;
  inset: 0;
  overflow: hidden;
  border-radius: inherit;
  display: flex;
  align-items: center;
  justify-content: center;
  background:
    radial-gradient(circle at 16% 8%, rgba(130, 178, 232, 0.18), rgba(130, 178, 232, 0) 34%),
    radial-gradient(circle at 84% 92%, rgba(88, 126, 182, 0.15), rgba(88, 126, 182, 0) 36%),
    radial-gradient(circle at 50% 40%, rgba(165, 205, 247, 0.06), rgba(165, 205, 247, 0) 28%),
    linear-gradient(160deg, rgba(16, 32, 49, 0.995), rgba(8, 17, 30, 0.995) 56%, rgba(4, 10, 18, 1));
}

.card-back__frame {
  position: absolute;
  inset: 6.5%;
  border-radius: 9%;
  border: 1px solid rgba(166, 200, 233, 0.28);
  box-shadow:
    inset 0 0 0 1px rgba(255, 255, 255, 0.03),
    0 0 0 1px rgba(78, 118, 176, 0.05);
}

.card-back__frame--inner {
  inset: 12%;
  border-radius: 7%;
  border-color: rgba(144, 179, 214, 0.18);
}

.card-back__band {
  position: absolute;
  left: 50%;
  top: 13%;
  bottom: 13%;
  width: 1.5px;
  transform: translateX(-50%);
  background: linear-gradient(
    180deg,
    rgba(255, 255, 255, 0),
    rgba(182, 214, 244, 0.3),
    rgba(255, 255, 255, 0)
  );
  box-shadow: 0 0 10px rgba(113, 160, 214, 0.14);
}

.card-back__center {
  position: relative;
  width: 86%;
  height: 86%;
  display: flex;
  align-items: center;
  justify-content: center;
}

.card-back__core {
  width: 52%;
  aspect-ratio: 1 / 1;
  border-radius: 999px;
  border: 1px solid rgba(184, 214, 242, 0.16);
  background:
    radial-gradient(circle at 50% 30%, rgba(223, 236, 250, 0.12), rgba(223, 236, 250, 0) 46%),
    conic-gradient(
      from 180deg at 50% 50%,
      rgba(28, 56, 84, 0.96),
      rgba(12, 22, 35, 0.92),
      rgba(28, 56, 84, 0.96)
    ),
    linear-gradient(180deg, rgba(24, 45, 68, 0.88), rgba(8, 17, 28, 0.68));
  box-shadow:
    0 0 12px rgba(96, 145, 198, 0.1),
    inset 0 0 0 1px rgba(255, 255, 255, 0.035),
    inset 0 -8px 18px rgba(0, 0, 0, 0.18);
}

.card-back__core-ring {
  position: absolute;
  left: 50%;
  top: 50%;
  width: 38%;
  aspect-ratio: 1 / 1;
  border-radius: 999px;
  transform: translate(-50%, -50%);
  border: 1px solid rgba(183, 210, 238, 0.12);
  box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.012);
}

.card-back__logo {
  position: relative;
  z-index: 2;
  width: 62%;
  height: auto;
  opacity: 0.96;
}
</style>
