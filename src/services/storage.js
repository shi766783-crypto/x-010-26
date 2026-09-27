// localStorage 通用封装：按命名空间隔离，统一异常处理与序列化
const PREFIX = 'family-travel-manager'

export function createStorage(namespace) {
  const key = `${PREFIX}:${namespace}`
  return {
    read(fallback = null) {
      try {
        const raw = localStorage.getItem(key)
        return raw == null ? fallback : JSON.parse(raw)
      } catch (error) {
        console.error(`[storage] 读取 ${key} 失败`, error)
        return fallback
      }
    },
    // 返回是否写入成功：配额超限等失败场景由调用方决定如何提示，不能静默吞掉
    write(value) {
      try {
        localStorage.setItem(key, JSON.stringify(value))
        return true
      } catch (error) {
        console.error(`[storage] 写入 ${key} 失败`, error)
        return false
      }
    },
    remove() {
      localStorage.removeItem(key)
    },
  }
}

export const planStorage = createStorage('plans')
