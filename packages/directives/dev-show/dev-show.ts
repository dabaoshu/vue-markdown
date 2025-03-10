import { Directive, DirectiveBinding, VNode } from 'vue';

interface DevConfig {
  [key: string]: any;
}

interface DevConfigOptions {
  path: string;
  key?: string;
}

// 从localStorage获取配置
function getDevConfig(key: string): DevConfig {
  try {
    const config = localStorage.getItem(key);
    return config ? JSON.parse(config) : {};
  } catch (error) {
    console.warn(`Failed to parse ${key} from localStorage:`, error);
    return {};
  }
}

// 获取嵌套对象的值
function getNestedValue(obj: any, path: string): any {
  return path.split('.').reduce((acc, part) => {
    return acc && acc[part] !== undefined ? acc[part] : undefined;
  }, obj);
}

// 规范化指令值
function normalizeValue(value: string | DevConfigOptions): DevConfigOptions {
  if (typeof value === 'string') {
    return { path: value, key: 'devConfig' };
  }
  return { key: 'devConfig', ...value };
}

export const devShowDirective: Directive = {
  mounted(el: HTMLElement, binding: DirectiveBinding) {
    const options = normalizeValue(binding.value);
    const { key, path } = options;
    // 创建注释节点作为占位符
    const comment = document.createComment('v-dev-show');
    (el as any)._devConfig_comment = comment;
    (el as any)._devConfig_parent = el.parentNode;

    // 初始检查
    const config = getDevConfig(key);
    const value = getNestedValue(config, path);
    if (value !== true) {
      el.parentNode?.replaceChild(comment, el);
    }

    // 监听 storage 事件
    const handleStorageChange = (event: StorageEvent) => {
      if (event.key === key) {
        const newConfig = event.newValue ? JSON.parse(event.newValue) : {};
        const newValue = getNestedValue(newConfig, path);
        const parent = (el as any)._devConfig_parent;
        const comment = (el as any)._devConfig_comment;

        if (parent) {
          if (newValue === true) {
            if (el.parentNode !== parent) {
              parent.replaceChild(el, comment);
            }
          } else {
            if (el.parentNode === parent) {
              parent.replaceChild(comment, el);
            }
          }
        }
      }
    };

    window.addEventListener('storage', handleStorageChange);

    // 存储清理函数
    (el as any)._devConfig_cleanup = () => {
      window.removeEventListener('storage', handleStorageChange);
    };
  },

  updated(el: HTMLElement, binding: DirectiveBinding) {
    if (binding.value !== binding.oldValue) {
      const options = normalizeValue(binding.value);
      const { path, key } = options;
      const config = getDevConfig(key);
      const value = getNestedValue(config, path);
      const parent = (el as any)._devConfig_parent;
      const comment = (el as any)._devConfig_comment;

      if (parent) {
        if (value === true) {
          if (el.parentNode !== parent) {
            parent.replaceChild(el, comment);
          }
        } else {
          if (el.parentNode === parent) {
            parent.replaceChild(comment, el);
          }
        }
      }
    }
  },

  beforeUnmount(el: HTMLElement) {
    // 清理事件监听
    if ((el as any)._devConfig_cleanup) {
      (el as any)._devConfig_cleanup();
    }

    // 恢复原始元素（如果被注释节点替换了）
    const parent = (el as any)._devConfig_parent;
    const comment = (el as any)._devConfig_comment;
    if (parent && comment.parentNode === parent) {
      parent.replaceChild(el, comment);
    }
  }
};
