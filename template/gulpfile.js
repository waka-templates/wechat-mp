/**
 * Created by ximing on 2018/5/12.
 */
"use strict";
const gulp = require("gulp");
const path = require("path");
const babel = require("gulp-babel");
const sourcemaps = require("gulp-sourcemaps");
const jsonminify = require("gulp-jsonminify");
const cssnano = require("gulp-cssnano");
const rename = require("gulp-rename");
const htmlmin = require("gulp-htmlmin");
const imagemin = require("gulp-imagemin");
const cssBase64 = require("gulp-css-base64");
const gutil = require("gulp-util");
const sass = require("gulp-sass");

const del = require("del");
const runSequence = require("run-sequence");
const gulpif = require("gulp-if");
const uglify = require("gulp-uglify");
const addModule = require("./plugins/babel-preset-wx");

const isProd = () => process.env.NODE_ENV === "production";

gulp.task("js", () =>
    gulp
        .src(["src/**/*.js"])
        .pipe(gulpif(!isProd, sourcemaps.init()))
        .pipe(
            babel({
                presets: [addModule,"es2015", "stage-1"],
                plugins: [],
                ignore: ["src/npm"]
            })
        )
        .on("error", function(err) {
            gutil.log(gutil.colors.red("[Compilation Error]"));
            gutil.log(err.fileName + (err.loc ? `( ${err.loc.line}, ${err.loc.column} ): ` : ": "));
            gutil.log(gutil.colors.red(err.message));
            gutil.log(err.codeFrame);
            this.emit("end");
        })
        .pipe(gulpif(isProd, uglify()))
        .pipe(gulpif(!isProd, sourcemaps.write(".")))
        .pipe(gulp.dest("dist"))
);

gulp.task("wxml", () =>
    gulp
        .src(["src/**/*.{wxml,xml,html}"])
        .pipe(
            gulpif(
                isProd,
                htmlmin({
                    collapseWhitespace: true,
                    includeAutoGeneratedTags: false,
                    keepClosingSlash: true,
                    removeComments: true,
                    removeEmptyAttributes: true,
                    removeScriptTypeAttributes: true,
                    removeStyleLinkTypeAttributes: true
                })
            )
        )
        .pipe(rename({ extname: ".wxml" }))
        .pipe(gulp.dest("dist"))
);

gulp.task("wxss", () =>
    gulp
        .src(["src/**/*.{wxss,css,scss}"])
        .pipe(sass().on("error", sass.logError))
        .pipe(
            cssBase64({
                baseDir: "./src",
                extensionsAllowed: [".png"]
            })
        )
        .pipe(gulpif(isProd, cssnano()))
        .pipe(rename({ extname: ".wxss" }))
        .pipe(gulp.dest("dist"))
);

gulp.task("json", () =>
    gulp
        .src(["src/**/*.json"])
        .pipe(gulpif(isProd, jsonminify()))
        .pipe(gulp.dest("dist"))
);

gulp.task("image", () =>
    gulp
        .src(["src/**/*.{jpg,jpeg,png,gif,svg}"])
        .pipe(gulpif(isProd, imagemin()))
        .pipe(gulp.dest("dist"))
);

gulp.task("extras", () =>
    gulp
        .src(["src/**/*.*", "!src/**/*.{js,wxml,xml,html,wxss,json,css,jpg,jpeg,png,gif,svg}"])
        .pipe(gulp.dest("dist"))
);

gulp.task("clean", () => del(["dist/*"]));

gulp.task("build", () => runSequence("clean", ["js", "wxml", "wxss", "json", "image", "extras"]));

gulp.task("watch", ["build"], () => {
    gulp.watch("src/**/*.js", ["js"]);
    gulp.watch("src/**/*.{wxml,xml,html}", ["wxml"]);
    gulp.watch("src/**/*.{wxss,css}", ["wxss"]);
    gulp.watch("src/**/*.json", ["json"]);
    gulp.watch("src/**/*.{jpg,jpeg,png,gif,svg}", ["image"]);
    gulp.watch(
        ["src/**/*.*", "!src/**/*.{js,wxml,xml,html,wxss,json,css,jpg,jpeg,png,gif,svg}"],
        ["extras"]
    );
});

gulp.task("default", ["watch"]);
