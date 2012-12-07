    var favorites = amplify.store("YANA.favorites") ? amplify.store("YANA.favorites") : [];
    var cachedItems = amplify.store("YANA.items") ? amplify.store("YANA.items") : [];

    $(document).ready(function () {
    
      // initialize favorites
      //if (amplify.store("YANA.favorites")) favorites = amplify.store("YANA.favorites");
      //if (amplify.store("YANA.items")) cachedItems = amplify.store("YANA.items");


      // --------------------------------------------------------------------------
      // --------------------------- SEARCH ---------------------------------------
      // --------------------------------------------------------------------------
       $('#osForm').submit(function(event) {
        var osUrl = this.action+'?'+$(this).serialize();
        var yqlUrl = "http://query.yahooapis.com/v1/public/yql?q=select%20*%20from%20xml%20where%20url%3D%22" + 
          encodeURIComponent(osUrl) + "%22&format=json";
        var ul = '';
          $.ajax({
              type: "GET",
              url: yqlUrl,
              contentType: "application/json; charset=utf-8",
              dataType: "jsonp",
              beforeSend: function() { $.mobile.showPageLoadingMsg(); },
              success: function(data) {
                  var result = JSON.stringify(data);   
                  if(JSON.parse(result).query.results && JSON.parse(result).query.results.rss) {
                    currentItems = JSON.parse(result).query.results.rss.channel.item;
                    $.each(JSON.parse(result).query.results.rss.channel.item, function(index) {
                      ul += '<li id="result_'+index+'" data-source="'+this.link+
                        '" class="html articleDetails" data-theme="c" data-item-index="'+index+'">'+
                        '<a href="#articleDetails&type=item&url='+
                        encodeURIComponent(this.link).replace(/\./g,'%2E')+'">'+this.title+'</a></li>';
                    }); 
                  }
              },
              error: function(request, textStatus, errorThrown) { },
              complete: function(request, textStatus){
                $('#searchResults').listview();
                $('#searchResults').html(ul).trigger('create');
                $('#searchResults').listview('refresh');
                $.mobile.hidePageLoadingMsg()
              }        
          });
      return false;
      }); // opensearch form submit

    }); // document.ready

    // --------------------------------------------------------------------------
    // ------------------- CALL RENDERS BASED ON URL PARAMS ---------------------
    // --------------------------------------------------------------------------
    $(document).bind( "pagebeforechange", function( e, data ) {

      if ( typeof data.toPage === "string" ) {
          var hash = $.mobile.path.parseUrl( data.toPage ).hash;
          console.log("pagebeforechange: "+hash);
          var type = $.url(hash).fparam('type');
          var url = $.url(hash).fparam('url'); 
          var index = getItemIndex(url); // is it in cache?
          if (hash === '#favPage') { renderFavorites(); }
          if (url !== null) {
            if (type === 'item') {  if (index !== -1) renderItemDetails(index);
            } else if (type === 'feed') { renderFeedItems(url,$.url(hash).fparam('title')); 
            } else if (type === 'html') { renderHtmlPage(url,$.url(hash).fparam('title')); } 
          }
      }
    });

      // --------------------------------------------------------------------------
      // --------------------------- JQM HACKS ------------------------------------
      // --------------------------------------------------------------------------
      $(document).bind( "pagechange", function() {
        $('.ui-page-active .ui-listview').listview('refresh');
        $('.ui-page-active :jqmData(role=content)').trigger('create');
      });
      // hack to add the back and home button to all nested listviews
      $(':jqmData(url^=home)').live('pagebeforecreate', 
        function(event) {
          $(this).filter(':jqmData(url*=ui-page)').find(':jqmData(role=header)')
            .prepend('<a href="#" data-rel="back" data-icon="arrow-l">Back</a>')
          $(this).filter(':jqmData(url*=ui-page)').find(':jqmData(role=header)')
            .append('<a href="#home" data-icon="home">Home</a>')
      });

      // --------------------------------------------------------------------------
      // --------------------------- CHILD BROWSER --------------------------------
      // --------------------------------------------------------------------------
      function showInChildBrowser(url){  
        if (window.plugins && (window.plugins.childBrowser != null) ) {
          Cordova.exec("ChildBrowserCommand.showWebPage", url);
          return false;
        } else {
          return true;
        }  
      }

      // --------------------------------------------------------------------------
      // --------------------------- FAVORITES ------------------------------------
      // --------------------------------------------------------------------------

      function getFavoriteIndex(link) {
          for (var i=0;i<favorites.length;i++) {
            if (favorites[i]['link'] === link ) return i;
          }
          return -1;
      }

      $('.addFavoriteButton').live('click',
        function() { 
          var link = $(this).attr('data-item-link') 
          var item = getCachedItem(link);
          if (item !== null){
            favorites.push(item);
            amplify.store("YANA.favorites",favorites);
          }
          $('#addFavButton').hide();
          $('#removeFavButton').show();
      });

      $('.deleteFavoriteButton').live('click',
        function() {
          var link = $(this).attr('data-item-link');
          var pos = getFavoriteIndex(link);
          if ( pos != -1) { 
            favorites.splice(pos, 1);
            amplify.store("YANA.favorites",favorites);
          }
          $('#addFavButton').show();
          $('#removeFavButton').hide();
      });

      $('.favorites').live('click',
        function() {
          currentItems = favorites;
          $('#favContent ul').listview();
          $('#favContent ul').listview('refresh');
          $.mobile.hidePageLoadingMsg();
      });
     
      function renderFavorites() {
        var ul = '';
        $.each(favorites, function(index) {
         ul += '<li class="articleDetails" data-item-link="'+this.link+'" data-theme="c">' +
          '<a href="#articleDetails&type=item&url='+encodeURIComponent(this.link).replace(/\./g,'%2E')+
          '&title='+encodeURIComponent(this.title)+'">'+this.title+'</a></li>';
        });
        currentItems = favorites;
        $('#favContent ul').html(ul).trigger('create');
        $.mobile.hidePageLoadingMsg();
      }
 
      // --------------------------------------------------------------------------
      // --------------------------- ITEM VIEW ------------------------------------
      // --------------------------------------------------------------------------
      $('.articleDetails').live('click',
        function() { 
          var hash = $(this).find('a').attr('href');
          window.location.replace(hash); // won't update properly otherwise...
      });

      function renderItemDetails(itemIndex) {
        var buttons = '';
        $("#articleContent").html(cachedItems[itemIndex].description);
        $("#articleTitle").html(cachedItems[itemIndex].title);
        if (cachedItems[itemIndex].enclosure) {
          buttons += '<a onclick="return showInChildBrowser(\'' + cachedItems[itemIndex].enclosure.url + '\');" '+
            'rel="external" href="'+cachedItems[itemIndex].enclosure.url+'" data-role="button">PDF</a> ';
        }
        if (cachedItems[itemIndex].link) {
          buttons += '<a onclick="return showInChildBrowser(\'' + cachedItems[itemIndex].link + '\');" '+
            'rel="external" href="'+cachedItems[itemIndex].link+'" data-role="button">Web</a> ';
        }
          buttons += '<a href="#" id="removeFavButton" data-item-index="'+itemIndex+'" data-item-link="'+cachedItems[itemIndex].link+
            '" class="deleteFavoriteButton" data-role="button">Remove from Favorites</a>';
          buttons += '<a href="#" id="addFavButton" data-item-index="'+itemIndex+'" data-item-link="'+cachedItems[itemIndex].link+
            '" class="addFavoriteButton" data-role="button">Add to Favorites</a>';            
        $("#articleFooter").html(buttons).trigger('create');
        if (getFavoriteIndex(cachedItems[itemIndex].link) != -1) { $('#addFavButton').hide(); } else { $('#removeFavButton').hide(); }
      }

      function getItemIndex(link) {
          for (var i=0;i<cachedItems.length;i++) {
            if (cachedItems[i]['link'] === link ) return i;
          }
          return -1;
      }
      function getCachedItem(link) {
          for (var i=0;i<cachedItems.length;i++) {
            if (cachedItems[i]['link'] === link ) return cachedItems[i];
          }
          return null;
      }

      function addCachedItem(item) {
          if (getItemIndex(item.link) === -1){
            cachedItems.push(item);
            amplify.store("YANA.items",cachedItems);
          }
      }

      // --------------------------------------------------------------------------
      // --------------------------- HTML ITEM ------------------------------------
      // --------------------------------------------------------------------------
      $('.html').live('click',
        function() { 
          var url = $(this).attr("data-source");
          var title = $.trim($(this).find('a').text());
          var hash = '#htmlPage&type=html&url=' + encodeURIComponent(url).replace(/\./g,'%2E') + '&title=' + encodeURIComponent(title);
          window.location.replace(hash); // won't update properly otherwise...
          $('#htmlContent').hide();
          renderHtmlPage(url,title); // needed for refresh bug...
      });
      
      function renderHtmlPage(url,title) { 
        console.log("renderHtmlPage title: "+title);
          var yqlUrl  = "http://query.yahooapis.com/v1/public/yql?q=select%20*%20from%20html%20where%20url%3D%22"+
            encodeURIComponent(url) + "%22";
          var html = '';
          $.ajax({
              type: "GET",
              url: yqlUrl,
              contentType: "application/json; charset=utf-8",
              dataType: "jsonp",
              beforeSend: function() { $.mobile.showPageLoadingMsg(); },
              success: function(data) { if (data.results[0]) { html = data.results[0]; } },
              error: function(request, textStatus, errorThrown) { console.log("error: "+errorThrown); },
              complete: function(request, textStatus){
                $('#htmlContent').show();
                $("#htmlContent").html(html);
                $("#htmlTitle").html(title);
                $.mobile.hidePageLoadingMsg()
              }
          }); 
      }

      // --------------------------------------------------------------------------
      // --------------------------- RSS MENU ITEMS -------------------------------
      // --------------------------------------------------------------------------
      $('.feed').live('click',
        function() { 
          var url = $(this).attr("data-source");
          var title = $.trim($(this).find('a').text());
          var hash = '#feedPage&type=feed&url=' + encodeURIComponent(url).replace(/\./g,'%2E')+ '&title=' + encodeURIComponent(title);
          window.location.replace(hash); // won't update properly otherwise...
          $('#feedList').hide();
          renderFeedItems(url,title);
      });

      function renderFeedItems(url,title) {   
        var yqlUrl = "http://query.yahooapis.com/v1/public/yql?q=select%20*%20from%20feed%20where%20url%3D%22" + 
            encodeURIComponent(url) + "%22&format=json";
        var ul = '';
        $.ajax({
            type: "GET",
            url: yqlUrl,
            contentType: "application/json; charset=utf-8",
            dataType: "jsonp",
            beforeSend: function() { $.mobile.showPageLoadingMsg(); },
            success: function(data) {
                var result = JSON.stringify(data);  
                if (JSON.parse(result).query.results) {
                  currentItems = JSON.parse(result).query.results.item;
                  $.each(JSON.parse(result).query.results.item, function(index) {
                    addCachedItem(this);
                    if (this.link.type === 'rss' && this.link.content) {
                       ul += '<li data-source="'+this.link.content+'" class="feed">' +
                        '<a href="#feedPage&type=feed&url='+encodeURIComponent(this.link.content).replace(/\./g,'%2E')+'">'+this.title+'</a>' +
                        '<ul data-role="listview" data-inset="true"></ul></li>';                             
                    } else {
                       ul += '<li class="articleDetails" data-item-index="'+index+'">'+
                      '<a href="#articleDetails&type=item&url='+encodeURIComponent(this.link).replace(/\./g,'%2E')+'">'+this.title+' </a>';                     
                    } 
                  });
                } else {
                  console.log("ERROR: no yql result returned!");
                }            
            },
            error: function(request, textStatus, errorThrown) { console.log("ERROR: "+request)},
            complete: function(request, textStatus){
              $('#feedList').show();
              $('#feedList').listview();
              $('#feedList').html(ul).trigger('create');
              $('#feedList').listview('refresh');
              $("#feedTitle").html(title);
              $.mobile.hidePageLoadingMsg()
            }
        });
      }