// Panel globals
var BEARER_TOKEN = [],
	CHART_DATA = {
		data_1 : {
			title : 'Revenue (last 7 days)',
			labels : [ 'Today', 'Yesterday', 'Day 3', 'Day 4', 'Day 5', 'Day 6', 'Day 7' ],
			values : []
		},
		data_2 : {
			title : 'Revenue (last 12 months)',
			labels : [
				'This month', 'Last Month', 'Month 3', 'Month 4', 'Month 5', 'Month 6', 'Month 7', 'Month 8',
				'Month 9', 'Month 10', 'Month 11', 'Month 12'
			],
			values : []
		},
		index : 1
	},
	CHART_CONFIG = {
		type : 'bar',
		data : { labels : [], datasets: [{ label : 'Revenue', backgroundColor : '#F27503', data : [] }] },
		options : {
			color : '#000000',
			scales : { x : { ticks : { color : '#000000' } }, y : { ticks : { color : '#000000' } } }
		}
	},
	CHART_PLANE = false,
	ORDERS_DATA = { page : 0, max : 0, query_text : '' };


// Bind on hash change listener for URL hash navigation
$(window).on('hashchange',function(event) {
	event.preventDefault();
	return nav_router();
});


// Bind a document ready listener
$(document).ready(function() {
	// Remove any unwanted URL hash incase of a redirect from /panel.html
	if (window.location.href.includes('#')) return window.open('./panel.html', '_self');

	// Check for session token
	if (get_local_storage('sess_tokn').length == 0) return window.open('./index.html', '_self');
	var sess_tokn = get_local_storage('sess_tokn');

	// Validate token
	if (!validate_json( sess_tokn )) {
		set_local_storage('sess_tokn', '');
		return window.open('./index.html', '_self');
	}
	sess_tokn = JSON.parse(sess_tokn);

	// Validate all token pieces
	if (!sess_tokn['time'] || !sess_tokn['token'] || !sess_tokn['refresh']) {
		set_local_storage('sess_tokn', '');
		return window.open('./index.html', '_self');
	}

	// Validate token time
	if (parseInt((Date.now() - sess_tokn['time']) / 1000) > 900) {
		set_local_storage('sess_tokn', '');
		return window.open('./index.html', '_self');
	}

	// Get token and store in global
	BEARER_TOKEN[0] = sess_tokn['token'];
	BEARER_TOKEN[1] = sess_tokn['refresh'];

	// Setup page theme
	theme_setup();

	// Navigate to dashboard
	nav_router();

	// Dismiss splash
	$('.splash').remove();
});


/* Logout process [
	Recommendation:: using something like a `revoke_token` that deletes all exsisting `access_tokens` will be
	the best action to take here. Limited to using the `refresh_token` endpoint, it returns a new `access_token`
	which can be spoofed to maintain session and still make assumed logged in requests to protected endpoints
	even after logging out.
 ]
 */
function logging_user_out() {
	$('.main_cs_bod button:eq(2), .main_cm_head_b_b button:eq(2)').attr('disabled', 'true');
	$('.main_cs_bod button:eq(2)').find('div:eq(0)').html( '<i class="fal fa-spinner fa-spin fa-fw"></i>' );
	$('.main_cm_head_b_b button:eq(2)').html( '<i class="fal fa-spinner fa-spin fa-fw"></i>' );
	$.ajax({
		url : 'https://freddy.codesubmit.io/refresh',
		type : 'POST',
		contentType : 'application/json',
		beforeSend: function(xhr) {
		    xhr.setRequestHeader( 'Authorization', 'Bearer '+ BEARER_TOKEN[1] );
		},
		success: function(res) {
			if (validate_json(res)) {
				
				// Clear saved token and reload page
				set_local_storage('sess_tokn', '');
				return window.location.reload();
			}
		},
		error: function(err) {
			$('.main_cs_bod button:eq(2), .main_cm_head_b_b button:eq(2)').removeAttr( 'disabled' );
			$('.main_cs_bod button:eq(2)').find('div:eq(0)').html( '<i class="fal fa-sign-out"></i>' );
			$('.main_cm_head_b_b button:eq(2)').html( '<i class="fal fa-sign-out"></i>' );
			if (err.responseJSON) return window.location.reload();
			return alert( 'Connection error. Retry' );
		}
	});
}


