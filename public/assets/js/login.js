// Bind a document ready listener
$(document).ready(function() {
	// Remove any unwanted URL hash incase of a redirect from /panel.html
	if (window.location.href.includes('#')) return window.open('./index.html', '_self');

	// Check for session token
	if (get_local_storage('sess_tokn').length > 0) {
		var sess_tokn = get_local_storage('sess_tokn');

		// Validate available session token
		if (validate_json( sess_tokn )) {
			sess_tokn = JSON.parse(sess_tokn);

			// Check retrieved token time is less than 15 minutes
			if (
				parseInt((Date.now() - sess_tokn['time']) / 1000) < 900
			) return window.open('./panel.html', '_self');
		}

		// Reset session token value
		set_local_storage('sess_tokn', '');
	}

	// Setup page theme
	theme_setup();

	// Dismiss splash
	$('.splash').remove();
});


// Process login form
function process_login(submit_button) {
	var username = $('#login_form_username').val(),
		password = $('#login_form_password').val();
	
	// Validate input
	if ((username.trim().length == 0) || (password.trim().length == 0)) {
		return show_error('All fields are mandatory');
	}
	
	$(submit_button).attr('disabled', 'true').html('<i class="fal fa-spinner fa-spin fa-fw"></i>');
	$.ajax({
		url : 'https://freddy.codesubmit.io/login',
		type : 'POST',
		contentType : 'application/json',
		data : JSON.stringify({ 'username' : username, 'password' : password }),
		success: function(res) {
			if (validate_json(res)) {
				if (res['access_token'] && res['refresh_token']) {
					
					// Store access ( session ) and reload to redirect
					set_local_storage(
						'sess_tokn',
						JSON.stringify({
							'token' : res['access_token'], 'time' : Date.now(), 'refresh' : res['refresh_token']
						})
					);
					return window.location.reload();
				}
			}
			$(submit_button).removeAttr('disabled').html('Login');
			return show_error(res);
		},
		error: function(err) {
			$(submit_button).removeAttr('disabled').html('Login');
			return show_error( err.responseJSON ? err.responseJSON['msg'] : 'Connection error. Retry' );
		}
	});
}


// Handle login error
function show_error(error) {
	$('.form_indicator').text( error );
	setTimeout(function(){
		return $('.form_indicator').text('');
	}, 2000);
}


// Get from local storage
function get_local_storage(key) {
	return window.localStorage.getItem(key) ? window.localStorage.getItem(key) : '';
}


// Set to local storage
function set_local_storage(key, value) {
	return window.localStorage.setItem(key, value);
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


// Password visibility switch
function password_state(element) {
	if ($(element).parent().siblings('input:eq(0)').attr('type') == 'password') {
		$(element).parent().siblings('input:eq(0)').attr('type', 'text');
		$(element).html('<i class="fal fa-eye"></i>');
		return;
	}
	$(element).parent().siblings('input:eq(0)').attr('type', 'password');
	$(element).html('<i class="fal fa-eye-slash"></i>');
}


// Page theme switch
function theme_switch(element) {
	$(element).attr('disabled', 'true').html('<i class="fal fa-spinner"></i>');
	var prev_theme = get_local_storage('page_theme');
	set_local_storage('page_theme', prev_theme == 'snow' ? 'dark' : 'snow');
	return theme_worker( prev_theme == 'snow' ? 'dark' : 'snow' );
}


// Page theme setup
function theme_setup() {
	if (get_local_storage('page_theme').length > 0) {
		return theme_worker(get_local_storage('page_theme'));
	}
	
	// Check browser theme
	if ('matchMedia' in self) {
		var new_theme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'snow';
		set_local_storage('page_theme', new_theme);
		return theme_worker(new_theme);
	}
	
	// Fall-back default theme
	set_local_storage('page_theme', 'snow');
	
	return theme_worker('snow');
}


// Page theme worker
function theme_worker(theme) {
	if (theme == 'dark') {
		$('#theme_styles').html(
			'body,.main_c_inner{background:#474F54;color:#FFFFFF;}'+
			'input,button{color:#FFFFFF;}'+
			'.back_container div,.form_input_elmnt_a{border-color:#575f64;}'+
			'.back_container{background:#575f64;}'+
			'.form_input_elmnt_a:has(> input:focus) .form_input_elmnt_label,'+
			'.form_input_elmnt_a:has(> input:valid) .form_input_elmnt_label{background:#474F54;}'+
			'@media only screen and (max-width:700px) {.main_container{background:#474F54;} }'
		);
		$('.theme_switch').html('<i class="fal fa-sun"></i>').removeAttr('disabled');
		return;
	}
	$('#theme_styles').html(
		'body,.main_c_inner{background:#FFFFFF;color:#474F54;}'+
		'input,button{color:#474F54;}'+
		'.back_container div,.form_input_elmnt_a{border-color:#D1D1D1;}'+
		'.back_container{background:#D1D1D1;}'+
		'.form_input_elmnt_a:has(> input:focus) .form_input_elmnt_label,'+
		'.form_input_elmnt_a:has(> input:valid) .form_input_elmnt_label{background:#FFFFFF;}'+
		'@media only screen and (max-width:700px) {.main_container{background:#FFFFFF;} }'
	);
	$('.theme_switch').html('<i class="fal fa-moon"></i>').removeAttr('disabled');
}
