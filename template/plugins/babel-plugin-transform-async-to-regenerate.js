/**
 * Created by ximing on 2018/5/12.
 */
'use strict';
const gr = require('./generate-require')
// const remapAsyncToGenerator  = require("babel-helper-remap-async-to-generator");

module.exports = function ({ types: t }) {
    return {
        visitor: {
            Function(path, state) {
                if (!path.node.async || path.node.generator) return;
                state.file.set('hasAsync', true);
                // remapAsyncToGenerator(path, state.file, {
                //     wrapAsync: state.addHelper("asyncToGenerator")
                // });
            },
            Program: {
                enter(path, { file }) {
                    file.set('hasAsync', false);
                },
                exit({ node, scope }, { file }) {
                    if (file.get('hasAsync') && !scope.hasBinding('regeneratorRuntime')) {
                        node.body.unshift(gr(t,'regeneratorRuntime','@npm/regenerator-runtime'));
                    }


                    // const regeneratorImportDeclaration = t.importDeclaration([
                    //     t.importDefaultSpecifier(t.identifier('regeneratorRuntime')),
                    // ], t.stringLiteral('@npm/regenerator-runtime'));
                    // node.body.unshift(regeneratorImportDeclaration);
                }
            }
        }
    };
}
