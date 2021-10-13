/*
 * @Author: qianlong github:https://github.com/LINGyue-dot
 * @Date: 2021-10-13 19:32:28
 * @LastEditors: qianlong github:https://github.com/LINGyue-dot
 * @LastEditTime: 2021-10-13 19:32:29
 * @Description: 测试 min-snabbdom
 */

import h from './min-snabbdom/h';
import { patch } from './min-snabbdom/patch';

const app = document.querySelector('#test');

let vnode = h('ul', {}, [
  h('li', {}, '我是一个li'),
  h('li', {}, [
    h('p', {}, '我是一个p'),
    h('p', {}, '我是一个p'),
    h('p', {}, '我是一个p'),
  ]),
  h('li', {}, '我是一个li'),
]);

let oldVnode = patch(app, vnode);
