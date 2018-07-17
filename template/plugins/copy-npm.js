/**
 * Created by ximing on 2018/5/26.
 */
'use strict';
const gutil = require('gulp-util');
const path = require('path');
const through = require('through2');
const fs = require('fs');
const fse = require('fs-extra');
const chalk = require('chalk');
const babylon = require('babylon');
const babelTraverse = require('babel-traverse').default;
const generate = require('babel-generator').default;
const t = require('babel-types');
const dest_node_modules_dir_name = 'wx-npm-modules';

let config = {
    'cn-src': 'src',
    'cn-dest': 'dist',
    'cn-node_modules': '../node_modules',
    'cn-log': false
};

const cn = {
    cache: {},
    gulp: {},

    srcToDest: function(source) {
        let temp = source.replace(this.currentDir, '');
        temp = temp.replace(config['cn-src'], config['cn-dest']);
        return path.join(this.currentDir, temp);
    },

    destToSrc: function(source) {
        let temp = source.replace(this.currentDir, '');
        temp = temp.replace(config['cn-dest'], config['cn-src']);
        return path.join(this.currentDir, temp);
    },
    isFile(p) {
        p = typeof p === 'object' ? path.join(p.dir, p.base) : p;
        if (!fs.existsSync(p)) {
            return false;
        }
        return fs.statSync(p).isFile();
    },
    isDir(p) {
        if (!fs.existsSync(p)) {
            return false;
        }
        return fs.statSync(p).isDirectory();
    },

    currentDir: process.cwd(),

    destDir: function() {
        return path.join(this.currentDir, config['cn-dest']);
    },
    srcDir: function() {
        return path.join(this.currentDir, config['cn-src']);
    },
    //目标 node_modules 目录
    dest_node_modules_dir: function() {
        return path.join(this.destDir(), dest_node_modules_dir_name);
    },
    src_node_modules_dir: function() {
        return path.join(this.srcDir(), config['cn-node_modules']);
    },

    printLog: function(info) {
        config['cn-log'] && gutil.log(info);
    },

    fixGlobalAndWindow: function(code) {
        if (/global|window/.test(code)) {
            code =
                `
            var global=window= {
  Array: Array,
  Date: Date,
  Error: Error,
  Function: Function,
  Math: Math,
  Object: Object,
  RegExp: RegExp,
  String: String,
  TypeError: TypeError,
  setTimeout: setTimeout,
  clearTimeout: clearTimeout,
  setInterval: setInterval,
  clearInterval: clearInterval,
};
            ` + code;
        }
        return code;
    },

    fixNPM: function(code) {
        code = code.replace(/([\w\[\]a-d\.]+)\s*instanceof Function/g, function(matchs, word) {
            return ' typeof ' + word + " ==='function' ";
        });
        code = code.replace(/'use strict';\n?/g, '');

        if (/[^\w_]process\.\w/.test(code) && !/typeof process/.test(code)) {
            code = `var process={};${code}`;
        }
        return code;
    },

    npmHack(code, filename) {
        switch (filename) {
            // case 'lodash.js':
            // case '_global.js':
            //     code = code.replace("Function('return this')()", 'this');
            //     break;
            // case '_html.js':
            //     code = 'module.exports = false;';
            //     break;
            // case '_microtask.js':
            //     code = code.replace('if(Observer)', 'if(false && Observer)');
            //     // IOS 1.10.2 Promise BUG
            //     code = code.replace(
            //         'Promise && Promise.resolve',
            //         'false && Promise && Promise.resolve'
            //     );
            //     break;
        }
        return code;
    },

    copyNPMDeps: function(code, destPath, currentNodeSrcDir, isNPM) {
        let err = null;
        let dest_node_modules_dir = this.dest_node_modules_dir();
        let destDir = path.parse(destPath).dir;
        // code = this.fixGlobalAndWindow(code);
        let ast;
        ast = babylon.parse(code, { sourceType: 'module' });
        babelTraverse(ast, {
            Expression: {
                enter: (astPath) => {
                    const node = astPath.node;
                    if (!err && node.type === 'CallExpression' && node.callee.name === 'require') {
                        if (
                            node.arguments &&
                            node.arguments.length === 1 &&
                            t.isStringLiteral(node.arguments[0])
                        ) {
                            let lib = node.arguments[0].value;
                            let ext = '';
                            let resolved = lib;
                            let dep;
                            let relative = '';

                            if (lib[0] === '.') {
                                // require('./something'');
                                if (!isNPM) {
                                    return;
                                }
                                ext = '.js';
                                dep = path.join(currentNodeSrcDir, lib);
                                relative = '';
                            } else if (
                                lib.indexOf('/') === -1 ||
                                lib.indexOf('/') === lib.length - 1
                            ) {
                                let pkg = this.getPkgConfig(lib, this.gulp.enc);
                                if (!pkg) {
                                    err = new gutil.PluginError(
                                        'cn-copy-npm',
                                        'Package not found:' + lib
                                    );
                                    return;
                                }
                                ext = pkg.main || 'index.js';
                                if (pkg.browser && typeof pkg.browser === 'string') {
                                    ext = pkg.browser;
                                }
                                if (ext.indexOf('./') === 0) {
                                    ext = ext.replace('./', '');
                                }
                                ext = path.sep + ext;
                                dep = path.join(this.src_node_modules_dir(), lib);
                                relative = path.relative(destDir, dest_node_modules_dir);
                            } else {
                                // require('babel-runtime/regenerator')
                                dep = path.join(this.src_node_modules_dir(), lib);
                                if (this.isDir(dep)) {
                                    let pkg = this.getPkgConfig(lib, this.gulp.enc);
                                    if (pkg) {
                                        ext = pkg.main || 'index.js';
                                        if (pkg.browser && typeof pkg.browser === 'string') {
                                            ext = pkg.browser;
                                        }
                                    } else {
                                        ext = path.sep + 'index.js';
                                        if (!this.isFile(dep + ext)) {
                                            err = new gutil.PluginError(
                                                'cn-copy-npm',
                                                'Package not found:' + lib
                                            );
                                            return;
                                        }
                                    }
                                    if (ext.indexOf('./') === 0) {
                                        ext = ext.replace('./', '');
                                    }
                                    if (ext[0] !== '/') {
                                        ext = `/${ext}`;
                                    }
                                    // ext = path.sep + 'index.js';
                                    // this.isFile(dep + path.sep + 'index.js')
                                } else if (this.isFile(dep + '.js')) {
                                    ext = '.js';
                                } else if (this.isFile(dep)) {
                                    ext = '';
                                } else {
                                    err = new gutil.PluginError(
                                        'cn-copy-npm',
                                        'File not found:' + dep
                                    );
                                    return;
                                }
                                relative = path.relative(destDir, dest_node_modules_dir);
                            }

                            resolved = path.join(relative, lib + ext);

                            if (lib !== resolved) {
                                this.printLog(
                                    `Replace file: ${destDir} depences: from(${chalk.cyan(
                                        lib
                                    )}) to(${chalk.cyan(resolved)})`
                                );
                            }

                            let npmPathString = dep.endsWith(ext) ? dep : dep + ext;
                            let npmPath = path.parse(npmPathString);

                            let outPath = path.join(
                                this.currentDir,
                                config['cn-dest'],
                                dest_node_modules_dir_name,
                                npmPathString.replace(this.src_node_modules_dir(), '')
                            );
                            this.printLog(
                                `Copy npm depences: from(${chalk.cyan(
                                    npmPathString
                                )}) to(${chalk.cyan(outPath)}) ...`
                            );

                            resolved = resolved.replace(new RegExp('\\' + path.sep, 'g'), '/'); //Fix #1

                            node.arguments[0].value =
                                resolved[0] !== '.' ? `./${resolved}` : resolved;

                            if (this.cache[outPath]) {
                                return;
                            }

                            let depCode = fs.readFileSync(npmPathString, {
                                encoding: this.gulp.enc
                            });

                            err = this.copyNPMDeps(depCode, outPath, npmPath.dir, true).err;
                        }
                    }
                }
            }
        });
        code = generate(ast, {
            quotes: 'single',
            retainLines: true
        }).code;

        if (isNPM && !this.cache[destPath] && !err) {
            code = this.npmHack(code, path.parse(destPath).base);
            code = this.fixNPM(code);
            code = this.doPlugins(code, destPath);
            fse.outputFileSync(destPath, code, {
                encoding: this.gulp.enc
            });
            this.cache[destPath] = true;
        }

        return {
            code: code,
            err: err
        };
    },

    getPkgConfig(lib, enc) {
        let pkg = null;
        try {
            pkg = fs.readFileSync(path.join(this.src_node_modules_dir(), lib, 'package.json'), enc);
            pkg = JSON.parse(pkg);
        } catch (e) {
            pkg = null;
        }
        return pkg;
    },

    doPlugins: function(depCode, destPath) {
        let result = depCode;
        let plugins = config.plugins;
        if (config.plugins) {
            for (let i = 0; i < plugins.length; i++) {
                let plugin = plugins[i];
                result = plugin(result, destPath, cn.gulp);
            }
        }
        return result;
    }
};

module.exports = function(options) {
    config = Object.assign(config, options);
    return through.obj(function(file, enc, callback) {
        cn.gulp.file = file;
        cn.gulp.enc = enc;
        cn.gulp.callback = callback;
        cn.cache = {};
        let sourceCode = file._contents.toString(enc);
        let { err, code } = cn.copyNPMDeps(
            sourceCode,
            cn.srcToDest(file.path),
            cn.src_node_modules_dir(),
            false
        );
        file._contents = new Buffer(code);
        // err maybe null
        callback(err, file);
    });
};
