import * as PIXI from 'pixi.js'

export default ({ app }) => {
  app.config.globalProperties.$PIXI = PIXI
}

export { PIXI }
