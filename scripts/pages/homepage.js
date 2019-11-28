require(['modules/jquery-mozu'], 
function($) {
    
    $("#play-video").on("click", function(e) {
        $(".image-video-wrapper").hide();
        $(".video-contaier").removeClass('hidden');
        $('.mz-iframe').fadeIn("slow");
        $(".video-contaier").fadeIn("slow");
        $('.mz-iframe').addClass('video-contaier');
        
        
        var videoURL = $('.mz-iframe').prop('src');
        videoURL += "?rel=0&autoplay=1";
        $('.mz-iframe').prop('src',videoURL);
    });
    
    $(document).ready(function($) {

        $(function(){
          //Snag the URL of the iframe so we can use it later
          var url = $('.mz-iframe iframe').attr('src');
          $('p.video-button a').click(function() {
              $('.mz-iframe').show();
              //Below we remove the URL to stop the video from playing, here we add it back in
              $('.mz-iframe iframe').attr('src', url);
          });
          $('p.close-video a').click(function() {
              $('.mz-iframe').hide();
              $(".image-video-wrapper").fadeIn("slow");
              //Assign the iframe's src to null, which kills the video
              $('.mz-iframe iframe').attr('src', '');
            });
        });
        
    });
    $('#stop').on('click', function() {
        $('#thevideo')[0].contentWindow.postMessage('{"event":"command","func":"' + 'stopVideo' + '","args":""}', '*');   
    });
});


