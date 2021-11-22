/*
 * @Author: qianlong github:https://github.com/LINGyue-dot
 * @Date: 2021-11-22 11:26:40
 * @LastEditors: qianlong github:https://github.com/LINGyue-dot
 * @LastEditTime: 2021-11-22 14:41:24
 * @Description: 响应式
 */

// Vue2.x 利用 defineProperty
// 每个属性都有一个 Dep 类
// 每当 get 的时候都会进行依赖收集将当前的 watcher 推入对应的 Dep 类中
// 每当 set 的时候会执行 Dep 实例中存储的 watcher 的更新

// 依赖收集类
class Dep {
	constructor() {
		this.subs = [];
	}

	addSub(item) {
		this.subs.push(item);
	}

	// 通知其全部的 watcher 更新
	noticify() {
		this.subs.forEach(item => item.update());
	}
}

//
class Watcher {
	constructor() {
		// 记录当前的 watcher
		Dep.target = this;
	}
	//
	update() {
		// 视图更新
		console.log("view update");
		render();
	}
}

// 封装，使其 obj 变为响应式
function observer(obj) {
	for (let item in obj) {
		toReactive(obj, item, obj[item]);
	}
}

// 添加 obj 的 key 变为响应式
function toReactive(obj, key, value) {
	// 每个属性都有 dep
	let dep = new Dep();

	Object.defineProperty(obj, key, {
		get() {
			// get 时候依赖收集将其当前的 watcher 推入自己对应的 dep
			dep.addSub(Dep.target);
			return value;
		},

		set(newVal) {
			if (value === newVal) {
				return;
			}
			value = newVal;
			// set 时候进行更新
			dep.noticify();
		},
	});
}

class Vue {
	constructor(options) {
		this._data = options.data;
		observer(this._data);
		new Watcher();
		console.log("render");
	}
}

// mock data

let data = {
	name: "qianlong",
	age: 123,
};

let vm = new Vue({
	data,
});

const btn = document.querySelector("#btn");
btn.addEventListener("click", () => {
	data.age = 20;
});

const content = document.getElementById("content");
function render() {
	content.innerHTML = data.name + data.age;
}
render();

/**
 * 几个问题
 * 1. Wacther.target 是单一的吗?为什么可以使用全局的静态属性
 * 2.
 */
