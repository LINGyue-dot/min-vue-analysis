# min-vue

## 全流程

![img](https://ustbhuangyi.github.io/vue-analysis/assets/mind.png)





## 总共的几个问题

1. vnode 如何渲染到真实 dom
2. 



## 前置



* 响应式
* 生命周期
* 几个 api













## 响应式

### 2.x

`defineProperty` 基本使用

```js
      // 模拟数据
      let data = {
        msg: '123',
      };
      // 模拟 vue 实例
      let vm = {};
      Object.defineProperty(vm, 'msg', {
        get() {
          return data.msg;
        },
        set(t) {
          data.msg = t;
          document.querySelector('#container').textContent = data.msg;
        },
      });
      // 触发响应式
      vm.msg = 'init';
```

`defineProperty` 使得多属性为响应式

```js
      // 模拟数据
      let data = {
        msg: '123',
        age: 123,
      };
      // 模拟 vue 实例
      let vm = {};

      Object.keys(data).forEach((key) => {
        Object.defineProperty(vm, key, {
          get() {
            return data[key];
          },
          set(newVal) {
            data[key] = newVal;
            document.querySelector('#container').textContent = data[key];
          },
        });
      });
      // 触发响应式
      vm.msg = 'init';
```



### 3.x

`proxy` 

```js
      // vue data
      let data = {
        msg: '',
        age: '',
      };
      // vue instance
      // first proxy
      let vm = new Proxy(data, {
        // target 表示需要代理的对象，这里指的就是 data
        get(target, key) {
          return target[key];
        },
        set(target, key, newVal) {
          target[key] = newVal;
          console.log(newVal);
          document.querySelector('#con').textContent = target[key];
        },
      });

      // 触发更新
      vm.msg = 'helllo';
```







## 事件流 eventbus

核心思想本质上就是利用 `map` 来存储事件名和回调函数，在 `addListener` 中添加回调事件以及类型到 `map` 中，在 `emit` 中执行相应的回调函数

### 核心

```js
class EventEmitter {
  constructor() {
    this._events = this._events || new Map(); // 事件
    this._maxListeners = this._maxListeners || 10; // 监听上限
  }
}
// where this point in prototype
// this point itself in prototype
EventEmitter.prototype.emit = function (type, ...args) {
  let handler;
  handler = this._events.get(type);
  handler.apply(this, args);
  return true;
};

EventEmitter.prototype.addListener = function (type, fn) {
  if (!this._events.get(type)) {
    this._events.set(type, fn);
  }
};
```

测试

```js
emitter.addListener('add', (item) => {
  console.log('add  ' + item);
});

emitter.emit('add', 'some food');
```



### 完善

对于同一事件目前只能一个回调函数，这里改进为可以多个回调函数执行：利用数组来存储回调函数

同时监听器也得有销毁监听器功能

```js
class EventEmitter {
  constructor() {
    this._events = this._events || new Map(); // 事件
    this._maxListeners = this._maxListeners || 10; // 监听上限
  }
}
// where this point in prototype
// this point itself in prototype
EventEmitter.prototype.emit = function (type, ...args) {
  let handlers;
  handlers = this._events.get(type);
  handlers.forEach((fn) => {
    fn.apply(this, args);
  });
  return true;
};

EventEmitter.prototype.addListener = function (type, fn) {
  if (!this._events.get(type)) {
    let cbs = [fn];
    this._events.set(type, cbs);
  } else {
    let cbs = this._events.get(type);
    cbs.push(fn);
    this._events.set(type, cbs);
  }
};

EventEmitter.prototype.removeListener = function (type, fn) {
  if (!this._events.get(type)) {
    return;
  }
  let cbs = this._events.get(type);
  let index = cbs.indexOf(fn);

  cbs.splice(index, 1);
};

const emitter = new EventEmitter();

```

test

```js
// test
function fn(it) {
  console.log('also eat ' + it);
}
emitter.addListener('add', fn);

emitter.removeListener('add', fn);
emitter.addListener('add', (item) => {
  console.log('add  ' + item);
});

emitter.emit('add', 'some food');
```





## vdom and diff

目的是仿写一个 `snabbdom` ， vue 的响应式中的 diff 算法也是如此 



### vdom 是什么

```html
<div class="container">
  <p>哈哈</p>
  <ul class="list">
    <li>1</li>
    <li>2</li>
  </ul>
</div>
```

```js
{ 
  // 选择器
  "sel": "div",
  // 数据
  "data": {
    "class": { "container": true }
  },
  // DOM
  "elm": undefined,
  // 和 Vue :key 一样是一种优化
  "key": undefined,
  // 子节点
  "children": [
    {
      "elm": undefined,
      "key": undefined,
      "sel": "p",
      "data": { "text": "哈哈" }
    },
    {
      "elm": undefined,
      "key": undefined,
      "sel": "ul",
      "data": {
        "class": { "list": true }
      },
      "children": [
        {
          "elm": undefined,
          "key": undefined,
          "sel": "li",
          "data": {
            "text": "1"
          },
          "children": undefined
        },
        {
          "elm": undefined,
          "key": undefined,
          "sel": "li",
          "data": {
            "text": "1"
          },
          "children": undefined
        }
      ]
    }
  ]
}
```

简单来说，每个 tag 都被转换为一下的数据结构

```js
{
	"sel":"div", // 选择器
    "data":{ // 携带的数据
		class:{"container":true}
    },
    "text":"hello", // textContent
    "elm":undefined, // 实际的 dom
    "key":undefined // 优化作用
    children:[{"相同结构"}]
}
```

之所以需要 vdom 一个是为了复杂项目中提高 dom 操作性能，一个是为了跨平台例如 Weex Node 等，其他平台下的渲染底层不同，所以转为 vdom 后可以自选渲染方法



### 核心思想

核心就2个东西

1. 将真实 dom 转为虚拟dom即写一个可以生成虚拟节点的函数
2. diff 算法对比2个虚拟 dom 并根据需要更新真实 dom



2个 vNode 进行比较的流程

1. oldVnode 是否是虚拟节点，如果不是转为虚拟节点再往下走
2. 两者的 `sel` `key` 是否相同，如果不同删除旧节点插入新的节点
3. 两者是否是同一对象，如是不操作
4. 两者是否具有 `text` ，是否相同，不相同的话直接使用 `textContent` 进行替换 `text`
5. 如果 oldVnode 没有 `children` ，直接将 newVnode 的 `children` 赋给他？？
6. 如果都有 ` children` 那么使用 `diff` 进行比较 





### diff

最核心的东西就是 diff 算法

diff 算法首先遵循的规则

1. 只进行同层节点的比较
2. 如果新旧节点不同，那么将原来节点以及他的全部子节点全部去除，替换成新的
3. 通过 key 来指定那些元素是相同的



diff 算法采用4指针，即新节点列表的头指针、尾指针，旧节点列表的头指针、尾指针

![image-20211014183909032](http://120.27.242.14:9900/uploads/upload_ff124e71fb3ffac67f73d0e46d5326d4.png)

diff 的条件当旧前、旧后、新前、新后四个指针的有存在相等的情况时候这2指针各自移动

```js
while(旧前<=旧后&&新前<=新后){
    // 
}
```

如果双方存在头尾指针超过即结束

比较策略

1. 新前和旧前
2. 新后和旧后
3. 新后和旧前
4. 新前和旧后



那么 diff 最终还是对节点进行新添、复用（包括移动）、删除三种操作



#### 添加的情况

当旧节点先遍历完成，说明新前和新后直接的节点就是需要新添的节点



#### 删除的情况

当新节点先遍历完成，说明旧节点需要进行删除，即需要将旧前和旧后之间的节点删除



#### 移动

1. 当触发第四种策略即新前和旧后，将旧后的节点移到旧前之前，并将原来的位置置为 undefined
2. 当触发第三种策略即新后和旧前，就将旧前移动到就旧后之后，并将原来位置置为 undefined





#### 特殊情况（移动）

不断遍历当四种策略都无法满足时候（如下），此时只能通过循环去旧节点中查找，若找到该节点，就将此节点设为 undfined ，然后再进行遍历，最终删除旧前和旧后之间的节点

<img src="C:\Users\16356\AppData\Roaming\Typora\typora-user-images\image-20211014185723553.png" alt="image-20211014185723553" style="zoom:50%;" />

那么此时寻找旧中是否有新前的节点，如果有就将其插入到旧前之前，没有的话就新建节点插入到旧前之前

#### 





### 主要函数	

* `patch()` 传入2个 dom 进行比较操作，核心入口函数
* `patchVnode()` 在 `patch()` 函数中调用用于进行2虚拟节点的比较 

#### patch()

进行流程中的 1 2 ，转换虚拟节点以及是否同一虚拟节点

如果是同一虚拟节点那么将剩下逻辑交给 `patchVnode()`

```js
/**
 * 根据传入的2个 node 进行更新操作，修改的最终都是在 oldVnode 上，newVnode 只是用于参考作用，所以最终 return 时候需要将值重新赋值给 newVnode
 * @param {*} oldVnode
 * @param {*} newVnode
 * @returns
 */
export function patch(oldVnode, newVnode) {
  if (!oldVnode.sel) {
    // 不是 vdom 转为 vdom
    oldVnode = turntoVnode(oldVnode);
  }
  if (!sameVnode(oldVnode, newVnode)) {
    // 如果 key 和 sel 不同直接替换该元素，即生成新的 dom 元素替换他
    // 不同虚拟节点直接替换整个
    const parent = oldVnode.elm.parentNode;
    const newELm = createElm(newVnode);
    // 修改真实 dom
    parent.insertBefore(newELm, oldVnode.elm);
    parent.removeChild(oldVnode.elm);
    oldVnode.elm = newELm;
  } else {
    // 同一虚拟节点
    patchVnode(oldVnode, newVnode);
  }
  newVnode = oldVnode;
  return newVnode;
}

```



#### patchVnode(ov,nv)

进行 345 流程

```js

/**
 * 同一虚拟节点进行判断更新操作
 * 通过 newVnode 的数据修改 oldVnode 的数据
 * @param {*} oldVnode
 * @param {*} newVnode
 */
export default function patchVnode(oldVnode, newVnode) {
  if (oldVnode === newVnode) {
    return;
  }
  // text 不相同
  if (oldVnode.text && oldVnode.text !== newVnode.text) {
    console.log('text different');
    oldVnode.elm.textContent = newVnode.text;
  } // 这里没考虑 children 和 text 同时存在的情况
  // children 进行 diff
  else if (oldVnode.children && newVnode.children) {
    // 两者都有 children 时候，进行 diff
    updateChildren(oldVnode.elm, oldVnode.children, newVnode.children);
  } else {
    // 有一方没有 children
    if (!newVnode.children && oldVnode.children) {
      // 新节点没有 children
      oldVnode.elm.innerHTML = '';
    } else if (!oldVnode.children && newVnode.children) {
      // 旧节点没有 children 时候
      // 生成新节点
      newVnode.children.forEach((child) => {
        let node = createElm(child);
        oldVnode.elm.appendChild(node);
      });
    }
  }
  newVnode.elm = oldVnode.elm;
}

```





#### updateChildren

 核心 diff 算法

```js
export default function updateChildren(parentElm, oldList, newList) {
  // 四指针
  let oldFront = 0;
  let oldBack = oldList.length - 1;
  let newFront = 0;
  let newBack = newList.length - 1;

  while (oldBack >= oldFront && newBack >= newFront) {
    // 清楚 undefined 保证执行四种策略

    if (oldList[oldFront] === undefined) {
      oldFront++;
    } else if (oldList[oldBack] === undefined) {
      oldBack--;
    }
    // 四种策略
    else if (sameVnode(newList[newFront], oldList[oldFront])) {
      console.log('plan 1');
      // 同一虚拟节点，更新内部
      patchVnode(oldList[oldFront], newList[newFront]);
      newFront++;
      oldFront++;
    } else if (sameVnode(newList[newBack], oldList[oldBack])) {
      console.log('plan 2');

      patchVnode(oldList[oldBack], newList[newBack]);
      newBack--;
      oldBack--;
    } else if (sameVnode(newList[newBack], oldList[oldFront])) {
      console.log('plan 3');

      // 第三种情况 旧前移动到旧后之后
      patchVnode(oldList[oldFront], newList[newBack]);

      parentElm.insertBefore(
        oldList[oldFront].elm,
        oldList[oldBack].elm.nextSibling
      );

      newBack--;
      oldFront++;
    } else if (sameVnode(newList[newFront], oldList[oldBack])) {
      console.log('plan 4');

      // 第四种情况 旧后移动到旧前之前
      patchVnode(oldList[oldBack], newList[newFront]);
      console.log(oldList);
      console.log(oldList[oldBack], oldList[oldFront]);
      parentElm.insertBefore(oldList[oldBack].elm, oldList[oldFront].elm);
      newFront++;
      oldBack--;
    } else {
      console.log('other plan 四种策略都没有命中');

      // 四种策略都没有命中

      // 遍历查找是否存在相同节点
      let i = oldFront + 1;
      for (; i <= oldBack; i++) {
        if (sameVnode(oldList[i], newList[newFront])) {
          patchVnode(oldList[i], newList[newFront]);
          // 移动节点 等同与于第三种情况
          parentElm.insertBefore(oldList[i].elm, oldList[oldFront].elm);
          // 置空
          oldList[i] = undefined;
          newFront++;
          break;
        }
      }
      // 没有找到节点 新添加节点
      if (i > oldBack) {
        const tempNode = createElm(newList[newFront]);
        parentElm.insertBefore(tempNode, oldList[oldFront].elm);
        newFront++;
      }
    }
  }

  // 出循环，进行添加或者删除操作
  if (oldFront <= oldBack) {
    // 新节点先遍历完，删除节点
    for (let i = oldFront; i <= oldBack; i++) {
      if (!oldList[i]) continue;
      parentElm.removeChild(oldList[i].elm);
    }
  } else if (newFront <= newBack) {
    // 旧节点先遍历完，新增节点
    for (let i = newFront; i <= newBack; i++) {
      const tempNode = createElm(newList[i]);
      parentElm.appendChild(tempNode);
    }
  }
}

```







### 工具函数

* `sameVnode` `patch()` 的第一步通过 `sel` `key ` 判断是否同一虚拟节点

* `createElm` 通过传入的 vNode 来生成真实的 dom 节点，children 节点利用递归生成真实的 dom 节点









# [剖析 Vue.js 内部运行机制](https://juejin.cn/book/6844733705089449991)

## 整体流程

<img src="http://120.27.242.14:9900/uploads/upload_62b31f7e27705827a7c841281f3dce30.png" alt="image-20211015152801313" style="zoom: 67%;" />

## 1. Vue.js 运行机制全局概览

1. 首先 `inti` 中就进进行生命周期 props methods watch computed 等的初始化，同时进行 **为对象设置响应式** 即 `Object.defineProperty` 设置 `getter` 和 `setter` 函数，这2函数用来实现 **[响应式]** **[依赖收集]**
2. 接下来调用 `$mount` 挂载，如果是运行时编译，即不存在 render function 但是存在 template 时候，需要 **[编译]** ???
3. 接下来 **[编译]** ，与编译 JS 代码一致，进行三个步骤 `parse` `optimize` `generate` 
   1. `parse` ：利用正则解析模板中的指令、class、style 等，形成 AST
   2. `optimize` ：主要是标记 static 静态节点，这是一个优化影响后面的 `patch` 更新操作
   3. `generate` ：将 AST 代码转换为 render function 字符串的过程，得到 render 的字符串 ???
4. 经过 **[编译]** 之后，组件中就存在渲染 VNode 所需要的 render function
5. 剩下的就是响应式核心内容（`setter` -> `watcher` -> `update`  ->  `patch(diff)` ->  `视图更新`）
   1. 当 render function 被渲染时候，因为要读取需要的对象的值，所以就会触发 `getter` 函数进行 **[依赖收集]** ， **[依赖收集]** 目的是将观察者 Wacther 对象存在在订阅者 Dep 的 subs 中。???
   2. 修改对象的值的时候，就会触发 `setter`  ，`setter` 会通知之前的  **[依赖收集]** 得到的 Dep 中的每个 Watcher ，告诉值改变需要重新渲染视图，这时 Watcher 就会调用 `update` 来更新视图 （其中涉及 diff 算法）



## 3. 响应式中的依赖收集

为什么需要？

我们在利用 `Object.defineProperty` 中的 `setter` ，当 `setter` 一旦触发就触发视图更新，但是此时如果修改一个未被引用（未在视图中起作用）的数据时候，此时就不需要触发视图更新调用 `cb()` 函数

所以 Vuejs 引入 **[依赖收集]**，只有在该数据被视图所使用修改的时候才会触发视图更新，这里引入订阅者 Dep

大致流程即：在 `get` 中将 `watcher` 放入对应的 `Dep` 对象中，在 `set` 中再通知自身 `Dep` 对象的全部 `watcher` 

```js
class Wacther{
    constructor(){
        // watcher 挂载到 Dep.targer 上
        dep.target = this
    }
    // 更新视图
    update(){
        
    }
}

Object.defineProperty(obj,key,{
	get:()=>{
        // 添加 wacther
		dep.addWacther(dep.target)
        return obj[key]
    },
    set:()=>{
        // 通知 dep 中所有 watcher 进行更新 
		dep.notify()
    }
    }
})
```















## temp

* 运行时编译



# Vue@2.x











# Refrence



* https://juejin.cn/post/6990582632270528525#heading-11
* https://juejin.cn/book/6844733816460804104/section/6844733816549048333
* https://ustbhuangyi.github.io/vue-analysis/

