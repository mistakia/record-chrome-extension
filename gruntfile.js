/* global module */

module.exports = function (grunt) {

  grunt.initConfig({
    pkg: grunt.file.readJSON('package.json'),
    clean: {
      options: {
        force: true
      },
      tmp: {
        src: ['tmp/**/*']
      },
      css: {
        src: ['tmp/*.css', 'dist/*.css']
      },
      js: {
        src: ['tmp/*.js', 'dist/*.js']
      }
    },

    /************************ STYLE ************************/
    stylus: {
      options: {
        compress: true,
        'include css': true
      },
      compile: {
        files: [{
		  'tmp/content.css': 'src/content/css/*.styl'
		}]
      }
    },
    cssmin: {
      compress: {
        files: [{
		  'tmp/content.css': 'tmp/content.css'
		}]
      }
    },

    /************************ JAVASCRIPT ************************/
    concat: {
	  content: {
		files: {
		  'tmp/content.js': ['src/content/js/**/*.js', 'src/content/index.js']
		}
	  }
    },
    uglify: {
      options: {
        beautify: {
          ascii_only: true,
          inline_script: true
        }
      },
	  content: {
		files: {
		  'tmp/content.js': ['tmp/content.js']
		}
	  }
    },

    /********************* ASSETS *********************/
    copy: {
      manifest: {
        files: [
          {
            src: 'manifest.json',
            dest: 'dist/'
          }
        ]
      },
      images: {
        files: [
          {
            expand: true,
            src: ['assets/**/*'],
            dest: 'dist/'
          }
        ]
      },
      js: {
        files: [
          {
            expand: true,
            flatten: true,
            src: ['tmp/content.js', 'src/background.js'],
            dest: 'dist/'
          }
        ]
      },
      css: {
        files: [{
		  expand: true,
		  flatten: true,
		  src: 'tmp/content.css',
		  dest: 'dist/'
		}]
      }
    },

    /************************ UTILITY ************************/
    jshint: {
      options: {
        curly: false,
        undef: true,
        unused: true,
        bitwise: true,
        freeze: true,
        immed: true,
        latedef: true,
        newcap: true,
        noempty: true,
        nonew: true,
        trailing: true,
        forin: true,
        eqeqeq: true,
        eqnull: true,
        force: true,
        quotmark: 'single'
      },
      main: [
        './gruntfile.js',
        'src/**/*.js'
      ]
    },
    watch: {
      css: {
        files: ['src/content/css/*.styl'],
        tasks: ['clean:css', 'stylus', 'cssmin', 'copy:css']
      },
      js: {
        files: 'src/**/*.js',
        tasks: ['clean:js', 'concat:content', 'copy:js']
      }
    }
  });

  grunt.loadNpmTasks('grunt-contrib-concat');
  grunt.loadNpmTasks('grunt-contrib-watch');
  grunt.loadNpmTasks('grunt-contrib-stylus');
  grunt.loadNpmTasks('grunt-contrib-copy');
  grunt.loadNpmTasks('grunt-contrib-clean');
  grunt.loadNpmTasks('grunt-contrib-cssmin');
  grunt.loadNpmTasks('grunt-contrib-jshint');
  grunt.loadNpmTasks('grunt-contrib-uglify');

  grunt.registerTask('lint', ['jshint']);

  grunt.registerTask('production', [
    'clean',

    'stylus',
    'cssmin',

	'concat:content',
    'uglify',

    'copy'

  ]);

  grunt.registerTask('default', [
    'clean',

    'stylus',
    'cssmin',

	'concat:content',

    'copy'

  ]);

};
