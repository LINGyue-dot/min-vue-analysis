/*
 * @Author: qianlong github:https://github.com/LINGyue-dot
 * @Date: 2021-10-13 16:11:06
 * @LastEditors: qianlong github:https://github.com/LINGyue-dot
 * @LastEditTime: 2021-10-13 19:35:58
 * @Description: 测试 vdom
 */

// // 第一步当然是先导入 snabbdom 的 init() h()
// import { h, init } from 'snabbdom';

// // 导入模块
// import attr from 'snabbdom/modules/attributes';
// import style from 'snabbdom/modules/style';
// import eventListeners from 'snabbdom/modules/eventlisteners';

// // init()注册模块 返回值是 patch 函数用来比较 两个虚拟DOM 差异 然后添加到 真实DOM
// let patch = init([attr, style, eventListeners]);

// // 使用 h() 渲染一个虚拟DOM
// let vnode = h(
//   'div#app',
//   {
//     // 自定义属性
//     attrs: {
//       myattr: '我是自定义属性',
//     },
//     // 行内样式
//     style: {
//       fontSize: '29px',
//       color: 'skyblue',
//     },
//     // 事件绑定
//     on: {
//       click: clickHandler,
//     },
//   },
//   '我是内容'
// );

// // 点击处理方法
// function clickHandler() {
//   // 拿到当前 DOM
//   let elm = this.elm;
//   elm.style.color = 'red';
//   elm.textContent = '我被点击了';
// }

// // 获取到 div#app
// let app = document.querySelector('#example');

// // patch 比较差异 ，然后添加到真实DOM 中
// patch(app, vnode);

//
import './self_test';
