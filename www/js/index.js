var app = {
    initialize: function() {
        this.bind();
    },
    bind: function() {
        document.addEventListener('deviceready', this.deviceready, false);
    },
    deviceready: function() {
        // note that this is an event handler so the scope is that of the event
        // so we need to call app.report(), and not this.report()

        var cb = ChildBrowser.install();
        if (cb != null)
        {
            cb.onLocationChange = function(loc){ root.locChanged(loc); };
            cb.onClose = function(){root.onCloseBrowser()};
            cb.onOpenExternal = function(){root.onOpenExternal();};
            window.plugins.childBrowser.showWebPage("http://google.com");
        }

        app.report('deviceready');
    },
    report: function(id) { 
        console.log("report:" + id);
        // hide the .pending <p> and show the .complete <p>
        document.querySelector('#' + id + ' .pending').className += ' hide';
        var completeElem = document.querySelector('#' + id + ' .complete');
        completeElem.className = completeElem.className.split('hide').join('');
    }
};
