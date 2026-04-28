import be from '../base/backend'
import injectString from '../base/inject.txt'
import { installHook } from '@back/hook'

// 安装全局 hook
installHook(window)

let contentWindow
let containerElement = null
let isVisible = false

const once = (fn) => {
  let loaded = false
  return function () {
    if (!loaded) {
      fn.apply({}, arguments)
      loaded = true
    }
  }
}

const injectOnce = once(inject)

function getVue2BaseVue() {
  // Nuxt (Vue 2)
  let Vue = window.$nuxt?.$root?.constructor
  if (Vue) {
    while (Vue.super) Vue = Vue.super
    return Vue
  }

  // Global Vue (Vue 2 CDN)
  if (window.Vue?.config) return window.Vue

  // Scan DOM for Vue 2 instances
  try {
    const walker = document.createTreeWalker(
      document.documentElement,
      NodeFilter.SHOW_ELEMENT
    )
    let node = walker.currentNode
    while (node) {
      const vm = node.__vue__
      if (vm) {
        Vue = Object.getPrototypeOf(vm).constructor
        while (Vue.super) Vue = Vue.super
        return Vue
      }
      node = walker.nextNode()
    }
  } catch (_) {
    // Ignore
  }

  return null
}

function tryInitVue2() {
  const hook = window.__VUE_DEVTOOLS_GLOBAL_HOOK__
  if (!hook?.emit) return false

  const Vue = getVue2BaseVue()
  if (!Vue) return false

  // Let legacy scan include root instances.
  if (Vue.config) Vue.config.devtools = true
  hook.emit('init', Vue)
  return true
}

function tryInitVue3() {
  const hook = window.__VUE_DEVTOOLS_GLOBAL_HOOK__
  if (!hook?.emit) return false

  try {
    const apps = new Set()
    const walker = document.createTreeWalker(
      document.documentElement,
      NodeFilter.SHOW_ELEMENT
    )
    let node = walker.currentNode
    while (node) {
      const app = node.__vue_app__
      if (app) apps.add(app)
      node = walker.nextNode()
    }

    if (apps.size) {
      for (const app of apps) {
        hook.emit('app:init', app, app.version, {})
      }
      return true
    }
  } catch (_) {
    // Ignore
  }

  return false
}

function tryInitExistingApps() {
  tryInitVue2()
  tryInitVue3()
}

function inject(scriptContent) {
  if (!contentWindow || !contentWindow.document) {
    console.error('ContentWindow is not ready')
    return
  }

  // 确保 document 已经完全加载
  const doc = contentWindow.document

  // 如果 body 还不存在，等待 DOM 加载
  if (!doc.body) {
    if (doc.readyState === 'loading') {
      doc.addEventListener('DOMContentLoaded', () => inject(scriptContent))
      return
    } else {
      // 手动创建 body
      doc.body = doc.createElement('body')
      doc.documentElement.appendChild(doc.body)
    }
  }

  const div = doc.createElement('div')
  div.setAttribute('id', 'app')
  doc.body.appendChild(div)

  const script = doc.createElement('script')
  script.text = scriptContent
  doc.body.appendChild(script)
}

function createFloatingContainer(options = {}) {
  const container = document.createElement('div')
  container.id = 'vue-devtools-standalone'

  // 默认样式
  const defaultStyle = {
    position: 'fixed',
    left: '0',
    right: '0',
    bottom: '0',
    width: '100vw',
    height: '50vh',
    zIndex: '999999',
    backgroundColor: '#fff',
    boxShadow: '0 4px 20px rgba(0, 0, 0, 0.3)',
    borderRadius: '12px 12px 0 0',
    display: 'none',
    flexDirection: 'column',
    overflow: 'hidden'
  }

  // 应用样式
  Object.assign(container.style, defaultStyle, options.containerStyle || {})

  // 创建标题栏
  const header = document.createElement('div')
  header.style.cssText = `
    padding: 10px 15px;
    background: linear-gradient(135deg, #42b883 0%, #35495e 100%);
    color: white;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
    font-size: 14px;
    font-weight: 600;
    display: flex;
    justify-content: space-between;
    align-items: center;
    cursor: move;
    user-select: none;
  `
  header.innerHTML = `
    <span>Vue DevTools</span>
    <div style="display: flex; gap: 10px;">
      <button id="vue-devtools-minimize" style="
        background: rgba(255,255,255,0.2);
        border: none;
        color: white;
        width: 24px;
        height: 24px;
        border-radius: 4px;
        cursor: pointer;
        font-size: 16px;
        line-height: 1;
        padding: 0;
      ">−</button>
      <button id="vue-devtools-close" style="
        background: rgba(255,255,255,0.2);
        border: none;
        color: white;
        width: 24px;
        height: 24px;
        border-radius: 4px;
        cursor: pointer;
        font-size: 16px;
        line-height: 1;
        padding: 0;
      ">×</button>
    </div>
  `

  container.appendChild(header)

  // 创建 iframe 容器
  const iframeWrapper = document.createElement('div')
  iframeWrapper.style.cssText = 'flex: 1; position: relative; overflow: hidden;'

  const iframe = document.createElement('iframe')
  iframe.id = 'vue-devtools-iframe'
  iframe.style.cssText = 'width: 105%; height: 105%; border: none;'
  iframe.__vdevtools__injected = true

  iframeWrapper.appendChild(iframe)
  container.appendChild(iframeWrapper)

  // 实现拖拽功能
  let isDragging = false
  let currentX
  let currentY
  let initialX
  let initialY

  header.addEventListener('mousedown', (e) => {
    if (e.target.tagName !== 'BUTTON') {
      isDragging = true
      initialX =
        e.clientX -
        (parseInt(container.style.right)
          ? window.innerWidth - parseInt(container.style.right) - container.offsetWidth
          : 0)
      initialY =
        e.clientY -
        (parseInt(container.style.bottom)
          ? window.innerHeight - parseInt(container.style.bottom) - container.offsetHeight
          : 0)
    }
  })

  document.addEventListener('mousemove', (e) => {
    if (isDragging) {
      e.preventDefault()
      currentX = e.clientX - initialX
      currentY = e.clientY - initialY

      container.style.left = currentX + 'px'
      container.style.top = currentY + 'px'
      container.style.right = 'auto'
      container.style.bottom = 'auto'
    }
  })

  document.addEventListener('mouseup', () => {
    isDragging = false
  })

  return { container, iframe }
}

