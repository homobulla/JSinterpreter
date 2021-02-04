## JSinterpreter
> https://github.com/jrainlau/canjs
用JS写一个js解释器
### 词法分析器 Lexical Analyser
将表达式拆解为最小词义单位`Token`。
词法分析器扫描代码，提取词义单位，然后评估词义单位的类型。
### 句法解析器 Syntax Parser
将词义单位转为AST即抽象语法树。
### 字节码生成器 Bytecode generator
将抽象语法树转为JavaScript引擎可以执行的二进制代码
### 字节码解释器 Bytecode interpreter
读取并执行字节码

### 参考
- [esprima](https://esprima.org/)
- [js.js](https://github.com/jterrace/js.js)
- [前端与编译原理——用JS写一个JS解释器](https://segmentfault.com/a/1190000017241258)