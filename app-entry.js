/* Portal links select a preview role; this is not an authentication mechanism. */
(function(){const role=new URLSearchParams(location.search).get('role');if(['member','coach','manager'].includes(role)&&typeof setApp==='function')setApp(role);})();
