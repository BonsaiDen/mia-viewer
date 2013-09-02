module.exports = function(grunt) {

    grunt.initConfig({

        // Configuration ------------------------------------------------------
        pkg: grunt.file.readJSON('package.json'),

        production: false,

        dirs: {

            // Source
            js: 'src/js',
            lib: 'src/lib',
            less: 'src/less',
            jade: 'src/jade',

            // Generated
            dist: {
                html: 'public',
                css: 'public/css',
                js: 'public/js',
                lib: 'public/lib'
            },

            // Others
            test: 'test'

        },

        files: {
            js: '<%= dirs.js %>/**/*.js',
            less: '<%= dirs.less %>/**/*.less',
            jade: '<%= dirs.jade %>/**/*.jade',
            test: '<%= dirs.test %>/**/*.test.js'
        },


        // Tasks --------------------------------------------------------------
        clean: {
            dist: [
                '<%= dirs.dist.html %>'
            ]
        },

        jshint: {

            grunt: {
                src: ['Gruntfile.js'],
                options: JSON.parse(grunt.file.read('.jshintrc').replace(/\/\/.*/g, ''))
            },

            js: {
                src: ['<%= files.js %>'],
                options: JSON.parse(grunt.file.read('src/js/.jshintrc').replace(/\/\/.*/g, ''))
            },

            test: {
                src: ['<%= files.test %>'],
                options: JSON.parse(grunt.file.read('test/.jshintrc').replace(/\/\/.*/g, ''))
            }

        },

        watch: {
            files: [
                '<%= files.js %>',
                '<%= files.less %>',
                '<%= files.jade %>'
            ],
            tasks: ['compile']
        },

        compile: {

            jade: {
                src: ['<%= files.jade %>'],
                dest: '<%= dirs.dist.html %>',
                base: '<%= dirs.jade %>',
                compiler: 'jade'
            },

            less: {
                src: ['<%= files.less %>'],
                dest: '<%= dirs.dist.css %>',
                base: '<%= dirs.less %>',
                compiler: 'less'
            },

            js: {
                src: ['<%= files.js %>'],
                dest: '<%= dirs.dist.js %>',
                base: '<%= dirs.js %>',
                compiler: 'js',
                concat: true,
                file: 'public/js/all.js'
            },

            lib: {
                src: ['<%= dirs.lib %>'],
                dest: '<%= dirs.dist.lib %>',
                base: '<%= dirs.lib %>'
            }

        }

    });


    // Custom Tasks -----------------------------------------------------------
    var compiler = require('./grunt.compile');
    compiler(grunt);

    // Dependencies -----------------------------------------------------------
    grunt.loadNpmTasks('grunt-contrib-clean');
    grunt.loadNpmTasks('grunt-contrib-uglify');
    grunt.loadNpmTasks('grunt-contrib-jshint');
    grunt.loadNpmTasks('grunt-contrib-watch');
    grunt.loadNpmTasks('grunt-contrib-concat');
    grunt.loadNpmTasks('grunt-mocha-test');


    // Public Tasks -----------------------------------------------------------
    grunt.registerTask('default', 'build');

};

