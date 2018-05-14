/**
 * Created by ximing on 2018/5/12.
 */
"use strict";
const gr = require("./generate-require");
module.exports = function({ types: t }) {
    return {
        visitor: {
            ImportSpecifier: function(path, state) {
                state.file.set("hasBabelHelpers", true);
            },
            ImportDefaultSpecifier: function(path, state) {
                state.file.set("hasBabelHelpers", true);
            },
            ImportNamespaceSpecifier: function(path, state) {
                state.file.set("hasBabelHelpers", true);
            },
            Function(path, state) {
                if (!path.node.async || path.node.generator) return;
                state.file.set("hasAsync", true);
            },
            Identifier(path, { file }) {
                if (path.node.name === "Promise") {
                    file.set("hasPromise", true);
                }
                if (path.node.name === "babelHelpers") {
                    file.set("hasBabelHelpers", true);
                }
            },
            Program: {
                enter(path, { file }) {
                    file.set("hasPromise", false);
                    file.set("hasBabelHelpers", false);
                    file.set("hasAsync", false);
                },
                exit({ node, scope }, { file }) {
                    let metadata = file.get("helpersNamespace");
                    if (
                        // 没有使用 external helpers 插件
                        metadata &&
                        metadata.name &&
                        // 没有使用到任何 helpers 并且也没有使用 import
                        !(
                            !(file.usedHelpers && Object.keys(file.usedHelpers).length) &&
                            !file.get("hasBabelHelpers")
                        ) &&
                        !scope.hasOwnBinding("babelHelpers")
                    ) {
                        let externalHelperName = metadata.name;
                        node.body.unshift(gr(t, externalHelperName, "@npm/babel-help"));
                    }
                    if (file.get("hasPromise") && !scope.hasOwnBinding("Promise")) {
                        node.body.unshift(gr(t, "Promise", "@npm/promise"));
                    }
                    if (file.get("hasAsync") && !scope.hasBinding("regeneratorRuntime")) {
                        node.body.unshift(gr(t, "regeneratorRuntime", "@npm/regenerator-runtime"));
                    }
                }
            }
        }
    };
};