// Navigation router
function nav_router() {
	if (!window.location.hash) return menu_switch('dashboard');
	var hash_value = window.location.hash.split('#');
	if (!hash_value[1]) return menu_switch('dashboard');
	return menu_switch( hash_value[1] == 'orders' ? hash_value[1] : 'dashboard' );
}


// Order page navigation
function order_page_nav(nav_button, type) {
	if (ORDERS_DATA['max'] < 1) return;
	if (type == 0) {
		if ((ORDERS_DATA['page'] - 1) < 1) return alert('You have reached the end of the list.');
		ORDERS_DATA['page'] = ORDERS_DATA['page'] - 1;
	} else {
		if ((ORDERS_DATA['page'] + 1) > ORDERS_DATA['max']) return alert('You have reached the end of the list.');
		ORDERS_DATA['page'] = ORDERS_DATA['page'] + 1;
	}
	return load_orders_data();
}


// Load product orders data
function load_orders_data() {
	$('#panel_ordrs').find('.panel_ordrs_body').html(
		'<div class="section_progress"><div><i class="fal fa-spinner fa-spin fa-fw"></i></div><div>searching..</div></div>'
	);
	$('#panel_ordrs').scrollTop(0);
	$('#section_scroll_up_floating_button').attr('style', 'display:none;');
	$.ajax({
		url : 'https://freddy.codesubmit.io/orders?page='+ ORDERS_DATA['page'] +'&q='+ ORDERS_DATA['query_text'],
		type : 'GET',
		contentType : 'application/json',
		beforeSend: function(xhr) {
		    xhr.setRequestHeader( 'Authorization', 'Bearer '+ BEARER_TOKEN[0] );
		},
		success: function(res) {
			if (validate_json(res)) {
				if (res['orders']) {
					// Set list meta data
					ORDERS_DATA['page'] = res['page'] ? res['page'] : ORDERS_DATA['page'];
					ORDERS_DATA['max'] = res['total'] ? res['total'] : ORDERS_DATA['max'];
					
					// Set orders data
					orders_list_adapter( JSON.parse(JSON.stringify( res['orders'] )) );
					return;
				}
			}
			$('.section_progress').find('div:eq(0)').html( '<i class="fal fa-exclamation-triangle"></i>' );
			return $('.section_progress').find('div:eq(1)').html( res.substring(0, 200) );
		},
		error: function(err) {
			$('.section_progress').find('div:eq(0)').html( '<i class="fal fa-exclamation-triangle"></i>' );
			if (err.responseJSON) return window.location.reload();
			return $('.section_progress').find('div:eq(1)').html( 'Connection error. Tap on the <i class="fal fa-search"></i> button to retry.' );
		}
	});
}


// Orders list adapter
function orders_list_adapter(data) {
	$('#panel_ordrs').find('.panel_ordrs_foot button').removeAttr('disabled');
	$('#panel_ordrs').find('.panel_ordrs_foot div').text( 'Page '+ ORDERS_DATA['page'] +' of '+ ORDERS_DATA['max'] );
	$('#panel_ordrs').find('.panel_ordrs_body').html(
		'<div id="panel_ordrs_body_inner" class="shadow_elmnt">'+
			'<div class="panel_ordrs_body_a">'+
				'<span>Product Name</span>	<span>Date</span>	<span>Total</span> <span>Status</span>'+
			'</div>'+
			'<div class="panel_ordrs_body_b">  </div>'+
		'</div>'
	);
	if (data.length == 0) {
		$('#panel_ordrs_body_inner').find('.panel_ordrs_body_b').html( '<div class="dashb_inline_none">No Data</div>' );
		return;
	}
	for (var i = 0; i < data.length; i++) {
		// Prepare status text coloring
		var status_state = [ 'delivered', 'processing' ].includes( data[i]['status'].toLowerCase() );
		var status_color = data[i]['status'].toLowerCase() == 'processing' ? 'red' : 'green';
		
		// Re-structure date and time
		var order_time = data[i]['created_at'].split('.')[0];
		order_time = order_time.replace(/T/g, ' ');
		
		// Proceed with list appending
		$('#panel_ordrs_body_inner').find('.panel_ordrs_body_b').append(
			'<div class="ordrs_bb_each_row">'+
				'<span><b>'+ serialize_html( data[i]['product']['name'] ) +'</b></span>'+
				'<span>'+ serialize_html( order_time ) + '</span>'+
				'<span>'+ serialize_html( data[i]['currency'] ) + '' + count_prefix( serialize_html( data[i]['total'] ), 2 ) +'</span>'+
				'<span '+ (status_state ? ('style="color:'+ status_color +' !important;"') : '') +'>'+ 
					serialize_html( data[i]['status'] ) + 
				'</span>'+
			'</div>'
		);
	}
}


