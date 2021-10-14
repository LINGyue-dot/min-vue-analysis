/*
 * @Author: qianlong github:https://github.com/LINGyue-dot
 * @Date: 2021-10-13 19:46:31
 * @LastEditors: qianlong github:https://github.com/LINGyue-dot
 * @LastEditTime: 2021-10-14 20:24:41
 * @Description:
 */

import createElm from './createElm';
import updateChildren from './updateChildren';

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
