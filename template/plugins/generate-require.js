/**
 * Created by ximing on 2018/5/13.
 */
'use strict';

module.exports = function (t,packageName,path) {
    const declaration = t.variableDeclarator(t.identifier(packageName),
        t.callExpression(t.identifier('require'),
            [t.stringLiteral(path)]
        )
    );
    return t.variableDeclaration('var', [declaration])
};