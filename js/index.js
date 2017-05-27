
$(document).ready(function(){
	$(":checkbox").labelauty({ label: false });
	$("#print").on('click', function(){
		ga('send', 'event', 'print', 'click', 'print');
		window.print();
	});
	$("#reset").on('click', function(){
		ga('send', 'event', 'reset', 'click', 'reset');
		$('input:checkbox').each(function() {
			$(this).prop('checked', false);
		});
		if (useGarlic) {
			$("#checklist-form").garlic('destroy');
		}
	});
	$("#footer a").on('click', function(e){
		var elm = e.currentTarget;
		ga('send', 'event', 'footer', $(elm).attr('title'));
	});
	$("input:checkbox").on('change', function(e){
		var cb = $(this);
		var id = cb.attr('id');
		var isChecked = cb.is(':checked');
		ga('send', 'event', {
			'eventCategory': 'checkbox',
			'eventAction': isChecked ? 'set' : 'clear',
			'eventLabel': id
		});
	});

	$('.open-popup-link').magnificPopup({
	  	type:'inline',
	  	midClick: true,
		callbacks: {
			open: function() {
				ga('send', 'event', 'popup', 'open', $(this.content).attr('id'));
			},
			close: function() {
				ga('send', 'event', 'popup', 'close', $(this.content).attr('id'));
			}
		}
	});
});

var useGarlic = false;

//realtime api
var defaultTitle = "UXchecklist";
var checkboxes = {};
var view = null;
var controller = null;

var log = (document.location.hostname == "localhost" && Function.prototype.bind)
	? Function.prototype.bind.call(console.log, console)
	: function() {};

$().ready(function(){
	var setTitles = function(titles, selectedTitle, fileId, e) {
		log(titles);
		log(selectedTitle);
		log(fileId);
		var newTitle = defaultTitle;
		var titleCounter = 0;
		var titleTest = function(title, _) {return title.toLowerCase() == newTitle.toLowerCase();};
		while (titles.some(titleTest)) {
			newTitle = defaultTitle + (++titleCounter);
		}
		log(newTitle);
		$("#project h1").text(selectedTitle);
		$(e).empty();
		$(titles).each(function(_, title) {
			var selected = title == selectedTitle ? "selected" : "";
			$(e).append("<li class='" + selected + "'><a href='javascript:void(0)' data-title='" + title + "'>" + title + "</a></li>");
		});
	    $(e).append("<li><a id='newPrj' data-title='" + newTitle + "'href='javascript:void(0)'>New Project</a></li>");
		
		$('a', e).click(function () {
			ga('send', 'event', 'file', 'change', 'file');
			var title = $(this).attr('data-title');
			$(".st-content").trigger("click");
			if (title === newTitle) {
				$('input:checkbox').each(function() {
					$(this).prop('checked', false);
				});
			}
			controller.start(title);
		});

		gapi.load('drive-share', function() {
			var shareClient = new gapi.drive.share.ShareClient('<YOUR_APP_ID>');
			shareClient.setItemIds([fileId]);
			$('#file-share').on('click', function() {
				ga('send', 'event', 'share', 'click', 'share');
				shareClient.showSettingsDialog();
			});
		});
	}

	$('#confirm-rename').on('click', function() {
		ga('send', 'event', 'rename', 'click', 'rename');
		if (newTitle) {
			ga('send', 'event', 'rename', 'rename', 'rename');
			controller.rename(newTitle, function(newTitle){
				controller.start(newTitle);
			});
		} 
	});

	$("#cancel-delete").on('click', function(){
		$.magnificPopup.instance.close();
	})

	$("#confirm-delete").on('click', function(){
		$.magnificPopup.instance.close();
		controller.deleteFile(null, function(){
			controller.start("","", defaultTitle);
		});
	})
		
	var fileList = new Realtime.Model.FileList($('#file-list'), setTitles);
	var isFn = function(id, e) { return $(e).is(':checked'); };
	var setFn = function(id, e, val) {
		$(e).prop('checked', val);
	};
	$('input:checkbox').each(function() {
		var id = $(this).attr('id');
		checkboxes[id] = new Realtime.Model.CheckBox(id, this, isFn, setFn);
	});
	view = new Realtime.View(fileList, checkboxes);
	var cb = view.checkboxes;
	log(cb);
	controller = new Realtime.Controller(view);
	
	var getParam = function(name) {
		var match = RegExp('[?&]' + name + '=([^&]*)').exec(window.location.search);
		return match && decodeURIComponent(match[1].replace(/\+/g, ' '));
	};
	
	var title = getParam('title');
	log(title);
	if (title) {
		ga('send', 'event', 'file', 'open_by_title', 'file');
	}
	var ids = getParam('ids');
	log(ids);
	if (ids) {
		ga('send', 'event', 'file', 'open_by_id', 'file');
	}
	gapi.load("auth:client,drive-realtime,drive-share", function () {
		controller.init();
		$('form').on('change', 'input:checkbox', function(ev){
			log(ev);
			if (controller.isLoaded()) {
				controller.onCheckBoxChange($(ev.target).attr('id'));	
			}
		});

		var signinSuccess = function() {
			$('#signin-do').hide();
			$('#signin-fail').hide();
			$('#signin-success').show();
			$("#reset").on('click', function(){
				controller.save();
			});
			$('#sharebox').appendTo('#signin-success');
			$('#header').removeClass('loading');
		};

		var signinFailed = function() {
			$('#signin-fail').show();
			$('#header').removeClass('loading');
		};
		
		controller.auth(true,
			signinSuccess,
			function(){
				$('#signin-do').show();
				$('#header').removeClass('loading');
				$("#checklist-form").garlic();
				useGarlic = true;
				log("Local storage enabled");
			},
			title,
			ids,
			defaultTitle
		);

		$('#signin').on('click', function(){
			controller.auth(false, signinSuccess, signinFailed, title, ids, defaultTitle);
		});
	});
});
