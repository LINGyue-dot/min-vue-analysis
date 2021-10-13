# min-vue



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

仿写一个 `snabbdom` 



### 是什么

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

```json
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





### 主要函数	

* `h() ` 即1生成对应的虚拟节点
* `patch()` 进行上方传入2个参数的比较流程
* `patchVnode()` 在 `patch()` 函数中调用用于进行2虚拟节点的比较 

#### h()











#### patch(ov,nv)

负责整个流程，具体实现 12 流程，当2个节点全部转换为虚拟节点的时候进入 `patchVnode()` 中，返回最终的新的虚拟节点 





#### patchVnode(ov,nv)

进行 345 流程







### 工具函数

* `sameVnode` `patch()` 的第一步通过 `sel` `key ` 判断是否同一虚拟节点

* `createElm` 通过传入的 vNode 来生成真实的 dom 节点，children 节点利用递归生成
* 









