module.exports = function( grunt ) {
	// require( 'time-grunt' )( grunt );
	require( 'jit-grunt' )( grunt );

	var	vendorjsFiles = [ 'assets/js/vendor/*.js' ],
		componentjsFiles = [ 'assets/js/app.js', 'assets/js/parts/*.js', 'components/**/*.js' ],
		alljsFiles = [].concat( vendorjsFiles, componentjsFiles ),
		sassFiles = [ 'assets/css/vendor/*.scss', 'assets/css/theme/*.scss', 'assets/css/style.scss', 'assets/css/parts/*.scss', 'components/**/*.scss', 'assets/css/editor-style.scss' ];

	grunt.initConfig({
		pkg: grunt.file.readJSON( 'package.json' ),

		notify_hooks: {
			options: {
				success: true,
			},
		},

		concat: {
			components: {
				src: componentjsFiles,
				dest: 'assets/cache/babel/pre-babel.js',
				options: {
					footer: '})( window, document, jQuery );',
					process: function( src, filepath ) {
						if ( 'assets/js/app.js' === filepath ) {
							src = "(function( root, document, $ ) {\n\t'use strict';\n" + src;
						}

						return src;
					},
				},
			},
			postBabel: {
				src: [].concat( vendorjsFiles, [ 'assets/cache/babel/post-babel.js' ] ),
				dest: 'assets/dist/app.min.js',
			},
			options: {
				sourceMap: false
			}
		},

		uglify: {
			dist: {
				src: 'assets/dist/app.min.js',
				dest: 'assets/dist/app.min.js',
				options: {
					drop_console: true,
				},
			},
		},

		sass: {
			dist: {
				files: {
					'assets/cache/postcss/style.min.css': 'assets/css/style.scss',
					'assets/cache/postcss/editor-style.min.css': 'assets/css/editor-style.scss',
				},
				options: {
					outputStyle: 'compressed',
				},
			},
			dev: {
				files: {
					'assets/cache/postcss/style.min.css': 'assets/css/style.scss',
					'assets/cache/postcss/editor-style.min.css': 'assets/css/editor-style.scss',
				},
				options: {
					sourceMap: true,
					outputStyle: 'compressed',
				},
			},
		},

		postcss: {
			dist: {
				files: [{
					expand: true,
					cwd: 'assets/cache/postcss/',
					src: [ '*.css' ],
					dest: 'assets/dist/',
				}],
			},
			dev: {
				files: [{
					expand: true,
					cwd: 'assets/cache/postcss/',
					src: [ '*.css' ],
					dest: 'assets/dist/',
				}],
				options: {
					map: true,
				},
			},
			options: {
				processors: [
					require( 'autoprefixer' )({ browsers: [ 'last 2 versions', 'IE >= 10', 'iOS 8' ] }),
				],
			},
		},

		sass_globbing: {
			dist: {
				files: {
					'assets/cache/import-maps/_vendor.scss': 'assets/css/vendor/*.scss',
					'assets/cache/import-maps/_parts.scss': 'assets/css/parts/*.scss',
					'assets/cache/import-maps/_components.scss': 'components/**/*.scss',
					'assets/cache/import-maps/_dependencies.scss': [ 'assets/css/theme/variables.scss', 'assets/css/theme/mixins.scss', 'assets/css/theme/helpers.scss' ],
				},
				options: {
					useSingleQuotes: false,
					signature: false,
				},
			},
		},

		imagemin: {
			dynamic: {
				options: {
					optimizationLevel: 5, // 0-7 where 3 is default. Higher is heavier.
				},
				files: [ {
					expand: true,
					cwd: 'assets/img/',
					src: [ '**/*.{png,jpg,gif,svg}', '*.{png,jpg,gif,svg}' ],
					dest: 'assets/img/',
				} ],
			},
		},

		clean: {
			cache: 'assets/cache/*',
		},

		copy: {
			fontello: {
				src: 'assets/css/vendor/fontello.scss',
				dest: 'assets/dist/fontello.css',
			},
		},

		stylelint: {
			dev: {
				src: [
					'assets/css/style.scss',
					'assets/css/editor-style.scss',
					'assets/css/theme/*.scss',
					'assets/css/parts/*.scss',
					'components/**/*.scss',
				],
				options: {
					configFile: 'assets/config/.stylelintrc.json',
					failOnError: true,
					syntax: 'scss'
				}
			}
		},

		eslint: {
			dev: {
				src: componentjsFiles,
				options: {
					configFile: 'assets/config/.eslintrc.json',
					rules: {
						"no-console": 0
					}
				}
			},
			dist: {
				src: componentjsFiles,
				options: {
					configFile: 'assets/config/.eslintrc.json',
				}
			},
		},

		babel: {
			options: {
				sourceMap: false,
			},
			dev: {
				src: 'assets/cache/babel/pre-babel.js',
				dest: 'assets/cache/babel/post-babel.js',
			},
			dist: {
				src: 'assets/cache/babel/pre-babel.js',
				dest: 'assets/cache/babel/post-babel.js',
				options: {
					presets: [
						[
							'env',
							{
								targets: {
									browsers: [ 'last 2 versions', 'IE >= 10', 'iOS 8' ]
								}
							}
						]
					]
				},
			},
		},

		watch: {
			js: {
				files: alljsFiles,
				tasks: 'js',
			},
			css: {
				files: sassFiles,
				tasks: 'css',
			},
			fontello: {
				files: [ 'assets/css/vendor/fontello.scss' ],
				tasks: 'copy:fontello',
			},
			livereload: {
				files: [ 'assets/dist/style.min.css', 'assets/dist/app.min.js' ],
				options: {
					livereload: true,
					livereloadOnError: false,
				},
			},
		},

	});

	grunt.loadNpmTasks( 'grunt-notify' );
	grunt.task.run( 'notify_hooks' );

	grunt.registerTask( 'default', [], function() {
		grunt.task.run( 'watch' );
	});

	grunt.registerTask( 'lint', [], function() {
		grunt.task.run(
			'eslint:dist',
			'stylelint',
		);
	});

	grunt.registerTask( 'js', [], function() {
		grunt.task.run(
			'changed:eslint:dev',
			'concat:components',
			'babel:dev',
			'concat:postBabel'
		);
	});

	grunt.registerTask( 'css', [], function() {
		grunt.task.run(
			'changed:stylelint',
			'sass_globbing:dist',
			'sass:dev',
			'changed:postcss:dev'
		);
	});

	grunt.registerTask( 'img', [], function() {
		grunt.task.run( 'imagemin' );
	});

	grunt.registerTask( 'dist', [], function() {
		grunt.task.run(
			'eslint:dist',
			'stylelint',
			'concat:components',
			'babel:dist',
			'concat:postBabel',
			'uglify:dist',
			'sass_globbing',
			'sass:dist',
			'postcss:dist',
		);
	});
};
