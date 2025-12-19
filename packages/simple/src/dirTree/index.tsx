import { Component, createVNode, defineComponent, PropType } from 'vue';
import styles from './index.module.scss';

type BreadcrumbItem = {
  name: string;
  key: string;
};

export const Breadcrumb = defineComponent({
  name: 'Breadcrumb',
  props: {
    items: {
      type: Array as PropType<BreadcrumbItem[]>,
      required: true
    },
    /**
     * 点击面包屑项的回调函数
     */
    onChange: {
      type: Function as PropType<
        (
          item: BreadcrumbItem,
          key: string,
          path: string[],
          index: number
        ) => void
      >,
      required: false
    },
    separator: {
      type: String as PropType<string>,
      required: false
    }
  },
  setup(props, { slots }) {
    // 处理面包屑项点击事件
    const handleClick = (index: number) => {
      if (props.onChange) {
        // 截取从开始到当前点击项的路径
        const items = props.items.slice(0, index + 1);
        props.onChange(
          items[index],
          items[index].key,
          items.map((item) => item.key),
          index
        );
      }
    };

    return () => {
      const items = props.items;
      let SeparatorIcon: any = '-';
      if (typeof props.separator === 'string') {
        SeparatorIcon = props.separator;
      } else if (slots.separatorIcon) {
        SeparatorIcon = slots.separatorIcon();
      }
      return (
        <div class={styles['breadcrumb_container']}>
          <ul class={styles['breadcrumb']}>
            {items.map((item, index) => (
              <li
                key={index}
                class={[styles['breadcrumb_item']]}
                onClick={() => handleClick(index)}
              >
                <span
                  class={[
                    styles['breadcrumb_item_name'],
                    { [styles['active']]: index === items.length - 1 }
                  ]}
                >
                  {item.name}
                </span>
                {index < items.length - 1 && (
                  <span class={styles['breadcrumb_separator']}>
                    {SeparatorIcon}
                  </span>
                )}
              </li>
            ))}
          </ul>
        </div>
      );
    };
  }
});
