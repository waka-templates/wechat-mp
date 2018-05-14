/**
 * Created by ximing on 2018/5/14.
 */
"use strict";
const path = require("path");
const addModule = require("./babel-plugin-add-module");
module.exports = {
    presets: [],
    plugins: [
        "external-helpers",
        addModule,
        [
            "module-resolver",
            {
                extensions: [".js"],
                resolvePath(sourcePath, currentFile, opts) {
                    if (/^@npm\/(.+)/.test(sourcePath)) {
                        let relativePath = path.relative(
                            path.dirname(currentFile),
                            path.join(process.cwd(), "src/lib", sourcePath.slice(1))
                        );
                        //兼容 app.js 里面的路径引用不支持 lib/npm/babel-help 相对路径的写法
                        return relativePath.indexOf(".") === 0 ? relativePath : `./${relativePath}`;
                    }
                    return sourcePath;
                }
            }
        ]
    ]
};
