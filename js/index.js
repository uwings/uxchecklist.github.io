$(document).ready(function() {
    $(":checkbox").labelauty({
        label: false
    });
    $("#print").on('click', function() {
        window.print();
    });
    $("#reset").on('click', function() {
        $('input:checkbox').each(function() {
            $(this).prop('checked', false);
        });
        if (useGarlic) {
            $("#checklist-form").garlic('destroy');
        }
    });
    $("#footer a").on('click', function(e) {
        var elm = e.currentTarget;
    });
    $("input:checkbox").on('change', function(e) {
        var cb = $(this);
        var id = cb.attr('id');
        var isChecked = cb.is(':checked');
    });
});

var useGarlic = false;


$().ready(function() {
    var setTitles = function(titles, selectedTitle, fileId, e) {
        log(titles);
        log(selectedTitle);
        log(fileId);
        var newTitle = defaultTitle;
        var titleCounter = 0;
        var titleTest = function(title, _) {
            return title.toLowerCase() == newTitle.toLowerCase();
        };
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
        $(e).append("<li><a id='newPrj' data-title='" + newTitle + "'href='javascript:void(0)'>+ New Project</a></li>");
    }

    $('#project-title').on('click', function(e) {
        var inputField = $('#rename-input');
        $('#project-title').hide();
        inputField.val($("#project-title").text());
        inputField.show();
        inputField.focus();
        inputField.select()
    });

    $('#rename-input').on('blur', function(e) {
        $('#rename-input').hide();
        $('#project-title').show();
    });

    $('#rename-input').on('keydown', function(e) {

        var code = e.keyCode || e.which;
        if (code == 13) { //Enter keycode
            var newTitle = $(this).val();
            if (newTitle !== $("#project-title").text()) {
                $('#rename-input').hide();
                $('#project-title').show();
                $("#project-title").text(newTitle);
                renameProject(newTitle);
            } else {
                $('#rename-input').hide();
                $('#project-title').show();
            }
        }

        if (code == 27) { //Esc keycode
            $('#rename-input').hide();
            $('#project-title').show();
        }
    });

    $("#cancel-delete").on('click', function() {
        $.magnificPopup.instance.close();
    })

    $("#confirm-delete").on('click', function() {
        $.magnificPopup.instance.close();
        controller.deleteFile(null, function() {
            controller.start("", "", defaultTitle);
        });
    })
});