angular.module("specky.controllers",[]);
angular.module("specky.factories",[]);
angular.module("templates",[]);
angular.module("specky.filters", []);


var app;
app = angular.module("specky", ["templates","specky.controllers","specky.factories","specky.filters"]);
app.config(function($compileProvider) {
  return $compileProvider.imgSrcSanitizationWhitelist(/^\s*((https?|ftp|file|blob|chrome-extension|resource):|data:image\/)/);
});
angular.element(document).ready(function() {
  var bootstrapTemplate;
  bootstrapTemplate = "<div id='specky-drawer' ng-controller='MainController'  ng-include=\"'main.html'\"></div>";
  angular.element("body").append(bootstrapTemplate);
  return angular.bootstrap(angular.element("#specky-drawer"), ["specky"]);
});

angular.module("specky.controllers").controller("MainController", function($scope, $rootScope, $location, ProviderHelper) {
  var adminRefreshedListener, openDrawerListener;
  $scope.opened = false;
  $scope.closeDrawer = function() {
    return $scope.opened = false;
  };
  $scope.openDrawer = function() {
    $scope.changeView("candidate");
    $scope.opened = true;
    if ($scope.provider != null) {
      $scope.importData = {
        candidate: $scope.provider.extractCandidateData()
      };
    }
  };
  $scope.changeView = function(view) {
    return $scope.view = view + ".html";
  };
  openDrawerListener = $rootScope.$on("openDrawer", function() {
    return $scope.openDrawer();
  });
  adminRefreshedListener = $rootScope.$on("adminRefreshed", function(event, admin) {
    return $scope.admin = ApiService.getAdmin();
  });
  $scope.$on("$destroy", function() {
    openDrawerListener();
    return adminRefreshedListener();
  });
  if (typeof chrome !== "undefined" && chrome !== null) {
    chrome.runtime.onMessage.addListener(function(request, sender, callback) {
      if (request.action === "toggleDrawer") {
        return $scope.$apply(function() {
          if ($scope.opened) {
            return $scope.closeDrawer();
          } else {
            return $scope.openDrawer();
          }
        });
      }
    });
  }
  if ((typeof self !== "undefined" && self !== null) && (self.port != null)) {
    self.port.on("toggleDrawer", function() {
      return $scope.$apply(function() {
        if ($scope.opened) {
          return $scope.closeDrawer();
        } else {
          return $scope.openDrawer();
        }
      });
    });
  }
  $scope.provider = ProviderHelper.detectProvider();
  if ($scope.provider != null) {
    $scope.provider.insertSourcingButton();
  }
});


angular.module("specky.factories").factory("ProviderHelper", function($location, $injector) {
  return {
    detectProvider: function() {
      var provider;
      provider = $injector.get("LinkedInProvider");
      return new provider();
    },
    extractEmail: function(text) {
      var emails;
      emails = text.match(/([a-zA-Z0-9._-]+@[a-zA-Z0-9._-]+\.[a-zA-Z0-9._-]+)/gi);
      if (emails != null) {
        return emails[0];
      } else {
        return null;
      }
    },
    trimData: function(data) {
      var key, value;
      if (data != null) {
        for (key in data) {
          value = data[key];
          if (angular.isString(value)) {
            data[key] = value.trim();
          }
        }
      }
      return data;
    }
  };
});


