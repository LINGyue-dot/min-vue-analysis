/*
 * @Author: qianlong github:https://github.com/LINGyue-dot
 * @Date: 2021-10-13 19:16:58
 * @LastEditors: qianlong github:https://github.com/LINGyue-dot
 * @LastEditTime: 2021-10-13 19:25:23
 * @Description:
 */

/**
 * 通过 vdom 生成 real dom element
 * @param {*} vNode
 */
export default function createElm(vNode) {
  let node = document.createElement(vNode.sel);

  if (vNode.text) {
    // 如果是 text
    node.textContent = vNode.text;
  } else if (Array.isArray(vNode.children) && vNode.children.length > 0) {
    // 有子元素

    vNode.children.forEach((child) => {
      let realChild = createElm(child);
      // 将子元素通过 appendChild 添加到真实 dom 上
      node.appendChild(realChild);
    });
  }

  // 更新 dom 元素属性
  vNode.elm = node;

  return node;
}
