var app;

angular.module("recruitee.controllers", []);

angular.module("recruitee.factories", []);

angular.module("recruitee.services", []);

angular.module("recruitee.directives", []);

angular.module("recruitee.filters", []);

app = angular.module("recruitee", ["ngAnimate", "recruitee.controllers", "recruitee.services", "recruitee.factories", "recruitee.directives", "recruitee.filters", "recruitee.templates"]);

app.config(function($compileProvider) {
  return $compileProvider.imgSrcSanitizationWhitelist(/^\s*((https?|ftp|file|blob|chrome-extension|resource):|data:image\/)/);
});

angular.element(document).ready(function() {
  var bootstrapTemplate;
  bootstrapTemplate = "<div id='recruitee-drawer' ng-controller='MainController' ng-include=\"'main.html'\"></div>";
  angular.element("body").append(bootstrapTemplate);
  return angular.bootstrap(angular.element("#recruitee-drawer"), ["recruitee"]);
});

angular.module("recruitee.controllers").controller("CandidateController", function($scope, ApiService) {
  return $scope["import"] = function() {
    if (!ApiService.isLogged()) {
      return $scope.changeView("profile");
    } else {
      return $scope.changeView("import");
    }
  };
});

angular.module("recruitee.controllers").controller("ImportController", function($scope, $rootScope, ApiService) {
  var loadOffers;
  loadOffers = function() {
    $rootScope.loading = true;
    return ApiService.getOffers(function(offers) {
      $rootScope.loading = false;
      return $scope.offers = offers;
    });
  };
  $scope.changeCompany = function() {
    if ($scope.formData.company != null) {
      ApiService.setDefaultCompany($scope.formData.company);
      return loadOffers();
    }
  };
  $scope.submit = function() {
    $scope.selectOfferError = false;
    $scope.error = false;
    if ($scope.formData.offer == null) {
      $scope.selectOfferError = true;
    }
    if (($scope.formData.offer != null) && ($scope.importData.candidate != null)) {
      $rootScope.loading = true;
      return ApiService.saveCandidate($scope.formData.offer.id, $scope.importData.candidate, function(saved, candidate) {
        $rootScope.loading = false;
        if (!saved) {
          $scope.error = true;
        }
        if (saved) {
          if (($scope.importData.note != null) && $scope.importData.note !== "") {
            return ApiService.saveNote(candidate.id, {
              body: $scope.importData.note
            }, function(saved, note) {
              return $scope.success = true;
            });
          } else {
            return $scope.success = true;
          }
        }
      });
    }
  };
  $scope.$watch("admin", function(newValue, oldValue) {
    if (newValue == null) {
      return $scope.changeView("profile");
    }
  });
  $scope.admin = ApiService.getAdmin();
  $scope.formData = {
    offer: null,
    company: ApiService.getDefaultCompany()
  };
  return loadOffers();
});

angular.module("recruitee.controllers").controller("MainController", function($scope, $rootScope, $location, ApiService, ProviderHelper) {
  var adminRefreshedListener, openDrawerListener;
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
      $scope.candidateStatus = null;
      if (ApiService.isLogged() && ($scope.importData.candidate != null)) {
        return ApiService.checkCandidatePresence($scope.importData.candidate.name, $scope.importData.candidate.email, function(status) {
          return $scope.candidateStatus = status;
        });
      }
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
  $scope.changeView("candidate");
  return $scope.admin = ApiService.getAdmin();
});

angular.module("recruitee.controllers").controller("ProfileController", function($scope, $rootScope, ApiService) {
  $scope.submit = function() {
    $scope.submitted = true;
    if (($scope.formData.email != null) && ($scope.formData.password != null)) {
      $rootScope.loading = true;
      return ApiService.login($scope.formData.email, $scope.formData.password, function(logged, admin, errors) {
        $rootScope.loading = false;
        if (logged) {
          return $scope.changeView("candidate");
        } else {
          return $scope.error = true;
        }
      });
    }
  };
  $scope.logout = function() {
    return ApiService.logout();
  };
  return $scope.formData = {};
});

