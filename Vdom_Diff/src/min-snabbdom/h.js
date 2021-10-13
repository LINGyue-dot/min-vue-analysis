/*
 * @Author: qianlong github:https://github.com/LINGyue-dot
 * @Date: 2021-10-13 16:20:48
 * @LastEditors: qianlong github:https://github.com/LINGyue-dot
 * @LastEditTime: 2021-10-13 19:10:25
 * @Description: 配合 vnode 函数通过 tag 生成特定的数据结构
 */

import vnode from './vnode';

/**
 * 用于 JS 数据直接生成虚拟节点，不支持 elment 直接生成虚拟节点
 * @param {*} sel 选择器
 * @param {*} data 数据
 * @param {*} c 可能是 children 可能是 text
 * @returns
 */
export default function h(sel, data, c) {
  if (arguments.length < 3) return;

  // 根据第三个参数
  if (typeof c === 'string' || typeof c === 'number') {
    // text
    return vnode(sel, data, undefined, c, undefined);
  } else if (Array.isArray(c)) {
    // children
    // [h(),h()] or [h(),text]
    let children = [];
    c.forEach((item) => {
      // 排除 [h(),text] 模式，只支持 [h(),h()] 模式
      if (!(typeof item === 'object' && item.sel)) return;
      children.push(item);
    });

    return vnode(sel, data, children, undefined, undefined);
  } else if (typeof c === 'object' && c.sel) {
    // 直接传入 h()
    let children = [c];
    return vnode(sel, data, children, undefined, undefined);
  }
}
