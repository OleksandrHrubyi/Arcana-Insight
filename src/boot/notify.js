import { boot } from 'quasar/wrappers'
import { Notify } from 'quasar'

// App-wide toast styling. The default Quasar grey notification box clashes with
// the dark mystic UI (especially over the immersive tarot scene). We give every
// $q.notify a single on-brand class (`arcana-toast`, styled in app.scss) plus
// sensible defaults, so individual call sites don't each restyle.
export default boot(() => {
  Notify.setDefaults({
    position: 'bottom',
    timeout: 2600,
    classes: 'arcana-toast',
  })
})