function createEmbeddedContainer(options = {}) {
  const container = document.createElement('div')
  container.id = 'vue-devtools-standalone'

  const defaultStyle = {
    position: 'relative',
    width: '100%',
    height: '100%',
    backgroundColor: '#fff',
    overflow: 'hidden'
  }

  Object.assign(container.style, defaultStyle, options.containerStyle || {})

  const iframe = document.createElement('iframe')
  iframe.id = 'vue-devtools-iframe'
  iframe.style.cssText = 'width: 100%; height: 100%; border: none; display: block;'
  iframe.__vdevtools__injected = true

  container.appendChild(iframe)

  return { container, iframe }
}

function createToggleButton(options = {}) {
  const button = document.createElement('button')
  button.id = 'vue-devtools-toggle'
  button.innerHTML = '🔧'

  const defaultStyle = {
    position: 'fixed',
    right: '20px',
    bottom: '20px',
    width: '50px',
    height: '50px',
    borderRadius: '50%',
    border: 'none',
    background: 'linear-gradient(135deg, #42b883 0%, #35495e 100%)',
    color: 'white',
    fontSize: '24px',
    cursor: 'pointer',
    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.3)',
    zIndex: '999998',
    transition: 'transform 0.2s, box-shadow 0.2s',
    outline: 'none'
  }

  Object.assign(button.style, defaultStyle, options.buttonStyle || {})

  button.addEventListener('mouseenter', () => {
    button.style.transform = 'scale(1.1)'
    button.style.boxShadow = '0 6px 16px rgba(0, 0, 0, 0.4)'
  })

  button.addEventListener('mouseleave', () => {
    button.style.transform = 'scale(1)'
    button.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.3)'
  })

  return button
}

export function createVueDevtools(options = {}) {
  const hasTarget = !!options.target
  const target = options.target || document.body
  const showButton = !hasTarget && options.showButton !== false
  const autoShow = !hasTarget && options.autoShow === true

  const { container, iframe } = hasTarget
    ? createEmbeddedContainer(options)
    : createFloatingContainer(options)
  containerElement = container
  target.appendChild(container)

  const initBackendAndInject = () => {
    contentWindow = iframe.contentWindow
    if (!contentWindow) {
      console.error('Failed to get iframe contentWindow')
      return
    }

    be.initBackendWithTargetWindow(window, contentWindow)
    setTimeout(() => {
      injectOnce(injectString)
    }, 100)

    // Support "load devtools after the page is already running".
    tryInitExistingApps()
    setTimeout(tryInitExistingApps, 500)
    setTimeout(tryInitExistingApps, 2000)
  }

  if (iframe.contentWindow && iframe.contentWindow.document.readyState === 'complete') {
    initBackendAndInject()
  } else {
    iframe.onload = initBackendAndInject
  }

  let toggleButton = null
  if (showButton) {
    toggleButton = createToggleButton(options)
    target.appendChild(toggleButton)

    toggleButton.addEventListener('click', () => {
      if (isVisible) hide()
      else show()
    })
  }

  if (!hasTarget) {
    setTimeout(() => {
      const closeBtn = container.querySelector('#vue-devtools-close')
      const minimizeBtn = container.querySelector('#vue-devtools-minimize')
      if (closeBtn) closeBtn.addEventListener('click', hide)
      if (minimizeBtn) minimizeBtn.addEventListener('click', hide)
    }, 100)
  } else {
    isVisible = true
  }

  if (autoShow) {
    setTimeout(() => show(), 200)
  }

  function show() {
    if (containerElement) {
      containerElement.style.display = 'flex'
      isVisible = true
      if (toggleButton) toggleButton.style.display = 'none'
    }
  }

  function hide() {
    if (containerElement) {
      containerElement.style.display = 'none'
      isVisible = false
      if (toggleButton) toggleButton.style.display = 'block'
    }
  }

  function destroy() {
    if (containerElement) {
      containerElement.remove()
      containerElement = null
    }
    if (toggleButton) {
      toggleButton.remove()
      toggleButton = null
    }
    contentWindow = null
    isVisible = false
  }

  function toggle() {
    if (isVisible) hide()
    else show()
  }

  return {
    show,
    hide,
    toggle,
    destroy,
    get isVisible() {
      return isVisible
    }
  }
}

export default {
  createVueDevtools,
  initPlugin: createVueDevtools
}

