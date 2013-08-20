/*
 *  Project: endless Carousel
 *  Description: Another carousel plugin
 *  Author: Ralf Hortt
 *  License: GPL
 */

// the semi-colon before function invocation is a safety net against concatenated
// scripts and/or other plugins which may not be closed properly.
;(function ( $, window, document, undefined ) {

	// undefined is used here as the undefined global variable in ECMAScript 3 is
	// mutable (ie. it can be changed by someone else). undefined isn't really being
	// passed in so we can ensure the value of it is truly undefined. In ES5, undefined
	// can no longer be modified.

	// window and document are passed through as local variable rather than global
	// as this (slightly) quickens the resolution process and can be more efficiently
	// minified (especially when both are regularly referenced in your plugin).

	// Create the defaults once
	var pluginName = "endlessCarousel",
		defaults = {

			// General
			duration: 400,
			easing: 'swing',
			slidePadding: 0,
			start: 0,
			offsetLeft: 0,

			// Controls
			controls: true,
			controlsClass: 'ec-controls',
			prevClass: 'ec-prev',
			prevText: '',
			nextClass: 'ec-next',
			nextText: '',

			// CSS classes
			containerClass: 'ec-container',
			viewportClass: 'ec-viewport',
			currentSlideClass: 'current-slide',

			// Pager
			pager: true,
			pagerClass: 'ec-pager',
			currentPagerClass: 'current-pager',

			// Auto
			auto: false,
			direction: 'next', // 'prev', 'next'
			pause: 400,
			pauseOnHover: true,

			// Callback
			onInit: function(){},
			onNextSlide: function(){},
			onPrevSlide: function(){},
			onSlide: function(){}
		};

	var that;

	// The actual plugin constructor
	function Plugin( element, options ) {
		this.element = $( element );

		// $ has an extend method which merges the contents of two or
		// more objects, storing the result in the first object. The first object
		// is generally empty as we don't want to alter the default options for
		// future instances of the plugin
		this.options = $.extend( {}, defaults, options );

		this._defaults = defaults;
		this._name = pluginName;

		that = this;

		this.init();

		return this;
	}

	Plugin.prototype = {

		init: function() {
			this.slides = this.element.children();
			this.slidesHTML = this.element.html();
			this.slidesCount = this.slides.length;
			this.slides.attr('data-type','original');
			this.currentSlide = this.element.find( '> :eq(' + this.options.start + ')' ).addClass( this.options.currentSlideClass );
			this.currentSlideIndex = this.options.start;

			this.clonesLeft = 0;
			this.clonesRight = 0;

			this.injectHTML();
			this.calculateDimensions();
			this.injectCSS();
			this.injectClones( false );

			this.bindEvents();

			this.options.onInit();
		},

		/**
		 *
		 * Bind all events
		 *
		 */
		bindEvents: function(){

			// Controls
			this.container.find('.' + this.options.prevClass ).click(function(e){
				e.preventDefault();
				that.prevSlide();
			});

			if ( false !== this.options.prevSelector ) {
				jQuery( this.options.prevSelector ).click(function(e){
					e.preventDefault();
					that.prevSlide();
				});
			}

			this.container.find('.' + this.options.nextClass ).click(function(e){
				e.preventDefault();
				that.nextSlide();
			});


			if ( false !== this.options.nextSelector ) {
				jQuery( this.options.nextSelector ).click(function(e){
					e.preventDefault();
					that.nextSlide();
				});
			}

			// Pager
			this.container.find('.' + this.options.pagerClass + ' a').click(function(e){
				e.preventDefault();
				if ( !$(this).hasClass( that.options.currentPagerClass ) )
					that.goTo( jQuery(this).data('slide') );
			});

			// Resize
			$(window).resize(function(){
				that.injectClones( true );
				that.centerSlide( null, false );
			});

		},

		/**
		 *
		 * Determine dimensions of slider
		 *
		 */
		calculateDimensions: function(){
			that.height = 0;
			that.width = 0;

			that.element.children().each(function(i,e){

				if ( $(this).height() > that.height )
					that.height = $(this).height();

				that.width += $(this).width();
			});
		},

		/**
		 *
		 * Center slide
		 *
		 * @param jQuery object element
		 * @param bool animate Should it be animated
		 *
		 */
		centerSlide: function( element, animate ){

			element = ( element ) ? element  : this.currentSlide;

			if ( false !== animate ) {
				this.element.animate({
					left: this.getCenterSlide( element )
				}, this.options.duration, this.options.easing, this.options.onSlide( this ) );
			} else {
				this.element.css({
					left: this.getCenterSlide( element )
				});
			}
		},

		/**
		 *
		 * Determine position of next slide
		 *
		 */
		getCenterSlide: function( element ){

			var containerOffset = this.container.offset().left,
				containerCenter = parseInt( this.container.width() / 2, 10 ),
				slideOffset = element.offset().left - containerOffset,
				slideCenter = parseInt( element.width() / 2, 10 ),
				offset = ( !isNaN( parseInt( this.element.css('left'), 10 ) ) ) ? parseInt( this.element.css('left'), 10 ) : 0,
				newOffset = containerCenter - ( slideOffset + slideCenter ) + offset + this.options.offsetLeft;

			return newOffset;
		},

		/**
		 *
		 * Determine slide
		 *
		 * @param int index Index of the next slide; starting with 0
		 *
		 */
		goTo: function( index ){
			// First / Last
			if ( index < 0 ) {
				index = this.slidesCount - 1;
			} else if ( index >= this.slidesCount ) {
				index = 0;
			}

			// Altered index
			var goTo = index + this.clonesLeft;

			// Update vars
			this.currentSlideIndex = index;

			// Update classes
			this.element.find('.' + this.options.currentSlideClass).removeClass( this.options.currentSlideClass );
			this.currentSlide = this.element.find('> :eq(' + goTo + ')').addClass( this.options.currentSlideClass );
			this.container.find('.' + this.options.currentPagerClass).removeClass( this.options.currentPagerClass );
			this.container.find('a[data-slide="' + index + '"]').addClass( this.options.currentPagerClass );

			if ( index == this.slidesCount - 1)
				this.element.find('> [data-type="original"]:first').prev().addClass( this.options.currentSlideClass );

			if ( 0 === index )
				this.element.find('> [data-type="original"]:last').next().addClass( this.options.currentSlideClass );

			// Update slider
			this.centerSlide();
		},

		/**
		 *
		 * Add clones elements
		 *
		 * @param reset bool Should all clones be removed before adding clones
		 *
		 */
		injectClones: function( reset ){

			if ( true === reset ) {
				this.element.find('> *[data-type="clone"]').remove();
			}

			var counter = this.slidesCount - 1,
				gabLeft = this.container.width() + this.element.find('> :last').width() - this.element.find('> :first').width(),
				gabRight = this.container.width() + this.element.find('> :first').width() - ( this.element.find('> :last').width() ),
				tmp,
				countClones = 0;

			// fill gab left
			while ( 0 <= gabLeft ) {
				tmp = this.element.find('> :eq(' + counter + ')');
				tmp.clone().prependTo(this.element).attr('data-type','clone');
				countClones++;
				gabLeft = gabLeft - tmp.width();
				this.centerSlide( null, false );
			}
			this.clonesLeft = countClones;

			// fill gab right
			counter = 0;
			countClones = 0;
			while ( 0 <= gabRight ) {
				var index = counter + this.clonesLeft;
				tmp = this.element.find('> :eq(' + index + ')');
				tmp.clone().appendTo(this.element).attr('data-type','clone');
				countClones++;
				gabRight = gabRight - tmp.width();
				this.centerSlide( null, false );
				counter++;
			}
			this.clonesRight = countClones;

		},

		/**
		 *
		 * Set CSS values
		 *
		 */
		injectCSS: function(){

			this.container.css({
				overflow: 'hidden',
				position: 'relative',
				width: '100%'
			});

			this.element.css({
				overflow: 'hidden',
				position: 'relative',
				// width: this.width
				width: '10000%'
			});
			this.centerSlide( null, false );

			this.element.children().css({
				float: 'left'
			});

		},

		/**
		 *
		 * Inject html
		 *
		 */
		injectHTML: function(){

			this.element.addClass( this.options.viewportClass ).wrap( '<div class="' + this.options.containerClass + '">' );
			this.container = $(this.element).parent();

			var tmp, j, highlight;
			if ( this.options.controls )
				this.container.append('<div class="' + this.options.controlsClass + '"><a href="#" class="' + this.options.prevClass + '">' + this.options.prevText + '</a><a href="#" class="' + this.options.nextClass + '">' + this.options.nextText + '</a></div>');

			if ( this.options.pager ) {
				tmp = '<div class="' + this.options.pagerClass + '">';
				for ( i = 1; i < this.slidesCount + 1; i++ ) {
					j = i - 1;
					highlight = ( j == this.options.start ) ? 'class="' + this.options.currentPagerClass + '"' : '';
					tmp += '<a ' + highlight + ' data-slide="' + j + '" href="#">' + i + '</a>';
				}
				tmp += '</div>';
				this.container.append(tmp);
			}

		},

		/**
		 *
		 * Go to next slide
		 *
		 */
		nextSlide: function(){

			// Checks if the current slide is the last slide
			if ( this.currentSlideIndex == this.slidesCount - 1 ) {
				var index = this.clonesLeft - 1,
					element = this.element.find('> :eq(' + index + ')');
				this.centerSlide( element, false );
			}

			// Callback
			this.options.onNextSlide(this);

			// Go to slide
			this.goTo( this.currentSlideIndex + 1 );
		},

		/**
		 *
		 * Go to previous slide
		 *
		 */
		prevSlide: function(){

			// Checks if the current slide is the first slide
			if ( 0 === this.currentSlideIndex ) {
				var index = this.clonesLeft + this.slidesCount,
					element = this.element.find('> :eq(' + index + ')');
				this.centerSlide( element, false );
			}

			// Callback
			this.options.onPrevSlide(this);

			// Go to slide
			this.goTo(this.currentSlideIndex - 1 );
		}

	};

	// A really lightweight plugin wrapper around the constructor,
	// preventing against multiple instantiations
	$.fn[pluginName] = function ( options ) {
		return this.each(function () {
			if (!$.data(this, "plugin_" + pluginName)) {
				$.data(this, "plugin_" + pluginName, new Plugin( this, options ));
			}
		});
	};

})( jQuery, window, document );