// Query orders
function run_orders_query(search_button) {
	var search_term = $(search_button).siblings('input:eq(0)').val();
	if (search_term.trim().length == 0) return alert('Enter a product name');
	
	// Reset section states and control variables
	$('#panel_ordrs').find('.panel_ordrs_foot div').text('Page 0 of 0');
	ORDERS_DATA['page'] = 1;
	ORDERS_DATA['max'] = 0;
	ORDERS_DATA['query_text'] = search_term;
	$('#panel_ordrs').find('.panel_ordrs_foot button').attr('disabled', 'true');
	
	// Load data-sets
	return load_orders_data();
}


// Prepare orders section
function prepare_ordrs_section() {
	$('.main_cm_body_sections').hide();
	$('#panel_ordrs').find('.panel_ordrs_body').html(
		'<div class="section_progress"><div><i class="fal fa-search"></i></div><div>Search orders by product name</div></div>'
	);
	$('#panel_ordrs').show().scrollTop(0);
	$('#panel_ordrs').find('input').val('');
	$('#panel_ordrs').find('.panel_ordrs_foot button').attr('disabled', 'true');
}


// Load dashboard data
function load_dashb_data() {
	$('.main_cm_body_sections').hide();
	$('#panel_dashb').find('.panel_dashb_summary, .panel_dashb_areas_b').html(
		'<div class="section_progress"><div><i class="fal fa-spinner fa-spin fa-fw"></i></div><div>loading data..</div></div>'
	);
	$('#panel_dashb').show().scrollTop(0);
	$.ajax({
		url : 'https://freddy.codesubmit.io/dashboard',
		type : 'GET',
		contentType : 'application/json',
		beforeSend: function(xhr) {
		    xhr.setRequestHeader( 'Authorization', 'Bearer '+ BEARER_TOKEN[0] );
		},
		success: function(res) {
			if (validate_json(res)) {
				if (res['dashboard']) {
					// set summary data
					dashboard_sum_adapter( JSON.parse(JSON.stringify( res['dashboard'] )) );
					
					// set chart data
					dashboard_chart_adapter( JSON.parse(JSON.stringify( res['dashboard'] )) );
					
					// set best sellers data
					dashboard_best_sellers_adapter( JSON.parse(JSON.stringify( res['dashboard'] )) );
					
					return;
				}
			}
			$('.section_progress').find('div:eq(0)').html( '<i class="fal fa-exclamation-triangle"></i>' );
			return $('.section_progress').find('div:eq(1)').html( res.substring(0, 200) );
		},
		error: function(err) {
			$('.section_progress').find('div:eq(0)').html( '<i class="fal fa-exclamation-triangle"></i>' );
			if (err.responseJSON) return window.location.reload();
			return $('.section_progress').find('div:eq(1)').html( 'Connection error. Tap on the <i class="fal fa-redo-alt"></i> button to retry.' );
		}
	});
}


