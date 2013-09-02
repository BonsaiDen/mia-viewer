// Dependencies ---------------------------------------------------------------
var fs = require('fs.extra'),
    path = require('path'),
    less = require('less'),
    jade = require('jade');


// Default Compilers ----------------------------------------------------------
// ----------------------------------------------------------------------------
var Compilers = {

    // Less -> CSS
    less: function(filename, data, options, done) {

        var parser = new less.Parser({
                filename: filename
            });

        parser.parse(data, function(err, tree) {
            if (err) {
                done(err);

            } else {
                done(null, tree.toCSS({
                    compress: options.production

                }), 'css');
            }
        });

    },

    // Jade -> HTML
    jade: function(filename, data, options, done) {
        done(null, jade.render(data, {
            pretty: !options.production
        }), 'html');
    },

    // JS -> Minify
    js: function(filename, data, options, done) {
        if (options.production) {

            var uglify = require('uglify-js'),
                pro = uglify.uglify,
                ast = uglify.parser.parse(data);

            ast = pro.ast_mangle(ast);
            ast = pro.ast_queeze(ast);

            done(null, pro.gen_code(ast), null);

        } else {
            done(null, data, null);
        }
    }

};

var Concators = {

    less: function(files) {
        return files.map(function(f) {
            return '/*' + f.dest + '*/\n' + f.data;

        }).join('\n\n');
    },

    js: function(files) {
        return files.map(function(f) {
            return '//' + f.dest + '\n' + f.data;

        }).join('\n;\n');
    }

};

// Helper Functions -----------------------------------------------------------
function Callback(done, func) {
    return function(err, data, extension) {
        if (err) {
            done(err);

        } else {
            func(data, extension);
        }
    };
}

function writeFile(src, dest, data, done) {
    fs.mkdirp(path.dirname(dest), function(err) {

        if (err) {
            done(err);

        } else {
            fs.writeFile(dest, data, function(err, buffer) {
                if (err) {
                    done(err);

                } else {
                    if (src) {
                        done(null, 'Wrote: ' + src + ' -> ' + dest);

                    } else {
                        done(null, 'Wrote: ' + dest);
                    }
                }
            });
        }

    });
}

function Writer(filename, options, done) {
    return new Callback(done, function(data, extension) {
        writeFile(filename, options.dest(filename, extension), data, done);
    });
}

function Concator() {

    var files = [];
    function c(filename, options, done) {
        return new Callback(done, function(data, extension) {
            files.push({
                src: filename,
                dest: options.dest(filename, extension),
                data: data
            });
            done(null, 'Concat: ' + filename);
        });
    }

    c.getFiles = function() {
        return files;
    };

    return c;

}

function DestinationFactory(destination, base) {

    var baseExp = new RegExp('^' + base),
        extExp = /\..*?$/;

    return function(src, extension) {
        var dest = src.replace(baseExp, destination);
        if (extension) {
            dest = dest.replace(extExp, '.' + extension);
        }
        return dest;
    };

}


// Task Helper ----------------------------------------------------------------
function TaskHandler(grunt, pending, gruntDone, complete) {

    return function(err, msg) {

        if (err) {
            grunt.log.error(err);
            gruntDone(false);

        } else {

            grunt.log.ok(' - ' + msg);
            pending--;

            if (pending === 0) {

                if (typeof complete === 'function') {
                    complete(gruntDone);

                } else {
                    gruntDone();
                }

            }
        }

    };

}

function copyTask(sources, options, done) {

    sources.forEach(function(src) {

        var dest = options.dest(src);
        fs.stat(src, function(err, stats) {

            if (err) {
                done(err);

            } else if (stats.isFile()) {
                fs.copy(src, dest, function(err) {

                    if (err) {
                        done(err);

                    } else {
                        done(null, 'Copied: ' + src + ' -> ' + dest);
                    }

                });

            } else if (stats.isDirectory()) {
                fs.copyRecursive(src, dest, function(err) {
                    if (err) {
                        done(err);

                    } else {
                        done(null, 'Copied: ' + src + ' -> ' + dest);
                    }
                });

            }
        });

    });

}

function compileTask(files, writer, options, done) {

    files.forEach(function(filename) {

        fs.readFile(filename, {
            encoding: 'utf8'

        }, function(err, data) {

            if (err) {
                done(err);

            // Compile (and possible concat)
            } else if (options.compiler) {

                var compiler = typeof options.compiler !== 'function'
                                    ? Compilers[options.compiler]
                                    : options.compiler;

                compiler(filename, data, options, writer(filename, options, done));

            // Just concat
            } else if (options.concat) {
                writer(filename, options, done)(data);
            }

        });
    });

}

function concatTask(files, handler, options, done) {

    if (!handler) {
        done('No concatenation function specified');

    } else {
        writeFile(null, options.file, handler(files, options), done);
    }
}


// Task Export ----------------------------------------------------------------
// ----------------------------------------------------------------------------
module.exports = function(grunt) {

    grunt.registerMultiTask('compile', 'Compile the source files', function() {

        var taskDone = this.async(),
            pending = this.filesSrc.length,
            done;

        var options = {
            dest: new DestinationFactory(this.data.dest, this.data.base || ''),
            compiler: this.data.compiler || null,
            concat: this.data.concat || null,
            production: !!grunt.config.data.production,
            file: this.data.file || ''
        };

        var Handler;
        function combine(gruntDone) {

            var Combiner;
            if (options.concat === true) {
                Combiner = Concators[options.compiler];

            } else if (typeof options.concat === 'function') {
                Combiner = options.concat;
            }

            concatTask(Handler.getFiles(), Combiner, options, function(err, msg) {
                if (err) {
                    grunt.log.error(err);
                    gruntDone(false);

                } else {
                    grunt.log.ok(msg);
                    gruntDone();
                }
            });

        }

        // Compile files
        if (options.compiler || options.concat) {

            // Either write the files out one by one or combine them
            if (options.concat) {
                Handler = new Concator();
                done = new TaskHandler(grunt, pending, taskDone, combine);

            } else {
                done = new TaskHandler(grunt, pending, taskDone);
                Handler = Writer;
            }

            compileTask(this.filesSrc, Handler, options, done);

        // Copy files and directories
        } else {
            done = new TaskHandler(grunt, pending, taskDone);
            copyTask(this.filesSrc, options, done);
        }

    });

};