angular.module("recruitee.factories").factory("AngelListProvider", function($document, $window, $templateCache, $rootScope, ProviderHelper) {
  var AngelListProvider;
  return AngelListProvider = (function() {
    function AngelListProvider() {}

    AngelListProvider.prototype.insertSourcingButton = function() {
      var buttonElement, headingElement;
      headingElement = $document.find(".header .summary .text");
      if (headingElement.length > 0) {
        buttonElement = angular.element($templateCache.get("sourcing_button.html"));
        buttonElement.addClass("angellist-provider");
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

    AngelListProvider.prototype.extractCandidateData = function() {
      var data, locationElement, rolesElement, skillsElement, summaryElement, websiteElement;
      if ($document.find(".header .summary h1.name").length === 0) {
        return null;
      }
      data = {};
      data.name = $document.find(".header .summary h1.name").text();
      data.remote_photo_url = $document.find(".header .summary .avatar img.avatar_img").attr("src");
      data.source = "import";
      data.sourcing_origin = "angellist";
      data.sourcing_data = {};
      data.sourcing_data.url = $window.location.href;
      websiteElement = $document.find(".actions_container .link a[data-field='online_bio_url']");
      if (websiteElement.length > 0) {
        data.sourcing_data.website = websiteElement.attr("href");
      }
      locationElement = $document.find(".sidebarContainer .section.vitals .value[data-field='tags_locations']");
      if (locationElement.length > 0) {
        data.sourcing_data.location = locationElement.find("a").map(function() {
          return angular.element(this).text();
        }).get().join(", ");
      }
      rolesElement = $document.find(".sidebarContainer .section.vitals .value[data-field='tags_roles']");
      if (rolesElement.length > 0) {
        data.sourcing_data.roles = rolesElement.find("a").map(function() {
          return angular.element(this).text();
        }).get().join(", ");
      }
      skillsElement = $document.find(".sidebarContainer .section.what_i_do .value[data-field='tags_skills']");
      if (skillsElement.length > 0) {
        data.sourcing_data.skills = skillsElement.find("a").map(function() {
          return angular.element(this).text();
        }).get().join(", ");
      }
      summaryElement = $document.find(".sidebarContainer .section.what_i_do .content.summary .value p");
      if (summaryElement.length > 0) {
        data.sourcing_data.about = summaryElement.text();
        if (data.email == null) {
          data.email = ProviderHelper.extractEmail(data.sourcing_data.about);
        }
      }
      if ($document.find(".portfolio .experience_container").length > 0) {
        data.sourcing_data.work_history = [];
        $document.find(".portfolio .experience_container .feature").each(function() {
          var element, item, titleElement;
          element = angular.element(this);
          titleElement = element.find(".text .role_title").clone();
          if (titleElement.find("span.years").length > 0) {
            titleElement.find("span.years").remove();
          }
          item = {
            title: titleElement.text(),
            company: element.find(".text strong.company_name").text(),
            duration: element.find(".text .role_title span.years").text()
          };
          if ((item.company != null) && (item.title != null)) {
            return data.sourcing_data.work_history.push(item);
          }
        });
      }
      return data;
    };

    return AngelListProvider;

  })();
});

angular.module("recruitee.factories").factory("Base64", function() {
  var keyStr;
  keyStr = "ABCDEFGHIJKLMNOP" + "QRSTUVWXYZabcdef" + "ghijklmnopqrstuv" + "wxyz0123456789+/" + "=";
  return {
    encode: function(input) {
      var chr1, chr2, chr3, enc1, enc2, enc3, enc4, i, output;
      output = "";
      chr1 = void 0;
      chr2 = void 0;
      chr3 = "";
      enc1 = void 0;
      enc2 = void 0;
      enc3 = void 0;
      enc4 = "";
      i = 0;
      while (true) {
        chr1 = input.charCodeAt(i++);
        chr2 = input.charCodeAt(i++);
        chr3 = input.charCodeAt(i++);
        enc1 = chr1 >> 2;
        enc2 = ((chr1 & 3) << 4) | (chr2 >> 4);
        enc3 = ((chr2 & 15) << 2) | (chr3 >> 6);
        enc4 = chr3 & 63;
        if (isNaN(chr2)) {
          enc3 = enc4 = 64;
        } else {
          if (isNaN(chr3)) {
            enc4 = 64;
          }
        }
        output = output + keyStr.charAt(enc1) + keyStr.charAt(enc2) + keyStr.charAt(enc3) + keyStr.charAt(enc4);
        chr1 = chr2 = chr3 = "";
        enc1 = enc2 = enc3 = enc4 = "";
        if (!(i < input.length)) {
          break;
        }
      }
      return output;
    },
    decode: function(input) {
      var base64test, chr1, chr2, chr3, enc1, enc2, enc3, enc4, i, output;
      output = "";
      chr1 = void 0;
      chr2 = void 0;
      chr3 = "";
      enc1 = void 0;
      enc2 = void 0;
      enc3 = void 0;
      enc4 = "";
      i = 0;
      base64test = /[^A-Za-z0-9\+\/\=]/g;
      if (base64test.exec(input)) {
        alert("There were invalid base64 characters in the input text.\n" + "Valid base64 characters are A-Z, a-z, 0-9, '+', '/',and '='\n" + "Expect errors in decoding.");
      }
      input = input.replace(/[^A-Za-z0-9\+\/\=]/g, "");
      while (true) {
        enc1 = keyStr.indexOf(input.charAt(i++));
        enc2 = keyStr.indexOf(input.charAt(i++));
        enc3 = keyStr.indexOf(input.charAt(i++));
        enc4 = keyStr.indexOf(input.charAt(i++));
        chr1 = (enc1 << 2) | (enc2 >> 4);
        chr2 = ((enc2 & 15) << 4) | (enc3 >> 2);
        chr3 = ((enc3 & 3) << 6) | enc4;
        output = output + String.fromCharCode(chr1);
        if (enc3 !== 64) {
          output = output + String.fromCharCode(chr2);
        }
        if (enc4 !== 64) {
          output = output + String.fromCharCode(chr3);
        }
        chr1 = chr2 = chr3 = "";
        enc1 = enc2 = enc3 = enc4 = "";
        if (!(i < input.length)) {
          break;
        }
      }
      return output;
    }
  };
});

angular.module("recruitee.factories").factory("BehanceProvider", function($document, $templateCache, $rootScope, ProviderHelper) {
  var DribbbleProvider;
  return DribbbleProvider = (function() {
    function DribbbleProvider() {}

    DribbbleProvider.prototype.insertSourcingButton = function() {
      var buttonElement, headingElement;
      headingElement = $document.find("#profile #profile-info");
      if (headingElement.length > 0) {
        buttonElement = angular.element($templateCache.get("sourcing_button.html"));
        buttonElement.addClass("behance-provider");
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

    DribbbleProvider.prototype.extractCandidateData = function() {
      var aboutElement, content, data;
      if ($document.find("#profile #profile-info #profile-display-name").length === 0) {
        return null;
      }
      content = $document.find("#profile #profile-info-wrap .profile-section").contents().map(function() {
        return angular.element(this).text();
      }).get().join(" ");
      data = {};
      data.name = $document.find("#profile #profile-info #profile-display-name a").text();
      data.remote_photo_url = $document.find("#profile #profile-info img#profile-image").attr("src");
      data.email = ProviderHelper.extractEmail(content);
      data.source = "import";
      data.sourcing_origin = "behance";
      data.sourcing_data = {};
      data.sourcing_data.url = $document.find("#profile #profile-info #profile-display-name a").attr("href");
      data.sourcing_data.location = $document.find("#profile #profile-info .profile-location a").text();
      data.sourcing_data.website = $document.find("#profile #profile-info a#profile-website").attr("href");
      data.sourcing_data.project_views = $document.find("#profile #profile-stats .profile-stat:eq(0) .profile-stat-count a").text();
      data.sourcing_data.appreciations = $document.find("#profile #profile-stats .profile-stat:eq(1) .profile-stat-count a").text();
      data.sourcing_data.followers = $document.find("#profile #profile-stats .profile-stat:eq(2) .profile-stat-count a").text();
      data.sourcing_data.following = $document.find("#profile #profile-stats .profile-stat:eq(3) .profile-stat-count a").text();
      if ($document.find("#profile #profile-focus a").length > 0) {
        data.sourcing_data.skills = $document.find("#profile #profile-focus a").map(function() {
          return angular.element(this).text();
        }).get().join(", ");
      }
      if ($document.find("#profile #profile-info-wrap .profile-section:contains('About')").length > 0) {
        aboutElement = $document.find("#profile #profile-info-wrap .profile-section:contains('About')").clone();
        if (aboutElement.find("h3").length > 0) {
          aboutElement.find("h3").remove();
        }
        if (aboutElement.find(".variable-text-full").length > 0) {
          if (aboutElement.find("span.variable-text-link").length > 0) {
            aboutElement.find("span.variable-text-link").remove();
          }
          data.sourcing_data.about = aboutElement.find(".variable-text-full").text().trim();
        } else {
          data.sourcing_data.about = aboutElement.text();
        }
      }
      return ProviderHelper.trimData(data);
    };

    return DribbbleProvider;

  })();
});

angular.module("recruitee.factories").factory("DribbbleProvider", function($document, $templateCache, $rootScope, ProviderHelper) {
  var DribbbleProvider;
  return DribbbleProvider = (function() {
    function DribbbleProvider() {}

    DribbbleProvider.prototype.insertSourcingButton = function() {
      var buttonElement, headingElement;
      headingElement = $document.find(".profile-head h1");
      if (headingElement.length > 0) {
        buttonElement = angular.element($templateCache.get("sourcing_button.html"));
        buttonElement.addClass("dribbble-provider");
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

    DribbbleProvider.prototype.extractCandidateData = function() {
      var data;
      if ($document.find(".profile-head").length === 0) {
        return null;
      }
      data = {};
      data.name = $document.find(".profile-head span.name").text();
      data.remote_photo_url = $document.find(".profile-head a.url img").attr("src");
      data.email = ProviderHelper.extractEmail($document.find(".profile-head h2.bio").text());
      data.source = "import";
      data.sourcing_origin = "dribbble";
      data.sourcing_data = {};
      data.sourcing_data.url = "https://dribbble.com" + ($document.find(".profile-head a.url").attr("href"));
      data.sourcing_data.location = $document.find(".profile-head .profile-details a.location").text();
      data.sourcing_data.website = $document.find(".profile-head .profile-details a.website").attr("href");
      data.sourcing_data.shots = $document.find("ul.profile-stats li.shots span.count").text();
      data.sourcing_data.followers = $document.find("ul.profile-stats li.followers span.count").text();
      data.sourcing_data.following = $document.find("ul.profile-stats li.following span.count").text();
      data.sourcing_data.likes = $document.find("ul.profile-stats li.likes span.count").text();
      data.sourcing_data.skills = $document.find("ul.profile-stats li.skills a").map(function() {
        return angular.element(this).text();
      }).get().join(", ");
      data.sourcing_data.about = $document.find(".profile-head h2.bio").text();
      return ProviderHelper.trimData(data);
    };

    return DribbbleProvider;

  })();
});

angular.module("recruitee.factories").factory("FacebookProvider", function($document, $window, $templateCache, $rootScope, ProviderHelper) {
  var FacebookProvider;
  return FacebookProvider = (function() {
    function FacebookProvider() {}

    FacebookProvider.prototype.insertSourcingButton = function() {};

    FacebookProvider.prototype.extractCandidateData = function() {};

    return FacebookProvider;

  })();
});

angular.module("recruitee.factories").factory("GithubProvider", function($document, $window, $templateCache, $rootScope) {
  var GithubProvider;
  return GithubProvider = (function() {
    function GithubProvider() {}

    GithubProvider.prototype.insertSourcingButton = function() {
      var buttonElement, headingElement;
      headingElement = $document.find("#site-container .container .vcard.column");
      if (headingElement.length > 0) {
        buttonElement = angular.element($templateCache.get("sourcing_button.html"));
        buttonElement.addClass("github-provider");
        buttonElement.on("click", function(event) {
          event.preventDefault();
          event.stopPropagation();
          return $rootScope.$apply(function() {
            return $rootScope.$emit("openDrawer");
          });
        });
        return headingElement.find("h1.vcard-names").after(buttonElement);
      }
    };

    GithubProvider.prototype.extractCandidateData = function() {
      var data, emailElement, locationElement, websiteElement, worksElement;
      if ($document.find("#site-container .container .vcard.column h1.vcard-names").length === 0) {
        return null;
      }
      data = {};
      data.name = $document.find("#site-container .container .vcard.column h1.vcard-names span.vcard-fullname").text();
      if ((data.name == null) || data.name === "") {
        data.name = $document.find("#site-container .container .vcard.column h1.vcard-names span.vcard-username").text();
      }
      data.remote_photo_url = $document.find("#site-container .container .vcard.column img.avatar").attr("src");
      emailElement = $document.find("#site-container .container .vcard.column li.vcard-detail a.email");
      if (emailElement.length > 0) {
        data.email = emailElement.text();
      }
      data.source = "import";
      data.sourcing_origin = "github";
      data.sourcing_data = {};
      data.sourcing_data.url = $window.location.href;
      websiteElement = $document.find("#site-container .container .vcard.column li.vcard-detail a.url");
      if (websiteElement.length > 0) {
        data.sourcing_data.website = websiteElement.attr("href");
      }
      locationElement = $document.find("#site-container .container .vcard.column li.vcard-detail[itemprop='homeLocation']");
      if (locationElement.length > 0) {
        data.sourcing_data.location = locationElement.attr("title");
      }
      worksElement = $document.find("#site-container .container .vcard.column li.vcard-detail[itemprop='worksFor']");
      if (worksElement.length > 0) {
        data.sourcing_data.works_for = worksElement.attr("title");
      }
      data.sourcing_data.followers = $document.find("#site-container .container .vcard.column .vcard-stats .vcard-stat:eq(0) .vcard-stat-count").text();
      data.sourcing_data.following = $document.find("#site-container .container .vcard.column .vcard-stats .vcard-stat:eq(1) .vcard-stat-count").text();
      data.sourcing_data.starred = $document.find("#site-container .container .vcard.column .vcard-stats .vcard-stat:eq(2) .vcard-stat-count").text();
      return ProviderHelper.trimData(data);
    };

    return GithubProvider;

  })();
});

angular.module("recruitee.factories").factory("LinkedInProvider", function($document, $window, $templateCache, $rootScope, ProviderHelper) {
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

angular.module("recruitee.factories").factory("ProviderHelper", function($location, $injector) {
  return {
    detectProvider: function() {
      var hostname, provider;
      hostname = $location.host();
      provider = null;
      if (hostname.indexOf("linkedin") !== -1) {
        provider = $injector.get("LinkedInProvider");
      } else if (hostname.indexOf("dribbble") !== -1) {
        provider = $injector.get("DribbbleProvider");
      } else if (hostname.indexOf("behance") !== -1) {
        provider = $injector.get("BehanceProvider");
      } else if (hostname.indexOf("github") !== -1) {
        provider = $injector.get("GithubProvider");
      } else if (hostname.indexOf("twitter") !== -1) {
        provider = $injector.get("TwitterProvider");
      } else if (hostname.indexOf("facebook") !== -1) {
        provider = $injector.get("FacebookProvider");
      } else if (hostname.indexOf("angel.co") !== -1) {
        provider = $injector.get("AngelListProvider");
      } else if (hostname.indexOf("stackoverflow") !== -1) {
        provider = $injector.get("StackOverflowProvider");
      } else if (hostname.indexOf("stackexchange") !== -1) {
        provider = $injector.get("StackExchangeProvider");
      }
      if (provider != null) {
        return new provider();
      } else {
        return null;
      }
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

angular.module("recruitee.factories").factory("StackExchangeProvider", function($document, $window, $templateCache, $rootScope, ProviderHelper) {
  var StackExchangeProvider;
  return StackExchangeProvider = (function() {
    function StackExchangeProvider() {}

    StackExchangeProvider.prototype.insertSourcingButton = function() {
      var buttonElement, headingElement;
      headingElement = $document.find("#mainbar-full #user-card .about");
      if (headingElement.length > 0) {
        buttonElement = angular.element($templateCache.get("sourcing_button.html"));
        buttonElement.addClass("stackexchange-provider");
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

    StackExchangeProvider.prototype.extractCandidateData = function() {
      var data, emailElement, locationElement, nameElement, reputationElement, websiteElement;
      if ($document.find("#mainbar-full #user-card h2.user-card-name").length === 0) {
        return null;
      }
      data = {};
      nameElement = $document.find("#mainbar-full #user-card h2.user-card-name").clone();
      if (nameElement.find("span.top-badge").length > 0) {
        nameElement.find("span.top-badge").remove();
      }
      if (nameElement.find("script").length > 0) {
        nameElement.find("script").remove();
      }
      data.name = nameElement.text().trim();
      data.remote_photo_url = $document.find("#mainbar-full #user-card #avatar-card img.avatar-user").attr("src");
      emailElement = $document.find("#site-container .container .vcard.column li.vcard-detail a.email");
      if (emailElement.length > 0) {
        data.email = emailElement.text();
      }
      data.source = "import";
      data.sourcing_origin = "stackexchange";
      data.sourcing_data = {};
      data.sourcing_data.url = $window.location.href;
      reputationElement = $document.find("#mainbar-full #user-card #avatar-card .reputation");
      if (reputationElement.length > 0) {
        reputationElement = reputationElement.clone();
        if (reputationElement.find("span.label-uppercase").length > 0) {
          reputationElement.find("span.label-uppercase").remove();
        }
        data.sourcing_data.reputation = reputationElement.text();
      }
      websiteElement = $document.find("#mainbar-full #user-card .user-links a.url");
      if (websiteElement.length > 0) {
        data.sourcing_data.website = websiteElement.attr("href");
      }
      locationElement = $document.find("#mainbar-full #user-card .user-links span.icon-location");
      if (locationElement.length > 0) {
        data.sourcing_data.location = locationElement.parent().text();
      }
      data.sourcing_data.answers = $document.find("#mainbar-full #user-card .user-stats .answers span.number").text();
      data.sourcing_data.questions = $document.find("#mainbar-full #user-card .user-stats .questions span.number").text();
      data.sourcing_data.people_reached = $document.find("#mainbar-full #user-card .user-stats .people-helped span.number").text();
      return ProviderHelper.trimData(data);
    };

    return StackExchangeProvider;

  })();
});

angular.module("recruitee.factories").factory("StackOverflowProvider", function($document, $window, $templateCache, $rootScope, ProviderHelper) {
  var StackOverflowProvider;
  return StackOverflowProvider = (function() {
    function StackOverflowProvider() {}

    StackOverflowProvider.prototype.insertSourcingButton = function() {
      var buttonElement, headingElement;
      headingElement = $document.find("#mainbar-full #user-card .about");
      if (headingElement.length > 0) {
        buttonElement = angular.element($templateCache.get("sourcing_button.html"));
        buttonElement.addClass("stackoverflow-provider");
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

    StackOverflowProvider.prototype.extractCandidateData = function() {
      var data, emailElement, locationElement, nameElement, reputationElement, websiteElement;
      if ($document.find("#mainbar-full #user-card h2.user-card-name").length === 0) {
        return null;
      }
      data = {};
      nameElement = $document.find("#mainbar-full #user-card h2.user-card-name").clone();
      if (nameElement.find("span.top-badge").length > 0) {
        nameElement.find("span.top-badge").remove();
      }
      if (nameElement.find("script").length > 0) {
        nameElement.find("script").remove();
      }
      data.name = nameElement.text().trim();
      data.remote_photo_url = $document.find("#mainbar-full #user-card #avatar-card img.avatar-user").attr("src");
      emailElement = $document.find("#site-container .container .vcard.column li.vcard-detail a.email");
      if (emailElement.length > 0) {
        data.email = emailElement.text();
      }
      data.source = "import";
      data.sourcing_origin = "stackoverflow";
      data.sourcing_data = {};
      data.sourcing_data.url = $window.location.href;
      reputationElement = $document.find("#mainbar-full #user-card #avatar-card .reputation");
      if (reputationElement.length > 0) {
        reputationElement = reputationElement.clone();
        if (reputationElement.find("span.label-uppercase").length > 0) {
          reputationElement.find("span.label-uppercase").remove();
        }
        data.sourcing_data.reputation = reputationElement.text();
      }
      websiteElement = $document.find("#mainbar-full #user-card .user-links a.url");
      if (websiteElement.length > 0) {
        data.sourcing_data.website = websiteElement.attr("href");
      }
      locationElement = $document.find("#mainbar-full #user-card .user-links span.icon-location");
      if (locationElement.length > 0) {
        data.sourcing_data.location = locationElement.parent().text();
      }
      data.sourcing_data.answers = $document.find("#mainbar-full #user-card .user-stats .answers span.number").text();
      data.sourcing_data.questions = $document.find("#mainbar-full #user-card .user-stats .questions span.number").text();
      data.sourcing_data.people_reached = $document.find("#mainbar-full #user-card .user-stats .people-helped span.number").text();
      return ProviderHelper.trimData(data);
    };

    return StackOverflowProvider;

  })();
});

angular.module("recruitee.factories").factory("TwitterProvider", function($document, $window, $templateCache, $rootScope, ProviderHelper) {
  var TwitterProvider;
  return TwitterProvider = (function() {
    function TwitterProvider() {}

    TwitterProvider.prototype.insertSourcingButton = function() {
      var currentUrl;
      currentUrl = $window.location.href;
      this.insert();
      return setInterval(((function(_this) {
        return function() {
          if (currentUrl !== $window.location.href) {
            currentUrl = $window.location.href;
            setTimeout((function() {
              return _this.insert();
            }), 1000);
            setTimeout((function() {
              return _this.insert();
            }), 3000);
            return setTimeout((function() {
              return _this.insert();
            }), 6000);
          }
        };
      })(this)), 500);
    };

    TwitterProvider.prototype.insert = function() {
      var buttonElement, headingElement;
      headingElement = $document.find(".AppContainer .ProfileSidebar .ProfileHeaderCard");
      if (headingElement.length > 0 && $document.find("a.rt-sourcing-button").length === 0) {
        buttonElement = angular.element($templateCache.get("sourcing_button.html"));
        buttonElement.addClass("twitter-provider");
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

    TwitterProvider.prototype.extractCandidateData = function() {
      var aboutElement, data, locationElement, websiteElement;
      if ($document.find(".AppContainer .ProfileSidebar .ProfileHeaderCard").length === 0) {
        return null;
      }
      data = {};
      data.name = $document.find(".AppContainer .ProfileSidebar .ProfileHeaderCard a.ProfileHeaderCard-nameLink").text();
      data.remote_photo_url = $document.find(".ProfileCanopy .ProfileAvatar img.ProfileAvatar-image").attr("src");
      data.source = "import";
      data.sourcing_origin = "twitter";
      data.sourcing_data = {};
      data.sourcing_data.url = $window.location.href;
      aboutElement = $document.find(".AppContainer .ProfileSidebar .ProfileHeaderCard p.ProfileHeaderCard-bio");
      if (aboutElement.length > 0) {
        data.sourcing_data.about = aboutElement.text();
      }
      websiteElement = $document.find(".AppContainer .ProfileSidebar .ProfileHeaderCard .ProfileHeaderCard-urlText a");
      if (websiteElement.length > 0) {
        data.sourcing_data.website = websiteElement.attr("title");
      }
      locationElement = $document.find(".AppContainer .ProfileSidebar .ProfileHeaderCard .ProfileHeaderCard-locationText");
      if (locationElement.length > 0) {
        data.sourcing_data.location = locationElement.text();
      }
      data.sourcing_data.followers = $document.find(".ProfileCanopy .ProfileNav-list .ProfileNav-item--followers .ProfileNav-value").text();
      data.sourcing_data.following = $document.find(".ProfileCanopy .ProfileNav-list .ProfileNav-item--following .ProfileNav-value").text();
      data.sourcing_data.tweets = $document.find(".ProfileCanopy .ProfileNav-list .ProfileNav-item--tweets .ProfileNav-value").text();
      return ProviderHelper.trimData(data);
    };

    return TwitterProvider;

  })();
});

angular.module("recruitee.filters").filter("extensionUrl", function($sce) {
  return function(src) {
    if (typeof chrome !== "undefined" && chrome !== null) {
      return chrome.extension.getURL(src);
    } else {
      return "resource://extension-at-recruitee-dot-com/recruitee-firefox-extension/data/" + src;
    }
  };
});

angular.module("recruitee.services").factory("ApiService", function($http, $rootScope, Base64) {
  var ApiService;
  return new (ApiService = (function() {
    function ApiService() {
      if (typeof chrome !== "undefined" && chrome !== null) {
        chrome.storage.sync.get(["admin", "company"], (function(_this) {
          return function(data) {
            _this.admin = data.admin;
            if (_this.admin != null) {
              _this.company = (data.company != null ? data.company : _this.admin.companies[0]);
            }
            return $rootScope.$apply(function() {
              return $rootScope.$emit("adminRefreshed", this.admin);
            });
          };
        })(this));
      }
      if ((typeof self !== "undefined" && self !== null) && (self.port != null)) {
        self.port.on("setCompany", (function(_this) {
          return function(company) {
            return _this.company = company;
          };
        })(this));
        self.port.on("setAdmin", (function(_this) {
          return function(admin) {
            _this.admin = admin;
            if (_this.company == null) {
              _this.company = admin.companies[0];
            }
            return $rootScope.$apply(function() {
              return $rootScope.$emit("adminRefreshed", this.admin);
            });
          };
        })(this));
        self.port.emit("getCompany");
        self.port.emit("getAdmin");
      }
      this.baseUrl = "https://api.recruitee.com";
    }

    ApiService.prototype.isLogged = function() {
      return this.admin != null;
    };

    ApiService.prototype.setAdmin = function(admin) {
      if (admin != null) {
        this.admin = admin;
        this.company = admin.companies[0];
        if (typeof chrome !== "undefined" && chrome !== null) {
          chrome.storage.sync.set({
            "admin": this.admin
          });
        }
        if ((typeof self !== "undefined" && self !== null) && (self.port != null)) {
          self.port.emit("setAdmin", this.admin);
        }
      } else {
        this.admin = null;
        this.company = null;
        if (typeof chrome !== "undefined" && chrome !== null) {
          chrome.storage.sync.remove(["admin", "company"]);
        }
        if ((typeof self !== "undefined" && self !== null) && (self.port != null)) {
          self.port.emit("setAdmin", null);
        }
      }
      return $rootScope.$emit("adminRefreshed", this.admin);
    };

    ApiService.prototype.getAdmin = function() {
      return this.admin;
    };

    ApiService.prototype.setDefaultCompany = function(company) {
      this.company = company;
      if (typeof chrome !== "undefined" && chrome !== null) {
        chrome.storage.sync.set({
          "company": this.company
        });
      }
      if ((typeof self !== "undefined" && self !== null) && (self.port != null)) {
        return self.port.emit("setCompany", this.company);
      }
    };

    ApiService.prototype.getDefaultCompany = function() {
      return this.company;
    };

    ApiService.prototype.getAuthToken = function() {
      if (this.admin != null) {
        return this.admin.authentication_token;
      } else {
        return null;
      }
    };

    ApiService.prototype.login = function(email, password, callback) {
      var authorizationHeader, url;
      authorizationHeader = "Basic " + (Base64.encode(email + ":" + password));
      url = this.baseUrl + "/admin";
      return $http.get(url, {
        headers: {
          "Authorization": authorizationHeader
        }
      }).success((function(_this) {
        return function(data, status, headers) {
          _this.setAdmin(data.admin);
          return callback(true, data.admin, null);
        };
      })(this)).error((function(_this) {
        return function(data, status, headers) {
          return callback(false, null, data.error);
        };
      })(this));
    };

    ApiService.prototype.logout = function() {
      return this.setAdmin(null);
    };

    ApiService.prototype.getOffers = function(callback) {
      var params, url;
      url = this.baseUrl + "/c/" + this.company.id + "/offers";
      params = {
        auth_token: this.getAuthToken(),
        scope: "active"
      };
      return $http.get(url, {
        params: params
      }).success(function(data, status, headers) {
        return callback(data.offers);
      }).error((function(_this) {
        return function(data, status, headers) {
          if (status === 401) {
            _this.logout();
          }
          return callback([]);
        };
      })(this));
    };

    ApiService.prototype.saveCandidate = function(offerId, candidateData, callback) {
      var params, url;
      url = this.baseUrl + "/c/" + this.company.id + "/offers/" + offerId + "/candidates";
      params = {
        auth_token: this.getAuthToken()
      };
      return $http.post(url, {
        candidate: candidateData
      }, {
        params: params
      }).success(function(data, status, headers) {
        return callback(true, data.candidate, null);
      }).error(function(data, status, headers) {
        return callback(false, null, data.error);
      });
    };

    ApiService.prototype.saveNote = function(candidateId, noteData, callback) {
      var params, url;
      url = this.baseUrl + "/c/" + this.company.id + "/candidates/" + candidateId + "/notes";
      params = {
        auth_token: this.getAuthToken()
      };
      return $http.post(url, {
        note: noteData
      }, {
        params: params
      }).success(function(data, status, headers) {
        return callback(true, data.note, null);
      }).error(function(data, status, headers) {
        return callback(false, null, data.error);
      });
    };

    ApiService.prototype.checkCandidatePresence = function(name, email, callback) {
      var params, url;
      url = this.baseUrl + "/candidates/check_presence";
      params = {
        name: name,
        email: email,
        auth_token: this.getAuthToken()
      };
      return $http.get(url, {
        params: params
      }).success(function(data, status, headers) {
        return callback(data.status);
      });
    };

    return ApiService;

  })());
});