// Dashboard best sellers adapter
function dashboard_best_sellers_adapter(data) {
	$('#panel_dashb').find('.panel_dashb_areas_b:eq(1)').html(
		'<div id="dashb_best_sellers_list" class="shadow_elmnt">'+
			'<div class="dashb_bsl_head">'+
				'<span>Product Name</span>	<span>Price</span>	<span># Units Sold</span>	<span>Revenue</span>'+
			'</div>'+
			'<div class="dashb_bsl_body">  </div>'+
		'</div>'
	);
	if (!data['bestsellers']) {
		$('#dashb_best_sellers_list').find('.dashb_bsl_body').html('<div class="dashb_inline_none">No Data</div>');
		return;
	}
	if (data['bestsellers'].length == 0) {
		$('#dashb_best_sellers_list').find('.dashb_bsl_body').html('<div class="dashb_inline_none">No Data</div>');
		return;
	}
	for (var i = 0; i < data['bestsellers'].length; i++) {
		$('#dashb_best_sellers_list').find('.dashb_bsl_body').append(
			'<div class="dashb_bsl_each_row">'+
				'<span><b>'+ serialize_html( data['bestsellers'][i]['product']['name'] ) +'</b></span>'+
				'<span>$0</span>'+
				'<span>'+ count_prefix( serialize_html( data['bestsellers'][i]['units'] ), 2) +'</span>'+
				'<span>$'+ count_prefix( serialize_html( data['bestsellers'][i]['revenue'] ), 2) +'</span>'+
			'</div>'
		);
	}
}


// Chart data switch
function chart_data_switch(switch_button) {
	if ($('#dashb_best_chart_area').length == 0) return alert('Data not yet ready');
	CHART_DATA['index'] = CHART_DATA['index'] == 1 ? 2 : 1;
	return process_chart_data();
}


// Represent chart data
function process_chart_data() {
	$('#panel_dashb').find('.panel_dashb_areas_b:eq(0)').html(
		'<div id="dashb_best_chart_area" class="shadow_elmnt"> <canvas id="dashh_chart_canvas" height="190"></canvas> </div>'
	);
	$('#panel_dashb').find('.panel_dashb_areas_a:eq(0) b').text( CHART_DATA[ 'data_'+ CHART_DATA['index'] ]['title'] );
	$('#panel_dashb').find('.panel_dashb_areas_a:eq(0) button').html(
		CHART_DATA['index'] == 1 ? '<i class="fal fa-toggle-off"></i>' : '<i class="fal fa-toggle-on"></i>'
	);
	CHART_CONFIG['data']['labels'] = CHART_DATA[ 'data_'+ CHART_DATA['index'] ]['labels'];
	CHART_CONFIG['data']['datasets'][0]['data'] = CHART_DATA[ 'data_'+ CHART_DATA['index'] ]['values'];
	CHART_PLANE = new Chart( $('#dashh_chart_canvas')[0], CHART_CONFIG );
}


// Dashboard chart adapter
function dashboard_chart_adapter(data) {
	CHART_DATA['data_1']['values'] = []; CHART_DATA['data_2']['values'] = [];
	
	// loop to get data-sets for the last 7days
	if (data['sales_over_time_week']) {
		for (var keys in data['sales_over_time_week']) {
			CHART_DATA['data_1']['values'].push( data['sales_over_time_week'][keys]['total'] );
		}
	}
	
	// loop to get data-sets for the last 12months
	if (data['sales_over_time_year']) {
		for (var keys in data['sales_over_time_year']) {
			CHART_DATA['data_2']['values'].push( data['sales_over_time_year'][keys]['total'] );
		}
	}
	
	CHART_DATA['index'] = 1;
	return process_chart_data();
}


// Dashboard summary adapter
function dashboard_sum_adapter(data) {
	var today_summary = [ 0, 0 ], last_7_days_summary = [ 0, 0 ], last_month_summary = [ 0, 0 ],
		loop_counter = 0;
	
	// loop to get data-sets for today and last 7days
	if (data['sales_over_time_week']) {
		for (var keys in data['sales_over_time_week']) {
			if (loop_counter == 0) {
				today_summary[0] += data['sales_over_time_week'][keys]['total'];
				today_summary[1] += data['sales_over_time_week'][keys]['orders'];
			}
			last_7_days_summary[0] += data['sales_over_time_week'][keys]['total'];
			last_7_days_summary[1] += data['sales_over_time_week'][keys]['orders'];
			loop_counter++;
		}
	}
	
	// loop to get data-sets for the last month
	loop_counter = 0;
	if (data['sales_over_time_year']) {
		for (var keys in data['sales_over_time_year']) {
			if (loop_counter == 1) {
				last_month_summary[0] += data['sales_over_time_year'][keys]['total'];
				last_month_summary[1] += data['sales_over_time_year'][keys]['orders'];
				break;
			}
			loop_counter++;
		}
	}
	
	// Set data
	return $('.panel_dashb_summary').html(
		'<div class="panel_dashb_s_slab shadow_elmnt">'+
			'<div><b>Today</b></div> <div>$'+ 
				count_prefix(today_summary[0], 2) +' / '+ count_prefix(today_summary[1], 2) +
			' orders</div>'+
		'</div>'+
		'<div class="panel_dashb_s_slab shadow_elmnt">'+
			'<div><b>Last 7 days</b></div> <div>$'+
				count_prefix(last_7_days_summary[0], 2) +' / '+ count_prefix(last_7_days_summary[1], 2) +
			' orders</div>'+
		'</div>'+
		'<div class="panel_dashb_s_slab shadow_elmnt">'+
			'<div><b>Last Month</b></div> <div>$'+
				count_prefix(last_month_summary[0], 2) +' / '+ count_prefix(last_month_summary[1], 2) +
			' orders</div>'+
		'</div>'
	);
}


