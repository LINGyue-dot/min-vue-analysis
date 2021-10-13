/*
 * @Author: qianlong github:https://github.com/LINGyue-dot
 * @Date: 2021-10-13 18:59:18
 * @LastEditors: qianlong github:https://github.com/LINGyue-dot
 * @LastEditTime: 2021-10-13 19:08:08
 * @Description:
 */

/**
 * 通过 key 和 sel 比较是否两者在这2属性上相同
 * @param {*} oldVnode
 * @param {*} newVnode
 */
export function sameVnode(oldVnode, newVnode) {
  return (
    (oldVnode && newVnode && oldVnode.data && newVnode.data
      ? oldVnode.data.key === newVnode.data.key
      : false) && oldVnode.sel === newVnode.sel
  );
}
