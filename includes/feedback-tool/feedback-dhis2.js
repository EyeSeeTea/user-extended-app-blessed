"use strict";

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

(function e(t, n, r) {
    function s(o, u) {
        if (!n[o]) {
            if (!t[o]) {
                var a = typeof require == "function" && require;if (!u && a) return a(o, !0);if (i) return i(o, !0);throw new Error("Cannot find module '" + o + "'");
            }var f = n[o] = { exports: {} };t[o][0].call(f.exports, function (e) {
                var n = t[o][1][e];return s(n ? n : e);
            }, f, f.exports, e, t, n, r);
        }return n[o].exports;
    }var i = typeof require == "function" && require;for (var o = 0; o < r.length; o++) {
        s(r[o]);
    }return s;
})({ 1: [function (require, module, exports) {
        /*
        Dhis2+Github module for https://github.com/eisnerd/feedback-tool
        
        Requires FeedBackToolGithub
        */

        var groupBy = function groupBy(xs, fn) {
            return xs.reduce(function (rv, x) {
                (rv[fn(x)] = rv[fn(x)] || []).push(x);
                return rv;
            }, {});
        };

        var FeedBackToolDhis2 = function () {
            function FeedBackToolDhis2(d2, appKey, options) {
                _classCallCheck(this, FeedBackToolDhis2);

                this.d2 = d2;
                this.appKey = appKey;
                this.options = options;
            }

            _createClass(FeedBackToolDhis2, [{
                key: "init",
                value: function init() {
                    var _this = this;

                    var locale = this.d2.currentUser.userSettings.settings.keyUiLocale || "en";
                    var throwError = function throwError(msg) {
                        throw new Error(msg);
                    };
                    var init = function init(i18nProperties) {
                        $.feedbackGithub(Object.assign({}, _this.options, {
                            postFunction: _this.sendFeedbackToUserGroups.bind(_this),
                            feedbackOptions: { i18nProperties: i18nProperties }
                        }));
                    };

                    fetch("includes/feedback-tool/i18n/" + locale + ".properties", { credentials: 'same-origin' }).then(function (res) {
                        return res.status.toString().match(/^2..$/) ? res : throwError("Cannot find locale");
                    }).then(function (res) {
                        return res.text();
                    }).then(init).catch(function () {
                        return init();
                    });
                }
            }, {
                key: "sendFeedbackToUserGroups",
                value: function sendFeedbackToUserGroups(payload) {
                    var _this2 = this;

                    var userGroupNames = this.options.sendToDhis2UserGroups;
                    var title = payload.title,
                        body = payload.body;

                    var currentApp = this.d2.system.installedApps.find(function (app) {
                        return app.key === _this2.appKey;
                    });
                    var fullTitle = currentApp ? "[" + currentApp.name + "] " + title : title;
                    var fullBody = payload.issueURL ? body + "\n\n---\n" + payload.issueURL : body;

                    return this.getUserGroups(userGroupNames).then(function (userGroups) {
                        return _this2.sendMessage(fullTitle, fullBody, userGroups.toArray());
                    }).catch(function (err) {
                        alert("Cannot send dhis2 message");
                    });
                }
            }, {
                key: "getUserGroups",
                value: function getUserGroups(names) {
                    return this.d2.models.userGroups.list({
                        filter: "name:in:[" + names.join(",") + "]",
                        paging: false
                    });
                }
            }, {
                key: "sendMessage",
                value: function sendMessage(subject, text, recipients) {
                    var api = this.d2.Api.getApi();
                    var recipientsByModel = groupBy(recipients, function (recipient) {
                        return recipient.modelDefinition.name;
                    });
                    var ids = function ids(objs) {
                        return objs && objs.map(function (obj) {
                            return { id: obj.id };
                        });
                    };

                    var message = {
                        subject: subject,
                        text: text,
                        users: ids(recipientsByModel.user),
                        userGroups: ids(recipientsByModel.userGroup),
                        organisationUnits: ids(recipientsByModel.organisationUnit)
                    };

                    if (recipients.length == 0) {
                        return Promise.resolve();
                    } else {
                        return api.post("/messageConversations", message);
                    }
                }
            }]);

            return FeedBackToolDhis2;
        }();

        $.feedbackDhis2 = function (d2, appKey, options) {
            var feedBackToolDhis2 = new FeedBackToolDhis2(d2, appKey, options);
            feedBackToolDhis2.init();
            return feedBackToolDhis2;
        };
    }, {}] }, {}, [1]);