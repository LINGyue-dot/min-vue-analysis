/*
 * @Author: qianlong github:https://github.com/LINGyue-dot
 * @Date: 2021-10-14 19:11:59
 * @LastEditors: qianlong github:https://github.com/LINGyue-dot
 * @LastEditTime: 2021-10-14 20:29:38
 * @Description: diff 算法
 */

import createElm from './createElm';
import patchVnode from './patchVnode';
import sameVnode from './sameVnode';

/**
 * 更新操作都是对于旧节点进行操作
 * @param {*} parentElm 父 dom
 * @param {*} oldList 老节点列表
 * @param {*} newList 新节点列表
 */
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
