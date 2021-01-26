(function (root, document, $) {
	'use strict';

	class App {

		static addComponent(className, selector) {
			if ('function' !== typeof className) {
				throw new Error('Expected "className" to be a class.');
			}

			if (!(className.prototype instanceof Component)) {
				throw new Error(`Expected ${className.name} to a subclass of Component.`);
			}

			if ('string' !== typeof selector && 'undefined' !== typeof selector) {
				throw new Error(`Expected selector "${selector}" to be a string or not defined at all.`);
			}

			if ('string' === typeof selector && 3 > selector.length) {
				throw new Error('Expected selector "${selector}" to have a length of at least 2.');
			}

			if ('undefined' === typeof App.components || !(App.components instanceof Array)) {
				App.components = [];
			}

			const component = {
				className
			};

			if (selector) {
				component.selector = selector;
			}

			App.components.push(component);
		}

		static getComponents() {
			return App.components;
		}

		static init() {
			Component.body = App.body = $(document.body);

			App.componentInstances = [];

			for (let i = App.components.length - 1; 0 <= i; i--) {
				const component = App.components[i];

				App.initClassWithSelector(component.className, component.selector);
			}

			App.body.addClass('is-loaded');
		}

		static initClassWithSelector(className, selector) {
			if ('string' === typeof selector) {
				const elements = $(selector);

				if (0 < elements.length) {
					elements.each((i, element) => {
						App.componentInstances[className.name] = App.componentInstances[className.name] || [];

						const $element = $(element);
						const instance = new className($element, selector);

						$element.data('instance', instance);
						App.componentInstances[className.name].push(instance);
					});
				}
			} else if ('undefined' === typeof selector && 0 === className.length) {
				App.componentInstances[className.name] = new className();
			}
		}
	}

	class Component {
		constructor(element, selector) {
			if ('undefined' !== typeof element && 'number' === typeof element.length) {
				this.element = element;
				this.selector = selector;
			}

			if ('function' !== typeof this.init) {
				throw new Error(`Class ${this.name} need to have a "init" function.`);
			}

			this.init();
		}

		static addComponent() {
			App.addComponent(this, ...arguments);
		}
	}

	// init
	$(() => App.init());

	class CookieBar extends Component {

		init() {
			$.cookieBar({
				message: theme.cookieMessageText,
				acceptText: theme.cookieAcceptText,
				fixed: true,
				bottom: true
			});
		}
	}

	CookieBar.addComponent();

	class Theme extends Component {

		init() {
			this.addMenuClass();
			//this.bindUIActions();
			// this.addOpenClass();
		}

		addMenuClass() {
			$(document).on('ready', () => {
				$('li.menu-item:has( ul.sub-menu )').addClass('menu-item-has-children');
			});
		}

		// addOpenClass() {
		// 	$( '.menu-item-has-children::before' ).on( 'click', () => {
		// 		console.log( e.currentTarget, this );
		// 	});
		// }

		// bindUIActions() {
		// 	this.element
		// 		.on( 'click', e => {
		// 			console.log( e.currentTarget, this );
		// 			alert( `${e.currentTarget} clicked!` );
		// 		});
		// }
	}

	Theme.addComponent('body');

	class Accordion extends Component {

		init() {
			this.accordionInit();
		}

		accordionInit() {
			const acc = document.getElementsByClassName('accordion-title');
			for (let i = 0; i < acc.length; i++) {
				acc[i].addEventListener('click', e => {
					const __this = $(e.currentTarget);
					__this.toggleClass('active');
					if (false === __this.next().is(':visible')) {
						__this.next().removeClass('hide-block');
					} else {
						__this.next().addClass('hide-block');
					}
				});
			}
		}
	}

	Accordion.addComponent('.component--accordion-content');

	class GoogleMap extends Component {

		init() {
			this.mapGoogleInit();
		}

		mapGoogleInit() {
			const latitude = $('#hidden-latitude').val();
			const longitude = $('#hidden-longitude').val();
			const address = $('#hidden-address').val();
			const myZoom = $('#hidden-zoom-level').val();
			const myLatLng = new google.maps.LatLng(latitude, longitude);
			const myOptions = {
				zoom: parseInt(myZoom),
				center: myLatLng
			};
			const map = new google.maps.Map(document.getElementById('map_canvas'), myOptions);
			const marker = new google.maps.Marker({
				map,
				position: myLatLng,
				title: address
			});

			marker.setMap(map);
		}
	}

	GoogleMap.addComponent('.component--google-map');

	class ImageBlock extends Component {

		init() {
			//this.swiperSlider();
		}

		swiperSlider() {
			new Swiper('.swiper-container', {
				slidesPerView: 2,
				spaceBetween: 30,
				slidesPerGroup: 1,
				centeredSlides: true,
				loop: true,
				loopFillGroupWithBlank: true,

				// Responsive breakpoints
				breakpoints: {
					//when window width is >= 767px
					767: {
						slidesPerView: 1,
						spaceBetween: 10,
						centeredSlides: false
					}
					//when window width is >= 480px
					//1280: {
					//	slidesPerView: 3,
					//	spaceBetween: 10,
					//},
				},

				navigation: {
					nextEl: '.swiper-button-next',
					prevEl: '.swiper-button-prev'
				}
			});
		}
	}

	ImageBlock.addComponent('.component--image');

	let clickedMarker = {};
	let infoWindow = null;
	let maps = null;
	let markerClusterer = null;
	const gpolygons = [];
	let icons = '';
	let markers = [];
	let markersData = [];
	const centerlocation = [];
	let markerCurrent = [];
	let markersDatacurrent = [];
	markersDatacurrent[0] = {};

	let blackPin = `${theme.template_path}/assets/img/black_pin.svg`;
	let greenPin = `${theme.template_path}/assets/img/pin-green.svg`;
	let redPin = `${theme.template_path}/assets/img/pin.svg`;

	if (/Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)) {
		blackPin = `${theme.template_path}/assets/img/small_black_pin.svg`;
		greenPin = `${theme.template_path}/assets/img/small_green-pin.svg`;
		redPin = `${theme.template_path}/assets/img/small_pin.svg`;
	}
	let imageUrl = redPin;

	class ProjectMap extends Component {

		init() {
			this.initialProjectData();
			this.googleMapInit();
			this.districtGraphsCords();
			this.changeOnMapFilter();

			$('#project-map-table').DataTable({ 'order': [] });
		}

		initialProjectData() {
			const __this = this;
			let req = null;
			if (null != req) {
				req.abort();
			}
			req = jQuery.ajax({
				type: 'post',
				dataType: 'json',
				url: theme.ajaxurl,
				data: {
					action: 'buildup_get_all_projects'
				},
				beforeSend: function () {
					// $( '#load_more_articles' ).addClass( 'loading' );
				},
				success: function (json) {
					if (json) {
						if (true === json.success && json.data.content) {
							markersData = JSON.parse(JSON.stringify(json.data.content));
							markerCurrent = JSON.parse(JSON.stringify(json.data.content));
							if ('' != markerCurrent) {
								markersDatacurrent = markerCurrent;
								clickedMarker = markersDatacurrent;
								clickedMarker.title = clickedMarker.post_title;
							}
							__this.displayMarkers();
						}
					}
				}
			});
		}

		changeOnMapFilter() {
			const __this = this;
			$(document).on('change', '.selectMapFilter', e => {
				$('#project-map-table').DataTable().clear().destroy();
				const __thiscur = $(e.currentTarget);
				const province = $('#province').val();
				const projecttype = $('#project_type').val();
				const district = $('#district').val();
				const changecat = __thiscur.attr('name');
				$('.loader').css('display', 'block');
				$('#googleMap').css('opacity', '0.7');
				$('body, html').animate({
					scrollTop: $('.component--project-map.project-map').offset().top - 80
				}, 1500);
				$('.default-pin-map-content').show();
				$('.pin-map-content').hide();
				let req = null;
				if (null != req) {
					req.abort();
				}
				req = jQuery.ajax({
					url: theme.ajaxurl,
					type: 'POST',
					dataType: 'json',
					data: {
						action: 'buildup_map_ajax_filter',
						// p_technology: technology,
						p_province: province,
						project_type: projecttype,
						p_district: district,
						change_cat: changecat
					},
					success: function (json) {
						$('.loader').css('display', 'none');
						$('#googleMap').css('opacity', '1');
						__this.deleteMarkers();
						if (json) {
							if (true === json.success && json.data.content) {
								markersData = JSON.parse(JSON.stringify(json.data.content));
							}
						}
						if (json.data.provinces) {
							$('#province').html(json.data.provinces[0].province);
						}
						if (json.data.project_types) {
							$('#project_type').html(json.data.project_types[0].project_type);
						}
						if (json.data.districts) {
							$('#district').html(json.data.districts[0].district);
						}
						if (json.data.content_table) {
							$('#project-map-table').html(json.data.content_table);
						}
						if (json.data.mapsearchcontent) {
							$('.mapcontent-toptext .open_sans_semi').html(json.data.mapsearchcontent);
						}
						$('#project-map-table').DataTable({ 'order': []
							// language: {
							// 	paginate: {
							// 		next: '&#8594;',
							// 		previous: '&#8592;'
							// 	}
							// }
						});
						__this.displayMarkers();
					}
				});
			});
		}

		districtGraphsCords() {
			$(document).on('change', '#province', () => {
				if ($('#previousprovinceid').val()) {
					this.togglePolygon($('#previousprovinceid').val());
				}
				$.getJSON(`${theme.template_path}/assets/map-geojson/province.geojson`, results => {
					const distid = jQuery('option:selected', '#province').attr('provid');
					if (distid) {
						const coordinates = [];
						const selectedcoordinates = results.features[distid - 1].geometry.coordinates;
						$.each(selectedcoordinates, (index, value) => {
							for (let i = 0; i < value.length; i++) {
								coordinates[i] = new google.maps.LatLng(parseFloat(value[i][1]), parseFloat(value[i][0]));
							}
						});
						const graphcords = new google.maps.Polygon({
							paths: coordinates,
							strokeColor: '#E16A60',
							strokeOpacity: 1,
							strokeWeight: 1,
							fillColor: '#DD5347',
							fillOpacity: 0.2,
							geodesic: true,
							_uniqueId: distid
						});
						graphcords.setMap(maps);
						gpolygons.push(graphcords);
						$('#previousprovinceid').val(distid);
					} else {
						$('#previousprovinceid').val('');
					}
				});
			});

			$(document).on('change', '#district', () => {
				if ($('#previousid').val()) {
					this.togglePolygon($('#previousid').val());
				}
				$.getJSON(`${theme.template_path}/assets/map-geojson/nepal-acesmndr.geojson`, results => {
					const distid = jQuery('option:selected', '#district').attr('distid');
					if (distid) {
						const coordinates = [];
						const selectedcoordinates = results.features[distid - 1].geometry.coordinates;
						$.each(selectedcoordinates, (index, value) => {
							for (let i = 0; i < value.length; i++) {
								coordinates[i] = new google.maps.LatLng(parseFloat(value[i][1]), parseFloat(value[i][0]));
							}
						});
						const graphcords = new google.maps.Polygon({
							paths: coordinates,
							strokeColor: '#E16A60',
							strokeOpacity: 1,
							strokeWeight: 1,
							fillColor: '#DD5347',
							fillOpacity: 0.2,
							geodesic: true,
							_uniqueId: distid
						});
						graphcords.setMap(maps);
						gpolygons.push(graphcords);
						$('#previousid').val(distid);
					} else {
						$('#previousid').val('');
					}
				});
			});

			$(document).on('click', '#project-map-table tr.table-row', e => {
				const bounds = new google.maps.LatLngBounds();
				const __this = $(e.currentTarget);
				const index = __this.data('index');
				$('#project-map-table').css('opacity', 0.4);
				$('.loader').css('display', 'block');

				// show map data
				this.showTableContent(markersData[index], markers[index]);
				setTimeout(() => {
					bounds.extend(new google.maps.LatLng(markersData[index]['project_lat'], markersData[index]['project_lng']));
					maps.fitBounds(bounds);
				}, 200);
			});

			$(document).on('click', '.map-next', e => {
				const bounds = new google.maps.LatLngBounds();
				const __this = $(e.currentTarget);
				const index = __this.data('index');
				const dataCount = markersData.length - 1;
				let ids = '';

				if (index == dataCount) {
					ids = 0;
				} else {
					ids = index + 1;
				}

				// show map data
				this.showTableContent(markersData[ids], markers[ids]);

				bounds.extend(new google.maps.LatLng(markersData[ids]['project_lat'], markersData[ids]['project_lng']));
				maps.fitBounds(bounds);
			});
		}

		togglePolygon(id) {
			for (let i = 0; i < gpolygons.length; i++) {
				if (gpolygons[i]._uniqueId == id) {
					if (null != gpolygons[i].getMap()) {
						gpolygons[i].setMap(null);
					} else {
						gpolygons[i].setMap(maps);
					}
				}
			}
		}

		googleMapInit() {
			jQuery('.map-filter-replacement').css('height', $('.map-filter').innerHeight());
			//$( window ).scroll( () => {
			//const scroll            = $( window ).scrollTop();
			//const fixedHeaderHeight = $( '.header.fixed' ).outerHeight( true );
			//const navheight         = $( '.map' ).offset().top - fixedHeaderHeight + 26;
			// if ( navheight < scroll ) {
			// 	jQuery( 'body' ).addClass( 'is-map-fixed' );
			// 	$( '.map-filter' ).css( 'top', fixedHeaderHeight );
			// } else {
			// 	jQuery( 'body' ).removeClass( 'is-map-fixed' );
			// }
			//});

			const myOptions = {
				center: new google.maps.LatLng(28.2212058, 84.79681819999996),
				zoom: 7,
				mapTypeId: google.maps.MapTypeId.ROADMAP,
				draggable: true,
				scrollwheel: false,
				disableDoubleClickZoom: false,
				disableDefaultUI: false,
				scaleControl: false,
				mapTypeControl: false,
				streetViewControl: false
			};

			maps = new google.maps.Map(document.getElementById('googleMap'), myOptions);

			let strictBounds = '';
			strictBounds = new google.maps.LatLngBounds(new google.maps.LatLng(27.278522282276125, 83.34332698906246), new google.maps.LatLng(30.084971624223463, 86.25030941093746));
			google.maps.event.addListener(maps, 'zoom_changed', () => {
				if (8 < maps.getZoom()) {
					strictBounds = new google.maps.LatLngBounds(new google.maps.LatLng(25.278522282276125, 74.34332698906246), new google.maps.LatLng(31.084971624223463, 95.25030941093746));
				} else {
					strictBounds = new google.maps.LatLngBounds(new google.maps.LatLng(27.278522282276125, 83.34332698906246), new google.maps.LatLng(30.084971624223463, 86.25030941093746));
				}
			});

			// Listen for the dragend event
			if (!/Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)) {
				google.maps.event.addListener(maps, 'dragend', () => {
					if (strictBounds.contains(maps.getCenter())) {
						return;
					}
					// We're out of bounds - Move the map back within the bounds
					const c = maps.getCenter();
					let x = c.lng(),
					    y = c.lat();
					const maxX = strictBounds.getNorthEast().lng(),
					      maxY = strictBounds.getNorthEast().lat(),
					      minX = strictBounds.getSouthWest().lng(),
					      minY = strictBounds.getSouthWest().lat();
					if (x < minX) {
						x = minX;
					}
					if (x > maxX) {
						x = maxX;
					}
					if (y < minY) {
						y = minY;
					}
					if (y > maxY) {
						y = maxY;
					}
					maps.setCenter(new google.maps.LatLng(28.2212058, 84.79681819999996));
				});
			}

			// Finally displayMarkers() function is called to begin the markers creation
			// this.displayMarkers();
			maps.setCenter(new google.maps.LatLng(28.2212058, 84.79681819999996));

			// Load GeoJSON.
			maps.data.loadGeoJson(`${theme.template_path}/assets/map-geojson/nepal-acesmndr.geojson`); //same as map.data.loadGeoJson();

			maps.data.setStyle({
				strokeColor: '#000000',
				strokeWeight: 2,
				strokeOpacity: 0.3,
				fillColor: '#CACACA',
				fillOpacity: 0
			});

			const opt = {
				minZoom: 7,
				maxZoom: 14
			};

			maps.setOptions(opt);

			// Nepal Map Coordinates Show Start
			// Define the LatLng coordinates for the polygon's  outer path.
			const outerCoords = [new google.maps.LatLng(-85.212564, 126.348268), new google.maps.LatLng(-85.247793, 63.418581), new google.maps.LatLng(-85.236203, 37.402956), new google.maps.LatLng(-85.165690, 11.387331), new google.maps.LatLng(-85.195228, -27.009886), new google.maps.LatLng(-85.299785, -169.041136), new google.maps.LatLng(-85.212564, 126.348268)];

			// Define the LatLng coordinates for the polygon's inner path.
			// Note that the points forming the inner path are wound in the
			// opposite direction to those in the outer path, to form the hole.
			const innerCoords = [new google.maps.LatLng(28.882349, 80.061242), new google.maps.LatLng(28.823464, 80.075541), new google.maps.LatLng(28.827903, 80.118726), new google.maps.LatLng(28.755426, 80.215924), new google.maps.LatLng(28.757784, 80.250602), new google.maps.LatLng(28.742528, 80.265391), new google.maps.LatLng(28.729194, 80.256631), new google.maps.LatLng(28.700562, 80.315909), new google.maps.LatLng(28.666490, 80.325743), new google.maps.LatLng(28.636073, 80.360580), new google.maps.LatLng(28.629003, 80.451503), new google.maps.LatLng(28.583918, 80.469580), new google.maps.LatLng(28.550701, 80.518402), new google.maps.LatLng(28.572464, 80.530716), new google.maps.LatLng(28.664864, 80.503590), new google.maps.LatLng(28.690748, 80.539651), new google.maps.LatLng(28.688262, 80.567844), new google.maps.LatLng(28.679968, 80.590564), new google.maps.LatLng(28.647752, 80.590197), new google.maps.LatLng(28.641754, 80.667612), new google.maps.LatLng(28.604523, 80.677539), new google.maps.LatLng(28.603296, 80.695594), new google.maps.LatLng(28.587164, 80.690134), new google.maps.LatLng(28.568395, 80.714667), new google.maps.LatLng(28.565679, 80.768219), new google.maps.LatLng(28.525024, 80.787798), new google.maps.LatLng(28.489576, 80.865857), new google.maps.LatLng(28.504504, 80.861695), new google.maps.LatLng(28.506961, 80.896143), new google.maps.LatLng(28.458071, 80.915735), new google.maps.LatLng(28.468375, 80.914159), new google.maps.LatLng(28.457656, 80.927680), new google.maps.LatLng(28.468201, 80.944019), new google.maps.LatLng(28.458610, 80.933614), new google.maps.LatLng(28.447929, 80.952251), new google.maps.LatLng(28.455541, 80.979607), new google.maps.LatLng(28.444498, 80.964787), new google.maps.LatLng(28.434101, 80.978884), new google.maps.LatLng(28.453914, 80.999899), new google.maps.LatLng(28.451893, 81.017859), new google.maps.LatLng(28.438475, 81.013179), new google.maps.LatLng(28.427755, 81.033543), new google.maps.LatLng(28.416079, 81.017630), new google.maps.LatLng(28.399096, 81.033637), new google.maps.LatLng(28.413716, 81.035824), new google.maps.LatLng(28.384344, 81.081367), new google.maps.LatLng(28.360793, 81.210932), new google.maps.LatLng(28.324876, 81.234577), new google.maps.LatLng(28.289183, 81.232676), new google.maps.LatLng(28.197717, 81.320774), new google.maps.LatLng(28.169615, 81.321975), new google.maps.LatLng(28.165570, 81.301174), new google.maps.LatLng(28.148333, 81.328047), new google.maps.LatLng(28.133657, 81.318137), new google.maps.LatLng(28.141678, 81.370448), new google.maps.LatLng(28.177205, 81.374715), new google.maps.LatLng(28.160950, 81.447054), new google.maps.LatLng(28.140819, 81.449956), new google.maps.LatLng(28.118548, 81.484015), new google.maps.LatLng(28.082650, 81.478339), new google.maps.LatLng(28.001336, 81.624785), new google.maps.LatLng(27.988200, 81.698463), new google.maps.LatLng(27.856970, 81.884959), new google.maps.LatLng(27.860072, 81.925889), new google.maps.LatLng(27.929054, 81.968283), new google.maps.LatLng(27.923710, 82.070018), new google.maps.LatLng(27.865872, 82.121095), new google.maps.LatLng(27.866646, 82.154096), new google.maps.LatLng(27.842797, 82.209144), new google.maps.LatLng(27.679493, 82.448805), new google.maps.LatLng(27.685689, 82.541308), new google.maps.LatLng(27.722671, 82.664370), new google.maps.LatLng(27.722606, 82.708454), new google.maps.LatLng(27.662968, 82.712370), new google.maps.LatLng(27.653848, 82.731673), new google.maps.LatLng(27.611008, 82.735022), new google.maps.LatLng(27.585803, 82.758020), new google.maps.LatLng(27.551832, 82.738189), new google.maps.LatLng(27.522591, 82.749695), new google.maps.LatLng(27.502349, 82.735570), new google.maps.LatLng(27.501238, 82.929348), new google.maps.LatLng(27.467779, 82.954143), new google.maps.LatLng(27.448783, 83.034627), new google.maps.LatLng(27.454376, 83.187897), new google.maps.LatLng(27.383452, 83.272202), new google.maps.LatLng(27.352667, 83.272466), new google.maps.LatLng(27.330165, 83.317191), new google.maps.LatLng(27.343115, 83.359182), new google.maps.LatLng(27.412479, 83.409403), new google.maps.LatLng(27.436681, 83.384040), new google.maps.LatLng(27.457035, 83.401781), new google.maps.LatLng(27.479763, 83.388914), new google.maps.LatLng(27.469222, 83.614526), new google.maps.LatLng(27.350974, 83.856626), new google.maps.LatLng(27.424599, 83.862260), new google.maps.LatLng(27.449745, 83.932336), new google.maps.LatLng(27.433372, 84.026879), new google.maps.LatLng(27.443432, 84.051865), new google.maps.LatLng(27.481585, 84.070285), new google.maps.LatLng(27.489238, 84.094734), new google.maps.LatLng(27.517325, 84.098603), new google.maps.LatLng(27.518703, 84.145552), new google.maps.LatLng(27.486290, 84.148914), new google.maps.LatLng(27.469569, 84.205758), new google.maps.LatLng(27.442836, 84.207811), new google.maps.LatLng(27.452834, 84.254080), new google.maps.LatLng(27.384915, 84.293962), new google.maps.LatLng(27.335921, 84.622690), new google.maps.LatLng(27.214933, 84.690881), new google.maps.LatLng(27.096562, 84.674502), new google.maps.LatLng(27.075795, 84.646197), new google.maps.LatLng(27.046168, 84.643298), new google.maps.LatLng(27.002886, 84.756684), new google.maps.LatLng(27.017730, 84.773314), new google.maps.LatLng(26.995881, 84.793243), new google.maps.LatLng(27.020981, 84.825389), new google.maps.LatLng(27.008397, 84.854125), new google.maps.LatLng(26.985559, 84.855482), new google.maps.LatLng(26.960515, 84.962496), new google.maps.LatLng(26.940114, 84.978403), new google.maps.LatLng(26.916444, 84.969157), new google.maps.LatLng(26.911923, 84.999917), new google.maps.LatLng(26.895048, 85.004146), new google.maps.LatLng(26.885761, 85.060836), new google.maps.LatLng(26.875577, 85.028988), new google.maps.LatLng(26.854398, 85.024093), new google.maps.LatLng(26.852812, 85.087305), new google.maps.LatLng(26.867099, 85.086396), new google.maps.LatLng(26.872374, 85.110860), new google.maps.LatLng(26.869897, 85.190745), new google.maps.LatLng(26.810260, 85.176505), new google.maps.LatLng(26.758180, 85.212006), new google.maps.LatLng(26.741908, 85.334074), new google.maps.LatLng(26.791422, 85.407560), new google.maps.LatLng(26.781846, 85.454235), new google.maps.LatLng(26.841105, 85.565765), new google.maps.LatLng(26.861055, 85.575372), new google.maps.LatLng(26.849551, 85.589304), new google.maps.LatLng(26.872193, 85.634409), new google.maps.LatLng(26.853232, 85.642235), new google.maps.LatLng(26.832229, 85.704043), new google.maps.LatLng(26.808175, 85.728760), new google.maps.LatLng(26.654022, 85.732012), new google.maps.LatLng(26.624327, 85.801482), new google.maps.LatLng(26.602919, 85.817321), new google.maps.LatLng(26.608671, 85.850970), new google.maps.LatLng(26.568021, 85.851585), new google.maps.LatLng(26.616601, 85.927872), new google.maps.LatLng(26.612757, 85.946678), new google.maps.LatLng(26.648971, 85.956082), new google.maps.LatLng(26.666763, 86.026882), new google.maps.LatLng(26.628939, 86.138738), new google.maps.LatLng(26.606404, 86.135795), new google.maps.LatLng(26.614759, 86.192511), new google.maps.LatLng(26.594044, 86.195844), new google.maps.LatLng(26.588571, 86.217294), new google.maps.LatLng(26.617186, 86.252424), new google.maps.LatLng(26.619121, 86.333064), new google.maps.LatLng(26.542362, 86.497736), new google.maps.LatLng(26.538704, 86.541784), new google.maps.LatLng(26.496520, 86.570078), new google.maps.LatLng(26.451221, 86.693877), new google.maps.LatLng(26.422438, 86.730881), new google.maps.LatLng(26.459363, 86.765431), new google.maps.LatLng(26.438867, 86.833400), new google.maps.LatLng(26.461973, 86.894102), new google.maps.LatLng(26.487964, 86.894101), new google.maps.LatLng(26.489035, 86.929218), new google.maps.LatLng(26.515929, 86.931844), new google.maps.LatLng(26.531982, 87.015171), new google.maps.LatLng(26.587307, 87.044615), new google.maps.LatLng(26.586016, 87.071158), new google.maps.LatLng(26.450408, 87.091499), new google.maps.LatLng(26.404233, 87.161661), new google.maps.LatLng(26.409415, 87.260687), new google.maps.LatLng(26.373956, 87.265836), new google.maps.LatLng(26.371600, 87.312226), new google.maps.LatLng(26.347758, 87.340938), new google.maps.LatLng(26.361097, 87.358220), new google.maps.LatLng(26.408155, 87.368601), new google.maps.LatLng(26.440282, 87.466490), new google.maps.LatLng(26.418477, 87.547510), new google.maps.LatLng(26.380520, 87.605795), new google.maps.LatLng(26.393577, 87.651646), new google.maps.LatLng(26.406007, 87.650010), new google.maps.LatLng(26.415933, 87.677943), new google.maps.LatLng(26.435625, 87.677408), new google.maps.LatLng(26.407620, 87.733694), new google.maps.LatLng(26.417745, 87.739077), new google.maps.LatLng(26.408986, 87.759965), new google.maps.LatLng(26.469005, 87.792803), new google.maps.LatLng(26.436890, 87.848651), new google.maps.LatLng(26.486951, 87.888119), new google.maps.LatLng(26.460821, 87.908864), new google.maps.LatLng(26.448938, 87.898378), new google.maps.LatLng(26.445000, 87.925556), new google.maps.LatLng(26.431644, 87.915977), new google.maps.LatLng(26.417527, 87.926921), new google.maps.LatLng(26.392716, 87.991682), new google.maps.LatLng(26.370366, 87.991423), new google.maps.LatLng(26.361033, 88.007209), new google.maps.LatLng(26.365036, 88.030188), new google.maps.LatLng(26.388606, 88.031235), new google.maps.LatLng(26.437898, 88.095111), new google.maps.LatLng(26.463039, 88.091977), new google.maps.LatLng(26.475559, 88.107282), new google.maps.LatLng(26.506442, 88.090556), new google.maps.LatLng(26.560833, 88.105648), new google.maps.LatLng(26.573323, 88.129880), new google.maps.LatLng(26.601285, 88.129917), new google.maps.LatLng(26.636795, 88.160932), new google.maps.LatLng(26.746749, 88.189282), new google.maps.LatLng(26.859750, 88.174365), new google.maps.LatLng(26.898876, 88.136242), new google.maps.LatLng(26.921182, 88.145899), new google.maps.LatLng(26.950770, 88.120312), new google.maps.LatLng(26.985055, 88.135404), new google.maps.LatLng(27.004681, 88.092122), new google.maps.LatLng(27.035515, 88.077487), new google.maps.LatLng(27.036785, 88.037493), new google.maps.LatLng(27.087884, 88.020965), new google.maps.LatLng(27.119507, 87.987290), new google.maps.LatLng(27.171190, 88.019222), new google.maps.LatLng(27.216206, 88.012033), new google.maps.LatLng(27.286412, 88.031577), new google.maps.LatLng(27.336104, 88.066469), new google.maps.LatLng(27.372214, 88.041540), new google.maps.LatLng(27.413112, 88.050413), new google.maps.LatLng(27.430012, 88.080088), new google.maps.LatLng(27.496171, 88.043602), new google.maps.LatLng(27.512300, 88.061409), new google.maps.LatLng(27.585186, 88.081828), new google.maps.LatLng(27.665817, 88.144480), new google.maps.LatLng(27.736734, 88.156124), new google.maps.LatLng(27.747224, 88.178410), new google.maps.LatLng(27.791013, 88.197149), new google.maps.LatLng(27.820663, 88.172988), new google.maps.LatLng(27.837647, 88.201118), new google.maps.LatLng(27.854728, 88.195583), new google.maps.LatLng(27.881597, 88.134974), new google.maps.LatLng(27.867382, 88.095663), new google.maps.LatLng(27.895677, 88.084008), new google.maps.LatLng(27.886511, 88.064302), new google.maps.LatLng(27.906077, 88.029931), new google.maps.LatLng(27.886128, 87.984703), new google.maps.LatLng(27.918072, 87.932034), new google.maps.LatLng(27.910960, 87.865758), new google.maps.LatLng(27.948148, 87.856837), new google.maps.LatLng(27.953049, 87.831664), new google.maps.LatLng(27.920352, 87.824549), new google.maps.LatLng(27.899549, 87.784458), new google.maps.LatLng(27.866073, 87.778509), new google.maps.LatLng(27.805471, 87.725211), new google.maps.LatLng(27.807047, 87.665324), new google.maps.LatLng(27.837509, 87.664446), new google.maps.LatLng(27.833370, 87.633246), new google.maps.LatLng(27.810765, 87.610323), new google.maps.LatLng(27.866800, 87.562885), new google.maps.LatLng(27.844513, 87.538051), new google.maps.LatLng(27.845787, 87.489340), new google.maps.LatLng(27.822545, 87.451771), new google.maps.LatLng(27.833595, 87.402641), new google.maps.LatLng(27.843459, 87.432139), new google.maps.LatLng(27.861274, 87.418224), new google.maps.LatLng(27.828102, 87.358182), new google.maps.LatLng(27.825856, 87.317077), new google.maps.LatLng(27.843376, 87.304275), new google.maps.LatLng(27.850788, 87.264518), new google.maps.LatLng(27.820895, 87.226929), new google.maps.LatLng(27.821305, 87.172412), new google.maps.LatLng(27.839849, 87.116025), new google.maps.LatLng(27.916013, 87.079213), new google.maps.LatLng(27.950253, 87.038105), new google.maps.LatLng(27.961639, 86.932673), new google.maps.LatLng(27.987868, 86.924831), new google.maps.LatLng(27.996762, 86.889010), new google.maps.LatLng(28.025196, 86.866671), new google.maps.LatLng(28.014031, 86.828744), new google.maps.LatLng(28.035767, 86.757076), new google.maps.LatLng(28.075419, 86.762951), new google.maps.LatLng(28.103763, 86.738572), new google.maps.LatLng(28.102481, 86.665383), new google.maps.LatLng(28.071307, 86.634007), new google.maps.LatLng(28.075125, 86.607279), new google.maps.LatLng(28.100238, 86.604635), new google.maps.LatLng(28.113750, 86.576144), new google.maps.LatLng(28.108903, 86.562046), new google.maps.LatLng(28.067782, 86.566158), new google.maps.LatLng(28.047956, 86.533261), new google.maps.LatLng(27.957091, 86.513882), new google.maps.LatLng(27.946035, 86.468055), new google.maps.LatLng(27.905942, 86.442061), new google.maps.LatLng(27.906236, 86.411367), new google.maps.LatLng(27.941629, 86.373624), new google.maps.LatLng(27.938398, 86.348217), new google.maps.LatLng(27.965770, 86.336040), new google.maps.LatLng(27.948218, 86.315163), new google.maps.LatLng(27.977908, 86.288389), new google.maps.LatLng(27.981290, 86.226295), new google.maps.LatLng(28.078287, 86.204494), new google.maps.LatLng(28.098980, 86.221861), new google.maps.LatLng(28.173806, 86.186388), new google.maps.LatLng(28.169557, 86.174194), new google.maps.LatLng(28.143137, 86.177519), new google.maps.LatLng(28.125954, 86.141492), new google.maps.LatLng(28.093068, 86.122277), new google.maps.LatLng(28.090602, 86.081189), new google.maps.LatLng(28.062028, 86.094748), new google.maps.LatLng(28.015470, 86.081076), new google.maps.LatLng(27.927701, 86.124698), new google.maps.LatLng(27.911821, 86.067035), new google.maps.LatLng(27.899812, 86.064818), new google.maps.LatLng(27.911588, 86.000154), new google.maps.LatLng(27.941793, 85.947576), new google.maps.LatLng(27.996631, 85.976827), new google.maps.LatLng(28.054516, 85.899812), new google.maps.LatLng(28.111057, 85.897169), new google.maps.LatLng(28.123687, 85.870293), new google.maps.LatLng(28.183312, 85.849439), new google.maps.LatLng(28.208719, 85.776890), new google.maps.LatLng(28.236476, 85.750309), new google.maps.LatLng(28.385833, 85.711978), new google.maps.LatLng(28.382455, 85.683634), new google.maps.LatLng(28.345446, 85.686865), new google.maps.LatLng(28.347649, 85.666451), new google.maps.LatLng(28.303004, 85.662339), new google.maps.LatLng(28.256302, 85.608295), new google.maps.LatLng(28.304766, 85.600218), new google.maps.LatLng(28.333371, 85.506197), new google.maps.LatLng(28.327269, 85.415663), new google.maps.LatLng(28.277526, 85.376716), new google.maps.LatLng(28.304416, 85.342836), new google.maps.LatLng(28.288262, 85.293197), new google.maps.LatLng(28.293696, 85.255160), new google.maps.LatLng(28.340516, 85.203516), new google.maps.LatLng(28.323222, 85.182803), new google.maps.LatLng(28.336351, 85.119593), new google.maps.LatLng(28.346357, 85.108275), new google.maps.LatLng(28.392471, 85.127376), new google.maps.LatLng(28.458613, 85.100166), new google.maps.LatLng(28.485389, 85.117968), new google.maps.LatLng(28.490454, 85.152270), new google.maps.LatLng(28.532715, 85.166308), new google.maps.LatLng(28.533005, 85.186426), new google.maps.LatLng(28.569477, 85.190334), new google.maps.LatLng(28.597700, 85.173690), new google.maps.LatLng(28.620923, 85.197348), new google.maps.LatLng(28.642005, 85.187019), new google.maps.LatLng(28.643757, 85.157056), new google.maps.LatLng(28.686948, 85.114831), new google.maps.LatLng(28.671847, 85.088856), new google.maps.LatLng(28.682478, 85.058169), new google.maps.LatLng(28.591867, 84.983746), new google.maps.LatLng(28.580349, 84.948341), new google.maps.LatLng(28.595006, 84.945093), new google.maps.LatLng(28.593848, 84.902397), new google.maps.LatLng(28.570809, 84.856653), new google.maps.LatLng(28.636301, 84.695878), new google.maps.LatLng(28.671211, 84.704696), new google.maps.LatLng(28.683931, 84.668124), new google.maps.LatLng(28.736746, 84.625489), new google.maps.LatLng(28.734931, 84.572244), new google.maps.LatLng(28.751570, 84.555302), new google.maps.LatLng(28.736595, 84.485721), new google.maps.LatLng(28.770133, 84.437394), new google.maps.LatLng(28.821152, 84.435047), new google.maps.LatLng(28.829472, 84.401617), new google.maps.LatLng(28.850649, 84.409029), new google.maps.LatLng(28.858817, 84.395567), new google.maps.LatLng(28.859271, 84.357145), new google.maps.LatLng(28.873338, 84.342624), new google.maps.LatLng(28.862145, 84.323565), new google.maps.LatLng(28.898902, 84.266387), new google.maps.LatLng(28.893060, 84.226238), new google.maps.LatLng(29.036704, 84.249143), new google.maps.LatLng(29.053948, 84.219646), new google.maps.LatLng(29.047293, 84.189695), new google.maps.LatLng(29.124892, 84.200284), new google.maps.LatLng(29.131094, 84.173964), new google.maps.LatLng(29.185549, 84.162317), new google.maps.LatLng(29.213835, 84.199074), new google.maps.LatLng(29.236222, 84.202402), new google.maps.LatLng(29.244391, 84.116181), new google.maps.LatLng(29.274190, 84.121777), new google.maps.LatLng(29.292947, 84.094248), new google.maps.LatLng(29.285686, 84.069289), new google.maps.LatLng(29.301418, 84.041154), new google.maps.LatLng(29.289619, 84.015438), new google.maps.LatLng(29.298090, 83.990026), new google.maps.LatLng(29.312762, 84.000161), new google.maps.LatLng(29.327889, 83.975958), new google.maps.LatLng(29.315939, 83.941319), new google.maps.LatLng(29.326981, 83.902897), new google.maps.LatLng(29.296880, 83.847837), new google.maps.LatLng(29.302325, 83.813954), new google.maps.LatLng(29.247567, 83.792021), new google.maps.LatLng(29.244088, 83.711245), new google.maps.LatLng(29.204003, 83.656034), new google.maps.LatLng(29.183885, 83.662992), new google.maps.LatLng(29.160590, 83.640756), new google.maps.LatLng(29.181162, 83.610049), new google.maps.LatLng(29.178893, 83.578888), new google.maps.LatLng(29.202642, 83.571628), new google.maps.LatLng(29.202490, 83.539560), new google.maps.LatLng(29.218373, 83.517778), new google.maps.LatLng(29.255736, 83.514298), new google.maps.LatLng(29.280543, 83.487676), new google.maps.LatLng(29.274492, 83.465591), new google.maps.LatLng(29.300510, 83.442599), new google.maps.LatLng(29.343469, 83.443204), new google.maps.LatLng(29.367218, 83.413556), new google.maps.LatLng(29.402462, 83.425657), new google.maps.LatLng(29.422127, 83.413254), new google.maps.LatLng(29.427875, 83.372110), new google.maps.LatLng(29.465994, 83.343218), new google.maps.LatLng(29.492767, 83.347605), new google.maps.LatLng(29.508650, 83.315991), new google.maps.LatLng(29.498818, 83.281805), new google.maps.LatLng(29.508045, 83.268645), new google.maps.LatLng(29.556904, 83.255333), new google.maps.LatLng(29.557357, 83.281956), new google.maps.LatLng(29.569912, 83.277872), new google.maps.LatLng(29.577627, 83.232039), new google.maps.LatLng(29.611964, 83.197097), new google.maps.LatLng(29.592300, 83.178037), new google.maps.LatLng(29.596686, 83.158524), new google.maps.LatLng(29.616199, 83.165331), new google.maps.LatLng(29.624670, 83.150053), new google.maps.LatLng(29.629662, 83.120405), new google.maps.LatLng(29.602586, 83.085917), new google.maps.LatLng(29.672473, 83.008349), new google.maps.LatLng(29.661881, 82.956586), new google.maps.LatLng(29.704689, 82.935257), new google.maps.LatLng(29.685479, 82.861591), new google.maps.LatLng(29.690319, 82.827557), new google.maps.LatLng(29.721480, 82.818632), new google.maps.LatLng(29.731009, 82.765236), new google.maps.LatLng(29.770792, 82.744966), new google.maps.LatLng(29.763125, 82.690309), new google.maps.LatLng(29.792120, 82.695351), new google.maps.LatLng(29.814659, 82.738613), new google.maps.LatLng(29.834626, 82.726663), new google.maps.LatLng(29.856408, 82.697015), new google.maps.LatLng(29.838256, 82.622895), new google.maps.LatLng(29.872442, 82.641804), new google.maps.LatLng(29.888930, 82.602777), new google.maps.LatLng(29.963806, 82.549835), new google.maps.LatLng(29.972428, 82.529263), new google.maps.LatLng(29.947469, 82.497195), new google.maps.LatLng(30.024463, 82.395545), new google.maps.LatLng(30.026732, 82.376032), new google.maps.LatLng(30.009639, 82.363477), new google.maps.LatLng(30.047304, 82.335039), new google.maps.LatLng(30.038379, 82.298584), new google.maps.LatLng(30.074985, 82.246851), new google.maps.LatLng(30.065456, 82.171975), new google.maps.LatLng(30.111138, 82.185589), new google.maps.LatLng(30.123087, 82.171975), new google.maps.LatLng(30.154248, 82.206161), new google.maps.LatLng(30.160299, 82.182715), new google.maps.LatLng(30.190249, 82.185135), new google.maps.LatLng(30.197207, 82.140815), new google.maps.LatLng(30.226250, 82.129773), new google.maps.LatLng(30.236385, 82.100881), new google.maps.LatLng(30.304000, 82.127050), new google.maps.LatLng(30.346354, 82.109201), new google.maps.LatLng(30.362086, 82.081670), new google.maps.LatLng(30.333345, 82.055955), new google.maps.LatLng(30.343329, 82.015416), new google.maps.LatLng(30.320942, 81.993786), new google.maps.LatLng(30.358933, 81.949824), new google.maps.LatLng(30.349833, 81.915128), new google.maps.LatLng(30.379784, 81.855227), new google.maps.LatLng(30.388708, 81.749947), new google.maps.LatLng(30.412154, 81.725745), new google.maps.LatLng(30.445886, 81.628784), new google.maps.LatLng(30.411701, 81.606548), new google.maps.LatLng(30.427886, 81.561471), new google.maps.LatLng(30.371767, 81.553000), new google.maps.LatLng(30.381901, 81.488108), new google.maps.LatLng(30.405650, 81.466628), new google.maps.LatLng(30.420928, 81.407786), new google.maps.LatLng(30.396423, 81.400677), new google.maps.LatLng(30.383263, 81.429115), new google.maps.LatLng(30.367985, 81.395382), new google.maps.LatLng(30.323665, 81.395987), new google.maps.LatLng(30.305362, 81.422307), new google.maps.LatLng(30.293109, 81.401584), new google.maps.LatLng(30.282067, 81.416711), new google.maps.LatLng(30.249999, 81.393567), new google.maps.LatLng(30.206888, 81.395534), new google.maps.LatLng(30.152736, 81.333998), new google.maps.LatLng(30.164231, 81.306417), new google.maps.LatLng(30.150769, 81.256975), new google.maps.LatLng(30.112442, 81.290318), new google.maps.LatLng(30.074380, 81.288741), new google.maps.LatLng(30.044732, 81.271497), new google.maps.LatLng(30.032026, 81.238370), new google.maps.LatLng(30.017807, 81.253799), new google.maps.LatLng(30.007824, 81.232470), new google.maps.LatLng(30.023404, 81.204335), new google.maps.LatLng(30.010395, 81.185125), new google.maps.LatLng(30.020227, 81.124316), new google.maps.LatLng(30.053276, 81.091980), new google.maps.LatLng(30.085271, 81.109038), new google.maps.LatLng(30.099490, 81.082113), new google.maps.LatLng(30.149559, 81.083172), new google.maps.LatLng(30.193728, 81.042482), new google.maps.LatLng(30.214394, 81.037827), new google.maps.LatLng(30.235056, 81.005706), new google.maps.LatLng(30.246223, 80.984571), new google.maps.LatLng(30.239594, 80.952450), new google.maps.LatLng(30.238409, 80.927423), new google.maps.LatLng(30.231457, 80.917179), new google.maps.LatLng(30.223297, 80.910038), new google.maps.LatLng(30.168820, 80.863056), new google.maps.LatLng(30.128313, 80.877847), new google.maps.LatLng(30.049367, 80.760721), new google.maps.LatLng(30.005266, 80.746226), new google.maps.LatLng(30.000895, 80.720192), new google.maps.LatLng(29.957100, 80.674261), new google.maps.LatLng(29.957894, 80.601273), new google.maps.LatLng(29.923436, 80.574010), new google.maps.LatLng(29.850706, 80.552894), new google.maps.LatLng(29.823104, 80.507144), new google.maps.LatLng(29.795828, 80.494094), new google.maps.LatLng(29.806167, 80.435015), new google.maps.LatLng(29.794839, 80.406754), new google.maps.LatLng(29.758766, 80.397016), new google.maps.LatLng(29.747803, 80.365555), new google.maps.LatLng(29.674112, 80.384653), new google.maps.LatLng(29.639032, 80.419930), new google.maps.LatLng(29.597069, 80.408189), new google.maps.LatLng(29.560806, 80.378934), new google.maps.LatLng(29.552870, 80.342572), new google.maps.LatLng(29.533140, 80.357865), new google.maps.LatLng(29.518856, 80.349774), new google.maps.LatLng(29.476724, 80.286845), new google.maps.LatLng(29.451747, 80.301766), new google.maps.LatLng(29.458501, 80.275799), new google.maps.LatLng(29.442545, 80.242488), new google.maps.LatLng(29.411233, 80.242116), new google.maps.LatLng(29.392046, 80.275642), new google.maps.LatLng(29.347673, 80.279391), new google.maps.LatLng(29.314438, 80.316813), new google.maps.LatLng(29.231455, 80.290238), new google.maps.LatLng(29.205258, 80.297729), new google.maps.LatLng(29.195089, 80.289143), new google.maps.LatLng(29.221984, 80.252590), new google.maps.LatLng(29.212559, 80.244033), new google.maps.LatLng(29.138702, 80.271697), new google.maps.LatLng(29.116199, 80.233729), new google.maps.LatLng(29.137326, 80.183853), new google.maps.LatLng(29.104645, 80.145258), new google.maps.LatLng(29.061874, 80.128685), new google.maps.LatLng(29.012970, 80.124902), new google.maps.LatLng(29.009583, 80.136348), new google.maps.LatLng(28.981157, 80.117565), new google.maps.LatLng(28.985913, 80.100307), new google.maps.LatLng(28.916123, 80.058875), new google.maps.LatLng(28.882349, 80.061242), new google.maps.LatLng(28.882349, 80.061242)];

			// Construct the polygon, including both paths.
			const NepalCordinates = new google.maps.Polygon({
				paths: [outerCoords, innerCoords],
				strokeColor: '#000000',
				strokeOpacity: 0.1,
				strokeWeight: 2,
				fillColor: '#CACACA',
				fillOpacity: 0.8
			});
			NepalCordinates.setMap(maps);
		}

		showTableContent(data, marker, pinClick = false) {
			const scrool = $('.component--project-map.project-map').offset().top;
			if (false === pinClick) {
				if (/Android|webOS|iPhone|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)) {
					$('body, html').animate({
						scrollTop: scrool + 400
					}, 1500);
				} else {
					$('body, html').animate({
						scrollTop: scrool - 80
					}, 1500);
				}
			}

			for (let j = 0; j < markers.length; j++) {
				if ('earth-bricks' == markersData[j].project_technology_slug) {
					imageUrl = redPin;
				} else if ('stone-cutting-crushing' == markersData[j].project_technology_slug) {
					imageUrl = blackPin;
				}

				icons = {
					url: imageUrl // url
				};
				markers[j].setIcon(icons);
			}

			const greenicon = {
				url: greenPin // url
			};
			marker.setIcon(greenicon);

			let iwContent = '<div id="iw_container" class="productsection"><div class="iw_centerd">';
			iwContent += '<div class="productDetails gmap_c_wrapper">';
			if ('' != data.images_gallery) {
				iwContent += '<div class="map-swiper-container"><div class="swiper-wrapper">';
				$.each(data.images_gallery, (key, value) => {
					iwContent += `<div class="swiper-slide"><img src="${value.upload_image}" class="img-responsive" /></div>`;
				});
				iwContent += `</div>
					<div class="swiper-button-next fa fa-chevron-circle-right"></div>
					<div class="swiper-button-prev fa fa-chevron-circle-left"></div>
				</div>`;
			}
			iwContent += `<h4>${data.post_title}</h4>`;
			if ('' != data.project_district) {
				iwContent += `<span class="address"><strong>District: </strong>${data.project_district}</span>`;
			}
			if ('' != data.project_address) {
				iwContent += `<span class="loaction"><strong>Location: </strong>${data.project_address}</span>`;
			}
			if ('' != data.project_date_started) {
				iwContent += `<span class="date_started"><strong>Date started: </strong>${data.project_date_started}</span>`;
			}
			if ('' != data.project_summary_of_project) {
				iwContent += `<span class="project_summary">${data.project_summary_of_project}</span>`;
			}

			iwContent += '<div class="withImages">';
			if ('' != data.project_nr_of_bricks_produced) {
				iwContent += `<span class="bricks_produced"><figure><img src="${theme.template_path}/assets/img/brick.png" class="img-responsive" alt=""></figure><strong>${data.project_nr_of_bricks_produced}</strong><small>Briks made</small></span>`;
			}
			if ('' != data.project_houses_built) {
				iwContent += `<span class="houses_build"><figure><img src="${theme.template_path}/assets/img/house.png" class="img-responsive" alt=""></figure><strong>${data.project_houses_built}+</strong><small>Houses built</small>`;
				if (data.project_schools) {
					iwContent += `<span class="school_community"><strong>+${data.project_schools}</strong><small>schools</small></span>`;
				}
				if (data.project_commununity) {
					iwContent += `<span class="school_community"><strong>+${data.project_commununity}</strong><small>Community</small></span>`;
				}
				iwContent += '</span>';
			}
			if ('' != data.total) {
				iwContent += `<span class="houses_build"><figure><img src="${theme.template_path}/assets/img/tools.png" class="img-responsive" alt=""></figure><strong>${data.total}</strong><small>Jobs created</small></span>`;
			}
			if ('' != data.co2_saved) {
				iwContent += `<span class="houses_build"><figure><img src="${theme.template_path}/assets/img/arrows.png" class="img-responsive" alt=""></figure><strong>${data.co2_saved}</strong><small>Tons CO2 Saved</small></span>`;
			}
			iwContent += '</div>';

			if (1 < markersData.length) {
				iwContent += `<div class="map-next-div"><a href="javascript:void(0);" class="map-next" id="${data.districtID}" data-index="${data.index}"><span>Next</span></a></div>`;
			}
			iwContent += '</div></div></div>';
			$('.pin-map-content').html(iwContent);
			$('.pin-map-content').show();
			$('.default-pin-map-content').hide();
			$('#project-map-table').css('opacity', 1);
			$('.loader').css('display', 'none');

			if ('' != data.images_gallery) {
				const numberOfSlides = data.images_gallery.length;
				new Swiper('.map-swiper-container', {
					slidesPerView: 1,
					slidesPerGroup: 1,
					loop: 1 === numberOfSlides ? false : true,
					autoplayDisableOnInteraction: 1 === numberOfSlides ? false : true,
					autoplay: 1 === numberOfSlides ? false : true,
					allowSlidePrev: 1 === numberOfSlides ? false : true,
					allowSlideNext: 1 === numberOfSlides ? false : true,
					navigation: {
						nextEl: '.swiper-button-next',
						prevEl: '.swiper-button-prev'
					}
				});
			}
		}

		displayMarkers() {
			if (markerClusterer) {
				markerClusterer.clearMarkers();
			}
			// this variable sets the map bounds according to markers position
			markersData.forEach(marker => {
				// const latlng = new google.maps.LatLng( marker.project_lat, marker.project_lng );
				this.createMarker(marker, markers);
			});

			let zoom = -1;
			// let size = -1;
			zoom = -1 == zoom ? null : zoom;
			// size = -1 == size ? null : size;
			// style = 0;
			markerClusterer = new MarkerClusterer(maps, markers, {
				maxZoom: zoom,
				gridSize: 30,
				zoomOnClick: true
			});
		}

		createMarker(data, markers) {
			const latlng = new google.maps.LatLng(data.project_lat, data.project_lng);
			const bounds = new google.maps.LatLngBounds();
			if ('earth-bricks' == data.project_technology_slug) {
				imageUrl = redPin;
			} else if ('stone-cutting-crushing' == data.project_technology_slug) {
				imageUrl = blackPin;
			}

			bounds.extend(latlng);

			icons = {
				url: imageUrl // url
			};

			const marker = new google.maps.Marker({
				map: maps,
				position: latlng,
				// title: pname,
				icon: icons
			});
			markers.push(marker);

			google.maps.event.addListener(marker, 'click', () => {
				clickedMarker = marker;

				// show map data
				this.showTableContent(data, marker, true);

				setTimeout(() => {
					jQuery('.gm-style-iw').parent('div').parent('div').addClass('changePos');
				}, 100);
			});

			// show map description
			if (/Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)) {
				infoWindow = new google.maps.InfoWindow({
					pixelOffset: new google.maps.Size(400, 250)
					// position: latlng,
				});
			} else {
				infoWindow = new google.maps.InfoWindow({
					// pixelOffset: new google.maps.Size( 400, 250 ),
					position: latlng
				});
			}

			google.maps.event.addListener(maps, 'zoom_changed', () => {
				if (maps.getMapTypeId() != google.maps.MapTypeId.HYBRID) {
					maps.setMapTypeId(google.maps.MapTypeId.HYBRID);
					maps.setTilt(0);
				}
			});

			google.maps.event.addListener(infoWindow, 'closeclick', () => {
				for (let j = 0; j < markers.length; j++) {
					if ('earth-bricks' == data.project_technology_slug) {
						imageUrl = redPin;
					} else if ('stone-cutting-crushing' == data.project_technology_slug) {
						imageUrl = blackPin;
					}

					icons = {
						url: imageUrl // url
					};
					markers[j].setIcon(icons);
				}
			});

			// Finally the bounds variable is used to set the map bounds
			// with fitBounds() function
			// Zooms map as per center data set
			const address = document.getElementById('district').value;
			if (address) {
				maps.fitBounds(bounds);
				if (10 < maps.getZoom()) {
					maps.setZoom(9);
				}
			} else {
				if (8 < maps.getZoom()) {
					maps.setZoom(7);
				}
				if (maps.getMapTypeId() == google.maps.MapTypeId.HYBRID) {
					maps.setMapTypeId(google.maps.MapTypeId.ROADMAP);
					maps.setTilt(0);
				}
			}

			//Center bound
			//center the map to the geometric center of all markers
			if (centerlocation) {
				if (centerlocation.latitude && centerlocation.longitude) {
					const myCenter = new google.maps.LatLng(centerlocation.latitude, centerlocation.longitude);
					//center the map to a specific spot (city)
					maps.setCenter(myCenter);
					//remove one zoom level to ensure no marker is on the edge.
					maps.setZoom(maps.getZoom() + 11);
					if (14 < maps.getZoom()) {
						maps.setZoom(13);
					}
				}
			} else {
				maps.setCenter(bounds.getCenter()); //or use custom center
				//remove one zoom level to ensure no marker is on the edge.
				maps.setZoom(maps.getZoom() - 1);
				// set a minimum zoom
				// if you got only 1 marker or all markers are on the same address map will be zoomed too much.
				if (15 < maps.getZoom()) {
					maps.setZoom(13);
				}
			}
		}

		setMapOnAll(maps) {
			for (let i = 0; i < markers.length; i++) {
				markers[i].setMap(maps);
			}
		}

		clearMarkers() {
			this.setMapOnAll(null);
		}

		// Deletes all markers in the array by removing references to them.
		deleteMarkers() {
			this.clearMarkers();
			markers = [];
		}
	}

	ProjectMap.addComponent('.project-map');

	class RepeaterImageContentBlock extends Component {

		init() {
			this.playVideo();
		}

		playVideo() {
			$(document).on('click', '.fa-play', e => {
				e.preventDefault();
				const __this = $(e.currentTarget);
				const parents = __this.parents('div.platform-grid');
				parents.find('figure.video-img').css('display', 'none');
				parents.find('div.video-container').css('display', 'block');
				parents.find('div.video-container').addClass('playit');
				parents.find('iframe')[0].src += '&autoplay=true';
			});
		}

	}

	RepeaterImageContentBlock.addComponent('.col-service');

	class Video extends Component {

		init() {
			this.playVideo();
		}

		playVideo() {
			$(document).on('click', '.video-group', e => {
				e.preventDefault();
				const __this = $(e.currentTarget);
				const parents = __this.parents('div.wrapper');
				parents.find('div.video-preview').css('display', 'none');
				parents.find('div.video-group').css('display', 'none');
				parents.find('div.video-container').addClass('fullvideo');
				parents.find('iframe')[0].src += '&autoplay=true';
			});
		}
	}

	Video.addComponent('.component--video');
})(window, document, jQuery);
