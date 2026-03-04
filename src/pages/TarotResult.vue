<template>
  <div class="tarotResult">
    <header class="title">
      <div class="t1">{{ tt('tarotCard')}}</div>
      <div class="t2">{{ tt('forToday')}} </div>
    </header>
    <main class="content">
      <div v-if="!card" class="notFound">{{ tt('tarotResult.cardNotFound') }}</div>

      <template v-else>
        <div class="cardWrap">
          <img
            class="cardImg"
            :class="{ reversed: orientation === 'reversed' }"
            :src="imageSrc"
            :alt="cardTitle"
            draggable="false"
          />
        </div>

        <div class="cardTitle">{{ cardTitle }}</div>
        <div class="badge">({{ badgeText }})</div>

        <div class="desc">
          {{ descriptionText }}
        </div>
      </template>
    </main>

    <q-btn size="14px" round class="shareBtn" icon="share" @click="share" />
    <q-btn size="14px" round class="back-btn" icon="arrow_back_ios_new" @click="backRoute" />
  </div>
</template>

<script>
import { t, currentLocale } from 'src/i18n/index.js';
import tarotData from "../../src/data/cardsV2/tarot_full.json";
import { Share } from "@capacitor/share";

export default {
  name: "TarotResult",
  data() {
    return {
      tarotData,
      card: null,
    };
  },
  computed: {
    tt() {
      return (key) => t(this.locale, key);
    },
    locale() {
      return currentLocale.value || 'en';
    },
    orientation() {
      const o = String(this.$route.query.o || "upright");
      return o === "reversed" ? "reversed" : "upright";
    },
    cardTitle() {
      if (!this.card) return "";
      const name = this.card.name?.[this.locale] || this.card.name?.en || this.card.id;
      return String(name).toUpperCase();
    },
    badgeText() {
      const b =
        this.card?.ui?.badge?.[this.locale] ||
        this.card?.ui?.badge?.en ||
        "UPR/REV";
      return b;
    },
    descriptionText() {
      if (!this.card) return "";

      const d =
        this.card.description?.[this.orientation]?.[this.locale] ||
        this.card.description?.upright?.[this.locale] ||
        this.card.description?.upright?.en;

      if (d) return String(d).replace(/\s+/g, " ").trim();

      const m =
        this.card.meaning?.[this.orientation]?.[this.locale] ||
        this.card.meaning?.upright?.[this.locale] ||
        this.card.meaning?.upright?.en;

      return m ? String(m).replace(/\s+/g, " ").trim() : "";
    },
    imageSrc() {
      if (!this.card) return "";
      // ✅ КАРТИНКИ В public/images/cards/ + шлях з json
      // приклад: /images/cards/majorArcana/TheFool.png
      return `/images/cards/${this.card.file}`;
    }
  },
  mounted() {
    this.loadCard();
  },
  watch: {
    "$route.params.id"() {
      this.loadCard();
    }
  },
  methods: {
    loadCard() {
      const id = this.$route.params.id;
      this.card = (this.tarotData.cards || []).find((c) => c.id === id) || null;
    },
    async share() {
      if (!this.card) return;

      const title = this.card.name?.[this.locale] || this.card.name?.en || this.card.id;
      const text = this.descriptionText;

      try {
        await Share.share({
          title: String(title),
          text,
          dialogTitle: this.tt('tarotResult.shareCard')
        });
      } catch (e) {
        console.error(e);
      }
    },

    backRoute(){
      this.$router.push('/tarot');
    }
  }
};
</script>

<style scoped>
.tarotResult {
  height: 100vh;
  background: radial-gradient(120% 60% at 50% 0%, #0a2233 0%, #07131d 40%, #050d15 100%);
  color: #eaf2ff;
  overflow: hidden;
  position: relative;
}

.title {
  padding-top: 62px;
  text-align: center;
  letter-spacing: 0.22em;
  font-weight: 500;
  opacity: 0.95;
}

.t1 {
  font-size: 14px;
}

.t2 {
  font-size: 12px;
  margin-top: 6px;
}

.content {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 34px 22px 130px;
}

.cardWrap {
  margin-top: 6px;
}

.cardImg {
  width: min(200px, 74vw);
  height: auto;
  border-radius: 14px;
  box-shadow: 0 26px 80px rgba(0, 0, 0, 0.55);
  user-select: none;
  -webkit-user-drag: none;
}

.cardImg.reversed {
  transform: rotate(180deg);
}

.cardTitle {
  margin-top: 18px;
  font-size: 15px;
  letter-spacing: 0.18em;
  opacity: 0.95;
  text-align: center;
}

.badge {
  margin-top: 8px;
  font-size: 12px;
  letter-spacing: 0.16em;
  color: rgba(234, 242, 255, 0.72);
  text-align: center;
}

.desc {
  margin-top: 18px;
  width: min(340px, calc(100% - 10px));
  text-align: center;
  font-size: 14px;
  line-height: 1.7;
  letter-spacing: 0.06em;
  color: rgba(234, 242, 255, 0.60);
  white-space: pre-wrap;
}

.notFound {
  margin-top: 120px;
  opacity: 0.7;
  letter-spacing: 0.12em;
}

.shareBtn {
  position: absolute;
  right: 18px;
  bottom: calc(24px + env(safe-area-inset-bottom));
  background-color: #0D1321;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #617C97;
}

.back-btn {
  position: absolute;
  left: 18px;
  bottom: calc(24px + env(safe-area-inset-bottom));
  background-color: #0D1321;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #617C97;
}
</style>
