/* Displays a message */
function modalMessageBox(message) {
    if (message.trim() == '') {
        message = 'Hmmm, no, nothing to say…';
    }
    $('#ServerMessage > .modal-body > p').text(message);
    $('#ServerMessage').modal();
}

/* Call a cgi-bin functio then displays the returned valu in modal box */
function callVarnish(url) {
    $.get(url, function(data) {
        modalMessageBox(data);
    });
}

/* Update statistics table */
function updateStat() {
    // Get varnishd pid
    // ps aux | grep varnishd | grep -v grep | awk '{print $2}'
    $.get('/cgi-bin/getvrnpid.txt').done(function(pid){
        if (pid.trim() == '') {
            $('#pid').text('Stopped').attr('class', 'btn btn-danger');
        
        // Varnishd is running:
        } else {
            $('#pid').text('Varnish Running (' + pid.trim() + ')').attr('class', 'btn btn-success');
            
            // Get varnish status
            // varnishadm -S /etc/varnish/secret.www-data -T 127.0.0.1:6082 status
            $.get('/cgi-bin/status.txt').done(function(status){
                if (status.indexOf('running') == -1) {
                    $('#status').text('Stopped').attr('class', 'btn btn-danger');
                
                // varnish has started:
                } else {
                    $('#status').text(status.trim()).attr('class', 'btn btn-success');
                    
                    // get varnishstat
                    //	varnishstat -j -1
                    $.getJSON('/cgi-bin/varnishstat.json').done(function(data){
                        // for each value:
                        $.each(data, function(key, val) {
                            // we remove any character that cold cause trouble:
                            key = key.replace('MAIN.', '');
                            var ekey = key.replace(/[\.\(\),]/gi, '_');
                            // if this is the timestamp:
                            if (ekey == 'timestamp') {
                                $('#s_' + ekey + ' > td:first').text(key);
                                $('#s_' + ekey + ' > td:last').text(val);
                                // if this value is already in the html table, we just update its value:
                            } else if ($('#s_' + ekey).length > 0) {
                                $('#s_' + ekey + ' > td:first').attr('title',val['description']).text(key);
                                $('#s_' + ekey + ' > td:last').text(val['value']);
                                // else we add a new row to the html table:
                            } else {
                                $('#stat').append('<tr id="s_' + ekey + '" class="secondary" rel="tooltip" title="' + val['description'] + '"><td>' + key + '</td><td>' + val['value'] + '</td></tr>');
                            }
                        });
                        
                        // we calculate the ratio HIT/(HIT+MISS)
                        var ratio = Math.floor(data['MAIN.cache_hit']['value'] / (data['MAIN.cache_miss']['value'] + data['MAIN.cache_hit']['value']) * 100);
                        // Depending on the ratio we change the badge color:
                        if (isNaN(ratio)) {
                            $('#ratio').attr('class', 'btn btn-default').hide();
                        } else if (ratio < 15) {
                            $('#ratio').attr('class', 'btn btn-danger');
                        } else if (ratio < 50) {
                            $('#ratio').attr('class', 'btn btn-warning');
                        } else if (ratio < 90) {
                            $('#ratio').attr('class', 'btn btn-info');
                        } else {
                            $('#ratio').attr('class', 'btn btn-success');
                        }
                        $('#ratio').text(ratio + "%");
                        
                        // come back in 2 second:
                        setTimeout(updateStat, 2000);
                    }).error(function(){
                        $('#ratio').attr('class', 'btn btn-danger').text('Error');
                    });
                }
            }).error(function(){
                $('#status').attr('class', 'btn btn-danger').text('Error');
            });
        }
    }).error(function(){
        $('#pid').text('Error').attr('class', 'btn btn-danger');
    });
}


$('tr[rel="tooltip"]').tooltip({
    container: 'body',
    placement:'left'
});

/* Ban everything */
function banCache() {
    callVarnish('/cgi-bin/ban.txt');
}

/* Stops the starts Varnish */
function rebootVarnish() {
    callVarnish('/cgi-bin/reboot.txt');
}

/* Starts logging */
function startLog() {
    callVarnish('/cgi-bin/startlog.txt');
}

/* Stops logging */
function stopLog() {
    callVarnish('/cgi-bin/stoplog.txt');
}

/* Stops all logging processes */
function stopAll() {
    callVarnish('/cgi-bin/stopall.txt');
}

/* Empties log file */
function clearLog() {
    callVarnish('/cgi-bin/clearlog.txt');
}

/* update log */
function updateLog() {
    // Gets log process pid:
    $.get('/cgi-bin/getlogpid.txt', function(pid) {
        // if no log process is running for this public ip:
        if (pid.trim() == '') {
            $('#pid').text('Stopped');
            $('#pid').removeClass('badge-success');
            // Gets log in case there is an old one worth reading:
            if ($('#logs').text() == '') {
                getLog();
            }
            // a log process is currently running:
        } else {
            $('#pid').text('Log Running (' + pid.trim() + ')');
            $('#pid').addClass('badge-success');
            // get log content:
            getLog();
        }
        // come back in 2 seconds:
        setTimeout(updateLog, 2000);
    });
}
/* Gets log content and scrolls down */
function getLog() {
    $.get('/cgi-bin/readlog.txt', function(data) {
        $('#logs').text(data);
        $("#logs").animate({scrollTop: $('#logs')[0].scrollHeight}, 1000);
    });
}



