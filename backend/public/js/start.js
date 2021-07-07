(function ($) {
    /**
     * START - ONLOAD - JS
     */
    /* ----------------------------------------------- */
    /* ------------- FrontEnd Functions -------------- */
    /* ----------------------------------------------- */

    /**
      * Hide Toastr
      */
    function hideToastr() {
        if (!$('.toastr').length) { return; }

        $('.toastr .close').on('click', function (e) {
            e.preventDefault();
            let toastr = $(this).closest('.toastr'),
                time = toastr.data('time');
            setTimeout(() => {
                $(toastr).removeClass('shw');
            }, time);
        })
    }


    /* ----------------------------------------------- */
    /* ----------------------------------------------- */
    /* OnLoad Page */
    $(document).ready(function ($) {
        hideToastr();
    });
    /* OnLoad Window */
    var init = function () {

    };
    window.onload = init;

})(jQuery);
