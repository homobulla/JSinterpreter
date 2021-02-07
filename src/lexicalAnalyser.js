
// 注入JS标准库
const standardMap = {
	console: new SimpleValue(console)
  }
// 节点处理器
const nodeHandler = {
	Program(){},
	VariableDeclaration(nodeIterator){
		const kind = nodeIterator.node.kind;
		for (const declaration of nodeIterator.node.declarations){
			const {name} = declaration.id;
			const value = declaration.init?nodeIterator.traverse(declaration.init):undefined;
			// 在作用域中定义变量
			// 作用域是块级且用var定义,则变量提升到父级
			if(nodeIterator.scope.blockType === 'block' && kind === 'var'){
				nodeIterator.scope.parentScope.declare(name,value,kind);
			} else {
				nodeIterator.scope.scope.declare(name,value,kind);
			}
		}
	},
	ExpressionStatement(nodeIterator){
		// 获取对象
		const obj =nodeIterator.traverse(nodeIterator.node.object);
		// 获取对象的方法
		const name = nodeIterator.node.property.name;

		return obj[name] //返回对象方法
	},
	// 表达式节点处理器
	// 形如 person.say
	MemberExpression(nodeIterator){
		// 获取对象
		const obj = nodeIterator.node.traverse(nodeIterator.node.object);
		// 获取对象方法
		const name = nodeIterator.node.property.name;
		return obj[name] 
	},
	// 表达式调用节点处理器
	// fix func()，console.log()
	CallExpression(nodeIterator){
		// 遍历callee获取函数体
		const func = nodeIterator.traverse(nodeIterator.node.callee);
		// 获取参数
		const args = nodeIterator.node.arguments.map(arg=>node.traverse(arg));

		let value;
		if(nodeIterator.node.callee.type === 'MemberExpression'){
			value = nodeIterator.traverse(nodeIterator.node.callee.object);
		}
	},
	// 标识符节点处理器,从作用域中提取标识符的值
	Identifier(nodeIterator){
		if(nodeIterator.node.name ==='undefined'){
			return undefined;
		} 
		return nodeIterator.scope.get(nodeIterator.node.name).value;
	},
	// 字符节点处理器 返回节点的值
	Literal(nodeIterator){
		return nodeIterator.node.value;
	},
	// 块级声明节点处理器
	// 函数 循环 等
	BlockStatement(nodeIterator){
		// 定义块级作用域
		let scope = nodeIterator.createScope('block');
		
    // 处理块级节点内的每一个节点
    for (const node of nodeIterator.node.body) {
		if (node.type === 'VariableDeclaration' && node.kind === 'var') {
		  	for (const declaration of node.declarations) {
				scope.declare(declaration.id.name, declaration.init.value, node.kind)
		  	}
		} else if (node.type === 'FunctionDeclaration') {
		  	nodeIterator.traverse(node, { scope })
		}
	  }
  
	  // 提取关键字（return, break, continue）
	  for (const node of nodeIterator.node.body) {
			if (node.type === 'FunctionDeclaration') {
		  		continue
			}
			const signal = nodeIterator.traverse(node, { scope })
			if (Signal.isSignal(signal)) {
		  		return signal
			}
	  	}
	}

}

// 节点遍历器
class NodeIterator{
	constructor(node,scope={}){
		this.node = node;
		this.scope = scope; //处理作用域
		this.nodeHandler = nodeHandler;
	}

	traverse(node,options={}){
		const scope = options.scope || this.scope;
		const nodeIterator = new NodeIterator(node,scope);
		// 节点类型->节点处理器
		const _eval = this.nodeHandler[node.type];

		if(!_eval){
			throw new Error(`lexicalAnalyser:unknown node type ${node.type}`);
		}
		return _eval(node);
	}

	// 维护作用域
	createScope(blockType='block'){
		return new Scope(blockType,this.scope);
	}

}

// 作用域类
class Scope{
	constructor(type,parentScope){
		// 作用域类型:函数作用域和块作用域
		this.type = type;
		// 父级作用域
		this.parentScope = parentScope;
		// 全局作用域
		this.globalDeclaration = standarMap;//?
		// 当前作用域的变量空间
		this.declaration = Object.create(null);
	}
	// 获取作用域变量值,遵循js语法,顺着作用域链往上找

	get(name){
		if(this.declaration[name]){
			return this.declaration[name]
		} else if (this.parentScope){
			return this.parentScope.get(name);
		} else if(this.globalDeclaration[name]){
			return this.globalDeclaration[name];
		} else {
			throw new Error(`${name} is not defined.`)
		}
	}

	set(name,value){
		if(this.declaration[name]){
			this.declaration[name] = value;
		} else if (this.parentScope[name]){
			this.parentScope.set(name,value);
		}else {
			// why not globalDeclaration set?
			throw new Error(`${name} is not defined`)
		}
	}
	// 根据变量的kind调用不同的变量定义方法
	declare(name,value,kind ='var'){
		if(kind ==='var'){
			return this.varDeclare(name,value)
		} else if(kind === 'let'){
			return this.letDeclare(name,value);
		} else if(kind === 'const'){
			return this.constDeclare(name,value);
		} else {
			throw new Error(`Invalid Variable Declaration Kind of "${kind}"`);
		}
	}

	varDeclare(name,value){
		let scope = this;
		// var 变量提升到非function的父级
		while(scope.parentScope && scope.type !== 'function'){
			scope = scope.parentScope;
		}
		this.declaration[name] = new SimpleValue(value,'var');
		return this.declaration[name]
	}
	letDeclare(name,value){
		// let 不能在一个作用域内重复定义
		if(this.declaration[name]){
			 throw new SyntaxError(`Identifier ${name} has already beeen declared`)
		}
		this.declaration[name] = new SimpleValue(value,'let');
		return this.declaration[name];
	}
	constDeclare(name,value){
		// 同样不能重复定义
		if(this.declaration[name]){
			throw new SyntaxError(`Identifier ${name} has already beeen declared`)
		}
		this.declaration[name] = new SimpleValue(value,'const');
		return this.declaration[name];
	}
}

// 定义变量值
class SimpleValue{
	constructor(value,kind=''){
		this.value = value;
		this.kind = kind;
	}

	set(value){
		if(this.kind ==='const'){
			throw new TypeError(`Assignment to constant variable`);
		} else {
			this.value = value;
		}
	}
	get(){
		return this.value;
	}
}

// 识别关键字
class Signal{
	constructor(type,value){
		this.type = type;
		this.value = value;
	}
	static Return(value){
		return new Signal('return',value);
	}
	static Break(value){
		return new Signal('break',value);
	}
	static Continue(value){
		return new Signal('continue',value);
	}
	static isReturn(signal){
		return signal instanceof Signal && signal.type === 'return'
	}
	static isBreak(signal){
		return signal instanceof Signal && signal.type === 'break';
	}
	static isContinue(signal){
		return signal instanceof Signal && signal.type === 'continue';
	}
	static isSignal(signal){
		return signal instanceof Signal;
	}

}