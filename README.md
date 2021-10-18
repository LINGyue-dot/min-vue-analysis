# min-vue

## 全流程

![img](https://ustbhuangyi.github.io/vue-analysis/assets/mind.png)





## 总共的几个问题

1. Vue 是如何将模板渲染成真实 dom
2. vnode 如何渲染到真实 dom
3. nextTick 如何实现，为什么在微任务之后获取到的 dom 就是真实 dom ，按理来说 dom 渲染是在微任务之后，或者 JS 获取的 dom 是真实渲染之后的 dom 还（已解决，转至 剖析 Vuejs 内部运行原理机制的 nexttick 一章）
4. vue 中的 ui 渲染函数是如何的如何保证遇见渲染函数就先执行后在执行微任务和宏任务，还是 JS 事件循环中的执行机制？（基本解决，GUI 线程和 JS 线程互斥）
5. `complier` 生成的 `render` 函数最终在哪调用？
6. 非 production 环境下除了报警 warn 还有什么？



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

`代理` ：即我们本来只能通过 app._data.text 触发响应式，现在我们代理成通过 app.text 触发，本质就是代理提升，将原本需要给 app._data 属性代理直接代理到 app 上 

```js
_proxy.call(this,options.data)
function _proxy(data){
    const that = this
    Object.keys(data).forEach(key=>{
        Object.defineProperty(that,key,{
            get:(){
                return that._data[key]
            },
            set:(val){
                that._data[key] = val
            }
        })
    })
}
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
    constructor(dep){
        // watcher 挂载到 Dep.targer 上
        dep.target = this
    }
    // 更新数据调用 nextTick 中的回调
    update(){
        
    }
    // 调用 patch 函数执行 dom 更新操作
    run(){
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







## 7. 异步更新以及 nextTick

由于异步更新操作需要涉及到 nextTick

### **nextTick**

nextTick 功能：在下次 DOM 更新循环结束之后执行延迟回调。在修改数据之后立即使用这个方法，获取更新后的 DOM。

即 nextTick 可以获取更新后的 dom

Vuejs 中分别使用 `Promise` `setTimout` 等方式创建微任务/宏任务并将 nextTick 中的回调函数放入，在同步函数全部执行完之后才会去执行。即 netxTick 本质上是在微任务/宏任务中执行，在 nextTick 的回调函数数组中原本就存在 ui 渲染函数，后面用户传入的函数都在其之后。也就是说用户传入的回调函数都在 UI 渲染函数之后**。JS 引擎遇到 UI 渲染函数时候会优先执行 UI 渲染函数后再执行微任务/宏任务**。前面这个结论是为什么呢？因为遇见渲染函数之后回去调用 GUI 线程去进行 dom 更新，此时 JS 线程会被冻结，只有 GUI 线程执行之后才会再执行 JS 代码

<img src="http://120.27.242.14:9900/uploads/upload_84575205dc7decc8527316cfcfc5e464.png" alt="image-20211016103535428"  />

```js
let pending = false // 等待标志位
let callbacks = []
function nextTick(cb){
    callbacks.push(cb)
 	    if(!pending){
        pending = true
        // 微任务宏任务
        setTimeout(flushCallbacks,0)
    }
}
// 执行所有回调
function flushCallbacks(){
    pending = false
    callbacks.forEach(fn=>fn())
}
```







### 异步更新

**为什么需要异步更新**

当触发某个事件时候，事件多次修改值，那么此时值一直变化，那么如果修改的同时也一直去渲染视图更新 dom ，资源消耗就非常恐怖

**如何进行异步更新**

 queue 中不能有相同的 watcher ，也就是批量改变数据最终改变视图并渲染也就一次，所以 wacther 对象中需要存储 id 以是否相同 wacther 区分。）

每次触发 `setter` 时候，将对应的 watcher push 到 队列中，队列通过 watcher.id 保证 watcher 中不存在相同 watcher ，队列每添加一个 watcher 后就会触发 nextTick ，nextTick 暂时不执行将其收集到的 watcher 放入数组中，等到 dom 渲染完成之后在执行这些 `watcher.run()` （ nextTick 原理）???

```js
class Watcher{
    constructor(){
        this.id = ++uid
    }
    update(){
        // 触发 nextTick
        console.log(this.id+' update')
        queueWacther(this) // 将自身添加到 queue 中
    }
    run(){
        // 用来触发 patch 即 dom 更新
        patch()
    }
}

let has = {}
let queue = []
let waiting = false // 标志位，表明是否已经向 nextTick 中传递了 flushSchedulerQueue
// watcher queue
function queueWacther(watcher){
    if(has[watcher.id] === null){
        // 说明 queue 中不存在该 wacther
        has[watcher.id] = true
        queue.push(watcher)
        if(!waiting){
            waiting = true
            nextTick(flushSchedulerQueue)
        }
    }
}

// 执行 watcher 队列
function flushSchedulerQueue(){
    let watcher,id
    queue.forEach(item=>{
        watcher = item
        id = item.id
        has[id] = null
        watcher.run()
    })
    waiting = false
}
```



























## temp

* 运行时编译



# Vue@2.x

由于 `runtime only` 涉及到 webpack 的 `vue-loader` 插件所以不好分析，所以下面涉及纯前端的 runtime + complier 的 Vue 即 `srcipts/config.js` 中的 `web-full-esm-browser-prod` 模式

## 类型检查

Vue@2.x 使用的是 flow 进行类型检查

### flow 与 ts

ts 是 ts file 经过编译之后生成原生的 JS 后再进行编译 JS 文件运行代码

flow 是直接写在 js 文件中通过周边 babel 等工具将其去除类型声明



### 为什么 vue@2.x 中使用的是 flow

1. Babel 和 Eslint 都有 Flow 插件以及支持语法，又 Vue@2.x 沿用 Vue@1.x 中的工具链迁移成本高
2. 更加贴近 ES 规范，当不想用 Flow 时候直接使用插件去除







## 整体文件

### src

```text
src
├── compiler        # 编译相关 
├── core            # 核心代码 
├── platforms       # 不同平台的支持
├── server          # 服务端渲染
├── sfc             # .vue 文件解析
├── shared          # 共享代码
```



## 编译



### Runtime Only vs Runtime + Complier

在使用 vue-cli 时候会让我们选择选哪个

Runtime Only：使用该版本时候通常需要借助如 webapck 的 vue-loader 工具将 `.vue` 文件编译成 JS 即编译成 render 函数，因为是在编译阶段就做了这个事情，所以他只包含编译阶段做的，所以只含运行时的 Vue 代码，所以代码会更轻量，此时的编译过程就是离线做的，在客户端上直接运行即可

Runtime + Complier：如果我们没有预编译，且使用了 template 传入了字符串，则需要在客户端编译模板



```js
// 需要 complier
new Vue({
	template: '<div>{{hi}}</div>'
    
})
// 不需要
new Vue({
    render(h){
        return h('div',this.hi)
    }
})
```



## 源码入口

首先我们先找到全局入口的 `import Vue from vue`  这个 vue 在哪

先从 `rollup` 打包的入口打包成的 `runtime + complier` 模式下的入口文件 `src/platforms/web/entry-runtime-with-complier.js`

```js
import Vue from './runtime/index'
// ...
export default Vue
```

`runtime/index` 

```js
import Vue from 'core/index'
// ... 其它配置 检测 devtool 等
// 
```

`cors/index`

```js
import Vue from './instance/index'
import { initGlobalAPI } from './global-api/index'
//...
initGlobalAPI(Vue)

// ... 挂载一些属性
Object.defineProperty(Vue.prototype, '$isServer', {
})
export default Vue

```

`./instance/index`

```js
import { initMixin } from './init'
import { stateMixin } from './state'
import { renderMixin } from './render'
import { eventsMixin } from './events'
import { lifecycleMixin } from './lifecycle'
import { warn } from '../util/index'

function Vue (options) {
  if (process.env.NODE_ENV !== 'production' &&
    !(this instanceof Vue)
  ) {
    warn('Vue is a constructor and should be called with the `new` keyword')
  }
  this._init(options)
}

initMixin(Vue)
stateMixin(Vue)
eventsMixin(Vue)
lifecycleMixin(Vue)
renderMixin(Vue)
export default Vue
```

在看下在 `cors/index` 的 `initGlobalAPI` 

```js
/* @flow */

import config from '../config'
import { initUse } from './use'
import { initMixin } from './mixin'
import { initExtend } from './extend'
import { initAssetRegisters } from './assets'
import { set, del } from '../observer/index'
import { ASSET_TYPES } from 'shared/constants'
import builtInComponents from '../components/index'
import { observe } from 'core/observer/index'

import {
  warn,
  extend,
  nextTick,
  mergeOptions,
  defineReactive
} from '../util/index'

export function initGlobalAPI (Vue: GlobalAPI) {
  // config
  const configDef = {}
  configDef.get = () => config
  Object.defineProperty(Vue, 'config', configDef)

  Vue.util = {
    warn,
    extend,
    mergeOptions,
    defineReactive
  }
  // 挂载属性
  Vue.set = set
  Vue.delete = del
  Vue.nextTick = nextTick

  // 2.6 explicit observable API
  Vue.observable = <T>(obj: T): T => {
    observe(obj)
    return obj
  }

  Vue.options = Object.create(null)
  ASSET_TYPES.forEach(type => {
    Vue.options[type + 's'] = Object.create(null)
  })

  Vue.options._base = Vue
  extend(Vue.options.components, builtInComponents)
  // 
  initUse(Vue)
  initMixin(Vue)
  initExtend(Vue)
  initAssetRegisters(Vue)
}

```

这里就很清楚看到 Vue 本身就只是一个函数只是通过 `init`  等函数去进行一系列操作

这里随便进去一个 `init` 函数观察是如何对 Vue 函数进行处理的

```
/* @flow */

import config from '../config'

let uid = 0

export function initMixin (Vue: Class<Component>) {
  Vue.prototype._init = function (options?: Object) {
   // ... 
   }
}
```

### 总结

`import Vue from 'vue' ` 本质上就是一个 函数通过 `init` 等函数进行对其原型链进行挂载一系列的属性





## 数据驱动



### 是什么

Vue 的核心思想就是数据驱动，即所有修改视图的操作是通过修改数据来进行的，相对于传统前端的 jQuery 等直接操作 dom 大大简化代码量并且逻辑更加清晰

### 核心问题

Vue 是如何将模板渲染成真实 dom

```html
<div id="app">{{message}}</div>
```

```js
new Vue({
    el:'#app',
    data:{
        message:'hello'
    }
})
```



### new Vue 做了什么

上方的 vue 的入口函数

`src/core/instance/index.js` 中 `function Vue` 

```js
import { warn } from '../util/index'

function Vue (options) {
  if (process.env.NODE_ENV !== 'production' &&
    !(this instanceof Vue)
  ) { // 只能通过 new 来调用
    warn('Vue is a constructor and should be called with the `new` keyword')
  }

  this._init(options)
}
// ...
export default Vue
```

#### _init

`_init` 函数在 `src/core/instance/init.js` 中的 `initMixin` 函数中进行定义

```js
  Vue.prototype._init = function (options?: Object) {
	// ...
    // merge options
    // 合并配置
    if (options && options._isComponent) { // 初始化时候不走这
      //... 子 component init
    } else {
      // init merge 
      // merge
    }
    // expose real self
    vm._self = vm;
    initLifecycle(vm); // 初始化生命周期
    initEvents(vm); // 初始化事件
    initRender(vm); // 初始化渲染
    callHook(vm, "beforeCreate"); // 触发生命周期函数
    initInjections(vm); // resolve injections before data/props
    initState(vm); // 初始化数据
    initProvide(vm); // resolve provide after data/props
    callHook(vm, "created");
     
    // 调用 $mount 函数
    if (vm.$options.el) {
      vm.$mount(vm.$options.el);
    }
  };
```



#### 总结

主要进行的就是合并配置、初始化生命周期、触发生命周期钩子函数、初始化事件、初始化渲染、初始化 data props computed watcher 等



### 实例挂载 $mount

#### 是什么

即将 vue 的 template 最终需要渲染到页面的某个地方，这个渲染到某个地方的过程就是挂载???

#### $mount

`src/platforms/web/entry-runtime-with-compiler.js` 中 `runtime  + complier` 下的 `mount` 函数

```js
/* @flow */
// ... import 
const mount = Vue.prototype.$mount; // 获取 runtime only 下的 mounted
Vue.prototype.$mount = function (
  el?: string | Element,
  hydrating?: boolean
): Component {
  el = el && query(el);

  // 限制 el 不能为 html 或者 body tag
  /* istanbul ignore if */
  if (el === document.body || el === document.documentElement) {
    process.env.NODE_ENV !== "production" &&
      warn(
        `Do not mount Vue to <html> or <body> - mount to normal elements instead.`
      );
    return this;
  }

  const options = this.$options;
  // resolve template/el and convert to render function
  // 如果没有 render 方法 说明存在 complier 过程，就将 template 在线编译为 render 方法
  if (!options.render) {
    let template = options.template;
    // 进行一系列 template 处理获取需要渲染的 template
    // 通过 template 获取 render 函数
    if (template) {
	  // 核心函数通过 template 获取 render 函数
      const { render, staticRenderFns } = compileToFunctions(
        template,
        {
          outputSourceRange: process.env.NODE_ENV !== "production",
          shouldDecodeNewlines,
          shouldDecodeNewlinesForHref,
          delimiters: options.delimiters,
          comments: options.comments,
        },
        this
      );
      options.render = render;
      options.staticRenderFns = staticRenderFns;
  }
  return mount.call(this, el, hydrating);
};
```

首先 Vue@2.x 中所有组件模板都是通过 render 函数来进行渲染的，所以不论是 .vue 文件还是 template 最终都转换为 render 方法，如果是 template 的话就是 `runtime + complier` 模式进行在线编译，他是调用 `compileToFunctions` 函数生成 render 函数

这个 `$mount` 函数也就很清楚了，首先限制了不能挂载到根元素，后就是获取需要渲染的 template 最后调用 ` compileToFunctions` 函数生成需要的 `render` 函数，最终执行 `runtime only` 模式下的 `mount` 函数，此时对于 `complier` 操作以及结束后面内容与 `runtime only` 一致



`runtime only `下的 `mount` 此时的 `src/platform/web/runtime/index.js`

```js
// public mount method
Vue.prototype.$mount = function (
  el?: string | Element,
  hydrating?: boolean // 服务端渲染参数不用理会
): Component {
  el = el && inBrowser ? query(el) : undefined
  return mountComponent(this, el, hydrating)
}
```

`core/instance/lifecycle`

```js
export function mountComponent(
  vm: Component,
  el: ?Element,
  hydrating?: boolean
): Component {
  vm.$el = el;
  // 没有 render 处理
  callHook(vm, "beforeMount");

  let updateComponent;
  /* istanbul ignore if */
  if (process.env.NODE_ENV !== "production" && config.performance && mark) {
    updateComponent = () => {
      // 调用 _update 函数更新 dom
      vm._update(vnode, hydrating);
    };
  } else 
    // init
    updateComponent = () => {
      // 先调用 _render 生成 vNode 调用 _update 函数更新 dom
      vm._update(vm._render(), hydrating);
    };
  }

  // Watcher 初始化时候会执行回调函数，同时传入 vm 当 vm 中的数据发生改变时候也会执行回调函数
  new Watcher(
    vm,
    updateComponent,
    noop,
    {
      before() {
        // 如果 vm._isMounted true 说明实例已经挂载
        if (vm._isMounted && !vm._isDestroyed) {
          callHook(vm, "beforeUpdate");
        }
      },
    },
    true /* isRenderWatcher */
  );

  // vm.$vnode 表示 Vue 实例的父虚拟节点，如果为 null 表示当前是根 Vue 实例 
  if (vm.$vnode == null) {
    vm._isMounted = true;
    callHook(vm, "mounted");
  }
  return vm;
}
```

`mountComponent` 函数主要涉及到触发生命周期钩子函数，核心是创建一个 Watcher 对象，同时传入核心更新组件的方法 `updateComponent` ，函数调用时机都委托给 Watcher ，而核心的 `updateComponent` 函数，调用 `_update` 并传入 `_render` 生成的虚拟 dom 。这里就涉及到了组件的虚拟 dom 以及组件更新是如何生成进行的。



#### 总结

本质上就进行了将 `runtime + complier` 的 template 转换为 `render ` 函数而 `runtime only` 模式下本身就存在 `render` 函数，这时初始化组件并启动监听器监听数据变化。



### _render

#### 是什么

如上分析， `_render` 通过对应的实例 `vm` 生成了对应的虚拟 dom

#### _render()

`src/instance/render` 

```js
Vue.prototype._render = function (): VNode {
    const vm: Component = this
    const { render, _parentVnode } = vm.$options


    // set parent vnode. this allows render functions to have access
    // to the data on the placeholder node.
    vm.$vnode = _parentVnode
    // render self
    let vnode
    try {
      currentRenderingInstance = vm
      // 调用 render 函数
      vnode = render.call(vm._renderProxy, vm.$createElement)
    } catch (e) {
      // ...
    } finally {
      currentRenderingInstance = null
    }
    // if the returned array contains only a single node, allow it
    if (Array.isArray(vnode) && vnode.length === 1) {
      vnode = vnode[0]
    }
    // return empty vnode in case the render function errored out
    // 返回空虚拟节点处理
    if (!(vnode instanceof VNode)) {
      vnode = createEmptyVNode()
    }
    // set parent
    vnode.parent = _parentVnode
    return vnode
  }
```

函数和核心就是调用了 `render` 函数，同时将  `vm.$createElement` 方法传入，这个 vnode 本质上 `vm.$createElement` 函数生成的

vdom （参照上方），Vue 其中的 vdom 也是参照 snabbdom 并添加上一些额外属性



### createElement

#### createElement()

`src/core/vdom/create-element.js`

```js
export function createElement (
  context: Component,
  tag: any,
  data: any,
  children: any,
  normalizationType: any,
  alwaysNormalize: boolean
): VNode | Array<VNode> {
  if (Array.isArray(data) || isPrimitive(data)) {
    normalizationType = children
    children = data
    data = undefined
  }
  if (isTrue(alwaysNormalize)) {
    normalizationType = ALWAYS_NORMALIZE
  }
  return _createElement(context, tag, data, children, normalizationType)
}
```

本质上只是将传入的参数处理调用 `_createElement` 

#### _createElement()

```js
export function _createElement(
  context: Component, // 上下文环境
  tag?: string | Class<Component> | Function | Object, // 标签
  data?: VNodeData, // vnode 的数据
  children?: any, // 子节点
  normalizationType?: number // 子节点规范类型，根据 render 函数是编译生成还是用户手写
): VNode | Array<VNode> {
  if (isDef(data) && isDef((data: any).__ob__)) {
    // 传入响应式的数据对象
    process.env.NODE_ENV !== "production" &&
      warn(
        `Avoid using observed data object as vnode data:`
      );
    return createEmptyVNode();
  }

  // warn against non-primitive key
  // 警告非基本类型作为 key
  // ...

  // support single function children as default scoped slot
	
  // 根据不同 normalizationType 调用不同方法生成不同 children
  if (normalizationType === ALWAYS_NORMALIZE) {
    children = normalizeChildren(children);
  } else if (normalizationType === SIMPLE_NORMALIZE) {
    children = simpleNormalizeChildren(children);
  }
  let vnode, ns;
  if (typeof tag === "string") {
    let Ctor;
    ns = (context.$vnode && context.$vnode.ns) || config.getTagNamespace(tag);
    if (config.isReservedTag(tag)) {
      // 如果是内置的节点直接创建 vnode
      // 部分警告处理...
      
      //
      vnode = new VNode(
        config.parsePlatformTagName(tag),
        data,
        children,
        undefined,
        undefined,
        context
      );
    } else if (
      (!data || !data.pre) &&
      isDef((Ctor = resolveAsset(context.$options, "components", tag)))
    ) {
      // 如果是已经注册的组件名，创建一个组件类型的 vnode
      // component
      vnode = createComponent(Ctor, data, context, children, tag);
    } else { 
      // 如果是未注册的组件名就创建一个未知标签的 vnode 节点
      // unknown or unlisted namespaced elements
      // check at runtime because it may get assigned a namespace when its
      // parent normalizes children
      // 生成 vnode
      vnode = new VNode(tag, data, children, undefined, undefined, context);
    }
  } else {
    // tag 为 component 类型
    // direct component options / constructor
    vnode = createComponent(tag, data, context, children);
  }
  if (Array.isArray(vnode)) {
    return vnode;
  } else if (isDef(vnode)) {
    if (isDef(ns)) applyNS(vnode, ns);
    if (isDef(data)) registerDeepBindings(data);
    return vnode;
  } else {
    return createEmptyVNode();
  }
}
```

`_createElement` 函数主要：根据传入的类型调用 `normalizeChildren`  `simpleNormalizeChildren` 生成 children 的 vnode

接下来就做一系列的 tag 判断，string 的话判断是否内置节点，是否已注册的组件名， component 的话就创建组件类型的 vnode（本质还是 vnode ）



#### simpleNormalizeChildren

```js
// render 函数是编译生成的即 runtime + complier 模式
// 这时编译生成的 children 已经是 vnode 类型
// 但是唯一例外是函数式组件返回的是一个数组而不是根节点就将该数组返回
// ex [[]] ，需要返回的是深度只有一层的数组
export function simpleNormalizeChildren(children: any) {
  for (let i = 0; i < children.length; i++) {
    if (Array.isArray(children[i])) {
      return Array.prototype.concat.apply([], children);
    }
  }
  return children;
}
```



#### normalizeChildren

```js
// render 函数是用户手写即 runtime only
// 1.当 children 只有一个节点时候，Vue 允许用户将 children 写成基本类型，这时会调用 createTextVNode 创建文本节点 VNode
// 2.当编译 slot 、v-for 时候会产生嵌套数组时候，就调用 normalizeArrayChildren
export function normalizeChildren(children: any): ?Array<VNode> {
  return isPrimitive(children) // 基本类型
    ? [createTextVNode(children)]
    : Array.isArray(children)
    ? normalizeArrayChildren(children)
    : undefined;
}
```



#### 总结

`render ` 函数主要功能是将传入的节点转换为 vnode ，主要进行的处理一个是对 children 进行转换成 vnode 一个就是对自身进行转换 vnode



### _update

`src/core/instance/lifecycle` 

```js
// update 函数 在初始化时候调用或者在数据更新时候调用
 // 核心就是调用 vm.__patch__
  Vue.prototype._update = function (vnode: VNode, hydrating?: boolean) {
    const vm: Component = this;
    const prevEl = vm.$el;
    const prevVnode = vm._vnode;
    const restoreActiveInstance = setActiveInstance(vm);
    vm._vnode = vnode;
    if (!prevVnode) {
      // initial render
      // 核心函数
      vm.$el = vm.__patch__(vm.$el, vnode, hydrating, false /* removeOnly */);
    } else {
      // updates
      vm.$el = vm.__patch__(prevVnode, vnode);
    }
    // ...
  };
```

#### vm.\__patch__

`src/platforms/web/runtime/index.js`

```js
// 在浏览器的话就指向 patch ，服务端渲染时候没有真实的 dom 就不需要将 vdom 转换为 dom
// install platform patch function
Vue.prototype.__patch__ = inBrowser ? patch : noop;
```



#### patch

`src/platforms/web/runtime/patch.js`

```js
// nodeOps 封装了一系列的 dom 操作方法
// modules 定义了一些模块的钩子函数实现
export const patch: Function = createPatchFunction({ nodeOps, modules })
```

这里的 `patch` 主要功能就是渲染 vdom 所以 `patch`是平台相关的，每个平台实现不同，对 DOM 的属性模块创建以及更新也不同，因此每个平台都有自己的 `nodeOps` 和 `modules` 他们的代码都在 `src/platforms` 下

而不同平台的 `patch` 的主要逻辑部分是相同的，这个公共部分内容放在 `core` 目录下



#### createPatchFunction

`core/vdom/patch` 这个函数是非常长的，其中包含非常多的辅助函数最终返回一个 `patch` 函数

这里暂时只分析 `patch` 函数中 Vue 实例初始化情况即传入的是真实 dom

```js
        if (isRealElement) {
          // init ：是真实 dom
		  // ...
          // init ：通过 emptyNodeAt 将真实 dom 转换为 vnode 对象
          oldVnode = emptyNodeAt(oldVnode);
        }
        // replacing existing element
        const oldElm = oldVnode.elm;
        const parentElm = nodeOps.parentNode(oldElm);

        // create new node
        createElm(
          vnode,
          insertedVnodeQueue,
          oldElm._leaveCb ? null : parentElm,
          nodeOps.nextSibling(oldElm)
        );

```



主要逻辑就是通过 `emptyNodeAt ` 创建一个旧的 vdom ，最后通过 `createElm` 的方法通过虚拟节点创建真实的 DOM 并插入到他的父元素



#### createElm

作用：通过传入的 vdom 创建真实的 DOM 并插入到他的父元素中

```js
 /** 通过传入的 vdom 生成真实 dom 并插入父元素中
   *
   */
  function createElm(
    vnode,
    insertedVnodeQueue,
    parentElm,
    refElm,
    nested,
    ownerArray,
    index
  ) {
    if (isDef(vnode.elm) && isDef(ownerArray)) {
      // 当前的 vnode 被上个渲染函数所使用如果直接修改可能会造成渲染问题，所以 clone
      vnode = ownerArray[index] = cloneVNode(vnode);
    }

    vnode.isRootInsert = !nested; // for transition enter check
    // 尝试创建子组件
    if (createComponent(vnode, insertedVnodeQueue, parentElm, refElm)) {
      return;
    }

    const data = vnode.data;
    const children = vnode.children;
    const tag = vnode.tag;
    // vnode 是否包含 tag
    if (isDef(tag)) {
      if (process.env.NODE_ENV !== "production") {
        // ...
        // 检验是否合法标签
        if (isUnknownElement(vnode, creatingElmInVPre)) {
			// ...
        }
      }

      // 调用平台的 DOM 操作创建一个占位符元素
      vnode.elm = vnode.ns
        ? nodeOps.createElementNS(vnode.ns, tag)
        : nodeOps.createElement(tag, vnode);
      setScope(vnode);

      /* istanbul ignore if */
      if (__WEEX__) {
		// ... weex platform
      } else {
        // 创建 children
        createChildren(vnode, children, insertedVnodeQueue);
        if (isDef(data)) {
          // 触发所有 create 钩子函数并将 vnode push 到 insertedVnodeQueue
          invokeCreateHooks(vnode, insertedVnodeQueue);
        }
        // 由于是深度优先递归所以子元素优先调用 insert，插入顺序就是先子后父
        insert(parentElm, vnode.elm, refElm);
      }
      else if (isTrue(vnode.isComment)) {
      // 如果不含 tag 那么可能是一个注释或者纯文本
      vnode.elm = nodeOps.createComment(vnode.text);
      insert(parentElm, vnode.elm, refElm);
    } else {
      // 纯文本
      vnode.elm = nodeOps.createTextNode(vnode.text);
      insert(parentElm, vnode.elm, refElm);
    }
  }
```

`createElm` 首先进行非生产模式下的 tag 检查，后调用占位符，后调用 `createChildren` 生产子元素，最后利用 `insert` 插入到父元素中完成渲染，如果不含 tag 那么可能是注释或者纯文本调用相应的函数直接创建

#### createChildren

`createChildren`  深度有限递归创建子节点

```js
  function createChildren(vnode, children, insertedVnodeQueue) {
    if (Array.isArray(children)) {
      if (process.env.NODE_ENV !== "production") {
        checkDuplicateKeys(children);
      }
      // 深度有限遍历递归创建节点
      for (let i = 0; i < children.length; ++i) {
        createElm(
          children[i],
          insertedVnodeQueue,
          vnode.elm, // 父元素节点传入
          null,
          true,
          children,
          i
        );
      }
    } else if (isPrimitive(vnode.text)) {
      nodeOps.appendChild(
        vnode.elm,
        nodeOps.createTextNode(String(vnode.text))
      );
    }
  }
```





#### invokeCreateHooks

```js
  function invokeCreateHooks(vnode, insertedVnodeQueue) {
    for (let i = 0; i < cbs.create.length; ++i) {
      // 执行 create 钩子函数
      cbs.create[i](emptyNode, vnode);
    }
    i = vnode.data.hook; // Reuse variable
    if (isDef(i)) {
      if (isDef(i.create)) i.create(emptyNode, vnode);
      // 将 vnode push 到 insertedVnodeQueue 中
      if (isDef(i.insert)) insertedVnodeQueue.push(vnode);
    }
  }
```



#### insert

```js
  function insert(parent, elm, ref) {
    if (isDef(parent)) {
      if (isDef(ref)) {
        if (nodeOps.parentNode(ref) === parent) {
          nodeOps.insertBefore(parent, elm, ref);
        }
      } else {
        nodeOps.appendChild(parent, elm);
      }
    }
  }
// nodeOps
```

nodeOps 在 `src/platforms/web/runtime/node-ops.js`

```js
export function insertBefore (parentNode: Node, newNode: Node, referenceNode: Node) {
  parentNode.insertBefore(newNode, referenceNode)
}

export function appendChild (node: Node, child: Node) {
  node.appendChild(child)
}
```

所以 `insert` 本质也是调用原生的 `insertBefore` 以及 `appendChild` 方法



#### 总结

`_update` 函数进行初始化 dom 操作以及更新 dom 操作，主要分析了初始化操作，对于传入的 dom 节点将其转为 vdom ，最后通过深度遍历递归 vdom 借助原生的插入子元素方法完成了真实 dom 的渲染



### 总结

完成了下图的分析：完成从 new Vue 到真实 DOM 的基本流程分析

![image-20211017114750482](http://120.27.242.14:9900/uploads/upload_a5c0ea1a0731bf32100bd55db6e88363.png)



从 new Vue 开始， Vue 函数会调用他原型上的 `_init` ， `_init` 函数中会做一系列的初始化即定义一些函数以及属性，后调用 `$mount` 函数开始挂载，此时 `$mount` 根据模式的不同 `runtime only` 或者 `runtime + complier` 分别进行不同操作，`runtime + complier` 多做了一个编译过程生成 `render` 函数，最终都调用 `mountComponent` 函数，该函数通过 `_render` 函数生成所需要的 vnode ，通过 `_update` 函数更新 dom 。而 `_render` 函数调用 `createElement` ，`createElement` 调用 `_createElement` 函数对其生成 vnode 。而 `_update` ，调用 `vm.__patch__` ，`vm.__patch__` 调用 `patch` ， `patch` 调用 `createPatchFunction` , `createPatchFunction`  调用 `createElm` ，`createElm` 也借助了`createChildren`  通过 vdom 创建真实 dom 最后借助 `insert` 函数插入到真实的 DOM

![初始化 new Vue 到渲染成真实 DOM](http://120.27.242.14:9900/uploads/upload_f226a7f301d80073bdc56c458cafed84.png)







## 组件化

组件化也是 Vue 的一主要设计理念，上一章分析了原生的 tag 在 Vue 中是如何渲染的，这一章分析自己构建的组件是如何渲染的

```js
import App from './app.vue'
var app = new Vue({
	el:'',
	render: h=>h(App) // h 即 createElement
})
```



### createCompoent

`src/core/vdom/create-element.js` 

上一章中 `createElement` 是调用 `_createElement` 方法，而在 `_createElement` 中如果 tag 是 component 的化就会调用  `createComponent` 来创建 vnode

```js
export function _createElement(
  context: Component, // 上下文环境
  tag?: string | Class<Component> | Function | Object, // 标签
  data?: VNodeData, // vnode 的数据
  children?: any, // 子节点
  normalizationType?: number // 子节点规范类型，根据 render 函数是编译生成还是用户手写
): VNode | Array<VNode> {
 
  if (typeof tag === "string") {
     //  原生 tag
    } else if (
      (!data || !data.pre) &&
      isDef((Ctor = resolveAsset(context.$options, "components", tag)))
    ) {
      // 如果是已经注册的组件名，创建一个组件类型的 vnode
      // component
      vnode = createComponent(Ctor, data, context, children, tag);
    } else {
      // 如果是未注册的组件名就创建一个未知标签的 vnode 节点
      // unknown or unlisted namespaced elements
      // check at runtime because it may get assigned a namespace when its
      // parent normalizes children
      // 生成 vnode
      vnode = new VNode(tag, data, children, undefined, undefined, context);
    }
  } else {
    // tag 为 component 类型
    // direct component options / constructor
    vnode = createComponent(tag, data, context, children);
  }
}
```

来看 `createComponent` 是如何生成 vnode

主要模块分为三块

* 构造子类构造函数
* 安装组件钩子函数
* 实例化 vnode

#### 构造子类构造函数

```js
  // baseCtor 是 Vue
  const baseCtor = context.$options._base;
  // plain options object: turn it into a constructor
  if (isObject(Ctor)) {
    Ctor = baseCtor.extend(Ctor);
  }
```

`src/core/global-api/index.js` 中 `initGlbalApi`  将 Vue 挂载到 options._base 上

```js
Vue.options._base = Vue
```

这里获取的是 context 即 vm ，那是什么时候将 Vue 的 option 扩展到 vm.$options 上呢

`src/core/instance/init.js` 里 Vue 原型的 `_init`  函数上进行了合并，这样就将 Vue 上的一些  `option ` 扩展到 vm.$options，这样也就可以通过 vm.$options._base 拿到 Vue 这个构造函数

```js
   // 合并配置
      vm.$options = mergeOptions(
        resolveConstructorOptions(vm.constructor),
        options || {},
        vm
      );
```

清晰了 baseCtor 是 Vue 之后，又涉及到了 ` Vue.extend` 函数

> Vue.extend 作用是构造一个 Vue 的子类
>
> Vue.extend 的使用例如 Element 的 `$message` 使用 `this.$message('h')` 就是以这种方式创建一个实例后面再挂载到  body 上

```js
 Vue.extend = function (extendOptions: Object): Function {
    extendOptions = extendOptions || {};
    const Super = this;
    const SuperId = Super.cid;
    const cachedCtors = extendOptions._Ctor || (extendOptions._Ctor = {});
    if (cachedCtors[SuperId]) { // 缓存
      return cachedCtors[SuperId];
    }
    // 实例化 Sub 时候就会执行 this._init 又走到了 Vue 实例的初始化逻辑
    const Sub = function VueComponent(options) {
      this._init(options);
    };
    // 以原型继承的方式
    Sub.prototype = Object.create(Super.prototype);
    Sub.prototype.constructor = Sub;
    // 属性扩展
    Sub.cid = cid++;
    Sub.options = mergeOptions(Super.options, extendOptions);
    Sub["super"] = Super;
    // 初始化 props 和 computed
    if (Sub.options.props) {
      initProps(Sub);
    }
    if (Sub.options.computed) {
      initComputed(Sub);
    }


    Sub.extendOptions = extendOptions;
    Sub.sealedOptions = extend({}, Sub.options);

    // 缓存组件，避免多次执行 Vue.extend 时候对同一子组件重复构造
    // cache constructor
    cachedCtors[SuperId] = Sub;
    return Sub;
  };
```

`Vue.extend`  主要就是使用原型继承的方式构造了一个 Vue 的子类，并对其本身的属性进行了扩展与初始化 props 和 computed ，最后再对其进行了缓存。???



#### 安装组件钩子函数

```js
  // 安装组件的钩子函数
  // install component management hooks onto the placeholder node
  installComponentHooks(data);
```



```js
function installComponentHooks(data: VNodeData) {
  const hooks = data.hook || (data.hook = {});
  for (let i = 0; i < hooksToMerge.length; i++) {
    const key = hooksToMerge[i];
    const existing = hooks[key];
    const toMerge = componentVNodeHooks[key];
    if (existing !== toMerge && !(existing && existing._merged)) {
      hooks[key] = existing ? mergeHook(toMerge, existing) : toMerge;
    }
  }
}
```

`installComponentHooks`  函数本质上就是将 `componentVNodeHooks` 中的钩子函数合并到 `data.hooks` 中

```js
const componentVNodeHooks = {
  init(vnode: VNodeWithData, hydrating: boolean): ?boolean {
	// ... other operations
  },

  prepatch(oldVnode: MountedComponentVNode, vnode: MountedComponentVNode) {
      	// ... other operations
  },

  insert(vnode: MountedComponentVNode) {
            	// ... other operations

  },

  destroy(vnode: MountedComponentVNode) {
            	// ... other operations
  },
};
```

`mergeHook` 函数也很简单

```js
function mergeHook(f1: any, f2: any): Function {
  const merged = (a, b) => {
    // flow complains about extra args which is why we use any
    f1(a, b);
    f2(a, b);
  };
  merged._merged = true;
  return merged;
}
```

安装组件钩子函数本质上就是将用户传入的钩子函数与内置的函数合并等待后面合适的时机调用



#### 实例化 vnode

唯一需要注意的是组件的 vnode 是没有 children

```js
  // 实例化 vnode 注意组件的 vnode 没有 children
  // return a placeholder vnode
  const name = Ctor.options.name || tag;
  const vnode = new VNode(
    `vue-component-${Ctor.cid}${name ? `-${name}` : ""}`,
    data,
    undefined,
    undefined,
    undefined,
    context,
    { Ctor, propsData, listeners, tag, children },
    asyncFactory
  );
```





### patch

在前一章中，通过 `createComponent` 生成组件的 VNode ，后再借助 `vm._update` -> `vm.__patch__` 去将 VNode 转换为真实的 DOM ，那对于组件渲染成真实 DOM 和普通节点的渲染有什么什么区别？



`createElm` 函数用来将 VNode 渲染成真实 DOM  `src/core/vdom/patch.js`  

```js
    // 尝试创建组件实例
    if (createComponent(vnode, insertedVnodeQueue, parentElm, refElm)) {
      return;
    }
```



#### createComponent

`src/core/vdom/patch.js` 

尝试创建组件实例

```js
  function createComponent(vnode, insertedVnodeQueue, parentElm, refElm) {
    let i = vnode.data; // i 获取到的就是 init 函数
    if (isDef(i)) {
      // 如果 vnode 是一个组件 VNode
      const isReactivated = isDef(vnode.componentInstance) && i.keepAlive;
      if (isDef((i = i.hook)) && isDef((i = i.init))) {
        // 执行 i 函数，即之前所 merge 的 init 钩子函数 `src/create-component` componentVNodeHooks 对象
        i(vnode, false /* hydrating */);
      }
      if (isDef(vnode.componentInstance)) { // 如果创建成功就返回 true 并插入到合适的 DOM 位置
        initComponent(vnode, insertedVnodeQueue);
        insert(parentElm, vnode.elm, refElm); // 由于是深度遍历所以是先将子节点插入，后再将父节点插入
        if (isTrue(isReactivated)) {
          reactivateComponent(vnode, insertedVnodeQueue, parentElm, refElm);
        }
        return true;
      }
    }
```

回到之前安装组件的钩子函数中 `src/create-component` 的默认执行的 `componentVNodeHooks` 中 `init` 函数中 

```js
  init(vnode: VNodeWithData, hydrating: boolean): ?boolean {
    if (
      vnode.componentInstance &&
      !vnode.componentInstance._isDestroyed &&
      vnode.data.keepAlive
    ) {
      // kept-alive components
    } else {
      // 非 keep-alive
      const child = (vnode.componentInstance = createComponentInstanceForVnode(
        vnode,
        activeInstance
      ));
      child.$mount(hydrating ? vnode.elm : undefined, hydrating);
    }
  },
```

会去调用 `createComponentInstanceForVnode` 创建一个 Vue 子实例后执行 `$mount` 函数将其挂载到合适的位置

`createComponentInstanceForVnode`  即创建一个 Vue 子实例

```js
// 创建一个 Vue 实例
export function createComponentInstanceForVnode(
  // we know it's MountedComponentVNode but flow doesn't
  vnode: any,
  // activeInstance in lifecycle state
  parent: any // 当前激活的组件实例
): Component {
  const options: InternalComponentOptions = { // 后面传入给 initInternalComponent
    _isComponent: true, // 是一个组件
    _parentVnode: vnode, // 
    parent,
  };
  // check inline-template render functions
  const inlineTemplate = vnode.data.inlineTemplate;
  if (isDef(inlineTemplate)) {
    options.render = inlineTemplate.render;
    options.staticRenderFns = inlineTemplate.staticRenderFns;
  }
  // vnode.componentOptions.Ctor Vue 的子类 Sub 此处等于 new Sub(options)
  // 即子组件创建会执行 _init 方法
  return new vnode.componentOptions.Ctor(options);
}
```

#### init

这样又回到 new Vue 时候的 `_init` 函数，看下组件创建时候 `_init` 函数的处理

`src/core/instance/init.js` 

```js
 Vue.prototype._init = function (options?: Object) {
    const vm: Component = this;
    if (options && options._isComponent) {
	  // 创建组件时候
      initInternalComponent(vm, options);
    } else {
      // 初始化时候
      vm.$options = mergeOptions(
        resolveConstructorOptions(vm.constructor),
        options || {},
        vm
      );
    }
  };
```

首先是不走合并配置的条件，走了 `initInternalComponent` 即将部分属性合并到 `$options` 中

```js

// 组件实例的创建时候调用
export function initInternalComponent(
  vm: Component,
  options: InternalComponentOptions
) {
  const opts = (vm.$options = Object.create(vm.constructor.options));
  // doing this because it's faster than dynamic enumeration.
  const parentVnode = options._parentVnode; // point ，右值是通过 createComponentInstanceForVnode 生成的
  opts.parent = options.parent; // point 右值是通过 createComponentInstanceForVnode 生成的
  // 后面将其合并到 $options
  opts._parentVnode = parentVnode;

  const vnodeComponentOptions = parentVnode.componentOptions;
  opts.propsData = vnodeComponentOptions.propsData;
  opts._parentListeners = vnodeComponentOptions.listeners;
  opts._renderChildren = vnodeComponentOptions.children;
  opts._componentTag = vnodeComponentOptions.tag;

  if (options.render) {
    opts.render = options.render;
    opts.staticRenderFns = options.staticRenderFns;
  }
}
```

再回到 `init` ，由于没有 `el` 所以并不会走该逻辑

```js
    if (vm.$options.el) {
      vm.$mount(vm.$options.el);
    }
```

那么 mount 挂载的逻辑在哪呢？

回到之前安装组件的钩子函数中 `src/create-component` 的默认执行的 `componentVNodeHooks` 中 `init` 函数中，非 keep-alive 的结尾

```js
child.$mount(hydrating ? vnode.elm : undefined, hydrating);
// 非服务端渲染
child.$mount(undefined,false)
```

#### vm._render()

回到第一章中的 `$mount` 挂载过程会去调用 `mountComponent` ，进而执行 `vm._render()` 与 `vm._update()`

```js
Vue.prototype._render = function (): VNode {
    const vm: Component = this;
    // !!! NOTICE render 是怎么样的，与 _rendner 具体区别
    // vnode 最终是用这个 render 函数与 vm.$createElement 生成的
    const { render, _parentVnode } = vm.$options; // _parentVnode 父组件的 VNode

    if (_parentVnode) { // 
      vm.$scopedSlots = normalizeScopedSlots(
        _parentVnode.data.scopedSlots,
        vm.$slots,
        vm.$scopedSlots
      );
    }
    // $vnode 就是其父节点
    vm.$vnode = _parentVnode;
    // ...
  };
```

即将 `$scopeSlots` `$vnode` 属性绑定

#### vm._update()

此时 vnode 已经生成需要使用 `vm._update` 去渲染

`src/core/instance/lifecycle.js`  即将自身的 vnode 挂载到自身身上，所以此时形成一个关系 `vm._vnode.parent === vm.$vnode`

```js
Vue.prototype._update = function (vnode: VNode, hydrating?: boolean) {
    const vm: Component = this;
    const prevEl = vm.$el;
    const prevVnode = vm._vnode;

    // 由于深度遍历，js 又是单线程所以在深度遍历时候需要将父 Vue 实例给子的所以需要 activeInstance 存储当前遍历的 Vue 实例
    // 退出这层遍历之后还需要将其返回到上层的 Vue 实例
    // const prevActiveInstance = activeInstance;
    // activeInstance = vm; // activeInstance 全局变量保存当前上下文 Vue 实例
    // 下一行等价上两行
    const restoreActiveInstance = setActiveInstance(vm);

    vm._vnode = vnode; // _render() 返回的 vnode
    
    if (!prevVnode) {
      // initial render
      // 核心函数 
      vm.$el = vm.__patch__(vm.$el, vnode, hydrating, false /* removeOnly */);
    } else {
      // updates
      vm.$el = vm.__patch__(prevVnode, vnode);
    }
    restoreActiveInstance(); // 等价于  activeInstance = prevActiveInstance;
    // ...
  };
```

理一遍实例化子组件过程

先调用 `initInternalComponent()` 合并 `options` ，将 `parent` 存储在 `vm.$options` 中，而在 `$mount` 时候需要走 `_init` 的逻辑所以先调用 `initLifecycle` 后再 `$mount`

#### initLifecycle()

```js
export function initLifecycle(vm: Component) {
  const options = vm.$options;

  // locate first non-abstract parent
  let parent = options.parent;
  if (parent && !options.abstract) {
    while (parent.$options.abstract && parent.$parent) {
      parent = parent.$parent;
    }
    parent.$children.push(vm); // 存储到父实例的属性上
  }

  vm.$parent = parent;
  vm.$root = parent ? parent.$root : vm;
  // ... 属性挂载
}
```

重点就是将自身存储到最大 Vue 实例的 `$children` 属性上

#### patch()

最终回到 `_update` 函数，最后还是调用 `__patch__()` -> `patch()` 进行渲染 VNode，同样 `patch()` 函数借助 `createElm()` 进行生成真实 DOM ，只传入了2个参数

```js
  function patch(oldVnode, vnode, hydrating, removeOnly) {

    if (isUndef(oldVnode)) {
      // empty mount (likely as component), create new root element
      isInitialPatch = true;
      createElm(vnode, insertedVnodeQueue);
    } else {
    }
  }
```



#### createElm()

调用时候只传入了两个参数即 `parentElm` 为 undefined ，第一个参数就是组件的 vnode

```js
  /** 通过传入的 vdom 生成真实 dom 并插入父元素中
   *
   */
  function createElm(
    vnode,
    insertedVnodeQueue,
    parentElm,
    refElm,
    nested,
    ownerArray,
    index
  ) {
    // 尝试创建子组件，如果是组件 vnode 那么就返回 true
    if (createComponent(vnode, insertedVnodeQueue, parentElm, refElm)) {
      return;
    }
  }
```

#### 总结

组件的渲染过程，从初始化开始

1. 编译过后，此时需要挂载 `$mount` ，调用 `mountComponent()` ，此时需要 vnode 和 渲染 vnode 即 `_render()`  `_update()`
2. 而如果是组件的话执行 `render()` 生成 vnode 时候调用 `createElement()` `_createElement()` , `_createElement()` 会调用 `src/core/vdom/create-element.js` 中的`createComponent` <sup>**1**</sup>  来生成 vnode
3. `createComponent` 作用是借助 Vue.extend 创建子实例的构造函数、合并用户传入的以及内置的部分生命周期函数、最后生成组件的 vnode
4. 此时有了组件的 vnode 后，调用 `_update()` ，`_update()` 调用 `createElm()` 去创建真实 DOM 
5. 而 `createElm()` 会尝试调用 `patch.js` 中的 `createComponent()` <sup>**2 **</sup>去创建组件实例， 如果创建成功那么所以逻辑便都在 `createComponent()` 中进行
6. `createComponent()` 会先触发生命周期 init 的所有构造函数，其中便包括之前 `createComponent` <sup>**1**</sup> 合并的内置的 init 钩子函数
7.  内置的 `init()` 函数会先实例化之前在创建 vnode 时候创建的`createComponent` <sup>**1**</sup> 的子类，实例化过程会合并部分属性到 `$options` 上
8. 然后内置的 `init()` 函数会再调用 `child.$mount()` 函数即将子元素进行挂载操作，进行递归的以上步骤，知道不是组件而是基本 tag 



## 关键词

* *hydrating* ：服务端渲染标志位
* *istanbul ignore if* 
* *baseCtor* ：总的 Vue 的构造函数
* *Ctor* ：子组件的构造函数即继承于 Vue 的构造器 `Sub`
* *vm.$vnode === vm._vnode.parent* ：即 *vm._vnode* 是自身的 vnode





## 工具函数





# Refrence



* https://juejin.cn/post/6990582632270528525#heading-11
* https://juejin.cn/book/6844733816460804104/section/6844733816549048333
* https://ustbhuangyi.github.io/vue-analysis/
* https://www.zhihu.com/question/46397274/answer/101193678
* .... 

