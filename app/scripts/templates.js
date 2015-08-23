angular.module("templates").run(["$templateCache", function($templateCache) {$templateCache.put("candidate.html","<div class=\"rt-candidate-controller\">\n  <div ng-if=\"!importData.candidate\" class=\"rt-heading\">\n    <div class=\"rt-photo\">\n      <img ng-src=\"{{\'images/candidate.png\'|extensionUrl}}\">\n    </div>\n    <h1 class=\"rt-light-color\">No candidate found</h1>\n  </div>\n  <div ng-if=\"importData.candidate\" class=\"rt-candidate\">\n    <div class=\"rt-heading\">\n      <div class=\"rt-photo\">\n        <img ng-src=\"{{ importData.candidate.remote_photo_url }}\">\n      </div>\n      <h1>{{ importData.candidate.name }}</h1>\n    </div>\n    <div class=\"rt-form\">\n      <div class=\"rt-form-group\">\n        <label for=\"email\" class=\"rt-label\">Name</label>\n        <input id=\"email\" type=\"text\" name=\"name\" ng-model=\"importData.candidate.name\" class=\"rt-control\">\n      </div>\n      <div class=\"rt-form-group\">\n        <label for=\"email\" class=\"rt-label\">Email</label>\n        <input id=\"email\" type=\"text\" name=\"email\" ng-model=\"importData.candidate.email\" placeholder=\"add email\" class=\"rt-control\">\n      </div>\n      <div class=\"rt-form-group\">\n        <label for=\"note\" class=\"rt-label\">Note</label>\n        <textarea id=\"note\" type=\"text\" name=\"note\" ng-model=\"importData.note\" placeholder=\"add internal note\" class=\"rt-control\"></textarea>\n      </div><a ng-click=\"import()\" class=\"rt-button\">Import candidate</a></div>\n  </div>\n</div>\n");
$templateCache.put("main.html","<div ng-show=\"opened\" class=\"rt-sidebar\">\n  <div class=\"rt-header\">\n    <div class=\"rt-actions\">\n      \n      <a ng-click=\"changeView(\'profile\')\">\n      </a>\n      <a ng-click=\"closeDrawer()\">\n\n      </a>\n    </div>\n    <a href=\"https://recruitee.com\" target=\"_blank\">\n\n    </a>\n  </div>\n  <div ng-include=\"view\" class=\"rt-view\">\n  </div>\n</div>\n");
$templateCache.put("sourcing_button.html","<a class=\"specky-sourcing-button\"></a>\n");}]);