angular.module("specky.factories").factory("LinkedInProvider", function($document, $window, $templateCache, $rootScope, ProviderHelper) {
  var LinkedInProvider;
  return LinkedInProvider = (function() {
    function LinkedInProvider() {}

    LinkedInProvider.prototype.insertSourcingButton = function() {
      var buttonElement, headingElement;
      headingElement = $document.find("#top-card .profile-card #name h1 span.fn");
      if (headingElement.length > 0) {
        buttonElement = angular.element($templateCache.get("sourcing_button.html"));
        buttonElement.addClass("linkedin-provider");
        buttonElement.on("click", function(event) {
          event.preventDefault();
          event.stopPropagation();
          return $rootScope.$apply(function() {
            return $rootScope.$emit("openDrawer");
          });
        });
        return headingElement.prepend(buttonElement);
      }
    };

    LinkedInProvider.prototype.extractCandidateData = function() {
      var data, emailElement, locationElement, phoneElement, summaryElement, websiteElement;
      if ($document.find("#top-card .profile-card #name span.full-name").length === 0) {
        return null;
      }
      data = {};
      data.name = $document.find("#top-card .profile-card #name span.full-name").text();
      data.remote_photo_url = $document.find("#top-card .profile-card .profile-picture img").attr("src");
      emailElement = $document.find("#top-card .profile-card-extras #contact-info-section #email a");
      if (emailElement.length > 0) {
        emailElement = emailElement.clone();
        if (emailElement.find("button").length > 0) {
          emailElement.find("button").remove();
        }
        data.email = emailElement.text();
      }
      if ((data.email == null) && $document.find("#relationship #contact-container #relationship-email-item-0 a").length > 0) {
        data.email = $document.find("#relationship #contact-container #relationship-email-item-0 a").text();
      }
      phoneElement = $document.find("#top-card .profile-card-extras #contact-info-section #phone li");
      if (phoneElement.length > 0) {
        data.phone = phoneElement.text();
      }
      if (!data.phone && $document.find("#relationship #contact-container #relationship-phone-numbers li.contact-info-text:first-child").length > 0) {
        data.phone = $document.find("#relationship #contact-container #relationship-phone-numbers li.contact-info-text:first-child").text();
      }
      data.source = "import";
      data.sourcing_origin = "linkedin";
      data.sourcing_data = {};
      data.sourcing_data.url = $window.location.href;
      websiteElement = $document.find("#relationship #contact-container tr.www-presence a.url");
      if (websiteElement.length > 0) {
        data.sourcing_data.website = websiteElement.attr("href");
      }
      locationElement = $document.find("#top-card .profile-card #location span.locality a");
      if (locationElement.length > 0) {
        data.sourcing_data.location = locationElement.text();
      }
      summaryElement = $document.find("#background-summary p.description");
      if (summaryElement.length > 0) {
        data.sourcing_data.about = summaryElement.text();
        if (data.email == null) {
          data.email = ProviderHelper.extractEmail(data.sourcing_data.about);
        }
      }
      data.sourcing_data.skills = $document.find("#background-skills ul.skills-section li.endorse-item").map(function() {
        return angular.element(this).attr("data-endorsed-item-name");
      }).get().join(", ");
      if ($document.find("#background-experience").length > 0) {
        data.sourcing_data.work_history = [];
        $document.find("#background-experience .section-item").each(function() {
          var durationElement, element, item;
          element = angular.element(this);
          durationElement = element.find("span.experience-date-locale").clone();
          if (durationElement.find("span.locality").length > 0) {
            durationElement.find("span.locality").remove();
          }
          item = {
            title: element.find("header h4 a").text(),
            company: element.find("header h5:not(.experience-logo) a").text(),
            duration: durationElement.text()
          };
          if ((item.company != null) && (item.title != null)) {
            return data.sourcing_data.work_history.push(item);
          }
        });
      }
      if ($document.find("#background-education").length > 0) {
        data.sourcing_data.education_history = [];
        $document.find("#background-education .section-item").each(function() {
          var element, item;
          element = angular.element(this);
          item = {
            school: element.find("header h4 a").text(),
            degree: element.find("header h5:not(.education-logo)").text(),
            duration: element.find("span.education-date").text()
          };
          if (item.degree != null) {
            return data.sourcing_data.education_history.push(item);
          }
        });
      }
      return ProviderHelper.trimData(data);
    };

    return LinkedInProvider;

  })();
});

angular.module("specky.filters").filter("extensionUrl", function($sce) {
  return function(src) {
    if (typeof chrome !== "undefined" && chrome !== null) {
      return chrome.extension.getURL(src);
    } else {
      return "resource://extension-at-recruitee-dot-com/recruitee-firefox-extension/data/" + src;
    }
  };
});

