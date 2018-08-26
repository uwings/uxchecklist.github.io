$(document).ready(function() {

	$('.buy-banner--wrapper--is-folded').find('.buy-banner--button').css({
		'maxWidth' : $('.buy-banner--wrapper--is-folded').find('.buy-banner--button').outerWidth()
	});

    $('#buy-banner-toggle').on('click', function(e) {
        $('#buy-banner').toggleClass('buy-banner--wrapper--is-folded buy-banner--wrapper--is-unfolded');
        e.preventDefault();
    });

});