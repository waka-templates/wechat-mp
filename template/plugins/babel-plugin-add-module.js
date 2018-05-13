/**
 * Created by ximing on 2018/5/12.
 */
'use strict';
const gr = require('./generate-require')
module.exports = function ({ types: t }) {
    return {
        visitor: {
            Identifier(path, { file }) {
                if(path.node.name === 'Promise'){
                    file.set('hasPromise', true);
                }
                if(path.node.name === 'babelHelpers'){
                    file.set('hasBabelHelpers', true);
                }
            },
            Program: {
                enter(path, { file }) {
                    file.set('hasPromise', false);
                    file.set('hasBabelHelpers', false);
                },
                exit({ node, scope }, { file }) {
                    if (file.get('hasPromise') && !scope.hasOwnBinding('Promise')) {
                        node.body.unshift(gr(t,'Promise','@npm/promise'));
                    }
                    if(file.get('hasBabelHelpers') && !scope.hasOwnBinding('babelHelpers')){
                        node.body.unshift(gr(t,'babelHelpers','@npm/babel-help'));
                    }
                }
            }
        }
    };
}
