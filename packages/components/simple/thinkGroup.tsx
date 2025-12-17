import { defineComponent } from 'vue';
import { SKIP, visitParents } from 'unist-util-visit-parents';
export function MergeThinkRehype(options) {
  const settings = options;
  const emptyClasses = '';
  return function (tree, file) {
    visitParents(tree, 'element', function (element, parents) {
      console.log('element', element, parents);
      let parent = parents[parents.length - 1];
      let scope = element;

      return SKIP;
    });
  };
}

const createThinkGroup = () => {
  return {
    type: 'thinkGroup',
    children: [],
    data: {
      hProperties: {
        loading: false,
        className: 'thinkGroupClass'
      },
      hName: 'thinkGroup',
      value: '',
      loading: true
    }
  };
};

const getRealNode = (node) => {
  return node;
};

export function MergeThinkRemark() {
  let isGroup = false;
  return (tree) => {
    visitParents(tree, 'thinkFlow', (node, parents) => {
      if (parents[0].type !== 'root') {
        return;
      }
      let scope = node;

      const rootParents = parents[0];
      if (node.type === 'thinkFlow' && !isGroup) {
        isGroup = true;
        const thinkGroup = createThinkGroup();
        const thinkGroupEle = getRealNode(thinkGroup);
        thinkGroupEle.children.push(scope);
        const index = rootParents.children.indexOf(scope);
        rootParents.children.splice(index, 1, thinkGroup);
        return SKIP;
      } else if (isGroup) {
        const thinkGroup = rootParents.children.find(
          (n) => n.type === 'thinkGroup'
        );
        if (!thinkGroup) return SKIP;

        const thinkGroupEle = getRealNode(thinkGroup);
        thinkGroupEle.children.push(scope);
        const index = rootParents.children.indexOf(scope);
        rootParents.children.splice(index, 1, {
          type: 'element',
          meta: {},
          value: '',
          tagName: 'div',
          properties: {},
          children: []
        });
      }
    });
  };
}

const thinkElement = defineComponent({
  props: [],
  setup(props, { slots, attrs }) {
    return () => {
      console.log('thinkElement_attrs', attrs);
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

export const thinkGroupElementt = defineComponent({
  name: 'thinkGroupElementt',
  props: [],
  setup(props, { slots, attrs }) {
    return () => {
      console.log('thinkGroupElementt', attrs);
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

export default thinkElement;