// Section reload
function section_reload(element) {
	$('#section_scroll_up_floating_button').attr('style', 'display:none;');
	return $('#panel_dashb').is(':visible') ? load_dashb_data() : prepare_ordrs_section();
}


// Clear section data
function clear_section_data() {
	$('#panel_dashb').find('.panel_dashb_summary, .panel_dashb_areas_b').html('')
	$('#panel_ordrs').find('.panel_ordrs_body').html('');
	$('#panel_ordrs').find('input').val('');
}


// Main menu switch
function menu_switch(destination) {
	$('.nav_buttons button').each(function(){
		var nav_type = $(this).data('typ');
		if ($(this).data('des') == destination) {
			$(this).addClass( nav_type == 0 ? 'sider_button_active' : 'footer_button_active' ).attr('disabled', 'true');
		} else {
			$(this).removeClass( nav_type == 0 ? 'sider_button_active' : 'footer_button_active' ).removeAttr('disabled');
		}
	});
	$('.main_cm_head').removeClass('shadow_elmnt');
	$('#section_scroll_up_floating_button').attr('style', 'display:none;');
	
	// Reset all section data ( a shy attempt to free some memory )
	clear_section_data();
	
	$('.main_cm_head_b_a b').text( (destination == 'dashboard') ? 'Dashboard' : 'Orders' );
	return destination == 'dashboard' ? load_dashb_data() : prepare_ordrs_section();
}


// Navigation open
function nav_open(hash_value) { return window.open( hash_value, '_self' );
}


// Section on scroll actions
function header_scroll_shadow(section) {
	$('#section_scroll_up_floating_button').attr(
		'style', 'display:'+ ( ($(section).scrollTop() > 100) ? 'flex' : 'none' ) +';'
	);
	return ($(section).scrollTop() > 5) ? $('.main_cm_head').addClass('shadow_elmnt') : 
		$('.main_cm_head').removeClass('shadow_elmnt');
}


// Section scrollup
function section_go_up() {
	return $('.main_cm_body_sections').scrollTop(0);
}


// Get from local storage
function get_local_storage(key) {
	return window.localStorage.getItem(key) ? window.localStorage.getItem(key) : '';
}


// Set to local storage
function set_local_storage(key, value) { return window.localStorage.setItem(key, value);
}


// JSON string validator
function validate_json(string) {
	string = (typeof string) !== 'string' ? JSON.stringify(string) : string;
	try {
		string = JSON.parse(string);
	} catch (error) {
		return false;
	}
	if ((typeof string === 'object') && (string !== null)) {
		return true;
	}
	return false;
}


// Count prefix
function count_prefix(figure, round_to) {
	var presets = [
			{ value : 1,		symbol : ''	 }, { value : 1e3,		symbol : 'K' },
			{ value : 1e6,		symbol : 'M' }, { value : 1e9,		symbol : 'G' },
			{ value : 1e12,		symbol : 'T' }, { value : 1e15,		symbol : 'P' },
			{ value : 1e18,		symbol : 'E' }
		],
		pattern = /\.0+$|(\.[0-9]*[1-9])0+$/,
		found = presets.slice().reverse().find(function(ba){ return Math.abs(figure) >= ba.value;
		});
	return found ? (figure / found.value).toFixed(round_to).replace(pattern, '$1') + found.symbol : '0';
}


