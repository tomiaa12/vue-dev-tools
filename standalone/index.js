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

function createContainer(options = {}) {
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
  const target = options.target || document.body
  const showButton = options.showButton !== false
  const autoShow = options.autoShow === true

  const { container, iframe } = createContainer(options)
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

  setTimeout(() => {
    const closeBtn = container.querySelector('#vue-devtools-close')
    const minimizeBtn = container.querySelector('#vue-devtools-minimize')
    if (closeBtn) closeBtn.addEventListener('click', hide)
    if (minimizeBtn) minimizeBtn.addEventListener('click', hide)
  }, 100)

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

