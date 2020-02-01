const fs = require('fs'),
      gulp = require('gulp'),
      clean = require('gulp-clean'),
      include = require('gulp-include'),
      rename = require('gulp-rename'),
      zip = require('gulp-zip'),
      ts = require('gulp-typescript'),
      sourcemaps = require('gulp-sourcemaps'),
      replace = require('gulp-replace'),
      remove = require('gulp-remove-dev'),
      sass = require('gulp-sass');

gulp.task('clean', function() {
    return gulp.src('dist/*', {read: false})
        .pipe(clean());
});

gulp.task('ts', function () {
    const tsconfig = require("./tsconfig.json");

    return gulp.src('src/*.ts')
        .pipe(sourcemaps.init())
        //.pipe(ts(tsconfig.compilerOptions))
        .pipe(ts(tsconfig.compilerOptions))
        .pipe(replace(/^\s*"use strict";/gm, ""))
        //.pipe(sourcemaps.write('.', { includeContent: false, sourceRoot: '../src' }))
        .pipe(sourcemaps.write({ includeContent: true, sourceRoot: 'modules/npcOverhaulsPatcher/src/' }))
        .pipe(gulp.dest('./compiled'));
});

gulp.task('html', gulp.series(function () {
        return gulp.src('src/*.scss')
            .pipe(sourcemaps.init())
            .pipe(sass().on('error', sass.logError))
            .pipe(sourcemaps.write())
            .pipe(gulp.dest('./compiled'));
    }, function () {
        return gulp.src('src/*.html')
            .pipe(include({includePaths: __dirname + "\\compiled"}))
            .pipe(gulp.dest('./partials'));
    }));

gulp.task('watch', gulp.series(gulp.parallel('html', 'ts'), function() {
    gulp.watch('src/*.ts', gulp.series('ts'));
    gulp.watch(['src/*.scss', 'src/*.html'], gulp.series('html'));
}));

gulp.task('build', gulp.series(['clean', 'ts', 'html'], function() {
    /*const replaceDev = /(?:^\s*)?\/\/<remove>.*?\/\/<\/remove>(?:\s*$)?/gms;
    const replaceDevEnd = /(?:^\s*)?\/\/<remove end>.*$/gms;
    const replaceDevBeginning = /^.*\/\/<remove beginning>(?:\s*$)/gms;*/
    const replaceFile = /(?:^\s*)?\/\/<replace file="(.*?)">(?:\s*$)?/g;

    return Promise.all([
        gulp.src('index.js')
            .pipe(replace(replaceFile, (match, p1, offset, string) => {
                //return fs.readFileSync(match.replace(replaceFile, "$1"), "utf8")
                return fs.readFileSync(p1, "utf8")
                //return fs.readFileSync("compiled/execute.js", "utf8")
                        .replace(remove.regex, "")
                    + "\r\n";
            }))
            .pipe(remove())
            .on('error', console.log)
            .pipe(gulp.dest('dist')),

        gulp.src('partials/*.html')
            .pipe(gulp.dest('dist/partials')),

        gulp.src('module.json')
            .pipe(gulp.dest('dist')),

        gulp.src('LICENSE')
            .pipe(gulp.dest('dist')),

        gulp.src('README.md')
            .pipe(gulp.dest('dist'))
    ])
}));

gulp.task('release', function() {
    let moduleInfo = JSON.parse(fs.readFileSync('module.json')),
        moduleId = moduleInfo.id,
        moduleVersion = moduleInfo.version,
        zipFileName = `${moduleId}-v${moduleVersion}.zip`;

    console.log(`Packaging ${zipFileName}`);

    return gulp.src('dist/**/*', { base: 'dist/'})
        .pipe(rename((path) => path.dirname = `${moduleId}/${path.dirname}`))
        .pipe(zip(zipFileName))
        .pipe(gulp.dest('.'));
});

gulp.task('default', gulp.series('build', 'release'));
