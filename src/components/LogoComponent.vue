<template>
  <!-- Ширина рівно по контенту -->
  <div class="ai-wordmark" :style="{ fontSize: base + 'px' }">
    <!-- тільки зірка у SVG, без тексту => немає viewBox-тягаря -->
    <svg class="ai-star" viewBox="0 0 20 20" aria-hidden="true">
      <defs>
        <linearGradient id="aiStarGrad" x1="0" y1="0" x2="1" y2="1">
          <stop stop-color="#A8DFF0"/><stop offset=".6" stop-color="#CBBEF9"/><stop offset="1" stop-color="#F9BDE6"/>
        </linearGradient>
      </defs>
      <polygon
        points="10,0 12.6,7.4 20,10 12.6,12.6 10,20 7.4,12.6 0,10 7.4,7.4"
        fill="url(#aiStarGrad)"
      >
        <animateTransform attributeName="transform" type="rotate"
                          from="0 10 10" to="360 10 10" dur="12s" repeatCount="indefinite"/>
      </polygon>
    </svg>

    <!-- Текст без SVG => ширина = реальний текст -->
    <div class="ai-text">
      <div class="ai-line1">ARCANA</div>
      <div class="ai-line2">INSIGHT</div>
    </div>
  </div>
</template>

<script>
export default {
  name: 'LogoComponent',
  props: {
    /** базовий розмір (скейлить увесь логотип) */
    base: { type: Number, default: 16 }
  }
}
</script>

<style scoped>
.ai-wordmark{
  display:inline-flex;            /* ширина рівно по контенту */
  align-items:center;
  gap:.55em;                      /* відступ між зіркою і текстом */
  line-height:1;                  /* щільно */
}

/* зірка масштабується відносно базового розміру шрифту */
.ai-star{
  width:1.45em;
  height:1.45em;
  display:block;
}

.ai-text{
  display:flex;
  flex-direction:column;
  gap:.25em;
}

/* верхній рядок — жирний, дуже читабельний */
.ai-line1{
  font-weight:800;
  letter-spacing:.05em;
  color:#E7EAF0;
  font-size: 10px;
}

/* нижній — дрібніший і розріджений */
.ai-line2{
  font-weight:600;
  letter-spacing:.22em;
  color:#CDD3DE;
  font-size: 7px;
}
</style>