// Serialize HTML special chars
function serialize_html(text) {
	return text.toString()
		.replace(/\'/g, '′')
		.replace(/\"/g, '″')
		.replace(/</g, '‹')
		.replace(/>/g, '›')
		.replace(/&prime;/g, '′')
		.replace(/&Prime;/g, '″')
		.replace(/&lsaquo;/g, '‹')
		.replace(/&rsaquo;/g, '›');
}


// Input ENTER key interceptor
function intercept_input(input_element, input_event, destination_button) {
	if (input_event.which === 13) {
		try {
			$(input_element).blur(); $(destination_button).click();
			} catch(error){ console.log(error); // For debugging purposes
		}
		input_event.preventDefault();
	}
}


// Page theme switch
function theme_switch(element) {
	$(element).attr('disabled', 'true').html( '<i class="fal fa-spinner"></i>' );
	var prev_theme = get_local_storage('page_theme');
	set_local_storage( 'page_theme', prev_theme == 'snow' ? 'dark' : 'snow' );
	return theme_worker( prev_theme == 'snow' ? 'dark' : 'snow' );
}


// Page theme setup
function theme_setup() {
	if (get_local_storage('page_theme').length > 0) {
		return theme_worker( get_local_storage('page_theme') );
	}
	
	// Check browser theme
	if ('matchMedia' in self) {
		var new_theme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'snow';
		set_local_storage( 'page_theme', new_theme );
		return theme_worker( new_theme );
	}
	
	// Fall-back default theme
	set_local_storage('page_theme', 'snow');
	
	return theme_worker('snow');
}


// Page theme worker
function theme_worker(theme) {
	// Update chart config to match theme
	CHART_CONFIG['options']['color'] = (theme == 'dark') ? '#FFFFFF' : '#474F54';
	CHART_CONFIG['options']['scales']['x']['ticks']['color'] = (theme == 'dark') ? '#FFFFFF' : '#474F54';
	CHART_CONFIG['options']['scales']['y']['ticks']['color'] = (theme == 'dark') ? '#FFFFFF' : '#474F54';
	
	// Update mainlayout theme
	if (theme == 'dark') {
		$('#theme_styles').html(
			'body,.main_c_inner{background:#474F54;color:#FFFFFF;}'+
			'input,button,canvas{color:#FFFFFF;}'+
			'.panel_ordrs_head{background:#474F54;}'+
			'.panel_ordrs_head input,.panel_ordrs_foot button{background:rgba(255,255,255,0.2);}'+
			'.panel_ordrs_head input::placeholder{color:#FFFFFF;opacity:0.3;}'+
			'.section_progress{background:rgba(71,79,84,0.5);}'+
			'@media only screen and (max-width:700px) {'+
			'.main_cm_head_b_b button:nth-child(2){color:#FFFFFF !important;}'+
			'}'
		);
		$('.theme_switch').html('<i class="fal fa-sun"></i>').removeAttr('disabled');
		
		// Rebuild chart view if previously visible
		if ($('#dashb_best_chart_area').length > 0) {
			process_chart_data();
		}
		return;
	}
	$('#theme_styles').html(
		'body,.main_c_inner{background:#FFFFFF;color:#474F54;}'+
		'input,button,canvas{color:#474F54;}'+
		'.panel_ordrs_head{background:#FFFFFF;}'+
		'.panel_ordrs_head input,.panel_ordrs_foot button{background:rgba(209,209,209,0.2);}'+
		'.panel_ordrs_head input::placeholder{color:#474F54;opacity:0.5;}'+
		'.section_progress{background:rgba(255,255,255,0.5);}'+
		'@media only screen and (max-width:700px) {'+
		'.main_cm_head_b_b button:nth-child(2){color:#474F54 !important;}'+
		'}'
	);
	$('.theme_switch').html('<i class="fal fa-moon"></i>').removeAttr('disabled');
	
	// Rebuild chart view if previously visible
	if ($('#dashb_best_chart_area').length > 0) {
		process_chart_data();
	}
}
