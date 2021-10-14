/*
 * @Author: qianlong github:https://github.com/LINGyue-dot
 * @Date: 2021-10-13 19:03:17
 * @LastEditors: qianlong github:https://github.com/LINGyue-dot
 * @LastEditTime: 2021-10-14 20:33:39
 * @Description:
 */

import createElm from './createElm';
import h from './h';
import patchVnode from './patchVnode';
import sameVnode from './sameVnode';
import vnode from './vnode';

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

// 由真实 dom 转为虚拟 dom
// TODO 没考虑 elm 的 children 元素问题
function turntoVnode(elm) {
  return vnode(elm.tagName.toLowerCase(), undefined, undefined, undefined, elm);
}
