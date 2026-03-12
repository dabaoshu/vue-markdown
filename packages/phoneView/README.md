# phoneView 手机端证件照模块

基于 `Vue 3`、`Vant 4` 封装的一套手机端证件照生成流程，可作为子应用嵌入到现有项目中使用。

## 运行与调试

在项目根目录执行：

```bash
pnpm dev --filter phoneView
```

将会启动一个手机端单页，地址默认为 `http://localhost:8002`。

## 对外使用方式

### 1. 作为路由页面集成

打包后，可以在宿主项目中按如下方式使用：

```ts
import { PhotoIdFlow } from 'phone-view';

const routes = [
  {
    path: '/phone/photo-id',
    component: PhotoIdFlow
  }
];
```

### 2. 使用工具方法与状态

```ts
import { usePhotoStore } from 'phone-view';

const store = usePhotoStore();
// 可以读取当前已上传的照片、选中状态以及参数信息
console.log(store.items.value, store.currentParams.value);
```

### 3. 以独立入口挂载

```ts
import { mountPhoneView } from 'phone-view';

mountPhoneView(document.getElementById('app')!);
```

上述方式会在指定容器中挂载完整的证件照流程界面。

