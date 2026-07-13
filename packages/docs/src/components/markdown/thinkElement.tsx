import { defineComponent } from 'vue';

/**
 * 单个 think 块渲染组件（Demo 业务 UI，对应 remarkThink 解析节点）。
 */
const ThinkElement = defineComponent({
  name: 'ThinkElement',
  props: [],
  setup(_props, { slots, attrs }) {
    return () => {
      const pProps = attrs;
      return (
        <div
          {...pProps}
          class={'markdown-think'}
          style={{ marginBottom: '0.5rem', border: '1px solid red' }}
        >
          {slots.default && slots.default()}
        </div>
      );
    };
  }
});

/**
 * 连续 thinkFlow 合并后的 thinkGroup 容器组件（Demo 业务 UI）。
 */
export const thinkGroupElementt = defineComponent({
  name: 'thinkGroupElementt',
  props: [],
  setup(_props, { slots, attrs }) {
    return () => {
      const pProps = attrs;
      return (
        <div {...pProps} class={'thinkGroupElementt'}>
          <div>这是thinkGroupElementt</div>
          <div style={{ marginBottom: '0.5rem', border: '1px solid red' }}>
            子元素 :{slots.default && slots.default()}
          </div>
        </div>
      );
    };
  }
});

export default ThinkElement;
